# Phase 17.1: CI Stabilization Follow-Up — Scope Draft

**Drafted by:** Plan 17-05 Task 4 (per CONTEXT D-16)
**Trigger:** Smoke-PR `chore/ci-smoke-noop` (PR #9) failed CI on run 25251866945 with a NEW unclassified blocker (TypeScript compile error in `DashboardChecklist.test.tsx`) that bypasses the entire Playwright layer.
**Status:** Draft — to be promoted via `/gsd:plan-phase 17.1` when work begins.

---

## Goal

Make the smoke-PR `chore/ci-smoke-noop` (off main, no-op diff) pass `Run Playwright tests` WITHOUT the `--admin` override. This is the actual CONTEXT D-15 verifier-gate that Phase 17 was meant to deliver but could not, because the smoke-PR surfaced a pre-existing build blocker that hides the E2E layer.

## Scope

### Required (blocks Phase 17.1 done)

1. **Fix the TS compile error in `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx`** (lines 84, 100, 122, 137, 175, 192, 209, 224)
   - Symptom: `error TS2345: Argument of type '{...; status: Q["status"]; ...}' is not assignable to parameter of type 'Partial<Q>'. Types of property 'status' are incompatible.`
   - Likely root cause: TanStack Query v5 type narrowing — when supplying a partial `UseQueryResult` mock with `isSuccess: true`, the type system expects `status: 'success'` (a literal), not the union `Q['status']` (which expands to `'error' | 'pending' | 'success'`). Cast literally per discriminated union variant, or use `as Partial<UseQueryResult>` cast.
   - Owner phase originally: Out-of-scope for Plan 17-03 (touch-target lifts only); deferred.
   - Acceptance: `pnpm --filter @schoolflow/web exec tsc -p tsconfig.app.json --noEmit` returns exit 0.

2. **Verify the Phase 17 worktree branches merge cleanly to main** (orchestrator-owned but verifier-gate depends on it)
   - Worktree branches involved (in order):
     - 17-01: Plan F (md:hidden → sm:hidden in 2 mobile spec files + 3 source files)
     - 17-02: Plan G (WebKit-darwin Bus-Error-10 env-classification, docs-only)
     - 17-03: Plans A+B+C (PageShell breadcrumb 44px + tabs.tsx 44px + radio-group.tsx 44px)
     - 17-04: Plan D (5 admin list-surface DataList migrations + breakpoint conversion)
     - 17-05: Plan E (this plan — sample triage + 30-min sweep + 14 spec files skip-annotated)

3. **Re-run smoke-PR verifier-gate** after (1)+(2)
   - Re-push or re-trigger CI on `chore/ci-smoke-noop` after main absorbs the Phase 17 fixes
   - Expected: GREEN (every PR-#1 baseline red spec is either auto-resolved by Plans F/A/B/C/D OR skip-annotated by Plan E)
   - If RED with NEW failures (not in the deferred-items.md cluster A-F list): document and continue to (4)

### Best-effort (deferred from Phase 17, not required for verifier-gate green)

4. **Cluster A — Phase 14 POST /constraint-templates 422 regression** (5 tests, 3 specs)
   - `admin-solver-tuning-restrictions.spec.ts` (E2E-SOLVER-04, E2E-SOLVER-06)
   - `admin-solver-tuning-preferences.spec.ts` (E2E-SOLVER-07, E2E-SOLVER-09)
   - `admin-solver-tuning-audit.spec.ts` (E2E-SOLVER-11)
   - **Fix path:** Live-stack repro the 422; inspect `r.json().type` URI from `validateCrossReference` (`schoolflow://errors/cross-reference-missing` vs `schoolflow://errors/period-out-of-range`); either fix `seed-class-1a` ID alignment in `apps/api/prisma/seed.ts` OR adjust `apps/web/e2e/helpers/constraints.ts` `params` shape to match the post-Phase-14 DTO contract. Root-cause-once unblocks all 5 tests at once. Phase-14-03 SUMMARY documents these as PASSING at end of Phase 14, so this is a regression introduced between Phase 14 final and PR #1 baseline.

5. **Cluster B — Phase 13 admin-user search fixture regression** (15 tests, 5 specs)
   - `admin-users-list.spec.ts` (5 tests)
   - `admin-user-overrides.spec.ts` (5 tests)
   - `admin-user-permissions.spec.ts` (2 tests)
   - `admin-user-person-link.spec.ts` (3 tests)
   - `admin-user-roles.spec.ts` (4 tests)
   - `admin-user-silent-4xx.spec.ts` (2 tests)
   - **Fix path:** Live-stack repro `GET /admin/users?search=...`; check whether response shape changed (Phase-15.1 seed UUID alignment touched persons; user search joins person.firstName/lastName). Single-fixture-fix likely unblocks the entire cluster. All 6 specs share the same root cause symptom.

6. **Cluster C — Phase 15 audit-log specs** (2 tests)
   - `admin-audit-log-detail.spec.ts:42` (AUDIT-VIEW-02): missing-fixture per CONTEXT D-08 (audit seed rows). Park, OR add a Phase-15-style fixture seeding step to E2E setup.
   - `admin-audit-log-filter.spec.ts:104`: selector strict-mode dual-render — quick `.first()` qualifier OR unique-test-id. <30 min fix.

7. **Cluster D — Phase 10.5 admin-import wizard** (3 tests, 1m timeouts)
   - `admin-import.spec.ts:71/91/116`: Investigate Mantine Stepper render delay or file-upload preview hang.

8. **Cluster E — Phase 04 DnD regression** (1 test)
   - `admin-timetable-edit-dnd.spec.ts:110` REGRESSION-DND-COLLISION: pointer-event timing in headless Playwright.

9. **Cluster F — Phase 10.2 silent-4xx + screenshot** (2 tests)
   - `silent-4xx.spec.ts:43` SILENT-4XX-01: toast-render timing.
   - `screenshots.spec.ts:172` SCHOOL-05: screenshot capture timing (UAT-only, non-blocking).

10. **Pre-existing TS errors deferred from Plan 17-03** — covered by item (1) above.

### Out-of-scope for Phase 17.1

- WebKit-Linux-CI playbook (Plan G's follow-up) — already deferred to Phase 23-Backlog per CONTEXT D-04.
- DataList API polish (column-resizing, sticky-headers) — deferred to Phase 999.x "DataList v2" per CONTEXT.
- Admin sub-surface DataList migration (`*DetailTabs.tsx` + Verfügbarkeits + Stundentafel-Vorlagen) — deferred to a future "admin sub-surface DataList migration" plan (see deferred-items.md "Out-of-scope `md:` breakpoint usages in admin sub-surfaces" section).
- Larger auth-helper refactor (loginAsRole v2 with cleanup) — deferred to Phase 23-Backlog per CONTEXT D-12 close.

## Specs to resolve (canonical list from 17-TRIAGE.md)

Copied from `17-TRIAGE.md` rows classified as `real-bug (deferred — regression-candidate)`, `real-bug (deferred — selector-strict-mode)`, `real-bug (deferred — wizard timeout)`, `real-bug (deferred — DnD timing)`, `real-bug (deferred — screenshot-flake)`, or `missing-fixture` with owner Phase 17.1:

| Cluster | Spec | Tests affected | Owning fix-path item |
|---------|------|----------------|----------------------|
| #cluster-14-422 | `admin-solver-tuning-restrictions.spec.ts` | E2E-SOLVER-04, -06 | (4) |
| #cluster-14-422-preferences | `admin-solver-tuning-preferences.spec.ts` | E2E-SOLVER-07, -09 | (4) |
| #cluster-14-422-audit | `admin-solver-tuning-audit.spec.ts` | E2E-SOLVER-11 | (4) |
| #cluster-13-users-list | `admin-users-list.spec.ts` | USER-01-LIST-01..05 (5) | (5) |
| #cluster-13-overrides | `admin-user-overrides.spec.ts` | USER-04-OVR-01..05 (5) | (5) |
| #cluster-13-permissions | `admin-user-permissions.spec.ts` | USER-03-PERM-01..02 (2) | (5) |
| #cluster-13-person-link | `admin-user-person-link.spec.ts` | USER-05-LINK-01..03 (3) | (5) |
| #cluster-13-roles | `admin-user-roles.spec.ts` | USER-02-ROLES-01..04 (4) | (5) |
| #cluster-13-silent-4xx | `admin-user-silent-4xx.spec.ts` | USER-SILENT-01..02 (2) | (5) |
| #cluster-15-audit-detail | `admin-audit-log-detail.spec.ts:42` | AUDIT-VIEW-02 (1) | (6) |
| #cluster-15-audit-filter | `admin-audit-log-filter.spec.ts:104` | Filter zurücksetzen (1) | (6) |
| #cluster-10.5-import | `admin-import.spec.ts:71/91/116` | IMPORT-UNTIS-01, IMPORT-CSV-01..02 (3) | (7) |
| #cluster-04-dnd | `admin-timetable-edit-dnd.spec.ts:110` | REGRESSION-DND-COLLISION (1) | (8) |
| #cluster-10.2-silent-4xx | `silent-4xx.spec.ts:43` | SILENT-4XX-01 (1) | (9) |
| #cluster-10.2-screenshot-school05 | `screenshots.spec.ts:172` | SCHOOL-05 (1) | (9) |
| (build-blocker) | `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx` | TS2345 × 8 (lines 84/100/122/137/175/192/209/224) | (1) |

**Total deferred test count:** 15 specs / 32 individual tests + 1 build-blocker file with 8 TS errors.

## Success criteria

- [ ] `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx` compiles cleanly (`tsc -b` exit 0)
- [ ] Phase 17 worktree branches merged to main without conflict (orchestrator step)
- [ ] Smoke-PR re-run shows green CI without `--admin` override on a PR off main
- [ ] All previously-deferred specs either fixed or REMOVED from the test suite with documented rationale (cluster-by-cluster decision, not file-by-file)
- [ ] `17-TRIAGE.md` `## Smoke-PR result` section updated with the green-PR run URL + commit hash
- [ ] STATE.md transitions Phase 17 from `done-with-followup` to `complete` after the green re-run

## Triggered by

Smoke-PR `chore/ci-smoke-noop` PR #9 — GitHub Actions run [25251866945](https://github.com/martinvidec/openaustria-school-flow/actions/runs/25251866945) failed at the `Build Web` step (TS compile errors) before Playwright could start. Per CONTEXT D-16: "Wenn nach allen Plans Failures bleiben die NICHT als CI-env-flake klassifizierbar sind → Phase 17.1 spawnt automatisch (kein done-with-workarounds)." The TS-compile-error blocker is NOT a CI-env-flake — it is a regression that must be fixed.

## Requirements

Tech-debt-closure follow-up — keine REQ-IDs.

## Depends on

Phase 17 (Complete with gaps_found; `17-TRIAGE.md`, `deferred-items.md`, and this `PHASE-17.1-SCOPE.md` are the input artifacts).

## Plans

TBD — to be planned via `/gsd:plan-phase 17.1` when work begins. Recommended structure:

- Plan 17.1-01: Fix DashboardChecklist.test.tsx TS errors (single-PR; <1h work; unblocks every CI run going forward).
- Plan 17.1-02: Coordinate orchestrator-merge of 17-01..17-05 worktree branches to main + re-run smoke-PR.
- Plan 17.1-03: Cluster A live-stack repro + fix (Phase 14 POST /constraint-templates 422 — single root cause unblocks 5 tests).
- Plan 17.1-04: Cluster B live-stack repro + fix (Phase 13 admin-user search — single fixture fix unblocks 15 tests).
- Plan 17.1-05: Cluster C+D+E+F mop-up (selector strict-mode `.first()`, wizard timing, DnD pointer timing, audit-fixture seeding).
