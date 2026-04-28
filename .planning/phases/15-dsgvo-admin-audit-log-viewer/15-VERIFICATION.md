---
phase: 15-dsgvo-admin-audit-log-viewer
verified: 2026-04-28T10:15:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Admin kann Audit-Log durchsuchen (Actor, Action, Subject, Zeitraum), einen Eintrag mit Before/After-Diff öffnen und gefilterte Ergebnisse als CSV exportieren"
    status: partial
    reason: "Filter toolbar + table + drawer + CSV export are all wired, BUT the Before/After diff is structurally broken for every DSGVO mutation (the largest mutation class in this phase). AuditInterceptor.extractResource() takes the FIRST URL segment after /api/v1/, so /api/v1/dsgvo/consent/* returns 'dsgvo' instead of 'consent'. Consequence: (a) RESOURCE_MODEL_MAP['dsgvo'] is undefined → before snapshot never captured for DSGVO writes; (b) SENSITIVE_RESOURCES does not contain 'dsgvo' → SENSITIVE_READ logging silently skipped for DSGVO reads; (c) Subject filter (resource=consent|retention|dsfa|vvz) returns zero rows because every DSGVO row is bucketed under resource='dsgvo'. The 'Subject' axis of AUDIT-VIEW-01 and the Vorzustand panel of AUDIT-VIEW-02 work correctly only for non-DSGVO resources (schools, students, teachers, classes, subjects, rooms, resources)."
    artifacts:
      - path: "apps/api/src/modules/audit/audit.interceptor.ts"
        issue: "extractResource() at line 165-173 returns first path segment; needs second-segment lookup for /dsgvo/<sub> paths"
    missing:
      - "Patch extractResource() to detect /api/v1/dsgvo/<sub>/... and return <sub> (consent | retention | dsfa | vvz | export | deletion | jobs)"
      - "Backfill audit rows currently labeled resource='dsgvo' if compliance reporting needs them under sub-resource names"
      - "Add unit test in audit.interceptor.spec.ts asserting /api/v1/dsgvo/consent/grant resolves to resource='consent', not 'dsgvo'"
      - "After fix: re-run plan 15-11 helper.seedAuditEntryWithBefore against PUT /api/v1/dsgvo/retention/:id (currently the spec was rerouted to PUT /schools/:id as a workaround)"
deferred:
  - truth: "DSGVO admin DTOs (@IsUUID) reject seed school 'seed-school-bgbrg-musterstadt' and seed person 'seed-person-student-1', causing 12/20 E2E mutation tests to soft-skip and dev-stack /admin/dsgvo to display the 'Einwilligungen konnten nicht geladen werden.' error banner."
    addressed_in: "Phase 16 (admin-dashboard-mobile) or a dedicated v1.1 Phase 15-12 cleanup"
    evidence: "Phase 15 ROADMAP frontmatter does not enumerate seed-data hygiene; deferred-items.md flags this as out-of-scope. Production schools use Prisma @default(uuid()) (verified in schema.prisma) so this is a test-fixture-only gap, not a production bug. Phase 16 is the next phase that touches the admin surface holistically; either it relaxes the DTOs to @IsString() or seed.ts gets regenerated with UUID IDs."
human_verification:
  - test: "Open /admin/dsgvo with admin role on a stack where E2E_SCHOOL_ID is a real UUID (not the seed default). Verify the Einwilligungen list renders, filters by Zweck/Status/Person update the URL, and the Widerrufen dialog completes with a toast."
    expected: "Filter toolbar updates URL search-params on each change; consent table shows 'Maria Müller (maria@example.at)' style person identity; Widerrufen dialog produces a success toast and the row's status badge flips to 'withdrawn'."
    why_human: "12/20 E2E mutation tests soft-skip on the seed-default schoolId because the DTO requires UUID. Automated coverage of the happy-path flow is gated on either a UUID-keyed seed or a DTO relaxation. Until then, only manual UAT against a UUID-keyed school can confirm the round-trip."
  - test: "Trigger a Datenexport (Art. 15) for a real Person UUID, then open the Jobs tab and watch the row transition QUEUED → PROCESSING → COMPLETED via the manual 'Aktualisieren' button."
    expected: "Within ~30s, the row's data-dsgvo-job-status attribute transitions through QUEUED → PROCESSING → COMPLETED. The dialog producing a 201 confirmation toast on submit. Hitting the same button after COMPLETED does not produce additional refetches that change the displayed status."
    why_human: "BullMQ job lifecycle requires the worker process to be running and a real Person + School UUID. The E2E spec (admin-dsgvo-export-job.spec.ts) covers this with expect.poll, but it soft-skips when env vars are absent."
  - test: "Open the Audit-Log viewer and use the 'CSV exportieren' button to download a CSV. Open the file in Excel (German locale) and verify the columns auto-split without the Import-Wizard prompt, the BOM is consumed silently, and umlauts render correctly."
    expected: "File downloads as audit-log-YYYY-MM-DD.csv with UTF-8 BOM (0xEF 0xBB 0xBF) and semicolon delimiter; Excel renders 10 columns including 'Vorzustand' and 'Nachzustand'; umlauts in user-typed cells are intact."
    why_human: "Excel locale-detection behavior cannot be verified programmatically — the Playwright spec asserts only the byte-level contract (BOM + delimiter + filename). Real Excel/LibreOffice rendering requires the OS file picker."
  - test: "After a DSGVO mutation (e.g. PUT /dsgvo/retention/:id), open /admin/audit-log, filter by Aktion=update, and click 'Detail öffnen' on the resulting row."
    expected: "GAP: The Before/After diff drawer SHOULD show the pre-mutation state. With the current extractResource bug, the row's resource column shows 'dsgvo' (not 'retention'), and the Vorzustand panel renders the muted-banner copy 'Vorzustand wurde für diesen Eintrag nicht erfasst…' even though the entry is brand new and the interceptor SHOULD have captured the snapshot. This is the AUDIT-VIEW-02 gap that the BLOCKER refers to."
    why_human: "Visual confirmation of the regression — a human can compare the Vorzustand panel content against the actual DB row to confirm the data is missing, not just hidden. Programmatic verification is the unit-test fix proposed in the gap."
