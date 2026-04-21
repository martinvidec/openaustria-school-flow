# Phase 10.2 — Deferred Items

Items discovered during plan execution that are out-of-scope for the current
plan and should be triaged in a follow-up phase or infra sweep.

---

## From Plan 10.2-02 (executor run, 2026-04-21)

### 1. WOCH-01 + ZEIT-01 parallel-worker DB race

**Discovered:** Running combined regression `--grep "WOCH-01|ZEIT-01"` on
desktop with Playwright's default 2-worker pool.

**Observed:** ZEIT-01 fails with `getByText(/Aenderungen gespeichert/)`
timeout even though the toast is visible in the post-failure DOM snapshot.

**Root cause:** Both specs mutate the SAME seed school's time-grid (there is
only one school in the seed). When WOCH-01 and ZEIT-01 run in parallel,
their concurrent PUT `/time-grid` calls race each other — one overwrites
the other's in-flight state — which produces timing-dependent toast /
validation glitches. Each spec asserts its own persistence via
`GET /schools/:id` which is strongly consistent, but the in-UI Save toast
can be clobbered by a second PUT that fires while the first toast is still
pending its visibility transition.

**Verification:** `--workers=1` makes both specs pass deterministically
every time:
```bash
pnpm exec playwright test --grep "WOCH-01|ZEIT-01" --project=desktop --workers=1
# → 2 passed
```

**Fix direction (out of scope for 10.2-02 — test-authoring-only plan):**
Options in order of preference:
1. Per-spec test fixture that creates a throwaway school, points all
   mutations at it, and deletes it in afterAll. Would require a
   POST `/schools` + DELETE `/schools/:id` surface and generous admin
   scoping — probably a Phase 10.2 testing-infra follow-up.
2. Make the `playwright.config.ts` desktop project default to
   `workers: 1` — simplest and fastest to ship, but slows the whole
   desktop suite.
3. Serialize WOCH-01 and ZEIT-01 via `test.describe.serial` grouping
   both specs in one file. Cross-file serialization requires a custom
   `test.projects` split.

**Current status:** Both specs green in isolation AND in any `--workers=1`
run. Flaky only under the default parallel pool when paired. The
Tier-1 Wochentage gap-closure goal of 10.2-02 (spec passing against a
running dev stack) is met per the plan's acceptance criterion.

---

## From Plan 10.2-03 (executor run, 2026-04-21)

### 1. Schuljahr edit UI missing (blocks YEAR-01)

**Discovered:** Plan 10.2-03 execution, 2026-04-21

**Evidence:**
- Backend `PATCH /api/v1/schools/:schoolId/school-years/:yearId` endpoint is
  implemented (`apps/api/src/modules/school/school-year.controller.ts:40`).
- Hook `useUpdateSchoolYear` is defined
  (`apps/web/src/hooks/useSchoolYears.ts:43`) but has **zero** call sites in
  `apps/web/src`.
- No `EditSchoolYearDialog.tsx` exists in
  `apps/web/src/components/admin/school-settings/`.
- `SchoolYearCard.tsx` renders only `Aktivieren` + trash-icon `loeschen` — no
  `bearbeiten` button.

**UX impact:** Admin can create / activate / delete school years but cannot
rename or change dates on an existing year. Typos and mid-year corrections
require delete+recreate (plus re-adding all holidays / autonomous days), which
is destructive and forbidden once any `SchoolClass` or `TeachingReduction`
references the year (D-10 orphan-guard — 409).

**Recommended path:** A dedicated plan (candidate `10.2-03b` if a follow-up
wave is preferred, or backlog v1.2) that:
  1. Adds `EditSchoolYearDialog` mirroring `CreateSchoolYearDialog`.
  2. Wires a `bearbeiten` button in `SchoolYearCard` with aria-label
     `Schuljahr <name> bearbeiten`.
  3. Adds success toast `Schuljahr aktualisiert.` to
     `useUpdateSchoolYear.onSuccess` (currently silent).
  4. Lands the YEAR-01 E2E test from the original 10.2-03 plan draft.

Estimated effort: ~90 min.

**Current coverage gap:** Phase 10.2 Tier 1 goal "Schuljahre
edit/delete/activate-switch have each Playwright spec" is at **2 of 3**
(delete + activate landed in 10.2-03; edit deferred). UAT-ban policy is not
fully satisfied for this surface until YEAR-01 lands.

---

### 2. `POST /school-years` with `isActive: true` returns 500 when another active year exists

**Discovered:** Plan 10.2-03 YEAR-03 first-pass — the original plan draft had
the test create a new year with `Als aktives Schuljahr setzen` ON and assert
the expected atomic demote. Instead the POST returned HTTP 500.

