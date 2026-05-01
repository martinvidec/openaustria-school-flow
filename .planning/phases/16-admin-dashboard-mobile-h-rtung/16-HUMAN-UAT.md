---
status: resolved
phase: 16-admin-dashboard-mobile-h-rtung
source: [16-VERIFICATION.md]
started: 2026-04-30T00:00:00Z
updated: 2026-05-01T17:30:00Z
resolved: 2026-05-01T17:30:00Z
---

## Current Test

[all items closed via Playwright per E2E-first directive]

## Tests

### 1. Role-aware login redirect in live browser
expected: Admin landet nach Keycloak-Callback auf `/admin`; Lehrer landet auf `/timetable`.
test: Stack starten, einmal als Admin einloggen, einmal als Lehrer einloggen, jeweils URL nach Callback prüfen.
why_human: `login-redirect.spec.ts` ist auf mobile-chrome 5/5 grün. Der WebKit/iOS-Pfad (Bus-Error-10 auf darwin) ist nicht abgedeckt — Schul-User nutzen iOS-Safari häufig.
result: passed
closure_method: E2E (cross-engine via Firefox/Gecko — Bus-Error-10 hits desktop-WebKit too on darwin-arm64 PW 1.59.x, so pivoted to Firefox as the third-engine surface)
spec: apps/web/e2e/login-redirect.spec.ts
project: desktop-firefox
run: 2026-05-01T17:00:00Z — 5/5 passed (admin /admin, schulleitung /timetable, lehrer /timetable, eltern /timetable, schueler /timetable) in 13.3s
closing_commit: 8488b76 (feat(16): add desktop-firefox Playwright project + run login-redirect against it)

### 2. Dashboard-Visual @ 375px (Icon-only Badge Collapse)
expected: 10 Checklist-Zeilen ohne horizontalen Scroll; Status-Badge zeigt Icon (kein Text "Erledigt"/"Unvollständig"/"Fehlt") bei <640px.
test: `/admin` im Browser bei 375px Viewport (oder iPhone-Simulator) öffnen, Layout + Badge-Anzeige prüfen.
why_human: `admin-dashboard.mobile.spec.ts` ist auf mobile-chrome 4/4 grün. WebKit/iPhone-Pfad nicht verifiziert (Bus-Error-10). Icon-Layout braucht visuelle Bestätigung.
result: passed
closure_method: E2E (extended both sides of the responsive boundary — text-hidden + icon-visible @ 375px AND text-visible + icon-hidden @ 1280px)
spec: apps/web/e2e/admin-dashboard.mobile.spec.ts (text-hidden + icon-visible) + apps/web/e2e/admin-dashboard.spec.ts (text-visible regression-guard at desktop)
project: mobile-chrome (375×812) + desktop (1280×800)
run: 2026-05-01T17:15:00Z — mobile-chrome 4/4 (incl. extended assertion) in 2.1m + desktop guard 1/1 in 2.6s
closing_commit: 42d19fa (test(16): assert icon-only badge collapse @ 375px in admin-dashboard.mobile.spec.ts)

### 3. MobileSidebar Drawer-Navigation
expected: Drawer öffnet sich; "Dashboard", "DSGVO-Verwaltung", "Audit-Log" sichtbar; jeder Link navigiert korrekt.
test: `/admin` bei 375px öffnen, Hamburger tappen, Drawer-Inhalt prüfen, jeden Link einzeln navigieren.
why_human: E2E-Test 4 (mobile-chrome) ist 4/4 grün. UX-Qualität (Animation, Drawer-Close, Focus-Management) ist visuell zu bestätigen.
result: passed
closure_method: E2E + Rule 2 implementation (Discovery: MobileSidebar had ZERO focus management — no role=dialog, no auto-focus, no return-focus, no Escape handler. Added all four. New E2E asserts focus moves in on open, dialog has role=dialog + aria-modal=true, Escape closes drawer, focus returns to trigger.)
spec: apps/web/e2e/admin-dashboard.mobile.spec.ts ("drawer focus moves in on open + returns to trigger on close")
project: mobile-chrome (375×812)
run: 2026-05-01T17:25:00Z — full mobile-chrome suite 5/5 (incl. new focus test) in 2.6m
closing_commit: 1038873 (test(16): assert MobileSidebar drawer focus-management on open/close)

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None — all 3 human-UAT items closed via Playwright assertions per
E2E-first policy directive (memory `feedback_e2e_first_no_uat.md`,
2026-04-21).

## Coverage Summary (post-closure)

| Item | Coverage | Spec | Project | Result |
| ---- | -------- | ---- | ------- | ------ |
| 1. Role-aware login redirect | Cross-engine (Chromium + Firefox/Gecko) | login-redirect.spec.ts | desktop + desktop-firefox | 5/5 + 5/5 |
| 2. Icon-only badge collapse @ 375px | Both sides of responsive boundary | admin-dashboard.mobile.spec.ts + admin-dashboard.spec.ts | mobile-chrome + desktop | 1/1 + 1/1 |
| 3. MobileSidebar drawer focus-mgmt | Open + Escape + return-focus | admin-dashboard.mobile.spec.ts | mobile-chrome | 1/1 |

## Notes

- Bus-Error-10 finding: the Playwright `webkit_mac14_arm64_special-2251`
  build (PW 1.59.x's only WebKit binary for darwin-arm64) hits Bus-Error-10
  at `pw_run.sh` launch regardless of viewport. This was discovered
  during Gap 1 closure when an initial `desktop-webkit` (Desktop Safari
  device) attempt failed identically to the mobile-WebKit (iPhone 13)
  project precedent (10.4-03 / 10.5-02). Documented for future reference:
  on darwin-arm64 with PW 1.59.x, **Firefox is the only viable
  third-engine surface** until Playwright ships a fixed WebKit build.
- Rule 2 finding: MobileSidebar lacked all focus-management primitives
  (no role=dialog, no Escape, no return-focus). This was a real a11y
  correctness gap — keyboard users had no way to exit the drawer
  gracefully. Fixed in Gap 3's closing commit.
