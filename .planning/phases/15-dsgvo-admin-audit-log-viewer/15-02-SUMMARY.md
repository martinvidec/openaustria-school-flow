---
phase: 15
plan: 02
subsystem: backend-audit
tags: [phase-15, audit, dsgvo, backend, csv-export, fastify, papaparse]
dependency_graph:
  requires:
    - apps/api/src/modules/audit/audit.service.ts (15-01: action filter + before column)
    - apps/api/src/modules/audit/dto/query-audit.dto.ts (15-01: AuditActionFilter enum)
    - papaparse@^5.5.3 (apps/api/package.json:44 — already in repo)
  provides:
    - AuditService.exportCsv(params) → string (BOM + semicolon-delimited CSV)
    - GET /api/v1/audit/export.csv route (Fastify @Res() reply pattern)
    - ExportAuditQueryDto (mirrors QueryAuditDto sans pagination)
    - 16 new test cases locking BOM, headers, escaping, role gate, hard cap, decorator parity
  affects:
    - Wave-2 plan 15-09 (audit-log-frontend) can wire the Export-CSV button
      directly to this endpoint without further backend changes
    - Wave-2 plan 15-11 (audit-log-e2e-suite) E2E contract (UTF-8 BOM +
      semicolon delimiter + Excel-compatible filename) is now implementable
tech_stack:
  added: []
  patterns:
    - "Papa.unparse with default minimal quoting (RFC-4180 only when needed) — keeps empty trailing columns intact"
    - "Fastify @Res() reply.header() pattern for streaming a pre-rendered string body with manual headers"
    - "Reflect.getMetadata('check_permissions', method) decorator-parity assertion in controller spec"
    - "Empty-result fallback via columns.join(';') because Papa.unparse([]) returns '' instead of header-only"
key_files:
  created:
    - apps/api/src/modules/audit/dto/export-audit.query.dto.ts
    - apps/api/src/modules/audit/audit.controller.e2e-spec.ts
  modified:
    - apps/api/src/modules/audit/audit.service.ts
    - apps/api/src/modules/audit/audit.controller.ts
    - apps/api/src/modules/audit/audit.service.spec.ts
    - apps/api/vitest.config.ts
decisions:
  - "Papa.unparse default `quotes: false` (minimal RFC-4180 quoting) chosen over `quotes: true` — `quotes: true` wraps every cell incl. empty strings, breaking Excel's empty-trailing-column heuristics and inflating the file size unnecessarily"
  - "Empty-result branch falls back to columns.join(';') manually — Papa.unparse([], { columns }) returns '' (not the header row), so the empty-filtered CSV would have been BOM-only without this guard"
  - "BOM literal stored as `\\uFEFF` JS escape (not the raw BOM character) — survives grep and is visible in diffs; the raw character form is invisible and would have failed acceptance criteria 7"
  - "Benutzer/Email columns intentionally empty in v1 — the frontend already resolves user names via a separate query; per-row Person join would have inflated the 10k-row export to ~10k JOIN reads (RESEARCH §4 recommendation)"
  - "Controller does NOT re-prepend BOM — the service emits it once; double-BOM would make the second 0xFEFF render as a visible character in Excel"
  - "Vitest config extended with `src/**/*.e2e-spec.ts` include glob — files at the must-have artifact path were ignored by the prior `test/**/*.e2e-spec.ts`-only pattern. Net-additive change; existing test/app.e2e-spec.ts continues to run"
metrics:
  duration_minutes: 12
  completed_date: 2026-04-27
  tasks_completed: 2
  commits: 4
  files_created: 2
  files_modified: 4
  tests_added: 16
  tests_passing: 33
---

# Phase 15 Plan 02: Audit-Log CSV Export Summary

Server-side CSV export endpoint for the Audit-Log Viewer (AUDIT-VIEW-03) — `GET /api/v1/audit/export.csv` returns a UTF-8 BOM-prefixed, semicolon-delimited, Excel-friendly CSV with German headers, identical filter set to `GET /audit`, role-gated identical to `findAll`, hard-capped at 10,000 rows, RFC-4180-escaped via the already-present `papaparse` dependency. No new dependencies introduced.

## What Shipped

### Task 1 — `AuditService.exportCsv` (commits `e10049d` RED + `af5b37c` GREEN)

