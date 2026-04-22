# Phase 10.5 — Deferred Items

Items explicitly descoped from 10.5 per user decision 2026-04-22. Each entry names an owner and tracking context. Created per CONTEXT.md D-27 by plan 10.5-01 Task 5.

## 1. Räume-CRUD UI + E2E

**Descoped because:** No `/admin/rooms` page exists in v1.x (only `/rooms` booking-grid). 10.5 covers only Räume-Booking-Conflict. Mirrors the 10.4 People-CRUD descope precedent.
**Owner:** future "admin-rooms" phase (roadmap-curator to insert a phase slot)
**Tracking:** ROADMAP §10.5 success-criteria edited per 10.5-01 Task 4 (D-26)

## 2. Imports CSV Error-Path variants

**Descoped because:** 10.5 covers only the "malformed row" error-path. Other error classes (invalid header, oversize file, encoding errors, duplicate rows) need their own hardening tranche.
**Owner:** future "imports-hardening" tranche
**Tracking:** see 10.5-RESEARCH.md Pitfall 5 + 10.5-CONTEXT.md `<deferred>` item 4

## 3. Solver-Aktivieren Confirm-Dialog

**Descoped because:** User explicitly rejected Option C (confirmation before replacing active timetable) on 2026-04-22 (D-12). The UX may want this later when Solver-Tuning-UI is expanded.
**Owner:** Phase 14 Solver-Tuning (add to Phase 14 success criteria when that phase is planned — D-28)
**Tracking:** 10.5-CONTEXT.md D-28

## 4. Imports Mobile-Project E2E

**Descoped conditionally:** If the ImportWizard is not responsive at 375px, mobile E2E defers to a future tranche. 10.5-03 Task 3 decides empirically; this entry is filled (or left as TBD) based on that outcome.
**Owner:** future "imports-ux-mobile" tranche OR 10.5-03 decides in-flight
**Tracking:** 10.5-CONTEXT.md D-09c + 10.5-03 Task 3 SUMMARY

## 5. Rooms-Booking Mobile-375 — environmental blocker (authored + deferred)

**Status:** Spec authored at `apps/web/e2e/rooms-booking.mobile.spec.ts` (commit 65f5290) and structurally identical to the desktop-green ROOM-BOOK-01 flow. Execution on the current dev machine fails with `WebKit Bus error: 10` in the frozen Playwright 1.59 `mac14_arm64_special` build on macOS 14.3 — the exact same environmental gate that affects `zeitraster.mobile.spec.ts`, `admin-school-settings.mobile.spec.ts`, and `screenshots.mobile.spec.ts`.

**Empirical evidence (2026-04-22, 10.5-01 Task 3):**

```
Error: browserType.launch: Target page, context or browser has been closed
[pid=31386][err] /.../webkit_mac14_arm64_special-2251/pw_run.sh: line 7:
  31392 Bus error: 10  DYLD_FRAMEWORK_PATH=...
```

Reproduction: `pnpm --filter @schoolflow/web exec playwright test apps/web/e2e/rooms-booking.mobile.spec.ts --project=mobile-375 --workers=1`.

**Why not a spec problem:** the same Pitfall-6 risk (grid overflow at 375px forcing horizontal scroll) is mitigated at the spec layer via `scrollIntoViewIfNeeded()` before the click. The seeded 2-period grid has `minWidth = 200 + 2*80 = 360px`, which fits at 375px without overflow, so the click is geometrically reachable. The blocker is purely the WebKit launch failure.

**Class:** c (environmental) per 10.4-VERIFICATION three-class failure taxonomy — NOT a 10.5-01 regression. Desktop coverage of the same logic is green (`rooms-booking.spec.ts` ROOM-BOOK-01 + ROOM-BOOK-02 both pass).

**Owner:** same testing-infra / OS upgrade follow-up as 10.4 deferred-item (Mobile-375 WebKit Bus-Error-10)
**Tracking:** `.planning/STATE.md` line 416 "mobile-375 5/5 Bus-error-10 = pre-existing WebKit frozen-build environmental blocker, NOT a regression" + 10.4-REGRESSION-REPORT §5.3

---

*Created: 2026-04-22*
*Phase: 10.5-e2e-admin-ops-operations*
*Source: CONTEXT.md D-27 (D-01 Räume-CRUD descope, D-12 Solver-Aktivieren confirm-dialog rejection, CONTEXT.md `<deferred>` item 4 CSV variants, D-09c Imports mobile-optional, 10.5-01 Task 3 empirical mobile-375 gate)*
