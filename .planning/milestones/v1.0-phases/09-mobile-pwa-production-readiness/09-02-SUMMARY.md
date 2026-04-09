---
phase: 09-mobile-pwa-production-readiness
plan: 02
subsystem: ui
tags: [pwa, service-worker, workbox, vite-plugin-pwa, offline, install-prompt, web-push]

# Dependency graph
requires:
  - phase: 09-mobile-pwa-production-readiness
    provides: responsive audit baseline, useIsMobile hook, settings page max-w-[640px] container
provides:
  - Installed vite-plugin-pwa with Workbox packages and pnpm peer dep override for Vite 8
  - Custom service worker (sw.ts) in injectManifest mode with app shell precache, NetworkFirst timetable API caching (3s timeout, 24h TTL), CacheFirst static asset caching (30d TTL), push event handler stub, notificationclick handler, and SKIP_WAITING message handler
  - useOnlineStatus hook using useSyncExternalStore for tear-free concurrent rendering
  - usePwaInstall hook capturing beforeinstallprompt with standalone/dismissed state detection
  - useServiceWorker hook using virtual:pwa-register dynamic import for update detection
  - OfflineBanner component (fixed below AppHeader, warning tint, WifiOff icon)
  - PwaInstallBanner component (fixed bottom, session dismissal, responsive height)
  - PwaInstallSettings card with installed/installable/iOS-share instruction states
  - Service worker update Sonner toast wired into root layout
affects: [09-03, 09-04, 09-05]

# Tech tracking
tech-stack:
  added:
    - "vite-plugin-pwa@^1.2.0"
    - "workbox-precaching@^7.4.0"
    - "workbox-routing@^7.4.0"
    - "workbox-strategies@^7.4.0"
    - "workbox-expiration@^7.4.0"
  patterns:
    - "vite-plugin-pwa injectManifest strategy for custom SW with push handlers (Pitfall 7 avoidance)"
    - "pnpm peerDependencyRules.allowedVersions override pattern for Vite 8 peer dep (Pitfall 2)"
    - "workbox NetworkFirst with networkTimeoutSeconds + ExpirationPlugin for stale-while-fresh caching"
    - "useSyncExternalStore pattern for browser-event subscriptions (online/offline)"
    - "Dynamic import('virtual:pwa-register') for SW registration -- tolerates missing virtual module in tests"
    - "Triple-slash reference pattern for scoped vite-plugin-pwa client types without touching tsconfig"
    - "beforeinstallprompt deferred event capture via useRef + event.preventDefault"
    - "Session-scoped dismissal via sessionStorage for PWA install banner"
    - "navigateFallbackDenylist for /api/* to prevent SW serving HTML for API requests (Pitfall 3)"

key-files:
  created:
    - apps/web/src/sw.ts
    - apps/web/src/hooks/useOnlineStatus.ts
    - apps/web/src/hooks/usePwaInstall.ts
    - apps/web/src/hooks/useServiceWorker.ts
    - apps/web/src/components/pwa/OfflineBanner.tsx
    - apps/web/src/components/pwa/PwaInstallBanner.tsx
    - apps/web/src/components/settings/PwaInstallSettings.tsx
    - apps/web/public/icons/icon-192.png
    - apps/web/public/icons/icon-512.png
    - apps/web/public/icons/badge-72.png
  modified:
    - package.json
    - pnpm-lock.yaml
    - apps/web/package.json
    - apps/web/vite.config.ts
    - apps/web/src/routes/__root.tsx
    - apps/web/src/routes/_authenticated/settings.tsx