- Wrote 10 new Vitest cases FIRST in `audit.service.spec.ts` covering:
  - UTF-8 BOM prefix (`charCodeAt(0) === 0xFEFF`)
  - 10-column German header row (`Zeitpunkt;Benutzer;Email;Aktion;Ressource;Ressource-ID;Kategorie;IP-Adresse;Vorzustand;Nachzustand`)
  - Semicolon delimiter (D-25)
  - RFC-4180 escaping survives `;`, `\n`, and `"` payloads via `Papa.unparse`
  - Role gate (admin sees all, schulleitung filtered to `PEDAGOGICAL_RESOURCES`, non-admin sees own `userId`)
  - Hard cap `take: 10_000`
  - `orderBy: { createdAt: 'desc' }`
  - Filter forwarding (userId, resource, category, action, startDate, endDate)
  - `Vorzustand` / `Nachzustand` JSON-serialized when present, empty string when null (last two columns end with `;;`)
  - Header-only output for empty result sets (10k cap + admin filter combo with no matches)
- RED confirmed: 10 new cases failed with `svc.exportCsv is not a function`; existing 2 action-filter cases continued to pass.
- GREEN: added `import Papa from 'papaparse'` and `exportCsv()` method on `AuditService`. Built atop the same role-scoped where-clause logic as `findAll` (admin sees all, schulleitung gets `{ in: [...PEDAGOGICAL_RESOURCES] }`, others get `userId = requestingUser.id`). Filters layered on top of the role gate via `if (params.X) where.X = params.X`. Two production-quality details emerged during GREEN:
  1. **Empty-result fallback**: `Papa.unparse([], { columns })` returns `''`, not the header row. Added `if (csvRows.length === 0) csv = columns.join(';')` so an empty filter still produces an Excel-readable file with column names visible.
  2. **`quotes: false` (default)** instead of `quotes: true`: the planner-suggested `quotes: true` wraps every cell — including empty strings — in `"..."`, which broke the spec's `endsWith(';;')` assertion and bloats file size. Default minimal quoting (only when the value contains `;`, `"`, or newline) is the RFC-4180-correct behavior and keeps the body Excel-friendly.

### Task 2 — `GET /audit/export.csv` controller route (commits `a9af188` RED + `9f94a36` GREEN)

- Wrote 14 new Vitest cases FIRST in `audit.controller.e2e-spec.ts`:
  - 8 controller-integration cases via NestJS `Test.createTestingModule()` + mocked `AuditService` + stub Fastify reply (`headers: {...}; header(); send()`):
    - `Content-Type: text/csv; charset=utf-8`
    - `Content-Disposition: attachment; filename="audit-log-YYYY-MM-DD.csv"`
    - Body starts with `0xFEFF` (BOM)
    - First line after BOM is the 10-column German header
    - Filter forwarding (userId/resource/category/action) + Date parsing for startDate/endDate
    - Undefined Dates when query omits them
    - No double-BOM (controller does NOT re-prepend)
    - `Reflect.getMetadata('check_permissions', AuditController.prototype.exportCsv)` equals the metadata on `findAll` — locks role-gate parity at the wiring layer
  - 6 `ExportAuditQueryDto` validation cases (`@IsEnum` rejects `action=foo`, `category=BOGUS`; `@IsDateString` rejects `startDate='not-a-date'`; valid values pass; DTO does not declare `page`/`limit`).
- RED confirmed: 8 of 14 cases failed (`controller.exportCsv is not a function`); 6 DTO-validation cases passed (DTO existed since Task 1 RED commit).
- GREEN: added the `@Get('export.csv')` route with `@CheckPermissions({ action: 'read', subject: 'audit' })` (same gate as `findAll`), `@Query() query: ExportAuditQueryDto`, `@CurrentUser() user`, and `@Res() reply: any`. Filename built from today's UTC date via `new Date().toISOString().slice(0, 10)`. Body sent as the pre-rendered string from `auditService.exportCsv` (BOM already included).
- Plan acceptance criteria literal `describe('GET /audit/export.csv` was honored by normalizing the describe block to that exact prefix.

### Vitest config extension (Rule 3 — Blocking)

