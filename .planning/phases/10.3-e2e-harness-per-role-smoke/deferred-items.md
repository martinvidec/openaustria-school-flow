# Phase 10.3 — Deferred Items

Issues discovered during execution that are **out of scope** for the
current plan per the Scope Boundary rule
(`Only auto-fix issues DIRECTLY caused by the current task's changes`).

---

## 1. `admin-school-settings.spec.ts` — 3 pre-existing failures (SCHOOL-02, SCHOOL-03, SCHOOL-05)

**Found during:** 10.3-01 Task 3 regression run.

**Confirmed pre-existing:** `git stash` + re-run on the 10.2-era helper reproduced
the same 3 failures, 1:1. The 10.3-01 refactor introduced **zero new failures**.

### 1a. SCHOOL-02: `strict mode violation: getByText('Unterrichtstage') resolved to 2 elements`

- Root cause: Plan **10.2-02** promoted the `<Label>Unterrichtstage</Label>` to an
  `<h3>` and added an explanatory `<p class="text-muted-foreground mb-6">Unterrichtstage, Perioden und Pausen dieser Schul…</p>`
  paragraph that also contains the substring.
- SCHOOL-02 was not updated in 10.2-02 (WOCH-01 got the new locator, SCHOOL-02 was not touched).
- Fix (future plan): replace `page.getByText('Unterrichtstage')` with
  `page.getByRole('heading', { name: 'Unterrichtstage' })`.
- Severity: spec-only, no production impact.

### 1b. SCHOOL-03: `getByText(/Schuljahr angelegt/)` toast never appears

- Root cause: related to 10.2-03 deferred item #2 — `POST /school-years`
  with `isActive: true` returns 500 when another active year exists.
  The YEAR-01 edit / activate-on-create paths were explicitly documented
  as broken at 10.2-03 shipping time (see `10.2-03` decision in STATE.md).
- Fix (future plan): atomic demote inside `SchoolYearService.create` so
  creating a new isActive year deactivates the current one in the same
  transaction. Tracked in `10.2-03` deferred-items.md.
- Severity: backend bug, pre-10.3.

### 1c. SCHOOL-05: `PrismaClientInitializationError`

- Root cause: `apps/web/e2e/fixtures/orphan-year.ts:40` constructs
  `new PrismaClient()` directly, relying on `DATABASE_URL` being present
  in the Playwright runner env. The env is correctly exported at shell
  level (`source .env`) but Playwright worker subprocesses drop it on
  macOS in some configurations.
- Fix (future plan): explicit `new PrismaClient({ datasources: { db: { url: ... }}})`
  or `dotenv` load inside the fixture, per prisma.config.ts pattern.
- Severity: fixture wiring, pre-10.3.

**Decision:** All three failures existed at the 10.2 baseline and are
not caused by 10.3-01. Plan 10.3-01 does NOT block on them — 16/19 desktop
specs remain green, including every spec the login helper touches
(SCHOOL-01, SCREENSHOT SCHOOL-01, ZEIT-01/02, YEAR-02/03, WOCH-01,
SILENT-4XX-01..04, other screenshot captures).

Tracked for a dedicated spec-hygiene follow-up (likely in the tail
of Phase 10.2 or as part of Phase 10.4 harness hardening).