key-decisions:
  - "injectManifest mode required because generateSW does not support custom push event handlers (09-RESEARCH Pitfall 7) -- custom sw.ts source compiled by Vite with precache manifest injected at build time"
  - "pnpm peerDependencyRules.allowedVersions override for vite-plugin-pwa>vite set to 8 to bypass the transitive peer-dep conflict (09-RESEARCH Pitfall 2)"
  - "navigateFallbackDenylist: [/^\\/api\\//] in VitePWA workbox config to prevent SW from intercepting API requests and serving cached HTML (09-RESEARCH Pitfall 3)"
  - "Service worker registration uses dynamic import('virtual:pwa-register') rather than top-level import -- tolerates vitest environments where the virtual module is absent without crashing the hook"
  - "Triple-slash reference to vite-plugin-pwa/client in useServiceWorker.ts instead of adding a project-wide vite-env.d.ts -- keeps the fix scoped to the Plan 02 file set and avoids inadvertently masking the pre-existing import.meta.env errors documented in deferred-items.md"
  - "usePwaInstall detects standalone via window.matchMedia('(display-mode: standalone)') with navigator.standalone fallback for iOS Safari compatibility"
  - "usePwaInstall stores the deferred BeforeInstallPromptEvent in useRef (not state) so install() always reads the latest captured event without triggering re-renders"
  - "OfflineBanner uses inline style for HSL with alpha rather than a Tailwind arbitrary-value class because Tailwind 4 arbitrary values don't parse slash-alpha in HSL -- inline style is the pragmatic path"
  - "Service worker update toast uses duration: Infinity with toast.info + action button -- user must explicitly accept or dismiss (no auto-dismiss for SW updates per 09-UI-SPEC)"
  - "Update toast shown once per detected update via useRef guard to prevent duplicate toasts on re-renders"
  - "PwaInstallBanner only renders when isInstallable AND !isInstalled AND !isDismissed (triple gate per 09-UI-SPEC)"
  - "Placeholder PWA icons generated with ImageMagick shape primitives (no font rendering) because ghostscript was not installed -- 192/512/72 PNGs are valid 24-bit RGB but visually minimal and should be replaced with real branding before production"

patterns-established:
  - "Pattern 1: PWA infrastructure via vite-plugin-pwa injectManifest + Workbox packages, custom TypeScript sw.ts with /// <reference lib=\"webworker\" /> directive"
  - "Pattern 2: React hooks for PWA state (useOnlineStatus, usePwaInstall, useServiceWorker) all SSR-safe and tolerant of missing virtual modules"
  - "Pattern 3: useSyncExternalStore for any browser event subscription that needs concurrent-rendering safety"
  - "Pattern 4: Workbox runtime caching configured via registerRoute with matcher function (url + request.method check) + strategy instance + ExpirationPlugin"
  - "Pattern 5: Root layout mounts PWA UI components (OfflineBanner, PwaInstallBanner) as siblings of <main> at the app root, not inside routed pages"

requirements-completed: [MOBILE-03]

# Metrics
duration: 25min
completed: 2026-04-09
---

# Phase 09 Plan 02: PWA Shell, Offline Timetable Cache & Install Prompt Summary

**PWA infrastructure with vite-plugin-pwa injectManifest mode, custom Workbox service worker (NetworkFirst timetable caching, push event stub, SKIP_WAITING), OfflineBanner + PwaInstallBanner + PwaInstallSettings components, and service worker update toast wired into the root layout.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-09T06:57:16Z
- **Completed:** 2026-04-09T07:22:54Z
- **Tasks:** 2
- **Files created:** 10
- **Files modified:** 6

## Accomplishments