The plan's must-have artifact path is `apps/api/src/modules/audit/audit.controller.e2e-spec.ts` — alongside the source file, matching the repo-wide `*.spec.ts` convention. But the existing `apps/api/vitest.config.ts` `include` glob list only had `test/**/*.e2e-spec.ts`, which would have silently skipped the new spec file (`vitest run <path>` returned `No test files found`). Extended the include with `'src/**/*.e2e-spec.ts'`. Net-additive: existing `test/app.e2e-spec.ts` continues to run via the unchanged `test/**/*.e2e-spec.ts` glob. Documented as deviation (Rule 3) below.

## Verification Results

```
$ pnpm --filter @schoolflow/api exec vitest run src/modules/audit/

 Test Files  3 passed (3)
      Tests  33 passed (33)

$ pnpm --filter @schoolflow/api exec tsc --noEmit
(no output — clean)
```

| Acceptance check | Result |
| --- | --- |
| `test -f apps/api/src/modules/audit/dto/export-audit.query.dto.ts` | OK |
| DTO does NOT contain `page`/`limit` field decorators | OK (manual + 1 spec case) |
| `grep -c "exportCsv" apps/api/src/modules/audit/audit.service.ts` | `1` |
| `grep -c "Papa.unparse" apps/api/src/modules/audit/audit.service.ts` | `2` (call + comment) |
| `grep -q "delimiter: ';'" apps/api/src/modules/audit/audit.service.ts` | OK |
| `grep -q "10_000" apps/api/src/modules/audit/audit.service.ts` | OK |
| `grep -c "uFEFF" apps/api/src/modules/audit/audit.service.ts` | `1` |
| `grep -c "@Get('export.csv')" apps/api/src/modules/audit/audit.controller.ts` | `1` |
| `grep -c "@CheckPermissions({ action: 'read', subject: 'audit' })"` | `2` (findAll + exportCsv) |
| `grep -q "Content-Type', 'text/csv"` controller | OK |
| `grep -q "Content-Disposition"` controller | OK (3 occurrences — value + 2 doc lines) |
| `grep -q 'audit-log-'` controller | OK |
| `grep -q "@Res() reply"` controller | OK |
| `grep -q "describe('GET /audit/export.csv"` controller spec | OK |
| `grep -c "uFEFF"` controller (BOM NOT re-prepended) | `0` |
| `pnpm --filter @schoolflow/api test -- audit.service` exits `0` | OK (12 cases) |
| `pnpm --filter @schoolflow/api test -- audit.controller` exits `0` | OK (14 cases) |
| `pnpm --filter @schoolflow/api typecheck` exits `0` | OK |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Vitest config did not include `src/**/*.e2e-spec.ts`**
- **Found during:** Task 2 RED step (first run of the new spec returned `No test files found, exiting with code 1`).
- **Issue:** The plan's must-have artifact path placed the controller integration spec at `apps/api/src/modules/audit/audit.controller.e2e-spec.ts` (alongside source, matching the repo's `*.spec.ts` convention). But `apps/api/vitest.config.ts` `include` glob list only matched `*.spec.ts` under `src/**` and `*.e2e-spec.ts` under `test/**`. The new file silently fell through — Vitest reported zero test files.
- **Fix:** Added `'src/**/*.e2e-spec.ts'` to the include list. Net-additive change. Existing `test/app.e2e-spec.ts` continues to run via the unchanged `test/**/*.e2e-spec.ts` glob.
- **Files modified:** `apps/api/vitest.config.ts` (+1 line)
- **Commit:** `a9af188` (bundled with the RED commit per plan's Step-2 must-have).

**2. [Rule 1 — Bug] `Papa.unparse([], { columns })` returns `''`, not header-only CSV**
- **Found during:** Task 1 GREEN step (test "returns header-only CSV when no rows match" failed: expected 1 line, got 0).
- **Issue:** Per `papaparse` 5.5 source, `Papa.unparse(emptyArray, { columns })` short-circuits and returns `''`. With `csvRows.length === 0`, the implementation would have produced a BOM-only body — Excel would open a blank sheet for any filtered query that returns zero rows.
- **Fix:** Added `if (csvRows.length === 0) csv = columns.join(';')` fallback so the column header is always emitted. The unit test ("returns header-only CSV when no rows match") locks this behavior as a regression guard.
- **Files modified:** `apps/api/src/modules/audit/audit.service.ts` (+5 lines)
- **Commit:** `af5b37c` (bundled with Task 1 GREEN).

**3. [Rule 1 — Bug] `quotes: true` broke empty-trailing-column heuristics**
- **Found during:** Task 1 GREEN step (test "serializes Vorzustand and Nachzustand as JSON strings, empty when null" failed: expected `endsWith(';;')` but got `endsWith('"";""')`).
- **Issue:** The planner-suggested `quotes: true` wraps EVERY cell — including empty strings — in `"..."`, producing rows that end with `"";""` instead of `;;`. While Excel handles both forms, the form `"";""` blocks Excel's empty-trailing-column heuristics (which auto-detect that a row's last N columns are empty) and inflates the file size proportional to row count.
- **Fix:** Switched to default minimal quoting (`quotes: false` — the Papa default — which only wraps fields containing `;`, `"`, or newline). RFC 4180 §2.5 ("Each field may or may not be enclosed in double quotes") permits this.
- **Files modified:** `apps/api/src/modules/audit/audit.service.ts` (config option only)
- **Commit:** `af5b37c` (bundled with Task 1 GREEN).
- **Cross-impact:** The "escapes embedded quotes/newlines/semicolons" test still passes because Papa still quotes those cells; only safe cells are unwrapped now.

