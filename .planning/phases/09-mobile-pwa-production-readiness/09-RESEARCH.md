# Phase 9: Mobile, PWA & Production Readiness - Research

**Researched:** 2026-04-06
**Domain:** PWA/Service Workers, Web Push, Responsive Web, Docker Production, Backup/Restore
**Confidence:** HIGH

## Summary

Phase 9 covers five distinct technical domains: (1) responsive audit of all existing pages, (2) PWA with offline timetable cache, (3) Web Push notifications, (4) backup/restore scripts, and (5) zero-downtime Docker deployments. The existing codebase already has a solid foundation -- the root layout has mobile sidebar/header with sm: breakpoint toggling, messaging has list-detail mobile routing, and there is an existing HealthModule, NotificationService, and BullMQ infrastructure that can be extended.

The primary technical risk is the `vite-plugin-pwa` peer dependency on Vite -- version 1.2.0 declares `vite: ^3.1.0 || ^7.0.0` but the project uses Vite 8. GitHub issue #923 confirms it works functionally with Vite 8 but the peer dep is not yet updated. This requires a pnpm override or `--legacy-peer-deps` equivalent. The `web-push` npm package (3.6.7) is stable and well-established for VAPID-based Web Push. For production Docker, the `docker-rollout` CLI plugin provides zero-downtime deployment for Docker Compose without requiring Kubernetes or Swarm.

**Primary recommendation:** Proceed with vite-plugin-pwa (with pnpm override for Vite 8 peer dep), web-push for VAPID push, pg_dump shell scripts for backup, and docker-rollout for zero-downtime deploys. All libraries are stable and widely used.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Tailwind breakpoints audit on existing components. Fix layout issues across all pages for sm/md/lg breakpoints. No new framework -- existing Tailwind responsive utility classes. Focus on timetable grid, classbook, messaging list-detail, import wizard.
- D-02: Vite PWA plugin (vite-plugin-pwa) with Workbox service worker. manifest.json with SchoolFlow branding. Install prompt support. Minimal config approach.
- D-03: Offline scope: today's timetable only. Cache GET /timetable response for current day via service worker. Show "Offline" banner when disconnected. Other features require network.
- D-04: Standard PWA install prompt. Browser-native Add to Home Screen banner. Custom "App installieren" button in settings page. iOS Safari meta tags for home screen icon.
- D-05: Web Push API with VAPID keys. Standard browser push via service worker. Works on Android Chrome, desktop browsers, iOS Safari 16.4+. VAPID keys generated server-side and stored in env vars.
- D-06: Push triggers: timetable changes, new messages, substitution offers, exam/homework assigned. Extends existing NotificationService to also trigger web push alongside Socket.IO. Same Notification entity, new delivery channel.
- D-07: Permission prompt on first relevant action (not on page load). "Benachrichtigungen aktivieren" button in settings. Ask when user first clicks notification bell or views settings.
- D-08: Backend uses web-push npm package. PushSubscription entity per user in DB. BullMQ job to batch push delivery. Failed/expired subscriptions auto-cleaned on 410 response.
- D-09: pg_dump backup scripts + Docker volume backup. Documented shell scripts for PostgreSQL dump, Redis snapshot, file upload directory backup. Cron-ready with timestamp naming. Restore script with integrity verification (row count comparison).
- D-10: Docker Compose rolling update for zero-downtime deployment. Health check endpoints on all services. `docker compose up -d --no-deps --build api` for rolling restart. No Kubernetes for v1.
- D-11: Dedicated /health and /ready endpoints. /health returns 200 if process alive (liveness). /ready checks DB + Redis + Keycloak connectivity (readiness). Used by Docker healthcheck directive.
- D-12: Multi-stage Dockerfile. Build stage compiles TypeScript, runtime stage uses node:24-alpine. Docker Compose production profile with resource limits, structured logging, restart policies. .env.example with all required environment variables documented.