- Installed `vite-plugin-pwa@1.2.0` and the four Workbox packages (precaching, routing, strategies, expiration) with a pnpm `peerDependencyRules.allowedVersions` override for `vite-plugin-pwa>vite: "8"` to resolve the transitive peer-dep conflict documented in 09-RESEARCH Pitfall 2.
- Configured `VitePWA` in `vite.config.ts` with `strategies: 'injectManifest'`, `registerType: 'prompt'`, full German manifest (`name: SchoolFlow`, `lang: de`, `display: standalone`, `theme_color: #3b82f6`), three icon entries (192, 512, 512-maskable), `injectManifest.globPatterns` for JS/CSS/HTML/PNG/SVG/WOFF2, and `workbox.navigateFallbackDenylist: [/^\/api\//]` to prevent the SW from intercepting API requests (09-RESEARCH Pitfall 3).
- Wrote a custom service worker at `apps/web/src/sw.ts` implementing: `precacheAndRoute(self.__WB_MANIFEST)` + `cleanupOutdatedCaches()`; `NetworkFirst` runtime caching for `/api/v1/schools/:schoolId/timetable/view` with 3-second network timeout and 24-hour expiration (MOBILE-03); `CacheFirst` for image/font destinations with 30-day expiration; `push` event handler that reads JSON payload (fallback `{title:'SchoolFlow', body:'Neue Benachrichtigung'}`) and calls `showNotification` with icon/badge/tag/url (MOBILE-02 consumer in Plan 04); `notificationclick` handler that focuses an existing window matching the target URL or opens a new one; and a `message` handler that calls `self.skipWaiting()` on `SKIP_WAITING`.
- Added three React hooks: `useOnlineStatus` (useSyncExternalStore subscribing to window `online`/`offline` events), `usePwaInstall` (captures deferred `beforeinstallprompt` in a ref, tracks `isInstallable`/`isInstalled`/`isDismissed`, exposes `install()` and `dismissForSession()`, detects standalone via `display-mode: standalone` with `navigator.standalone` iOS fallback), and `useServiceWorker` (dynamic `import('virtual:pwa-register')` to tolerate missing virtual module in tests, tracks `updateAvailable`, exposes `updateServiceWorker()`).
- Generated three placeholder PWA icons with ImageMagick (192x192, 512x512, 72x72 badge) as solid blue background with white rounded-rectangle / circle overlays. These are valid 24-bit RGB PNGs sufficient to satisfy the Chrome install prompt requirements but should be replaced with real SchoolFlow branding before production launch.
- Built `OfflineBanner` (fixed `top-[56px]`, `h-[40px]`, z-40, inline-styled warning tint `hsl(38 92% 50% / 0.10)` background with `hsl(38 92% 50% / 0.30)` border, `WifiOff` 16px icon, 12px semibold German text "Sie sind offline. Der heutige Stundenplan ist weiterhin verfuegbar.") using `useOnlineStatus`. Renders `null` when online.
- Built `PwaInstallBanner` (fixed bottom, `h-[56px] sm:h-[48px]`, z-40, `border-t border-border`, `shadow-lg`, "SchoolFlow" label with hidden-on-mobile Download icon, "Nicht jetzt" ghost button + "App installieren" primary button, both 44px min touch targets on mobile). Triple-gated render: `isInstallable && !isInstalled && !isDismissed`.
- Built `PwaInstallSettings` card (Card shell with "App installieren" 20px semibold heading, description text, three mutually exclusive states: `isInstalled` shows success text with CheckCircle icon in `hsl(142 71% 45%)`, `isInstallable` shows the 44px "App installieren" primary button, fallback shows Share-icon + iOS "Teilen-Menue" instructions).
- Wired `OfflineBanner` into `__root.tsx` between `AppHeader` and `<main>`, with conditional `pt-[calc(1rem+40px)]` on main content when offline to prevent banner overlap.
- Wired `PwaInstallBanner` as a sibling of the main layout wrapper so it floats above all routed pages.
- Wired `useServiceWorker` into `__root.tsx` with a `useEffect` that fires a persistent `toast.info` (`duration: Infinity`) with "Jetzt aktualisieren" action (calls `updateServiceWorker`) and "Spaeter" cancel. Guarded by a `useRef` flag to prevent duplicate toasts on re-renders.
- Mounted `PwaInstallSettings` card on the settings page below `ICalSettings` inside the existing `max-w-[640px]` container.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vite-plugin-pwa, create service worker, configure PWA manifest and hooks** - `8ab45cc` (feat)
2. **Task 2: OfflineBanner, PwaInstallBanner, PwaInstallSettings and root layout wiring** - `7f1d143` (feat)

## Files Created/Modified

### Created (10)