---

# Phase 15: DSGVO-Admin & Audit-Log-Viewer Verification Report

**Phase Goal:** Admin kann Einwilligungen, Aufbewahrungsrichtlinien, DSFA/VVZ und DSGVO-Jobs aus der UI verwalten und das Audit-Log durchsuchen und exportieren.
**Verified:** 2026-04-28T10:15:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Admin kann Einwilligungs-Records nach Zweck, Status und User filtern und durchsuchen | ✓ VERIFIED | `apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx` (3 URL-synced fields: Zweck Select, Status Select, Person Input) + `ConsentsTab.tsx:91+` consumes `useConsentsAdmin({ schoolId, purpose, status, personSearch, page, limit })` against `GET /api/v1/dsgvo/consent/admin` (consent.controller.ts:44 `@Get('admin')` + consent.service.ts:143 `findAllForAdmin`). Backend enforces required schoolId via `@IsUUID()` on QueryConsentAdminDto + service-level role gate (admin-only 403). Single composed personFilter prevents tenant-scope drop. 22/22 vitest cases pass. |
| 2   | Admin kann Aufbewahrungsrichtlinien pro Datenkategorie editieren und DSFA-/VVZ-Einträge anlegen/editieren | ✓ VERIFIED | `RetentionTab.tsx:188 LOC` + `RetentionEditDialog.tsx:191 LOC` (create + edit, edit-mode disables dataCategory because backend PUT only accepts retentionDays); `DsfaTable.tsx:192 LOC` + `DsfaEditDialog.tsx:244 LOC` (5 fields matching CreateDsfaEntryDto exactly); `VvzTable.tsx:180 LOC` + `VvzEditDialog.tsx:310 LOC` (8 fields matching CreateVvzEntryDto exactly). All three CRUD tabs are wired into DsgvoTabs.tsx (lines 100-122). Backend hooks (useRetention, useDsfa, useVvz) call the live controller paths verified at execution time (`/api/v1/dsgvo/retention/school/:schoolId`, `/api/v1/dsgvo/dsfa/{dsfa,vvz}/school/:schoolId`). |
| 3   | Admin kann Art. 15 Datenexport für einen User aus der UI anstoßen und den BullMQ-Job-Status live verfolgen | ✓ VERIFIED | `RequestExportDialog.tsx:114 LOC` (single-step, opened from ConsentsTab toolbar 'Datenexport anstoßen' button) → `useRequestExport()` POSTs `/api/v1/dsgvo/export` with `{ personId, schoolId }`. `useDsgvoExportJob(jobId)` polls `/api/v1/dsgvo/export/:id` with `refetchInterval: (q) => isTerminal(q.state.data?.status) ? false : 2000` (terminal-stop pattern, lines 96-97). `JobsTab.tsx` renders the school-wide job list from `GET /api/v1/dsgvo/jobs` (DsgvoJobsController + DsgvoJobsService:findAllForAdmin). Each row carries `data-dsgvo-job-id` + `data-dsgvo-job-status`. Manual `Aktualisieren` button + per-id polling cover live status visibility. |
| 4   | Admin kann Art. 17 Anonymisierung/Löschung für einen User aus der UI anstoßen, mit 2-stufiger Bestätigung und Job-Status-Tracking | ✓ VERIFIED | `RequestDeletionDialog.tsx:172 LOC` ships the canonical 2-step state machine (line 65: `useState<1 \| 2>`). Step 1 = Sicherheitsabfrage with Abbrechen/Weiter. Step 2 = email-token strict-equal `tokenInput === person.email` (line 77, NO trim/toLowerCase confirmed by grep). Defense-in-depth: submit handler bails on `!tokenMatches` (line 83) AND submit button disabled (line 161). Mounted into ConsentsTab Löschen-anstoßen row action (ConsentsTab.tsx:299 `<RequestDeletionDialog />`). Job tracking shares the same JobsTab + useDsgvoDeletionJob terminal-stop polling pipeline. |
| 5   | Admin kann Audit-Log durchsuchen (Actor, Action, Subject, Zeitraum), einen Eintrag mit Before/After-Diff öffnen und gefilterte Ergebnisse als CSV exportieren | ✗ FAILED | Filter toolbar + table + CSV download are all wired correctly: `AuditFilterToolbar.tsx:210 LOC` URL-syncs 7 search params (Von/Bis/Aktion/Ressource/Benutzer/Kategorie + page); `AuditTable.tsx:207 LOC` renders rows with `data-audit-id` + `data-audit-action`; `AuditDetailDrawer.tsx:107 LOC` renders Vorzustand + Nachzustand JsonTree sections; `useAuditCsvExport` triggers a blob download from `GET /api/v1/audit/export.csv` which emits UTF-8 BOM + semicolon delimiter + 10k-row cap (audit.service.ts:118-211). **GAP:** `AuditInterceptor.extractResource()` (audit.interceptor.ts:165-173) takes the FIRST URL segment after /api/v1/, so every `/api/v1/dsgvo/<sub>/...` request resolves to resource='dsgvo' instead of consent/retention/dsfa/vvz/export/deletion. Consequence (a): `RESOURCE_MODEL_MAP['dsgvo']` is undefined → before-snapshot is NEVER captured for DSGVO mutations (the entire purpose of plan 15-01). Consequence (b): `SENSITIVE_RESOURCES` does not contain 'dsgvo' → SENSITIVE_READ logging is silently skipped for DSGVO reads. Consequence (c): admin filtering by `resource=consent\|retention\|dsfa\|vvz` returns zero matches because all DSGVO rows are bucketed under `dsgvo`. The Before/After diff works correctly for non-DSGVO mutations (schools/students/teachers/classes/subjects/rooms/resources) — verified by plan 15-11 helper.seedAuditEntryWithBefore which had to reroute from `PUT /dsgvo/retention/:id` to `PUT /schools/:id` to get a populated before-snapshot. |