### Claude's Discretion
- Exact Workbox caching strategies (StaleWhileRevalidate vs CacheFirst)
- Service worker update notification UX
- VAPID key generation and rotation strategy
- Push notification payload format and size limits
- Backup retention policy (how many backups to keep)
- Docker resource limit values (memory, CPU)
- Health check timeout and retry configuration
- Responsive breakpoint-specific layout decisions per page
- PWA manifest icon sizes and splash screens

### Deferred Ideas (OUT OF SCOPE)
- React Native mobile app (v2)
- Full offline mode with sync queue
- Kubernetes Helm charts
- Cloud-managed backup (AWS RDS, etc.)
- Push notification preferences per category
- Background sync for offline form submissions
- CDN and asset optimization
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOBILE-01 | Alle Features sind ueber responsive Web-App auf Smartphone/Tablet nutzbar | Tailwind responsive audit pattern; existing sm/md/lg breakpoints in layout; UI-SPEC page-by-page responsive rules |
| MOBILE-02 | Push-Notifications fuer Stundenplanaenderungen, neue Nachrichten, Abwesenheits-Alerts | web-push npm package for VAPID; PushSubscription Prisma model; BullMQ push-delivery queue; extends existing NotificationService |
| MOBILE-03 | Heutiger Stundenplan ist offline einsehbar (PWA Cache) | vite-plugin-pwa with Workbox runtimeCaching; NetworkFirst strategy for timetable API; OfflineBanner component |
| DEPLOY-02 | Backup/Restore-Skripte sind dokumentiert und getestet | pg_dump/pg_restore shell scripts; Redis BGSAVE; Docker volume backup; cron-ready with retention |
| DEPLOY-03 | System unterstuetzt Rolling Updates ohne Downtime | docker-rollout CLI plugin or manual scale-up/down; /health and /ready endpoints; Docker healthcheck directives |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | 1.2.0 | PWA manifest, service worker generation | Zero-config PWA for Vite. Uses Workbox internally. Most popular Vite PWA plugin (1200+ GitHub stars). |
| workbox-window | 7.4.0 | Service worker registration + update detection | Peer dependency of vite-plugin-pwa. Provides `registerSW` with update callbacks. |
| web-push | 3.6.7 | VAPID Web Push from Node.js backend | Standard library for Web Push in Node.js. Used by 320+ projects. Handles VAPID signing and push endpoint calls. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workbox-build | 7.4.0 | Build-time service worker generation | Peer dependency of vite-plugin-pwa. Automatically required. |
| docker-rollout | latest (CLI plugin) | Zero-downtime Docker Compose deploys | Install as Docker CLI plugin for `docker rollout <service>` command. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-pwa | Manual Workbox config | Much more boilerplate. PWA plugin handles manifest, precache, registration. |
| web-push | OneSignal / Firebase | Vendor lock-in. Self-hosted requirement rules out SaaS push providers. |
| docker-rollout | Docker Swarm | Requires swarm init. Overkill for single-server school deployments. |
| pg_dump scripts | pgBackRest / Barman | Enterprise tools. Too complex for single-school self-hosted deployments. |

**Installation:**
```bash
# Frontend (apps/web)
pnpm add vite-plugin-pwa

# Backend (apps/api)
pnpm add web-push
pnpm add -D @types/web-push

# Docker CLI plugin (on deployment server)
mkdir -p ~/.docker/cli-plugins
curl https://raw.githubusercontent.com/wowu/docker-rollout/master/docker-rollout -o ~/.docker/cli-plugins/docker-rollout
chmod +x ~/.docker/cli-plugins/docker-rollout
```

**Version verification:**
- vite-plugin-pwa: 1.2.0 (verified via `npm view`, published ~Nov 2025)
- web-push: 3.6.7 (verified via `npm view`, stable)
- workbox-window: 7.4.0 (verified via `npm view`)