**Evidence:**
```bash
POST /api/v1/schools/seed-school-bgbrg-musterstadt/school-years
body: { "name": "E2E-API-TEST-ACTIVE", ..., "isActive": true }
→  HTTP 500  "Ein unerwarteter Fehler ist aufgetreten."
```

**Root cause:**
`SchoolYearService.create` at
`apps/api/src/modules/school/school-year.service.ts:11` does a plain
`prisma.schoolYear.create({ data: { ... isActive: true ... } })` without
demoting the currently-active year first. The schema's partial-unique index
`school_years_active_per_school` (one `isActive=true` per `schoolId`) then
fires a Prisma unique-constraint violation, which the ProblemDetailsFilter
surfaces as a bare 500.

Compare to `SchoolYearService.activate` at
`apps/api/src/modules/school/school-year.service.ts:74` which **does** handle
the demote inside a `$transaction`.

**Effect on the test surface:**
- Original SCHOOL-03 in `admin-school-settings.spec.ts` (Phase 10-06) was
  drafted when the seed had no active year and passed. Now that the seed
  includes an active `2025/2026`, SCHOOL-03 fails deterministically with the
  same 500 — a **pre-existing regression** flushed out while running the
  combined regression for 10.2-03.
- 10.2-03 YEAR-03 is authored around the bug by creating the throwaway year
  inactive and then activating via the dedicated `Aktivieren` button — which
  is the admin's daily workflow anyway.

**Fix direction (out of scope for 10.2-03 — test-authoring-only plan):**
Mirror `activate`'s transaction pattern in `create`. When `isActive === true`,
demote sibling active years inside the same `$transaction` before inserting
the new row. Pseudocode:

```ts
return this.prisma.$transaction(async (tx) => {
  if (dto.isActive) {
    await tx.schoolYear.updateMany({
      where: { schoolId, isActive: true },
      data: { isActive: false },
    });
  }
  return tx.schoolYear.create({ data: { schoolId, ..., isActive: !!dto.isActive } });
});
```

**Regression coverage:** a follow-up plan should also fix SCHOOL-03 (it will
start passing once the backend is fixed) and add a backend-level spec
asserting the atomic demote on create-with-active. A UAT-ban ticket for this
line of the admin flow.

---

### 3. SCHOOL-05 Prisma client init failure in Playwright parallel workers

**Discovered:** Running combined regression
`--grep "SCHOOL-03|SCHOOL-05|YEAR-"` under Playwright's default 2-worker mode.

**Evidence:**
```
PrismaClientInitializationError: `PrismaClient` needs to be constructed with
a non-empty, valid `PrismaClientOptions`:
    new PrismaClient({ ... })
```
Thrown at `apps/web/e2e/fixtures/orphan-year.ts:40` — the `new PrismaClient()`
zero-arg call.

**Context:**
- Single-worker runs **also fail** (verified `--workers=1`) — so this is NOT
  a parallel-workers issue as first suspected.
- Prisma 7 may have tightened the "DATABASE_URL auto-discovery" path when the
  CJS client is loaded via `createRequire` from the web package (the API
  package's `.env` isn't on the web-package resolution path).
- The fixture relies on the DATABASE_URL env var being inherited into the
  Node worker's `process.env`. That inheritance appears to be broken post-
  Prisma-7 (our Prisma is 7.6.0, pinned in `package.json`).

**Fix direction (out of scope for 10.2-03):**
Pass `datasources: { db: { url: process.env.DATABASE_URL } }` explicitly in
the `new PrismaClient()` call inside `orphan-year.ts`, or add a guard that
loads `apps/api/.env` via `dotenv` before instantiation. Belongs to the same
testing-infra sweep as deferred #1 from Plan 10.2-01 (WebKit crash +
`storageState` auth-setup).

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

**Update after Plan 10.2-02 (2026-04-21):** The Phase 10.2-02 TimeGridTab
UX promotion replaced the `<Label>` with an `<h3>` and kept the Card
subtitle paragraph ("Unterrichtstage, Perioden und Pausen dieser Schule"
— pre-existing) untouched. SCHOOL-02's `getByText('Unterrichtstage')`
now matches {h3 heading, paragraph subtitle} — strict-mode violation
persists for a slightly different reason (subtitle instead of tab label).
The recommended fix is now `page.getByRole('heading', { name:
'Unterrichtstage' })` which targets the section h3 unambiguously. Even
with that fix SCHOOL-02 would still fail later on the empty-schoolDays
"Mindestens ein Unterrichtstag erforderlich" validation because
`GET /time-grid` is 404 (deferred item #2 above) — SCHOOL-02 is a
pre-existing failure that needs BOTH fixes to go green, and was out of
scope for both 10.2-01 and 10.2-02 (test-authoring-only plans).