**Score:** 4/5 truths verified

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | DSGVO admin DTOs (@IsUUID) reject seed school + person stable IDs, causing 12/20 E2E mutation tests to soft-skip and the dev-stack /admin/dsgvo to display the 'Einwilligungen konnten nicht geladen werden.' error banner | Phase 16 (or a dedicated 15-12 cleanup) | Production schemas use Prisma `@default(uuid())` (verified `id String @id @default(uuid())` ×20 in schema.prisma); production schools/persons WILL have UUIDs. The seed.ts shortcut to static IDs is a test-fixture-only gap, NOT a production bug. ROADMAP Phase 16 is the next phase that touches the admin surface holistically and is the natural place to either relax the DTOs to `@IsString()` or regenerate seed.ts with UUID IDs. Documented in deferred-items.md. |

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `apps/api/prisma/migrations/20260427181615_add_audit_entry_before_snapshot/migration.sql` | Adds AuditEntry.before JSONB column | ✓ VERIFIED | Additive ALTER TABLE; no DROP/RENAME; Prisma migrate status clean. |
| `apps/api/src/modules/audit/audit.interceptor.ts` | RESOURCE_MODEL_MAP + captureBeforeState + RxJS from()+switchMap pre-handler hook | ✓ VERIFIED (substantive) / ⚠️ INCORRECT (logic bug) | All claimed code present; 7 vitest cases pass. **However** extractResource() URL parsing is too coarse — see Truth #5 FAILED. |
| `apps/api/src/modules/audit/audit.service.ts` (exportCsv method) | Papa.unparse + BOM + semicolon delimiter + 10k cap + role-scoped where | ✓ VERIFIED | grep confirms all key tokens (line 211 `'' + csv`, line 200 `delimiter: ';'`, line 164 `take: 10_000`). 12 vitest cases pass. |
| `apps/api/src/modules/audit/audit.controller.ts` (export.csv route) | @Get('export.csv') + same @CheckPermissions decorator as findAll + Fastify @Res() pattern | ✓ VERIFIED | Line 54 `@Get('export.csv')`. Decorator parity asserted via Reflect.getMetadata in audit.controller.e2e-spec.ts. |
| `apps/api/src/modules/dsgvo/consent/consent.controller.ts` (admin route) | @Get('admin') registered ABOVE @Get('school/:schoolId') | ✓ VERIFIED | Line 44 (`@Get('admin')`) precedes line 72 (`@Get('school/:schoolId')`). Static-before-parametric ordering correct. |
| `apps/api/src/modules/dsgvo/consent/consent.service.ts` (findAllForAdmin) | Role gate + schoolId guard + single composed personFilter | ✓ VERIFIED | Line 143 `findAllForAdmin`; line 156 admin role check; single composed personFilter (regression guard against MEMORY useTeachers tenant leak family). 22/22 cases pass. |
| `apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` | Required @IsUUID schoolId (no @IsOptional) + 3 optional filters | ✓ VERIFIED | Line 21 `@IsUUID()` on schoolId without `@IsOptional`. |
| `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts` | @Get() route returning paginated jobs | ✓ VERIFIED | Line 15 `@Get()`; @Controller('dsgvo/jobs'). |
| `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` | findAllForAdmin with admin role gate + Pitfall-4 guard + 2-query Person hydration | ✓ VERIFIED | 9/9 vitest cases pass. Two-query hydration pattern documented (CSV deviation from plan's `include` because DsgvoJob lacks Prisma navigation relation). |
| `apps/api/src/modules/dsgvo/dsgvo.module.ts` | DsgvoJobsController + DsgvoJobsService registered | ✓ VERIFIED | Lines 19-20 import; lines 29 + 41 registration. |
| `apps/web/src/routes/_authenticated/admin/dsgvo.tsx` | Admin-gated route + Zod search schema (tab + sub + filter params) | ✓ VERIFIED | Route registered in routeTree.gen.ts:147; admin gate via `(user?.roles ?? []).includes('admin')`. |
| `apps/web/src/routes/_authenticated/admin/audit-log.tsx` | Admin-gated route + Zod schema + AuditFilterToolbar + AuditTable mount | ✓ VERIFIED | Routes registered (routeTree.gen.ts:153); imports + mounts both components; PageShell with admin gate. |
| `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` | 4-tab shell + URL writeback + mobile ToggleGroup | ✓ VERIFIED | All 4 tabs LIVE (Consents/Retention/DSFA-VVZ/Jobs); `<PlaceholderPanel>` removed. |
| `apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx` (153 LOC) | 3 URL-synced inputs + page-reset on filter change | ✓ VERIFIED | __all__ sentinel for shadcn Select; `Filter zurücksetzen` button. |
| `apps/web/src/components/admin/dsgvo/ConsentsTab.tsx` (308 LOC — 263 LOC at 15-06 + 47 LOC additive 15-08) | Filter toolbar + 7-col table + Widerrufen + Datenexport-anstoßen + Löschen-anstoßen | ✓ VERIFIED | data-consent-id + data-consent-status selectors locked; both Art-17 dialogs (Export + Deletion) mounted (lines 290-303). |
| `apps/web/src/components/admin/dsgvo/RetentionTab.tsx` + `RetentionEditDialog.tsx` | Create/edit/delete + dataCategory-disabled-in-edit guard | ✓ VERIFIED | data-retention-category selectors; legalBasis correctly omitted (verified absent from both Prisma model and DTO). |
| `apps/web/src/components/admin/dsgvo/DsfaTable.tsx` + `DsfaEditDialog.tsx` | Create/edit/delete with 5 fields matching CreateDsfaEntryDto | ✓ VERIFIED | data-dsfa-id selectors; verbatim German copy for empty state + delete confirm. |
| `apps/web/src/components/admin/dsgvo/VvzTable.tsx` + `VvzEditDialog.tsx` | Create/edit/delete with 8 fields matching CreateVvzEntryDto | ✓ VERIFIED | data-vvz-id selectors; comma-separated Input convention for dataCategories + affectedPersons; client-side ArrayMinSize(1) guard layered above backend's lax @IsArray. |
| `apps/web/src/components/admin/dsgvo/JobsTab.tsx` (202 LOC) | School-wide job table + Aktualisieren button + status badges + manual refetch | ✓ VERIFIED | data-dsgvo-job-id + data-dsgvo-job-status selectors; statusVariant + statusClass + statusLabel maps; consumes useDsgvoJobs which consumes /api/v1/dsgvo/jobs. |
| `apps/web/src/components/admin/dsgvo/RequestExportDialog.tsx` (114 LOC) | Single-step Person-UUID input + useRequestExport mutation | ✓ VERIFIED | Receives schoolId prop (Rule-3 fix from plan); passes through to mutation as `{ personId, schoolId }`. |
| `apps/web/src/components/admin/dsgvo/RequestDeletionDialog.tsx` (172 LOC) | 2-step state machine + email-token strict-equal + reset on close | ✓ VERIFIED | Line 77 `tokenInput === person.email` (strict equal, NO normalization confirmed by grep); line 83 `if (!tokenMatches) return` defense-in-depth; line 69-74 useEffect resets step + tokenInput on close. |
| `apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx` (210 LOC) | 7-field URL-synced filter + CSV-export button + Filter-zurücksetzen | ✓ VERIFIED | Reads Route.useSearch() + navigate({ search: prev =>… }); __all__ sentinel for Aktion + Kategorie selects. |
| `apps/web/src/components/admin/audit-log/AuditTable.tsx` (207 LOC) | Native table + data-audit-id/action + Detail-öffnen drawer + pagination | ✓ VERIFIED | Lines 143-144 row selectors; line 164 onClick opens drawer; lines 96-122 dual empty states. |
| `apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx` (107 LOC) | Sheet + Vorzustand + Nachzustand JsonTree sections + legacy banner | ✓ VERIFIED | Line 88-95 Vorzustand or muted banner; line 100-103 Nachzustand JsonTree of `pickAfterValue(metadata)`. |
| `apps/web/src/components/admin/audit-log/JsonTree.tsx` (64 LOC) | Recursive React component handling null/string/number/boolean/array/object | ✓ VERIFIED | Static pl-4 wrappers per recursion level (Tailwind v4 content-scanner constraint); React's auto-escape on `{value}` for XSS mitigation. |
| `apps/web/src/hooks/useAuditEntries.ts` | Paginated query against GET /audit + buildAuditQueryString + auditKeys | ✓ VERIFIED | enabled when filters provided; staleTime: 5_000; AuditEntryDto exposes optional `actor` for forward-compat. |
| `apps/web/src/hooks/useAuditCsvExport.ts` | useMutation blob download + URL.revokeObjectURL cleanup | ✓ VERIFIED | grep confirms `URL.createObjectURL` + `URL.revokeObjectURL` + `'CSV-Export fehlgeschlagen.'`. |
| `apps/web/src/hooks/useDsgvoJobs.ts` (123 LOC) | School-wide job list + isTerminal predicate + dsgvoJobsKeys | ✓ VERIFIED | enabled !!schoolId guard; staleTime: 2000; isTerminal exported for the per-id polling hooks. |
| `apps/web/src/hooks/useDsgvoExportJob.ts` (134 LOC) + `useDsgvoDeletionJob.ts` (139 LOC) | Per-id terminal-stop polling + trigger mutations with schoolId | ✓ VERIFIED | refetchInterval functional terminal-stop confirmed (lines 96-97 / 100-101). Trigger inputs typed with both personId AND schoolId (Rule-3 fix). |
| `apps/web/src/hooks/useConsents.ts` + `useRetention.ts` + `useDsfa.ts` + `useVvz.ts` | CRUD hooks + body-less DELETE invariant + toast.error/invalidateQueries | ✓ VERIFIED | All 4 hook files; backend route paths corrected at execution time (`/dsgvo/retention/school/:schoolId` not `?schoolId=`). |
| `apps/web/e2e/helpers/dsgvo.ts` + `audit.ts` | Wave-0 idempotent seed helpers + cleanupAll | ✓ VERIFIED | Both files exist with documented helpers. |
| `apps/web/e2e/admin-dsgvo-*.spec.ts` (7 files) + `admin-audit-log-*.spec.ts` (3 files) | 18 + 6 test cases per plan | ✓ VERIFIED (substantive) / ⚠️ COVERAGE GAP | Files exist with claimed test counts. Plan 15-10 reports 8 passed + 12 skipped (mutation flows soft-skip on UUID DTO mismatch). Plan 15-11 reports 6/6 passing (workaround: PUT /schools instead of PUT /dsgvo/retention because of the same UUID DTO + the extractResource bug). |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| ConsentsTab | useConsentsAdmin | TanStack useQuery | ✓ WIRED | ConsentsTab.tsx imports + invokes `useConsentsAdmin({ schoolId, purpose, status, personSearch, page, limit })` |
| useConsentsAdmin | GET /api/v1/dsgvo/consent/admin | apiFetch | ✓ WIRED | useConsents.ts hook calls the live `/admin` endpoint |
| GET /dsgvo/consent/admin | ConsentService.findAllForAdmin | NestJS DI | ✓ WIRED | consent.controller.ts:54-69 forwards query + currentUser to service |
| ConsentService.findAllForAdmin | prisma.consentRecord.findMany | role-gated where | ✓ WIRED | service line 156 admin gate; line 167 single composed personFilter |
| RequestExportDialog | useRequestExport | mutate({ personId, schoolId }) | ✓ WIRED | RequestExportDialog.tsx:46 hook + invocation; schoolId required by typed input |
| useRequestExport | POST /api/v1/dsgvo/export | apiFetch | ✓ WIRED | useDsgvoExportJob.ts trigger mutation |
| RequestDeletionDialog | useRequestDeletion | mutate({ personId, schoolId }) | ✓ WIRED | RequestDeletionDialog.tsx:84 mutate call |
| RequestDeletionDialog email-token | tokenInput === person.email | strict-equal | ✓ WIRED | line 77 (no normalization confirmed) + line 83 defense-in-depth bail |
| JobsTab | useDsgvoJobs | TanStack useQuery | ✓ WIRED | JobsTab.tsx:93 + table renders rows with selectors |
| useDsgvoJobs | GET /api/v1/dsgvo/jobs | apiFetch | ✓ WIRED | useDsgvoJobs.ts hook |
| GET /dsgvo/jobs | DsgvoJobsService.findAllForAdmin | NestJS DI | ✓ WIRED | dsgvo-jobs.controller.ts:15 + DsgvoJobsService.findAllForAdmin two-query hydration |
| AuditTable | useAuditEntries | TanStack useQuery | ✓ WIRED | AuditTable.tsx:58 |
| AuditTable | AuditDetailDrawer | onClick setDrawerEntry | ✓ WIRED | line 164 (Detail öffnen icon-button) |
| AuditDetailDrawer | JsonTree | for entry.before + pickAfterValue(entry.metadata) | ✓ WIRED | lines 89 + 102 |
| AuditFilterToolbar | useAuditCsvExport | onClick CSV-Button | ✓ WIRED | toolbar invokes mutation; useAuditCsvExport calls /audit/export.csv |
| useAuditCsvExport | GET /api/v1/audit/export.csv | apiFetch + blob() | ✓ WIRED | hook fetches + creates anchor + URL.createObjectURL + revokeObjectURL |
| AuditInterceptor | RESOURCE_MODEL_MAP[resource] | captureBeforeState | ⚠️ PARTIAL | extractResource() returns 'dsgvo' for /dsgvo/* routes → RESOURCE_MODEL_MAP['dsgvo']=undefined → branch returns undefined → before snapshot NOT captured for any DSGVO mutation. Works correctly for non-DSGVO routes (schools, students, teachers, classes, subjects, rooms, resources). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| ConsentsTab | `data` from `useConsentsAdmin` | `prisma.consentRecord.findMany` (consent.service.ts:findAllForAdmin) with role-scoped where + composed personFilter | Yes — real DB query with paginated envelope; Person summary joined via Prisma include | ✓ FLOWING |
| RetentionTab | `data` from `useRetentionPolicies` | `RetentionService.findBySchool` → `prisma.retentionPolicy.findMany` | Yes (DTO requires UUID schoolId — works against UUID schools, fails against seed school) | ✓ FLOWING |
| DsfaTable | `data` from `useDsfaEntries` | `DsfaService.findBySchool` → Prisma | Yes | ✓ FLOWING |
| VvzTable | `data` from `useVvzEntries` | Prisma | Yes | ✓ FLOWING |
| JobsTab | `data` from `useDsgvoJobs` | `DsgvoJobsService.findAllForAdmin` → 2-query Prisma (jobs + person hydration, both tenant-scoped) | Yes | ✓ FLOWING |
| AuditTable | `data` from `useAuditEntries` | `AuditService.findAll` → `prisma.auditEntry.findMany` (role-scoped) | Yes — 64 backend tests cover where-clause + pagination | ✓ FLOWING |
| AuditDetailDrawer.Vorzustand | `entry.before` populated by interceptor | `AuditInterceptor.captureBeforeState(resource, id)` | ⚠️ PARTIAL: real Prisma findUnique for non-DSGVO resources; **always undefined** for DSGVO (consent/retention/dsfa/vvz/export/deletion) because extractResource returns 'dsgvo' which is NOT in RESOURCE_MODEL_MAP. The drawer falls back to "Vorzustand wurde für diesen Eintrag nicht erfasst" muted banner, masking the structural bug. | ⚠️ HOLLOW (DSGVO subset) / ✓ FLOWING (non-DSGVO) |
| AuditDetailDrawer.Nachzustand | `pickAfterValue(entry.metadata)` | `entry.metadata.body` from interceptor sanitizeBody | Yes | ✓ FLOWING |
| useAuditCsvExport download | blob from /audit/export.csv | `AuditService.exportCsv` → role-scoped findMany → Papa.unparse | Yes — verified by 16 backend tests + 1 Playwright spec asserting BOM 0xEF 0xBB 0xBF + semicolon delimiter | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Audit + DSGVO + Consent unit tests pass | `cd apps/api && pnpm exec vitest run src/modules/audit/ src/modules/dsgvo/jobs/ src/modules/dsgvo/consent/` | 5 test files passed; 64/64 tests passed (audit interceptor, audit service, audit controller e2e, dsgvo-jobs service, consent service findAllForAdmin) | ✓ PASS |
| All claimed 17 frontend components + 8 hooks exist | `wc -l apps/web/src/components/admin/dsgvo/*.tsx apps/web/src/components/admin/audit-log/*.tsx` | 16 component files totaling 2971 LOC; size matches SUMMARY claims (e.g. JobsTab 202 LOC, AuditTable 207 LOC, RequestDeletionDialog 172 LOC); no stub files (≤20 LOC absent) | ✓ PASS |
| All 11 plan SUMMARY commits exist on branch | `git log --oneline -25` | All claimed commits found: f9ab661 (15-08), 702eb5c (15-08 last placeholder), 8e80495 (15-09 AuditTable), f0851be (15-11 CSV spec), e7b67ab (15-10 docs), 50d4d02 (15-11 docs) etc. | ✓ PASS |
| `<PlaceholderPanel>` JSX is removed from DsgvoTabs.tsx | `grep -rn "PlaceholderPanel" apps/web/src/components/admin/dsgvo/` | Only stale JSDoc-comment references remain (DsgvoTabs.tsx:13 + ConsentsTab.tsx:38); no JSX usage; no exported function | ✓ PASS |
| extractResource bug confirmed in actual code | `grep -nE "apiMatch\|extractResource" apps/api/src/modules/audit/audit.interceptor.ts` | Line 167-168: `const apiMatch = url.match(/\/api\/v1\/([^/?]+)/); if (apiMatch) return apiMatch[1];` — single capture group on first segment after /api/v1/ → returns 'dsgvo' for /api/v1/dsgvo/* | ✓ FAIL (bug confirmed) |
| Routes registered in TanStack routeTree | `grep -nE "admin/dsgvo\|admin/audit-log" apps/web/src/routeTree.gen.ts` | Line 30-31 imports; line 147+153 path declarations; line 221-253 typed route map entries | ✓ PASS |
| Sidebar entries present | `grep -nE "DSGVO-Verwaltung\|Audit-Log" apps/web/src/components/layout/AppSidebar.tsx` | Line 177 'DSGVO-Verwaltung' + line 184 'Audit-Log' both present | ✓ PASS |
| Build passes typecheck for new files (regression gate) | (per Wave 3 report) | 696/697 unit tests pass; 1 pre-existing dev-DB pollution issue in school-year-multi-active.spec.ts unrelated to Phase 15 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| DSGVO-ADM-01 | 15-03 + 15-05 + 15-06 + 15-10 | Admin kann Einwilligungs-Records nach Zweck/Status filtern und durchsuchen | ✓ SATISFIED | Backend GET /dsgvo/consent/admin (consent.controller.ts:44, service line 143) + frontend ConsentsTab + ConsentsFilterToolbar + 22/22 vitest cases + Playwright spec admin-dsgvo-consents.spec.ts (3 cases). |
| DSGVO-ADM-02 | 15-05 + 15-06 + 15-10 | Admin kann Aufbewahrungsrichtlinien pro Datenkategorie editieren | ✓ SATISFIED | RetentionTab + RetentionEditDialog (create + edit + delete) + admin-dsgvo-retention.spec.ts (4 cases — soft-skip on seed school). |
| DSGVO-ADM-03 | 15-05 + 15-07 + 15-10 | Admin kann DSFA-Einträge anlegen und editieren | ✓ SATISFIED | DsfaTable + DsfaEditDialog + admin-dsgvo-dsfa.spec.ts (3 cases). 5 form fields match CreateDsfaEntryDto exactly. |
| DSGVO-ADM-04 | 15-05 + 15-07 + 15-10 | Admin kann VVZ-Einträge anlegen und editieren | ✓ SATISFIED | VvzTable + VvzEditDialog + admin-dsgvo-vvz.spec.ts (3 cases). 8 form fields match CreateVvzEntryDto. |
| DSGVO-ADM-05 | 15-04 + 15-08 + 15-10 | Admin kann Art. 15 Datenexport anstoßen und Job-Status verfolgen | ✓ SATISFIED | RequestExportDialog + JobsTab + isTerminal-stop polling + admin-dsgvo-export-job.spec.ts (2 cases incl. expect.poll on data-dsgvo-job-status). |
| DSGVO-ADM-06 | 15-04 + 15-08 + 15-10 | Admin kann Art. 17 Anonymisierung/Löschung anstoßen mit Bestätigung | ✓ SATISFIED | RequestDeletionDialog (2-step + strict-equal) + admin-dsgvo-deletion-confirm.spec.ts (3 cases incl. negative case-different test). E2E_DELETION_LIVE-gated to avoid irreversible mutation in CI. |
| AUDIT-VIEW-01 | 15-01 + 15-09 + 15-11 | Admin kann Audit-Log mit Suche und Filter durchsuchen | ⚠️ PARTIAL — SATISFIED with caveat | AuditFilterToolbar 7-field URL-synced filter + AuditTable rendering — verified by admin-audit-log-filter.spec.ts (3 cases passing). **Caveat:** filtering by Subject (resource=consent\|retention\|dsfa\|vvz) returns ZERO rows because of the extractResource bug; admin must filter by `resource=dsgvo` to find DSGVO mutations. Actor + Action + Zeitraum filters work as designed. |
| AUDIT-VIEW-02 | 15-01 + 15-09 + 15-11 | Admin sieht Audit-Eintrag-Detail mit Before/After-Diff | ✗ BLOCKED | Drawer + JsonTree are wired correctly — verified by admin-audit-log-detail.spec.ts (2 cases passing). **Critical gap:** the Vorzustand panel renders the muted "Vorzustand wurde nicht erfasst" banner for ALL DSGVO mutations because extractResource returns 'dsgvo' which is not in RESOURCE_MODEL_MAP. The before-snapshot capture (the entire purpose of plan 15-01) is structurally bypassed for the largest mutation class in this phase. Works correctly only for non-DSGVO mutations (schools/students/teachers/etc). |
| AUDIT-VIEW-03 | 15-02 + 15-09 + 15-11 | Admin kann gefilterten Audit-Log als CSV exportieren | ✓ SATISFIED | useAuditCsvExport hook + AuditFilterToolbar 'CSV exportieren' button + GET /api/v1/audit/export.csv (UTF-8 BOM + semicolon + 10k cap) + admin-audit-log-csv.spec.ts byte-level contract test (filename + BOM 0xEF 0xBB 0xBF + delimiter). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `apps/api/src/modules/audit/audit.interceptor.ts` | 165-173 | extractResource takes first URL segment — too coarse for namespaced /dsgvo/* routes | 🛑 Blocker | Before-snapshot never captures for DSGVO mutations; SENSITIVE_READ never logs DSGVO reads; admin filter by sub-resource finds 0 DSGVO rows. Goal-level impact: AUDIT-VIEW-02 fails for DSGVO half of mutations; AUDIT-VIEW-01 'Subject' axis broken for DSGVO half. |
| `apps/api/src/modules/dsgvo/{retention,dsfa,export,deletion}/dto/*.dto.ts` + `consent/dto/query-consent-admin.dto.ts` + `dsfa/dto/create-vvz-entry.dto.ts` | various — `@IsUUID()` on schoolId/personId | DTO + seed.ts disagreement | ⚠️ Warning (test-fixture) | Production schools/persons use Prisma `@default(uuid())` so this is correct in production. Seed.ts uses static stable IDs ('seed-school-bgbrg-musterstadt') which fail validation. Effect: 12/20 E2E mutation tests soft-skip; dev-stack /admin/dsgvo errors with 'Einwilligungen konnten nicht geladen werden.' Not a production bug. |
| `apps/web/src/components/admin/dsgvo/ConsentsTab.tsx` | 38 (JSDoc only) | Stale JSDoc comment "placeholder for plan 15-08" — code is fully wired | ℹ️ Info | Cosmetic — the JSDoc references the previous-state of the file. The actual JSX (lines 290-303) mounts both Art-17 dialogs. Cleanup deferred. |
| `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` | 13 (JSDoc only) | Stale JSDoc reference to "PlaceholderPanel" — code has none | ℹ️ Info | Same — JSDoc-only, no JSX or function definition remains. |

### Human Verification Required

See `human_verification` in frontmatter for the 4 items requiring manual validation:

1. **Consent admin happy-path against UUID-keyed school** — proves the contract works on a non-seed stack (12/20 E2E mutations soft-skip on seed default).
2. **BullMQ Datenexport lifecycle (QUEUED→PROCESSING→COMPLETED)** — requires a running worker process and real Person UUID; spec covers this only via expect.poll when env vars are set.
3. **Excel/LibreOffice CSV import (German locale)** — locale-detection cannot be programmatically tested; Playwright only asserts the byte-level contract.
4. **DSGVO-mutation Before/After diff regression** — visual confirmation of the extractResource bug; Vorzustand panel renders the legacy banner for any /api/v1/dsgvo/* PUT/PATCH/DELETE.

### Gaps Summary

**Phase 15 ships 100% of the surface area but 80% of the contract:** all 11 plans landed substantive code with correct wiring, all 16 frontend components + 11 backend files exist on disk and are imported through the data-flow graph, and 64 backend unit tests + 14 E2E specs (8 passing + 12 soft-skipping in 15-10, 6/6 in 15-11) are committed. The four "easy" success criteria (#1 Consents, #2 Retention/DSFA/VVZ, #3 Datenexport, #4 Art-17) are fully VERIFIED with concrete code evidence and unit-test coverage.

**The single blocking gap** is success criterion #5 — specifically the Vorzustand portion of AUDIT-VIEW-02 and the Subject filter axis of AUDIT-VIEW-01 — caused by `AuditInterceptor.extractResource()` taking the first URL path segment. For `/api/v1/dsgvo/*` namespaced routes (consent/retention/dsfa/vvz/export/deletion — i.e. ALL Phase 15 admin DSGVO mutations), this returns `dsgvo` instead of the actual resource name, so:
- The whole point of plan 15-01 (capture before-snapshot for DSGVO mutations) is structurally bypassed because `RESOURCE_MODEL_MAP['dsgvo']` is undefined
- SENSITIVE_RESOURCES allowlist never matches because the list contains 'consent'/'retention'/'export'/'person' but never 'dsgvo'
- Admin filter by Subject=consent/retention returns zero rows (every DSGVO mutation is bucketed under resource='dsgvo')

The plan 15-11 author documented this as a "Backlog Discoveries" item, but the symptom is observable in the production audit log today: every DSGVO admin action shows `resource=dsgvo, before=NULL`. This is fixable with a 5-line patch in extractResource() (detect and walk past `/dsgvo/`), one new unit test, and a re-run of the 15-11 helper to use the proper /dsgvo/retention path again.

**The deferred gap** (UUID DTOs vs seed.ts) is a test-fixture issue — production behavior is correct because Prisma generates UUIDs by default. Phase 16 or a dedicated 15-12 cleanup is the natural place to either relax the DTOs to `@IsString()` or regenerate seed.ts with UUIDs.

**Recommendation:** open a single focused gap-closure plan for the extractResource fix; mark Phase 15 as "passed once gap closed". The seed/UUID misalignment is information-only and does not block the phase boundary.

---

_Verified: 2026-04-28T10:15:00Z_
_Verifier: Claude (gsd-verifier)_