**CRITICAL: Vite 8 Peer Dependency Issue**
vite-plugin-pwa 1.2.0 declares `peerDependencies.vite: "^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0"` -- does NOT include `^8.0.0`. The project uses Vite 8.0.3. GitHub issue #923 confirms it works functionally. Resolution: add pnpm override in root `package.json`:
```json
{
  "pnpm": {
    "peerDependencyRules": {
      "allowedVersions": {
        "vite-plugin-pwa>vite": "8"
      }
    }
  }
}
```

## Architecture Patterns

### Recommended Project Structure (new files)
```
apps/api/src/
  modules/
    health/
      health.controller.ts       # EXTEND: add /ready endpoint
      health.module.ts            # EXTEND: inject PrismaService, Redis, ConfigService
    push/
      push.module.ts              # NEW: PushModule
      push.controller.ts          # NEW: POST/DELETE /push-subscriptions
      push.service.ts             # NEW: web-push send logic
      push.processor.ts           # NEW: BullMQ processor for batch push
      dto/
        create-push-subscription.dto.ts
  substitution/notification/
    notification.service.ts       # EXTEND: call push.service after Socket.IO emit
  config/queue/
    queue.constants.ts            # EXTEND: add PUSH_QUEUE constant
    queue.module.ts               # EXTEND: register push queue

apps/web/src/
  components/
    pwa/
      OfflineBanner.tsx           # NEW
      PwaInstallBanner.tsx        # NEW
    settings/
      PushNotificationSettings.tsx # NEW
      PwaInstallSettings.tsx       # NEW
  hooks/
    useOnlineStatus.ts            # NEW
    usePwaInstall.ts              # NEW
    usePushSubscription.ts        # NEW
    useServiceWorker.ts           # NEW
  public/
    icons/                        # NEW: PWA icons (192x192, 512x512)

docker/
  docker-compose.yml              # EXTEND: healthchecks for all services
  docker-compose.prod.yml         # NEW: production profile overrides
  Dockerfile.api                  # NEW: multi-stage API Dockerfile
  Dockerfile.web                  # NEW: multi-stage web Dockerfile (nginx)
  scripts/
    backup.sh                     # NEW
    restore.sh                    # NEW
```

### Pattern 1: PWA Service Worker with Workbox Runtime Caching

**What:** Use vite-plugin-pwa with `generateSW` strategy and runtime caching to cache the timetable API response.

**When to use:** D-02, D-03 -- PWA with offline timetable.

**Example:**
```typescript
// vite.config.ts addition
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // ... existing plugins
    VitePWA({
      registerType: 'prompt', // D-07: prompt user before activating new SW
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'SchoolFlow',
        short_name: 'SchoolFlow',
        description: 'Schulverwaltungsplattform',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache timetable API responses (today only) -- MOBILE-03
            urlPattern: /\/api\/v1\/schools\/[^/]+\/timetable\/view\?/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'timetable-api',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Cache static assets
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
});
```