- `apps/web/src/sw.ts` - Custom Workbox service worker with precache, NetworkFirst timetable cache, CacheFirst static assets, push/notificationclick/message handlers
- `apps/web/src/hooks/useOnlineStatus.ts` - useSyncExternalStore hook tracking navigator.onLine
- `apps/web/src/hooks/usePwaInstall.ts` - Captures beforeinstallprompt and manages install/standalone/dismiss state
- `apps/web/src/hooks/useServiceWorker.ts` - Dynamic virtual:pwa-register registration with updateAvailable state
- `apps/web/src/components/pwa/OfflineBanner.tsx` - Fixed banner below AppHeader, warning tint
- `apps/web/src/components/pwa/PwaInstallBanner.tsx` - Fixed bottom install prompt banner with session dismiss
- `apps/web/src/components/settings/PwaInstallSettings.tsx` - Settings card with installed/installable/iOS states
- `apps/web/public/icons/icon-192.png` - 192x192 PWA icon (placeholder blue + white square)
- `apps/web/public/icons/icon-512.png` - 512x512 PWA icon (placeholder blue + white square, used as maskable)
- `apps/web/public/icons/badge-72.png` - 72x72 notification badge (placeholder blue + white circle)

### Modified (6)

- `package.json` - Added `pnpm.peerDependencyRules.allowedVersions["vite-plugin-pwa>vite"]: "8"`
- `pnpm-lock.yaml` - Regenerated for vite-plugin-pwa and workbox packages
- `apps/web/package.json` - Added `vite-plugin-pwa` dependency and four `workbox-*` devDependencies
- `apps/web/vite.config.ts` - Added `VitePWA` plugin with injectManifest configuration + navigateFallbackDenylist
- `apps/web/src/routes/__root.tsx` - Imported/mounted OfflineBanner + PwaInstallBanner, wired useServiceWorker update toast, conditional padding on main when offline
- `apps/web/src/routes/_authenticated/settings.tsx` - Imported and mounted PwaInstallSettings card below ICalSettings

## Decisions Made

All decisions are enumerated in the frontmatter `key-decisions` list. Highlights:

- **injectManifest over generateSW**: required because the auto-generated SW does not include custom push event handlers, which MOBILE-02 needs to consume in Plan 04. The research document explicitly flagged this as Pitfall 7 and updated the strategy recommendation.
- **pnpm peerDependencyRules override**: `vite-plugin-pwa` currently declares a peer dependency on Vite 5-7 but works fine with Vite 8. The override at the root `package.json` is the documented workaround (09-RESEARCH Pitfall 2) and was already anticipated in the plan.
- **navigateFallbackDenylist for /api/***: without this, the SW's navigation fallback would try to serve `index.html` for any 404 API request, breaking the backend integration (09-RESEARCH Pitfall 3).
- **Dynamic import for virtual:pwa-register**: `import('virtual:pwa-register')` rather than top-level static import so that Vitest unit tests of the hook do not crash with "module not found" when the vite-plugin-pwa virtual module is absent. The hook degrades gracefully to a no-op.
- **Triple-slash client reference in useServiceWorker.ts**: I intentionally did NOT create `apps/web/src/vite-env.d.ts` with the full `vite/client` reference because that would silently resolve the pre-existing `import.meta.env` TSC errors documented in `deferred-items.md`. Those errors are out of scope for Plan 09-02 per the scope boundary rule. Instead I scoped the vite-plugin-pwa client types to just the hook file that needs them.
- **useRef for deferredPrompt**: The captured `BeforeInstallPromptEvent` does not need to trigger re-renders when captured (only its *presence* matters, tracked by the separate `isInstallable` state). Storing it in a ref keeps `install()` pure and avoids stale closures.
- **Session-scoped dismissal**: Using `sessionStorage` (not `localStorage`) means "Nicht jetzt" hides the banner for the current browser session but it will reappear on the next visit, matching the 09-UI-SPEC requirement that dismissal does not suppress future prompts.
- **Inline HSL styles in OfflineBanner**: Tailwind 4 arbitrary values have limited support for HSL slash-alpha syntax in some contexts, and the warning tint values are one-off. Inline `style` with literal HSL strings is the pragmatic path; the spec tokens are documented in 09-UI-SPEC.

## Deviations from Plan

None — plan executed exactly as written.

One noteworthy detail: the plan step for icons anticipated that ImageMagick might not be available. ImageMagick IS installed on this machine but ghostscript is not, so font-based text rendering failed. I pivoted to geometric shape primitives (solid color backgrounds with white rounded-rectangle and circle overlays) and the resulting PNGs are valid 24-bit RGB images that satisfy the Chrome install prompt and Lighthouse PWA audit requirements. This is not a deviation from the plan instructions — the plan explicitly said "note they should be replaced with proper branding" in the fallback path, and the generated icons should be replaced with real SchoolFlow branding before production launch.

## Issues Encountered

### TSC verification gate pre-existing errors

The plan's verification gate is `pnpm --filter @schoolflow/web tsc --noEmit`. The default command runs against `apps/web/tsconfig.json` which references (but does not include files from) `tsconfig.app.json`, so it exits with code 0 as required.

When running `tsc --noEmit -p tsconfig.app.json` directly (which does include `src/**/*`), eight pre-existing errors surface — all documented in `.planning/phases/09-mobile-pwa-production-readiness/deferred-items.md` (created by Plan 09-01). I verified these errors have the exact same line numbers and error codes as before my Plan 09-02 changes:

- `src/hooks/useImportSocket.ts(9,29)` -- import.meta.env
- `src/lib/keycloak.ts(3,33)`, `(4,35)`, `(5,38)` -- import.meta.env
- `src/lib/socket.ts(4,29)` -- import.meta.env
- `src/main.tsx(1,8)` -- CSS module declaration
- `src/routes/_authenticated/classbook/$lessonId.tsx(95,17)` -- TanStack Router type inference
- `src/routes/_authenticated/messages/$conversationId.tsx(34,35)` -- missing search param
- `src/routes/_authenticated/teacher/substitutions.tsx(28,33)` -- null vs undefined

**Zero new errors** were introduced by Plan 09-02. The verification gate exits 0 as specified.

### ghostscript not installed

ImageMagick needs ghostscript to render TrueType fonts. The `magick -annotate "SF"` path failed with "gs: command not found". Resolved by using pure geometric primitives (`-fill white -draw "roundrectangle ..."` and `-draw "circle ..."`) which don't require a font engine. PNGs are still 24-bit RGB and pass `file` inspection.

## Stub Tracking

Scanned all created/modified files for stubs (hardcoded empty arrays, placeholder text, unwired components).

- **OfflineBanner** is wired to `useOnlineStatus` (real navigator.onLine source). Not a stub.
- **PwaInstallBanner** is wired to `usePwaInstall` which captures real `beforeinstallprompt` events. Not a stub.
- **PwaInstallSettings** is wired to `usePwaInstall`. Not a stub.
- **Service worker push handler** in `sw.ts` currently parses `event.data?.json()` and calls `showNotification`. This is intentional scaffolding for Plan 04 (MOBILE-02) which will add the backend `web-push` delivery, `PushSubscription` Prisma model, and VAPID key management. The handler itself is NOT a stub — it works when a push arrives — but the end-to-end push delivery is incomplete until Plan 04 wires the backend. This is explicitly documented in the 09-02 plan scope and 09-RESEARCH.
- **Placeholder icons** (`icon-192.png`, `icon-512.png`, `badge-72.png`) are visually minimal but functionally valid PNGs. They are NOT code stubs but brand-asset placeholders and should be replaced before production launch. This is the only known visual placeholder in the plan and is explicitly sanctioned in the plan's icon creation step.

**No hidden stubs that would block the plan's goal** (MOBILE-03: today's timetable viewable offline via PWA cache) are present. The NetworkFirst strategy caches the actual backend response on successful online loads.

## User Setup Required

None — no external service configuration required for Plan 09-02.

Two user-facing notes for production:

1. **Real PWA icons**: The placeholder icons at `apps/web/public/icons/*.png` should be replaced with real SchoolFlow branding before production launch. File sizes, naming, and format are already correct.
2. **VAPID keys for push**: Plan 04 will require generating VAPID keys via `web-push generate-vapid-keys --json` and storing them in backend env vars. This is out of scope for Plan 09-02 — the service worker's push handler is ready to receive messages but backend delivery is not yet wired.

## Next Phase Readiness

- **09-03 (Push Notifications Settings Card)**: Ready. The service worker's `push` and `notificationclick` handlers are in place. Plan 03 can add a `PushNotificationSettings` card using the same settings card pattern as `PwaInstallSettings`, add a `usePushSubscription` hook that calls `registration.pushManager.subscribe()`, and POST the subscription to the backend endpoint (which Plan 04 will build).
- **09-04 (Web Push Backend)**: Ready. The SW-side push handler is the consumer. Plan 04 needs to add the `web-push` dependency to the API, create the `PushSubscription` Prisma model, wire `PushService` into `NotificationService`, generate VAPID keys, and expose the public VAPID key endpoint that the 09-03 subscription hook will call.
- **09-05 (Production Infrastructure)**: Not affected by this plan (backend only -- health endpoints, backup scripts, Docker production profile).

### Blockers/Concerns

- **Pre-existing TSC errors** continue to block a clean `tsc -p tsconfig.app.json` run. They do NOT block the plan-specified verification gate (`pnpm --filter @schoolflow/web tsc --noEmit`) which uses the default empty `tsconfig.json`. A dedicated TSC hygiene sweep (suggested: `09-XX-tsc-hygiene` or Phase 10 tech debt) should resolve the `vite/client` reference, the `./app.css` ambient declaration, and the TanStack Router search param strictness fixes before a full `strict` CI can land.
- **Placeholder icons**: Not a blocker for functionality, but a blocker for production launch. Visual branding team should supply final PNGs at 192/512/72 sizes.
- **Dev-mode SW disabled**: `devOptions.enabled: false` means the service worker only activates in production builds. Testing offline behavior requires running `pnpm --filter @schoolflow/web build && pnpm --filter @schoolflow/web preview` rather than `pnpm dev`. This is intentional per 09-RESEARCH to avoid SW caching during HMR development.

## Self-Check: PASSED

All claimed files and commits verified to exist on disk and in git history.

**Files verified (10 created + 4 modified):**

- FOUND: apps/web/src/sw.ts
- FOUND: apps/web/src/hooks/useOnlineStatus.ts
- FOUND: apps/web/src/hooks/usePwaInstall.ts
- FOUND: apps/web/src/hooks/useServiceWorker.ts
- FOUND: apps/web/src/components/pwa/OfflineBanner.tsx
- FOUND: apps/web/src/components/pwa/PwaInstallBanner.tsx
- FOUND: apps/web/src/components/settings/PwaInstallSettings.tsx
- FOUND: apps/web/public/icons/icon-192.png
- FOUND: apps/web/public/icons/icon-512.png
- FOUND: apps/web/public/icons/badge-72.png
- FOUND: apps/web/vite.config.ts (modified)
- FOUND: apps/web/src/routes/__root.tsx (modified)
- FOUND: apps/web/src/routes/_authenticated/settings.tsx (modified)
- FOUND: package.json (modified)

**Commits verified:**

- FOUND: 8ab45cc (Task 1: PWA infrastructure + hooks)
- FOUND: 7f1d143 (Task 2: components + root/settings wiring)

**Acceptance criteria (all 18 from plan, verified inline during execution):**

- Task 1: `VitePWA` (2), `injectManifest` (3), `precacheAndRoute` (3), `NetworkFirst` (3), `addEventListener.*push` (1), `SKIP_WAITING` (2), `useSyncExternalStore` (3), `beforeinstallprompt` (6), `peerDependencyRules` (1), three PNG icons present, `tsc --noEmit` exits 0 PASS
- Task 2: `OfflineBanner` in __root.tsx (2), `PwaInstallBanner` in __root.tsx (2), `useServiceWorker` in __root.tsx (2), `PwaInstallSettings` in settings.tsx (2), `useOnlineStatus` in OfflineBanner.tsx (2), `usePwaInstall` in PwaInstallBanner.tsx (2), `WifiOff` in OfflineBanner.tsx (3), `tsc --noEmit` exits 0 PASS

**Verification gate:** `pnpm --filter @schoolflow/web tsc --noEmit` exits with code 0.

---
*Phase: 09-mobile-pwa-production-readiness*
*Completed: 2026-04-09*
