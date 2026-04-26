---
phase: quick/260426-eyf
plan: 01
subsystem: web/perspective-list-hooks
tags: [hardening, regression-guard, e2e, vitest, useRooms, pagination, perspective-selector]
dependency-graph:
  requires:
    - useRooms hook unwrap+map fix (commit 1fb7abf, 2026-04-02)
    - useClasses pagination + spec pattern (commit d76b5a3, 2026-04-26)
    - useTeachers pagination + spec pattern (commit 3e9de88, 2026-04-26)
    - admin-timetable-edit-perspective spec scaffold (commit 3045920, 2026-04-26)
    - seedTimetableRun fixture self-provisioning a Room (commit bc298f6, 2026-04-26)
  provides:
    - useRooms regression guard (3 vitest specs)
    - admin-timetable-edit-perspective Räume group assertion
  affects:
    - apps/web/src/hooks/useTimetable.ts (useRooms only)
    - apps/web/src/hooks/__tests__/useTimetable.spec.ts (file-header + new describe)
    - apps/web/e2e/admin-timetable-edit-perspective.spec.ts (header, describe, test name, in-test block)
tech-stack:
  added: []
  patterns:
    - URLSearchParams for query-string assembly (mirrors useClasses/useTeachers)
    - Radix listbox group-filter locator for label-based group navigation
    - Category A audit-taxonomy guard (assert schoolId NOT in query string)
key-files:
  created: []
  modified:
    - apps/web/src/hooks/useTimetable.ts
    - apps/web/src/hooks/__tests__/useTimetable.spec.ts
    - apps/web/e2e/admin-timetable-edit-perspective.spec.ts
key-decisions:
  - Test 2 (paginated envelope unwrap) was expected to fail in RED but already passed because commit 1fb7abf is canonical — the test is now a regression guard locking that fix.
  - Used `prisma migrate deploy` (NOT `prisma db push`) per CLAUDE.md hard rule, even though reference_app_startup memory mentions db push (CLAUDE.md takes precedence).
  - Playwright project is `desktop` (not `desktop-chromium` as the plan said) — verified against playwright.config.ts before running.
metrics:
  duration: ~12 min
  completed: 2026-04-26
---

# Quick Task 260426-eyf: Harden useRooms (pagination params + unit tests + E2E assertion) Summary

**One-liner:** Closed the three deferred hardening items from `.planning/debug/resolved/missing-raeume-perspective.md` by adding `?page=1&limit=500` to the useRooms hook, locking it with a 3-test vitest regression guard mirroring the useClasses/useTeachers pattern, and extending the existing Klassen-perspective E2E spec with a Räume SelectGroup assertion using a group-filter locator (since Room names follow no naming convention).

## Commits Landed

| # | Hash | Type | Subject |
|---|------|------|---------|
| 1 | `cef660d` | fix(web) | useRooms sends pagination params + unit test regression guard |
| 2 | `caaeb59` | test(web) | extend admin-timetable-edit-perspective spec with Räume assertion |

## What Changed

### Task 1 — useRooms hook + 3 unit tests (commit cef660d)

**`apps/web/src/hooks/useTimetable.ts`** — useRooms function:
- Added `const params = new URLSearchParams({ page: '1', limit: '500' })` before the apiFetch call.
- Changed URL from `` `/api/v1/schools/${schoolId}/rooms` `` → `` `/api/v1/schools/${schoolId}/rooms?${params.toString()}` ``.
- Replaced one-liner JSDoc with a multi-paragraph block matching useClasses/useTeachers style. Documents:
  - Route is Category A SAFE — schoolId is a URL path segment.
  - WHY pagination params are sent: backend `PaginationQueryDto.limit` defaults to 20 → silent truncation for >20-room schools.
  - History entries for both 1fb7abf (unwrap+map) and this hardening pass.
- Unwrap+map block (`json.data ?? json` + `.map(...)`) **unchanged** — it remains the canonical fix from commit 1fb7abf and Test 2 deep-equals it.

**`apps/web/src/hooks/__tests__/useTimetable.spec.ts`**:
- File-header docstring updated: removed the disclaimer "useRooms is NOT covered" and added a paragraph explaining the new useRooms coverage is QUANTITATIVE (pagination quantity guard), NOT tenant-isolating (the route already enforces scope via URL path).
- Import: `useClasses, useTeachers` → `useClasses, useRooms, useTeachers`.
- Appended new describe block with 3 tests:
  1. **`sends ?page=1&limit=500 on the GET request (and keeps schoolId in the URL path, NOT as a query param)`** — Asserts URL matches `/api/v1/schools/school-1/rooms?...`, contains `page=1` AND `limit=500`, AND does NOT contain `schoolId=` (Category A taxonomy guard).
  2. **`maps the paginated { data, meta } envelope to EntityOption[]`** — Deep-equals the mapped output. Locks the unwrap+map fix from commit 1fb7abf.
  3. **`does not fire the request when schoolId is undefined`** — Asserts `fetchStatus === 'idle'` and `apiFetchMock` not called.