**Caching Strategy Recommendation (Claude's Discretion):**
- **Timetable API: `NetworkFirst`** with 3-second timeout. Tries network first; falls back to cache. This ensures users always get fresh data when online, but cached today's timetable when offline. 24-hour expiry cleans stale data daily.
- **Static assets (fonts, images): `CacheFirst`**. These rarely change. Cache-first reduces bandwidth.
- **App shell (HTML/JS/CSS): Workbox precache** via `globPatterns`. Automatically versioned by content hash.

### Pattern 2: Web Push Subscription Lifecycle

**What:** PushSubscription stored per-user in Prisma. Backend sends via web-push. BullMQ batches delivery. 410 responses trigger auto-cleanup.

**When to use:** D-05, D-06, D-07, D-08 -- MOBILE-02.

**Example (backend):**
```typescript
// push.service.ts
import webpush from 'web-push';

@Injectable()
export class PushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    webpush.setVapidDetails(
      'mailto:admin@schoolflow.example',
      config.getOrThrow('VAPID_PUBLIC_KEY'),
      config.getOrThrow('VAPID_PRIVATE_KEY'),
    );
  }

  async subscribe(userId: string, subscription: PushSubscriptionJSON): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
  }

  async sendToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or unsubscribed -- auto-cleanup (D-08)
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  }
}
```

**Example (frontend -- service worker push handler):**
```javascript
// In the generated service worker, push event listener
// vite-plugin-pwa injectManifest mode or custom SW entry
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'SchoolFlow', body: 'Neue Benachrichtigung' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(clients.openWindow(url));
});
```

**VAPID Key Strategy (Claude's Discretion):**
- Generate once via `web-push generate-vapid-keys --json` during initial setup
- Store in `.env` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
- Expose public key via `GET /api/v1/push/vapid-key` (public endpoint) for frontend subscription
- No rotation needed for VAPID keys -- they are long-lived. Rotation would invalidate ALL existing subscriptions.

### Pattern 3: Health Check Endpoints (Liveness + Readiness)

**What:** Extend existing HealthController with /ready endpoint that checks DB, Redis, and Keycloak.

**When to use:** D-11 -- DEPLOY-03.

**Example:**
```typescript
// health.controller.ts -- extend existing
@Get('ready')
@Public()
@ApiOperation({ summary: 'Readiness check -- verifies external dependencies' })
async ready() {
  const checks = {
    database: false,
    redis: false,
    keycloak: false,
  };

  // PostgreSQL
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {}

  // Redis
  try {
    const pong = await this.redis.ping();
    checks.redis = pong === 'PONG';
  } catch {}

  // Keycloak
  try {
    const res = await fetch(`${this.keycloakUrl}/realms/${this.realm}`);
    checks.keycloak = res.ok;
  } catch {}

  const allHealthy = Object.values(checks).every(Boolean);
  return {
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  };
}
```

### Pattern 4: Docker Multi-Stage Build

**What:** Separate build and runtime stages. Build compiles TypeScript. Runtime uses node:24-alpine.

**When to use:** D-12 -- DEPLOY-03.

**Example (Dockerfile.api):**
```dockerfile
# Build stage
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @schoolflow/api run build

# Runtime stage
FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
```

### Pattern 5: Backup Script with Integrity Verification

**What:** Shell script for pg_dump + Redis BGSAVE + file backup with row count verification.

**When to use:** D-09 -- DEPLOY-02.

**Example (backup.sh):**
```bash
#!/bin/bash
set -euo pipefail
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"

# PostgreSQL dump
docker compose exec -T postgres pg_dump -U schoolflow schoolflow \
  | gzip > "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

# Redis snapshot
docker compose exec -T redis redis-cli BGSAVE
sleep 2
docker compose cp redis:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"

# File uploads (if mounted volume)
if [ -d "$UPLOAD_DIR" ]; then
  tar czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" "$UPLOAD_DIR"
fi

# Retention: delete backups older than $RETAIN_DAYS
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETAIN_DAYS -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETAIN_DAYS -delete

echo "Backup complete: $TIMESTAMP"
```

### Anti-Patterns to Avoid

- **Asking for push permission on page load:** Browsers penalize sites that show permission prompts immediately. D-07 specifies: ask only when user actively visits settings or clicks notification bell.
- **Using `injectManifest` when `generateSW` suffices:** For D-03's limited offline scope (today's timetable only), `generateSW` with runtime caching is simpler. `injectManifest` is for complex custom SW logic.
- **Caching all API responses offline:** D-03 explicitly limits offline to today's timetable. Caching all endpoints wastes storage and creates stale data issues.
- **Storing VAPID private key in code:** Must be in environment variables only. Never commit to repository.
- **`container_name` in production Docker Compose:** Prevents scaling. Remove `container_name` and `ports` (use Docker network) when using docker-rollout.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker generation | Custom SW file with manual precache | vite-plugin-pwa + Workbox | Precache manifest generation, cache busting, update detection are complex edge-case-rich problems |
| Push notification encryption | Manual VAPID signing | web-push npm package | RFC 8291/8188 encryption and VAPID auth are crypto-heavy specs |
| PWA manifest generation | Manual manifest.json | vite-plugin-pwa manifest config | Plugin auto-generates manifest and injects link tags |
| Backup scheduling | Custom Node.js cron service | Shell scripts + system cron | Shell scripts are auditable, portable, and don't couple backup to app lifecycle |
| Zero-downtime deploys | Custom deployment orchestration | docker-rollout or manual scale-up/down pattern | Timing container lifecycle is error-prone without tooling |

**Key insight:** PWA and Web Push are built on web standards with complex specs (Service Worker API, Push API, Notification API, Cache Storage API). Workbox and web-push abstract these correctly. Hand-rolling means re-discovering browser quirks (especially iOS Safari).

## Common Pitfalls

### Pitfall 1: iOS Safari Push Requires Home Screen Installation
**What goes wrong:** Push notifications silently fail on iOS Safari because the PWA is not installed to the home screen.
**Why it happens:** Apple requires PWAs to be added to the home screen before push works. In the EU, PWAs may open in Safari tabs with no push support.
**How to avoid:** (1) Guide users to install via PwaInstallBanner and settings card. (2) Show clear instructions for iOS "Add to Home Screen" flow. (3) Do NOT assume push is available -- always check `'Notification' in window && 'serviceWorker' in navigator`.
**Warning signs:** `Notification.permission` returns "default" but `PushManager.subscribe()` throws or `registration.pushManager` is undefined.

### Pitfall 2: vite-plugin-pwa Vite 8 Peer Dependency
**What goes wrong:** `pnpm install` fails with peer dependency resolution error for vite-plugin-pwa.
**Why it happens:** vite-plugin-pwa 1.2.0 declares Vite <=7 in peerDependencies. Project uses Vite 8.
**How to avoid:** Add `pnpm.peerDependencyRules.allowedVersions` override in root `package.json` before installing.
**Warning signs:** `ERR_PNPM_PEER_DEP_ISSUES` during install.

### Pitfall 3: Service Worker Scope vs. API Proxy Conflict
**What goes wrong:** Service worker intercepts API requests (`/api/v1/...`) and serves cached HTML shell instead of JSON.
**Why it happens:** Default Workbox precache includes `index.html` as navigation fallback. API routes may match navigation fallback regex.
**How to avoid:** Configure `navigateFallbackDenylist: [/^\/api\//]` in Workbox config. Only cache explicit timetable API pattern in `runtimeCaching`.
**Warning signs:** API calls return 200 with HTML content-type after SW install.

### Pitfall 4: Push Subscription Endpoint Expiry
**What goes wrong:** Sending push to expired endpoints returns 410 but the subscription stays in the database, causing repeated failures.
**Why it happens:** Browser push endpoints expire when user clears browser data, uninstalls PWA, or browser updates the push service URL.
**How to avoid:** D-08 specifies auto-cleanup on 410/404. Implement this in `PushService.sendToUser()` -- delete subscription row on these status codes.
**Warning signs:** Push delivery success rate drops over time. Logs show increasing 410 responses.

### Pitfall 5: Backup Script Assumes Running Container
**What goes wrong:** `docker compose exec` fails if the postgres container is stopped or unhealthy.
**Why it happens:** Backup scripts are often run via cron which doesn't check container state.
**How to avoid:** Add pre-check: `docker compose ps postgres --format '{{.State}}' | grep -q running`. Exit with error if not running.
**Warning signs:** Silent cron failures. Empty backup files.

### Pitfall 6: Health Check Endpoint Behind Auth Guard
**What goes wrong:** Docker healthcheck gets 401 from `/health` because the global JwtAuthGuard intercepts it.
**Why it happens:** Existing health controller uses `@Public()` decorator, but if decorator is removed or guard logic changes, health checks break.
**How to avoid:** Verify `@Public()` decorator is present on both `/health` and `/ready` endpoints. The existing HealthController already has `@Public()` -- maintain this.
**Warning signs:** Container enters unhealthy state in Docker despite the app running fine.

### Pitfall 7: Workbox generateSW vs. injectManifest for Push
**What goes wrong:** Using `generateSW` mode means the service worker is auto-generated and does NOT include push event handlers. Push notifications arrive but are not shown.
**Why it happens:** `generateSW` produces a generic caching SW. Push requires custom `self.addEventListener('push', ...)` handlers.
**How to avoid:** Use `injectManifest` mode instead of `generateSW`. Create a custom `sw.ts` source file with push event handlers, and let vite-plugin-pwa inject the precache manifest into it. This is the standard approach when SW needs custom logic beyond caching.
**Warning signs:** `push` events fire in devtools but no notification appears.

**UPDATE TO CACHING STRATEGY RECOMMENDATION:** Given Pitfall 7, use `injectManifest` mode (not `generateSW`). The custom SW source file will include both the injected precache manifest AND push/notification event handlers.

### Pitfall 8: Rolling Update Drops In-Flight WebSocket Connections
**What goes wrong:** Users lose real-time timetable/notification/messaging WebSocket connections during deployment.
**Why it happens:** Container replacement terminates existing WebSocket connections. Socket.IO reconnects automatically but there is a brief gap.
**How to avoid:** Socket.IO already has automatic reconnection (configured in Phase 3/4). Ensure `reconnection: true` and `reconnectionAttempts: Infinity` on client. Users will see a brief disconnect/reconnect. This is acceptable for school deployments (typically done outside school hours).
**Warning signs:** `socket.io: disconnect` events in client console during deployment.

## Code Examples

### Custom Service Worker Source (injectManifest mode)
```typescript
// apps/web/src/sw.ts
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// Injected by vite-plugin-pwa at build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime caching: timetable API (MOBILE-03 offline today)
registerRoute(
  ({ url }) => url.pathname.match(/\/api\/v1\/schools\/[^/]+\/timetable\/view/),
  new NetworkFirst({
    cacheName: 'timetable-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 }),
    ],
    networkTimeoutSeconds: 3,
  }),
);

// Static assets
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 86400 }),
    ],
  }),
);

// Push notification handler (MOBILE-02)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'SchoolFlow', body: 'Neue Benachrichtigung' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag ?? 'default',
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    }),
  );
});

// Skip waiting message (for SW update toast)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### PushSubscription Prisma Model
```prisma
// Add to schema.prisma
model PushSubscription {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@map("push_subscriptions")
}
```

### useOnlineStatus Hook
```typescript
// apps/web/src/hooks/useOnlineStatus.ts
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
```

### vite-plugin-pwa Configuration (injectManifest mode)
```typescript
// Updated vite.config.ts VitePWA config for injectManifest
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'prompt',
  includeAssets: ['icons/*.png'],
  manifest: {
    name: 'SchoolFlow',
    short_name: 'SchoolFlow',
    description: 'Schulverwaltungsplattform',
    theme_color: '#3b82f6',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    lang: 'de',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  },
  devOptions: {
    enabled: false, // Only enable SW in production builds
  },
})
```

### Push Notification Payload Format (Claude's Discretion)
```json
{
  "title": "Stundenplanaenderung",
  "body": "Morgen, Di 3. Stunde: Mathematik faellt aus (Vertretung durch Hr. Mueller)",
  "tag": "timetable-change-2026-04-07",
  "url": "/timetable"
}
```
- **Max payload size:** 4096 bytes per Web Push spec. Keep payloads under 3KB to account for encryption overhead.
- **`tag` field:** Used for notification dedup. Same tag replaces previous notification instead of stacking.
- **Format per trigger type:**
  - Timetable change: `tag: "timetable-change-{date}"`, `url: "/timetable"`
  - New message: `tag: "message-{conversationId}"`, `url: "/messages/{conversationId}"`
  - Substitution offer: `tag: "substitution-{substitutionId}"`, `url: "/teacher/substitutions"`
  - Homework/Exam: `tag: "homework-{id}"` or `tag: "exam-{id}"`, `url: "/timetable"`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SW + manifest.json | vite-plugin-pwa auto-generation | 2023+ | Zero-config PWA. No manual cache versioning. |
| GCM for push | VAPID (no Google dependency) | 2018+ | Self-hosted push without vendor accounts. |
| generateSW only | injectManifest when custom SW logic needed | Stable | Required for push event handlers in SW |
| Docker Swarm for rolling updates | docker-rollout CLI plugin | 2023+ | No swarm init needed. Compose-native zero-downtime. |
| pg_dump + manual retention | pg_dump + find -mtime cleanup | Stable | Automated retention via cron |

**Deprecated/outdated:**
- **GCM (Google Cloud Messaging):** Replaced by FCM/VAPID. web-push uses VAPID natively.
- **AppCache (manifest.appcache):** Removed from browsers in 2022+. Service Workers are the replacement.
- **`vite-plugin-pwa` generateSW for push:** Not deprecated but insufficient when SW needs push handlers. Use injectManifest.

## Open Questions

1. **PWA Icon Assets**
   - What we know: PWA manifest requires icons at 192x192 and 512x512 minimum. Maskable variant needed for Android adaptive icons.
   - What's unclear: No SchoolFlow logo/icon assets exist in the repository yet.
   - Recommendation: Create placeholder icon using simple "SF" text on primary color background. Can be replaced with proper branding later. Use a tool like `@vite-pwa/assets-generator` if a source SVG is available, or create manually.

2. **Push Notification for Offline Users**
   - What we know: Web Push delivers to browser push service even if user is offline. Browser shows notification when device comes online.
   - What's unclear: TTL (Time-To-Live) for push messages. School notifications may be time-sensitive (e.g., "timetable change for today").
   - Recommendation: Set TTL to 24 hours (86400 seconds) via `web-push` options. Notifications older than 24h are not useful for school context.

3. **injectManifest + TypeScript**
   - What we know: The custom SW source file is TypeScript (`sw.ts`). vite-plugin-pwa can compile it via Vite's build pipeline.
   - What's unclear: Whether additional Workbox packages need explicit install when using `injectManifest` (workbox-precaching, workbox-routing, workbox-strategies, workbox-expiration).
   - Recommendation: These are typically auto-resolved through workbox-build peer dependency. If not, install explicitly: `pnpm add -D workbox-precaching workbox-routing workbox-strategies workbox-expiration`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Dockerfile build, compose | Yes | 29.2.0 | -- |
| Node.js | API/Web build | Yes | v25.8.2 | -- (need >=24, 25 is fine) |
| pnpm | Package management | Yes | 10.33.0 | -- |
| pg_dump | Backup scripts | No (not on host) | -- | Run via `docker compose exec postgres pg_dump` (inside container) |
| redis-cli | Redis backup | No (not on host) | -- | Run via `docker compose exec redis redis-cli` (inside container) |

**Missing dependencies with no fallback:**
- None -- all commands run inside Docker containers or via Docker Compose exec.

**Missing dependencies with fallback:**
- `pg_dump` and `redis-cli` are not installed on the host machine, but both are available inside their respective Docker containers. Backup scripts use `docker compose exec` to run commands inside containers. This is the standard Docker-based backup approach.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file (API) | `apps/api/vitest.config.ts` |
| Config file (Web) | `apps/web/vitest.config.ts` |
| Quick run command (API) | `cd apps/api && pnpm test` |
| Quick run command (Web) | `cd apps/web && pnpm test` |
| Full suite command | `pnpm test` (turbo) |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOBILE-01 | Responsive layout on all pages | manual | Visual audit at 375px/768px/1280px viewports | -- (manual) |
| MOBILE-02-a | PushSubscription CRUD | unit | `cd apps/api && pnpm vitest run src/modules/push/push.service.spec.ts -x` | Wave 0 |
| MOBILE-02-b | Push delivery via BullMQ | unit | `cd apps/api && pnpm vitest run src/modules/push/push.processor.spec.ts -x` | Wave 0 |
| MOBILE-02-c | Push subscription frontend hook | unit | `cd apps/web && pnpm vitest run src/hooks/usePushSubscription.test.ts -x` | Wave 0 |
| MOBILE-03-a | SW registration + offline detection | unit | `cd apps/web && pnpm vitest run src/hooks/useOnlineStatus.test.ts -x` | Wave 0 |
| MOBILE-03-b | OfflineBanner component render | unit | `cd apps/web && pnpm vitest run src/components/pwa/OfflineBanner.test.tsx -x` | Wave 0 |
| DEPLOY-02-a | Backup script execution | smoke | `bash docker/scripts/backup.sh --dry-run` | Wave 0 |
| DEPLOY-02-b | Restore script execution | smoke | `bash docker/scripts/restore.sh --dry-run --file <backup>` | Wave 0 |
| DEPLOY-03-a | /health endpoint liveness | unit | `cd apps/api && pnpm vitest run src/modules/health/health.controller.spec.ts -x` | Exists (extend) |
| DEPLOY-03-b | /ready endpoint readiness | unit | `cd apps/api && pnpm vitest run src/modules/health/health.controller.spec.ts -x` | Exists (extend) |
| DEPLOY-03-c | Docker healthcheck config | smoke | `docker compose -f docker/docker-compose.prod.yml config --quiet` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && pnpm vitest run --reporter=verbose` + `cd apps/web && pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm test` (full turbo suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/push/push.service.spec.ts` -- covers MOBILE-02-a
- [ ] `apps/api/src/modules/push/push.processor.spec.ts` -- covers MOBILE-02-b
- [ ] `apps/web/src/hooks/useOnlineStatus.test.ts` -- covers MOBILE-03-a
- [ ] `apps/web/src/components/pwa/OfflineBanner.test.tsx` -- covers MOBILE-03-b
- [ ] `apps/web/src/hooks/usePushSubscription.test.ts` -- covers MOBILE-02-c
- [ ] Extend `apps/api/src/modules/health/health.controller.spec.ts` -- covers DEPLOY-03-a, DEPLOY-03-b

## Sources

### Primary (HIGH confidence)
- [vite-plugin-pwa npm](https://www.npmjs.com/package/vite-plugin-pwa) -- version 1.2.0 verified
- [web-push npm](https://www.npmjs.com/package/web-push) -- version 3.6.7 verified
- [vite-plugin-pwa official docs](https://vite-pwa-org.netlify.app/guide/) -- configuration patterns
- [Workbox runtime caching](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime) -- caching strategies
- [vite-plugin-pwa Vite 8 issue #923](https://github.com/vite-pwa/vite-plugin-pwa/issues/923) -- peer dependency workaround
- [docker-rollout GitHub](https://github.com/wowu/docker-rollout) -- zero-downtime Docker Compose

### Secondary (MEDIUM confidence)
- [PWA iOS limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) -- iOS push requirements
- [Apple Web Push docs](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) -- iOS Safari 16.4+ support
- [pg_dump Docker backup guide](https://dev.to/piteradyson/postgresql-docker-backup-strategies-how-to-backup-postgresql-running-in-docker-containers-1bla) -- backup patterns
- [Docker Compose rolling updates](https://reintech.io/blog/zero-downtime-deployments-docker-compose-rolling-updates) -- zero-downtime patterns
- [NestJS Web Push integration](https://medium.com/@dnyaneshwarsukashe/implementing-web-push-notifications-in-angular-and-nestjs-4d33a8e14af5) -- NestJS patterns

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified on npm, versions confirmed, usage patterns well-documented
- Architecture: HIGH -- extends existing codebase patterns (NotificationService, BullMQ, health endpoint, Socket.IO)
- Pitfalls: HIGH -- iOS Safari push limitations and Vite 8 peer dep are well-documented issues with known workarounds
- Responsive audit: MEDIUM -- UI-SPEC provides detailed page-by-page rules, but actual effort depends on how many components need fixes vs already being responsive

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days -- stable domain, no fast-moving dependencies)
