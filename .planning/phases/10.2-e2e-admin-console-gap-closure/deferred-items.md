# Phase 10.2 — Deferred Items

Items discovered during plan execution that are out-of-scope for the current
plan and should be triaged in a follow-up phase or infra sweep.

---

## From Plan 10.2-01 (executor run, 2026-04-21)

### 1. WebKit / mobile-375 project crashes on macOS 14.3 (infrastructure)

**Discovered:** Executing `pnpm exec playwright test --project=mobile-375 ...`
after a fresh `pnpm exec playwright install webkit`.

**Observed:**
```
[pid=...][err] ... Bus error: 10   DYLD_FRAMEWORK_PATH="$DYLIB_PATH" ...
```

**Root cause:** Playwright 1.59's "frozen" WebKit build (`webkit v2251`,
tagged `mac14_arm64_special`) is built for a newer macOS; on macOS 14.3
the dyld cache layout is incompatible and the process segfaults at launch.
Playwright surfaces the warning at install time:

> You are using a frozen webkit browser which does not receive updates
> anymore on mac14-arm64. Please update to the latest version of your
> operating system to test up-to-date browsers.

**Effect on Plan 10.2-01:**
- `apps/web/e2e/zeitraster.mobile.spec.ts` was authored per the plan and
  typechecks cleanly, but cannot be executed locally on this dev box.
- The existing `admin-school-settings.mobile.spec.ts` (from Plan 10-06) is
  affected by the exact same crash, so this is not a regression introduced
  by this plan.

**Fix options (out of scope here):**
1. Upgrade the dev macOS to 14.7+ or 15.x so the frozen WebKit runs.
2. Switch the `mobile-375` project in `apps/web/playwright.config.ts` from
   the iPhone 13 / WebKit device to Chromium with a mobile viewport
   (`devices['Pixel 7']` or a custom `{ browserName: 'chromium', viewport,
   userAgent }`). Chromium 1217 is already installed and works.
3. CI: run mobile tests only in GitHub Actions where ubuntu + Playwright's
   Linux webkit build is stable.

**Recommended home:** a dedicated testing-infra follow-up (co-located with
the `storageState` auth-setup work noted in 10-06-SUMMARY.md "Auth in
tests"). Do both at once.

---

### 2. `GET /api/v1/schools/:schoolId/time-grid` is not implemented

**Discovered:** While authoring ZEIT-01 persistence check.

**Observed:**
- `useTimeGrid(schoolId)` in `apps/web/src/hooks/useTimeGrid.ts` hits
  `GET /api/v1/schools/:schoolId/time-grid` and swallows the 404 to return
  `null`.
- The `SchoolTimeGridController` at
  `apps/api/src/modules/school/school-time-grid.controller.ts:9` declares
  only a `@Put()`. No corresponding GET handler exists.

**Effect:**
- TimeGridTab's hydration effect (`useEffect([tgQuery.data])`) never fires
  on real data — the table is always empty on initial load.
- The actual persisted time-grid is reachable via the embedded
  `school.timeGrid` field on `GET /api/v1/schools/:schoolId`, which is how
  ZEIT-01 verifies persistence in this plan.
- ZEIT-01 was originally drafted to reload the page and inspect the
  hydrated UI; the missing GET forced a rewrite to assert persistence at
  the API layer instead. The UI behaviour (PUT succeeds, green toast) is
  still exercised — the GET/hydration path just isn't verifiable through
  the UI until this endpoint ships.

**Fix:** Add a `@Get()` on `SchoolTimeGridController` that returns the
current grid (or 404 with problem-details for "no grid yet"). Update
`useTimeGrid` to stop swallowing 404 and treat it as "empty form".

**Scope:** Belongs to a Plan 10 follow-up or Phase 11 groundwork — the
current plan (10.2-01) is E2E coverage, not API surface work.

---

### 3. SCHOOL-02 strict-mode violation — `getByText('Unterrichtstage')`

**Discovered:** First ZEIT-01 pass surfaced the same duplicate-match issue
noted in the prior executor's breadcrumb.

**Where:** `apps/web/e2e/admin-school-settings.spec.ts` SCHOOL-02 uses
`page.getByText('Unterrichtstage')` which matches two elements (the tab
label "Unterrichtstage" in the TabsList and the `<Label>` in the form
body). In Playwright's default strict mode this will error.

**Workaround in the new specs:** both `zeitraster.spec.ts` (ZEIT-01 /
ZEIT-02) and `zeitraster.mobile.spec.ts` use `page.getByText(
'Unterrichtstage', { exact: true })` to pin to the Label-only match.

**Fix:** update SCHOOL-02 to use `{ exact: true }` too. Trivial one-line
edit; belongs to a follow-up admin-school-settings tidy plan, NOT to
10.2-01.