**Vitest result:** 9 / 9 pass (3 useClasses + 3 useTeachers + 3 useRooms).

### Task 2 — E2E Räume assertion (commit caaeb59)

**`apps/web/e2e/admin-timetable-edit-perspective.spec.ts`**:
- File-header docstring extended with "Background — second guard added 2026-04-26" paragraph and a third bullet under "What this spec asserts".
- `test.describe` name: `Klassen perspective renders (useClasses schoolId fix)` → `Klassen + Räume perspectives render (useClasses schoolId fix + useRooms pagination fix)`.
- `test()` name: `PerspectiveSelector exposes the Klassen group ...` → `PerspectiveSelector exposes the Klassen and Räume groups with at least one option each, and selecting a class renders the grid`.
- Inserted new assertion block between the existing Klassen `seededClass` expectation and the BONUS click-and-verify-grid block. Two assertions:
  1. `dropdown.getByText('Raeume', { exact: true })` is visible — proves the SelectLabel rendered, which proves useRooms returned a non-empty array.
  2. The Raeume SelectGroup contains at least one selectable option — uses `dropdown.locator('[role="group"]').filter({ has: page.getByText('Raeume', { exact: true }) }).getByRole('option').first()`.
- Existing Klassen block + BONUS click-and-verify-grid block left **unchanged**.

**Playwright result:** 1 / 1 passed deterministically across **two consecutive runs** on `--project=desktop` with the full live stack (postgres + redis + keycloak + api + vite).

## Räume E2E Assertion Shape — Why Group-Filter Locator (Not Name-Regex)

The Klassen assertion uses `dropdown.getByRole('option', { name: /^\d+[A-Z]$/ }).first()` because seeded class names follow the Austrian convention (`1A`, `2B`, etc.). Room names have **no such convention** — the `seedTimetableRun` fixture creates a Room with an arbitrary name when the seed school has none (per quick-task 260425-u72 SUMMARY). A name regex would either:
- Be too narrow (miss legitimate fixture-created rooms), or
- Be too broad (match Klassen options by accident — e.g. `name: /.+/` matches everything in the listbox).

The group-filter locator (`listbox > group:has(div:text-is("Raeume")) > [role="option"]`) sidesteps the naming problem by navigating the Radix DOM structure: each `SelectGroup` renders as `role=group` with the `SelectLabel` as a child div. `Locator.filter({ has: ... })` selects only the group whose descendants include the text "Raeume", and we then grab the first `role=option` inside that scoped subtree. This is robust against Room name churn AND against future re-ordering of the SelectGroups in PerspectiveSelector.

## Deferred Items Closed

All three deferred items from `.planning/debug/resolved/missing-raeume-perspective.md` are now closed:

| # | Deferred item | Closed by |
|---|---------------|-----------|
| 1 | useRooms must send `?page=1&limit=500` so >20-room schools aren't truncated | commit cef660d (useTimetable.ts edit + Test 1) |
| 2 | Add unit-test regression guard for useRooms (3-test pattern) | commit cef660d (useTimetable.spec.ts new describe block) |
| 3 | Extend admin-timetable-edit-perspective spec with Räume group assertion | commit caaeb59 (in-test block insertion) |

## Trifecta Complete

This task completes the **perspective-list hooks hardening trifecta** started 2026-04-26:

| Hook | Pagination + spec commit | Bug class | Audit category |
|------|--------------------------|-----------|----------------|
| useClasses | `d76b5a3` (2026-04-26) | Silent UI omission via 404-then-default-[] | A (path-segment was not used; route required `?schoolId=`) |
| useTeachers | `3e9de88` (2026-04-26) | Cross-tenant data leak via Prisma filter-drop | B (silent leak — backend hardening also applied via `d7e1c9d`) |
| useRooms | `cef660d` (this task, 2026-04-26) | Silent UI truncation via PaginationQueryDto.limit=20 | A (route already path-scoped — quantity guard, not isolation guard) |

All three hooks now share the same defense-in-depth shape:
- URLSearchParams-built query string with `page=1` + `limit=500` (where applicable) and `schoolId=...` (only for Category B routes).
- Identical 3-test vitest regression guard structure (URL params, paginated envelope unwrap, no-fetch-when-undefined).
- E2E coverage in `admin-timetable-edit-perspective.spec.ts` for the Klassen + Räume groups (Lehrer is exercised by the sibling `admin-timetable-edit-dnd.spec.ts`).

## Deviations from Plan

### Resolved frictions (Rule 3 - Blocking)