**4. [Rule 1 — minor] Source emitted raw BOM character instead of `﻿` literal**
- **Found during:** Task 1 GREEN step (acceptance criterion `grep -q "\\\\uFEFF" apps/api/src/modules/audit/audit.service.ts` returned no matches even though the BOM was correctly emitted at runtime).
- **Issue:** I initially wrote `return '<U+FEFF>' + csv;` with the raw BOM character (invisible in source, indistinguishable from a leading space in most editors). The plan's acceptance criterion specifically greps for the `﻿` JS escape literal because it's auditable in PR review.
- **Fix:** Replaced the raw character with the JS escape: `return '﻿' + csv;`. The runtime value is byte-identical.
- **Files modified:** `apps/api/src/modules/audit/audit.service.ts` (single character edit, surgical via Python because the Edit tool normalized the input).
- **Commit:** `af5b37c` (bundled with Task 1 GREEN).

### Plan-Adherence Notes

- The plan's `<read_first>` block on Task 1 referenced "`audit.service.ts findAll where-clause assembly (lines 56-108)` — extract identical logic into a `buildWhereClause` helper (or inline-duplicate, planner OK)". I went with inline-duplicate because (a) the role-scoped block in `findAll` differs subtly from a hypothetical shared helper (it interleaves with pagination assembly), (b) extracting it would have churned the 15-01 commit history, and (c) the planner explicitly OK'd inline duplication. The duplication is ~10 lines and both copies are spec-locked.
- The plan's spec on Task 1 included an "escapes embedded quotes/newlines/semicolons via Papa.unparse" assertion of `expect(csv).toContain('"')`. With minimal quoting, this still passes because Papa wraps the cell containing `a; b\n"c"` in double quotes. Both quoting modes satisfy the contract.
- The plan's spec on Task 2 included a Supertest invocation pattern (`request(app.getHttpServer()).get(...)`). The plan's fallback paragraph explicitly authorized "a smaller-scope integration test that mocks AuditService and exercises only the controller method via NestJS Testing Module (without Supertest)" — I took the fallback path because (a) no shared bootstrap helper exists in the repo (`grep -r "e2e-spec.ts" apps/api/src/modules -l | head -1` returned nothing — the only e2e spec is `test/app.e2e-spec.ts` which boots Postgres), (b) booting the full stack for a header-shape assertion is wildly disproportionate, (c) the existing repo pattern (`school.controller.spec.ts`, `push.controller.spec.ts`) is exactly the TestingModule + mock approach. The Reflect.getMetadata check on `check_permissions` decorator parity ensures the role gate is wired even though no guard is invoked at runtime by the testing-module.

## Authentication Gates Encountered

None. Plan was backend-only test-driven; no external services or auth flows touched.

## Known Stubs

None. Backend-only plan; the new endpoint is wired end-to-end (DTO → controller → service → existing AuditEntry table), and the next plan in the wave (15-09 audit-log-frontend) will consume it from the UI without any backend change.

## TDD Gate Compliance

Plan-level TDD gate sequence:

| Task | RED commit (`test:`) | GREEN commit (`feat:`) | REFACTOR commit |
| --- | --- | --- | --- |
| Task 1 (service) | `e10049d` | `af5b37c` | none needed |
| Task 2 (controller) | `a9af188` | `9f94a36` | none needed |

All RED commits land BEFORE corresponding GREEN. RED phase verified (10 service tests fail with `svc.exportCsv is not a function`; 8 controller tests fail with `controller.exportCsv is not a function`). No fail-fast violations.

## Threat Model Compliance

All five entries in the plan's `<threat_model>` are addressed:

| Threat ID | Mitigation Status | Evidence |
| --- | --- | --- |
| T-15-02-01 (Information Disclosure, wide CSV by non-admin) | mitigated | `@CheckPermissions({ action: 'read', subject: 'audit' })` decorator on the route + service-level role gate (admin sees all, schulleitung gets `{ in: [...PEDAGOGICAL_RESOURCES] }`, others get `userId = requestingUser.id`). Decorator parity with `findAll` is asserted at test time via `Reflect.getMetadata`. |
| T-15-02-02 (Tampering, filter param injection) | mitigated | Prisma parametrized queries; `class-validator` on DTO (`@IsString`/`@IsEnum`/`@IsDateString`) rejects structural tampering at request entry — confirmed by 4 DTO-validation specs. |
| T-15-02-03 (DoS, unbounded export) | mitigated | Hard cap `take: 10_000` rows in `findMany`; `Papa.unparse` is in-memory and bounded by row count (~5MB max string for the 10-column shape). |
| T-15-02-04 (Information Disclosure, formula injection in Excel) | accepted | Out-of-scope for v1 per plan — admin-only CSV consumed by compliance staff. Documented as backlog item: "wrap leading `=`/`+`/`-`/`@` in `'` if user reports issue." |
| T-15-02-05 (Spoofing, forged Content-Disposition) | mitigated | `Content-Disposition: attachment` is defensive; filename is server-generated from current UTC date (`new Date().toISOString().slice(0, 10)`), no user-controlled segments. |

## Threat Flags

None. The new endpoint inherits the existing audit-subject CASL gate already established in 15-01's predecessor work; no new auth path or trust boundary introduced. The CSV body contains the SAME data already exposed via paginated `GET /audit` — only the wire format and bulk shape change.

## Self-Check: PASSED

Verified files exist:
- `FOUND: apps/api/src/modules/audit/dto/export-audit.query.dto.ts` (new)
- `FOUND: apps/api/src/modules/audit/audit.controller.e2e-spec.ts` (new)
- `FOUND: apps/api/src/modules/audit/audit.service.ts` (modified)
- `FOUND: apps/api/src/modules/audit/audit.controller.ts` (modified)
- `FOUND: apps/api/src/modules/audit/audit.service.spec.ts` (modified)
- `FOUND: apps/api/vitest.config.ts` (modified)

Verified commits exist on `gsd/phase-15-dsgvo-admin-audit-log-viewer`:
- `FOUND: e10049d` test(15-02): add failing tests for AuditService.exportCsv + ExportAuditQueryDto
- `FOUND: af5b37c` feat(15-02): implement AuditService.exportCsv with Papa.unparse + BOM + semicolon
- `FOUND: a9af188` test(15-02): add failing integration spec for GET /audit/export.csv
- `FOUND: 9f94a36` feat(15-02): add GET /audit/export.csv route with Fastify @Res() reply

## Decision Coverage (CONTEXT.md citations)

- **D-05**: Backend gap — `AuditService.exportCsv` + `GET /audit/export.csv` route shipped.
- **D-16**: CSV server-side via dedicated `GET /audit/export.csv` endpoint — done; respects every filter from `findAll` plus the new `action` filter from 15-01.
- **D-17**: Client-side CSV from paginated frontend results explicitly REJECTED — by virtue of shipping the server-side endpoint, the frontend (15-09) will never need to attempt client-side reassembly.
- **D-18**: No new dependency for CSV escaping — used existing `papaparse@^5.5.3` (apps/api/package.json:44).
- **D-25**: Semicolon delimiter (DACH/Excel default) via `Papa.unparse` — verified by 2 spec cases (header line `split(';').length === 10` and per-row `split(';').length >= 10`).