**1. Worktree branch lagged behind main HEAD by ~3 weeks**
- **Found during:** Initial file read (the plan referenced canonical commits like `d76b5a3` and the existing useTimetable.spec.ts that did not exist on the worktree branch).
- **Cause:** The worktree branch `worktree-agent-a611e531` was branched from commit `42ac851` (chore: archive v1.0 MVP milestone), which predates the entire 2026-04-26 hooks-hardening day.
- **Fix:** `git merge --ff-only main` brought the worktree to current HEAD (`73c838b`). Fast-forward only — no new commits introduced, just history catch-up.
- **Plan file:** Plan was created in main but the worktree's `.planning/quick/` was empty. Copied the plan file into the worktree (untracked, not committed).

**2. Shared package dist required `.js` extension post-process**
- **Found during:** First API startup attempt — `Cannot find module '.../packages/shared/dist/constants/roles'` (ESM resolver requires explicit `.js` extension; tsc compiled extensionless imports verbatim).
- **Cause:** Documented in `.github/workflows/playwright.yml` (lines 118-128) and the `feedback_restart_api_after_migration.md` memory.
- **Fix:** Ran the canonical perl one-liner: `find . -name "*.js" -exec perl -i -pe "s{from '(\.\.?/[^']+?)'}{from '\$1.js'}g unless /\.js'/; s{from \"(\.\.?/[^\"]+?)\"}{from \"\$1.js\"}g unless /\.js\"/" {} +` inside `packages/shared/dist`.

**3. API needs explicit env vars when launched outside docker**
- **Found during:** Second API startup attempt — `TypeError: Configuration key "VAPID_PUBLIC_KEY" does not exist` (local launch doesn't load `.env.example`).
- **Fix:** Inlined dev VAPID keypair from `.github/workflows/playwright.yml:77-79` into the launch command alongside DATABASE_URL/REDIS_URL/etc.

### Plan-vs-reality reconciliations

**A. Test 2 already-passing in RED phase**
- **Plan said:** "confirm Test 1 + Test 2 FAIL (because useRooms still hits the bare path)."
- **Actually:** Only Test 1 failed in RED. Test 2 (paginated envelope unwrap deep-equal) passed immediately because the unwrap+map fix from commit `1fb7abf` (2026-04-02) is already canonical in the codebase.
- **Why this is fine:** Test 2's purpose per the plan's `<behavior>` block is "lock the unwrap+map from commit 1fb7abf so a future revert fails loudly" — i.e., it is a regression guard for an already-fixed bug. The fact that it passes immediately ON the fixed code is exactly what we want; if someone reverts to `return res.json()`, Test 2 will fail.
- **No code change made.** Continued straight to GREEN for Test 1.

**B. Playwright project name**
- **Plan said:** `--project=desktop-chromium` (in multiple places).
- **Actually:** The project is named `desktop` in `apps/web/playwright.config.ts:35`.
- **Followed user constraint:** "or whatever the desktop project name actually is — check playwright.config.ts before running" — used `--project=desktop`.

**C. Database migration command**
- **Plan-context memory said:** Use `prisma db push --accept-data-loss` per `reference_app_startup`.
- **CLAUDE.md hard rule:** "Do not use `prisma db push` on this project. Every change ships as a migration file."
- **Used:** `prisma migrate deploy` (no pending migrations to apply — schema already up to date in the dev DB).

## Threat Flags

None — this task only HARDENS the existing useRooms surface and adds tests. No new endpoints, no new auth paths, no new file access patterns, no schema changes.

## Verification Evidence

```text
# Vitest unit specs (final run, both commits landed)
$ pnpm --filter @schoolflow/web exec vitest run useTimetable
 RUN  v4.1.2 .../apps/web

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  1.07s

# Playwright E2E (twice, deterministic)
$ pnpm exec playwright test e2e/admin-timetable-edit-perspective.spec.ts --project=desktop
Run 1: ✓  1 passed (3.2s)
Run 2: ✓  1 passed (2.4s)

# Type check
$ pnpm exec tsc --noEmit
(no output = clean)
```

## Self-Check: PASSED

All claimed artifacts exist on disk:
- `apps/web/src/hooks/useTimetable.ts` (modified — useRooms now uses URLSearchParams, line 42 + 82+)
- `apps/web/src/hooks/__tests__/useTimetable.spec.ts` (modified — new useRooms describe block)
- `apps/web/e2e/admin-timetable-edit-perspective.spec.ts` (modified — Raeume assertion at line 170)
- `.planning/quick/260426-eyf-harden-userooms-pagination-params-unit-t/260426-eyf-PLAN.md` (untracked, copied from main)
- `.planning/quick/260426-eyf-harden-userooms-pagination-params-unit-t/260426-eyf-SUMMARY.md` (this file)

Both commits exist in `git log`:
- `cef660d` fix(web): useRooms sends pagination params + unit test regression guard
- `caaeb59` test(web): extend admin-timetable-edit-perspective spec with Räume assertion
