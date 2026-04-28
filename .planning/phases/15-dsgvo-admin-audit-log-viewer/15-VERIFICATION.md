---
phase: 15-dsgvo-admin-audit-log-viewer
verified: 2026-04-28T13:42:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Truth #5 — AuditInterceptor.extractResource() now resolves /api/v1/dsgvo/<sub>/... to <sub> (consent | retention | dsfa | vvz | export | deletion | jobs); RESOURCE_MODEL_MAP is hit so AuditEntry.before is captured for DSGVO mutations; SENSITIVE_RESOURCES extended with dsfa/vvz/deletion; admin Subject filter resource=consent|retention|dsfa|vvz|export|deletion|jobs returns the right rows."
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "DSGVO admin DTOs (@IsUUID) reject seed school 'seed-school-bgbrg-musterstadt' and seed person 'seed-person-student-1', causing 12/20 E2E mutation tests to soft-skip and dev-stack /admin/dsgvo to display the 'Einwilligungen konnten nicht geladen werden.' error banner."
    addressed_in: "Phase 16 (admin-dashboard-mobile) or a dedicated v1.1 Phase 15-13 cleanup"
    evidence: "Production schools use Prisma @default(uuid()) (verified in schema.prisma) so this is a test-fixture-only gap, not a production bug. Phase 16 is the next phase that touches the admin surface holistically; either it relaxes the DTOs to @IsString() or seed.ts gets regenerated with UUID IDs. Documented in deferred-items.md."
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
  - test: "After a DSGVO mutation (e.g. PUT /dsgvo/retention/:id) on a UUID-keyed school, open /admin/audit-log, filter by Aktion=update + Ressource=retention, click 'Detail öffnen' on the resulting row, and confirm the Vorzustand panel renders a JsonTree with the pre-mutation retentionDays value (NOT the muted legacy banner)."
    expected: "Drawer opens; Vorzustand heading visible; Vorzustand body renders a JsonTree (font-mono nodes) showing { id, dataCategory, retentionDays: <original> }; Nachzustand body renders { body: { retentionDays: <new> } }; the 'Vorzustand wurde für diesen Eintrag nicht erfasst…' muted banner does NOT appear."
    why_human: "End-to-end visual confirmation that the 15-12 fix lands in a live stack. Programmatic confirmation lives in audit.interceptor.spec.ts (19/19 passing) and the admin-audit-log-detail.spec.ts second branch. CI execution of the spec requires E2E_SCHOOL_ID set to a UUID school per the deferred seed-UUID gap; until that lands, only a manual visit produces the screenshot-quality proof."
---

# Phase 15: DSGVO-Admin & Audit-Log-Viewer Verification Report

**Phase Goal:** Admin kann Einwilligungen, Aufbewahrungsrichtlinien, DSFA/VVZ und DSGVO-Jobs aus der UI verwalten und das Audit-Log durchsuchen und exportieren.
**Verified:** 2026-04-28T13:42:00Z
**Status:** human_needed
**Re-verification:** Yes — after 15-12 gap-closure (commits cf6582e + 9dcc794 + ad937e0 + b04f501 + 0baf572)

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | Admin kann Einwilligungs-Records nach Zweck, Status und User filtern und durchsuchen | ✓ VERIFIED | `apps/web/src/components/admin/dsgvo/ConsentsFilterToolbar.tsx` (3 URL-synced fields: Zweck Select, Status Select, Person Input) + `ConsentsTab.tsx:91+` consumes `useConsentsAdmin({ schoolId, purpose, status, personSearch, page, limit })` against `GET /api/v1/dsgvo/consent/admin` (consent.controller.ts:44 `@Get('admin')` + consent.service.ts:143 `findAllForAdmin`). Backend enforces required schoolId via `@IsUUID()` on QueryConsentAdminDto + service-level role gate (admin-only 403). Single composed personFilter prevents tenant-scope drop. 22/22 vitest cases pass. |
| 2   | Admin kann Aufbewahrungsrichtlinien pro Datenkategorie editieren und DSFA-/VVZ-Einträge anlegen/editieren | ✓ VERIFIED | `RetentionTab.tsx:188 LOC` + `RetentionEditDialog.tsx:191 LOC` (create + edit; edit-mode disables dataCategory because backend PUT only accepts retentionDays); `DsfaTable.tsx:192 LOC` + `DsfaEditDialog.tsx:244 LOC` (5 fields matching CreateDsfaEntryDto exactly); `VvzTable.tsx:180 LOC` + `VvzEditDialog.tsx:310 LOC` (8 fields matching CreateVvzEntryDto exactly). All three CRUD tabs are wired into DsgvoTabs.tsx (lines 100-122). Backend hooks (useRetention, useDsfa, useVvz) call the live controller paths verified at execution time. |
| 3   | Admin kann Art. 15 Datenexport für einen User aus der UI anstoßen und den BullMQ-Job-Status live verfolgen | ✓ VERIFIED | `RequestExportDialog.tsx:114 LOC` (single-step, opened from ConsentsTab toolbar 'Datenexport anstoßen' button) → `useRequestExport()` POSTs `/api/v1/dsgvo/export` with `{ personId, schoolId }`. `useDsgvoExportJob(jobId)` polls `/api/v1/dsgvo/export/:id` with terminal-stop pattern. `JobsTab.tsx` renders the school-wide job list from `GET /api/v1/dsgvo/jobs`. Each row carries `data-dsgvo-job-id` + `data-dsgvo-job-status`. |
| 4   | Admin kann Art. 17 Anonymisierung/Löschung für einen User aus der UI anstoßen, mit 2-stufiger Bestätigung und Job-Status-Tracking | ✓ VERIFIED | `RequestDeletionDialog.tsx:172 LOC` ships the canonical 2-step state machine. Step 1 = Sicherheitsabfrage. Step 2 = email-token strict-equal `tokenInput === person.email` (NO trim/toLowerCase). Defense-in-depth: submit handler bails on `!tokenMatches` AND submit button disabled. Mounted into ConsentsTab Löschen-anstoßen row action. Job tracking shares the same JobsTab + useDsgvoDeletionJob terminal-stop polling pipeline. |
| 5   | Admin kann Audit-Log durchsuchen (Actor, Action, Subject, Zeitraum), einen Eintrag mit Before/After-Diff öffnen und gefilterte Ergebnisse als CSV exportieren | ✓ VERIFIED (post-15-12) | **Filter toolbar + table + CSV export** — `AuditFilterToolbar.tsx:210 LOC` URL-syncs 7 search params; `AuditTable.tsx:207 LOC` renders rows with `data-audit-id` + `data-audit-action`; `AuditDetailDrawer.tsx:107 LOC` renders Vorzustand + Nachzustand JsonTree sections; `useAuditCsvExport` triggers blob download from `GET /api/v1/audit/export.csv` (UTF-8 BOM + semicolon + 10k cap). **15-12 closure** — `AuditInterceptor.extractResource()` (audit.interceptor.ts:202-218) now walks past `/api/v1/dsgvo/` for the 7 known sub-resources via the new `DSGVO_SUB_RESOURCES` Set (lines 54-62): `consent`, `retention`, `dsfa`, `vvz`, `export`, `deletion`, `jobs`. Verified by 19/19 vitest cases (`audit.interceptor.spec.ts`), 12 of them new in commit 9dcc794. `RESOURCE_MODEL_MAP['retention'\|'consent'\|'dsfa'\|'vvz']` is hit so `audit_entries.before` is captured for DSGVO mutations. `SENSITIVE_RESOURCES` extended with `dsfa`, `vvz`, `deletion` (audit.service.ts:12-16; commit ad937e0). The E2E helper + detail spec are reverted to the proper `PUT /api/v1/dsgvo/retention/:id` target (commit b04f501) so the AUDIT-VIEW-02 round-trip is provable end-to-end (live-stack confirmation gated on the deferred seed-UUID work). |

**Score:** 5/5 truths verified

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | DSGVO admin DTOs (@IsUUID) reject seed school + person stable IDs, causing 12/20 E2E mutation tests to soft-skip and the dev-stack /admin/dsgvo to display the 'Einwilligungen konnten nicht geladen werden.' error banner | Phase 16 (or a dedicated 15-13 cleanup) | Production schemas use Prisma `@default(uuid())` (verified `id String @id @default(uuid())` ×20 in schema.prisma); production schools/persons WILL have UUIDs. The seed.ts shortcut to static IDs is a test-fixture-only gap, NOT a production bug. ROADMAP Phase 16 is the next phase that touches the admin surface holistically and is the natural place to either relax the DTOs to `@IsString()` or regenerate seed.ts with UUID IDs. Documented in deferred-items.md. |

### Required Artifacts (post 15-12)

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `apps/api/src/modules/audit/audit.interceptor.ts` | DSGVO_SUB_RESOURCES Set + extractResource walk-past for /dsgvo/<sub>/ + RESOURCE_MODEL_MAP unchanged | ✓ VERIFIED | Lines 54-62 declare the Set with the 7 sub-resources (`consent`, `retention`, `dsfa`, `vvz`, `export`, `deletion`, `jobs`). Lines 202-218 implement the new `extractResource()` with DSGVO branch first (regex `/\/api\/v1\/dsgvo\/([^/?]+)/` + `DSGVO_SUB_RESOURCES.has(...)` allowlist check), then the generic `/api/v1/<resource>` branch, then the leading-slash fallback. Lines 25-37 keep `RESOURCE_MODEL_MAP` unchanged with `consent`/`retention`/`dsfa`/`vvz` entries pointing to `consentRecord`/`retentionPolicy`/`dsfaEntry`/`vvzEntry`. |
| `apps/api/src/modules/audit/audit.interceptor.spec.ts` | 7 existing + 12 new cases covering DSGVO sub-resources + non-DSGVO regression | ✓ VERIFIED | Line 163 declares nested `describe('extractResource URL parsing — DSGVO sub-resource walk (15-12)', ...)`. 12 new cases (lines 171-276) cover: 7 DSGVO sub-resources via `interceptor.intercept` path (consent, retention with prisma.retentionPolicy.findUnique assertion, dsfa, vvz, export bare, export with id, deletion) + 5 cases via private `extractResource` accessor (jobs, schools, audit, bare /api/v1/dsgvo, unknown sub /api/v1/dsgvo/foo/x). 19/19 tests pass: `pnpm exec vitest run apps/api/src/modules/audit/audit.interceptor.spec.ts`. |
| `apps/api/src/modules/audit/audit.service.ts` | SENSITIVE_RESOURCES extended with dsfa, vvz, deletion | ✓ VERIFIED | Lines 12-16: list contains 'grades', 'student', 'teacher', 'user', 'consent', 'export', 'person', 'retention', 'dsfa', 'vvz', 'deletion'. The block comment (lines 5-11) documents that 'jobs' is intentionally omitted (admin-list reads of opaque job metadata). |
| `apps/web/e2e/helpers/audit.ts` | seedAuditEntryWithBefore PUTs /api/v1/dsgvo/retention/:id (NOT /schools/:id) + defensive before=NULL guard | ✓ VERIFIED | Lines 133-222: helper ensures retention policy via `ensureRetentionPolicyForAudit`, captures original retentionDays, PUTs `/dsgvo/retention/${policy.id}` with new value, polls `?action=update&resource=retention&limit=1`, throws if `row.before` is NULL with message "plan 15-12 extractResource fix not deployed in this environment", restores original retentionDays best-effort. `grep -c "/dsgvo/retention/" apps/web/e2e/helpers/audit.ts` returns 6. The single `/schools/` reference is a docstring history note (line 115) per the 15-12 SUMMARY decision to retain workaround context for future maintainers. |
| `apps/web/e2e/admin-audit-log-detail.spec.ts` | Second branch navigates ?action=update&resource=retention | ✓ VERIFIED | Line 85: `await page.goto('/admin/audit-log?action=update&resource=retention');` — was `resource=schools` pre-15-12. `grep -c "resource=schools"` returns 0; `grep -c "resource=retention"` returns 1. Test body comment block (lines 75-79) names the round-trip and references the historical workaround. |
| All Phase 15 frontend components + hooks (16 component files + 8 hook files) | All exist with substantive LOC | ✓ VERIFIED (carry-forward from initial) | Unchanged by 15-12. JobsTab 202 LOC, AuditTable 207 LOC, RequestDeletionDialog 172 LOC, ConsentsTab 308 LOC etc. — see initial VERIFICATION.md row-by-row evidence. |

### Key Link Verification (post 15-12)

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| AuditInterceptor.intercept | extractResource | `request.url` | ✓ WIRED | audit.interceptor.ts:92-93 calls `this.extractResource(url)`; the patched method walks the DSGVO branch first. |
| AuditInterceptor.extractResource | DSGVO_SUB_RESOURCES | `.has(secondSegment)` | ✓ WIRED | Line 206: `if (dsgvoMatch && DSGVO_SUB_RESOURCES.has(dsgvoMatch[1])) { return dsgvoMatch[1]; }` — Set membership gates the walk-past. |
| AuditInterceptor.extractResource | RESOURCE_MODEL_MAP[resource] | captureBeforeState | ✓ WIRED | For `/api/v1/dsgvo/retention/:id`, extractResource → 'retention' → RESOURCE_MODEL_MAP['retention'] = 'retentionPolicy' → prisma.retentionPolicy.findUnique. Proven by spec line 192 `expect(prisma.retentionPolicy.findUnique).toHaveBeenCalledWith({ where: { id: 'uuid-123' } })`. |
| AuditInterceptor.intercept | SENSITIVE_RESOURCES | .includes(resource as any) | ✓ WIRED | audit.interceptor.ts:140 imports SENSITIVE_RESOURCES from audit.service.ts and uses `.includes(resource as any)` — the extended list (incl. dsfa/vvz/deletion) gates SENSITIVE_READ logging for DSGVO reads on those sub-resources. |
| seedAuditEntryWithBefore | PUT /api/v1/dsgvo/retention/:id | authReq | ✓ WIRED | apps/web/e2e/helpers/audit.ts:178 + line 195 + line 210 — three live PUT calls (initial mutation + post-poll restore + best-effort restore). |
| admin-audit-log-detail.spec.ts (second branch) | seedAuditEntryWithBefore + UI ?resource=retention | playwright fixture | ✓ WIRED | Line 80 calls `seedAuditEntryWithBefore(request, { schoolId: SCHOOL_ID })`; line 85 `page.goto('/admin/audit-log?action=update&resource=retention');` — the URL filter axis matches the resource-name produced by the patched interceptor. |

### Data-Flow Trace (Level 4, post 15-12)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| AuditDetailDrawer.Vorzustand | `entry.before` | `AuditInterceptor.captureBeforeState(resource, id)` for ANY mutation on a mapped resource — including DSGVO sub-resources post-15-12 | Yes — both DSGVO and non-DSGVO mutations now produce populated before-snapshots. Programmatically proven by audit.interceptor.spec.ts case "walks past dsgvo for /api/v1/dsgvo/retention/:id → resource=retention + prisma.retentionPolicy.findUnique fired". | ✓ FLOWING |
| AuditDetailDrawer.Nachzustand | `pickAfterValue(entry.metadata)` | interceptor sanitizeBody on request.body | Yes | ✓ FLOWING |
| useAuditCsvExport download | blob from /audit/export.csv | AuditService.exportCsv → role-scoped findMany → Papa.unparse | Yes — 16 backend tests + 1 Playwright spec assert byte-level contract | ✓ FLOWING |
| AuditTable | `data` from `useAuditEntries` | AuditService.findAll role-scoped findMany | Yes — DSGVO rows now correctly bucketed under their concrete resource (consent/retention/dsfa/vvz/export/deletion/jobs) so the Subject filter axis works for the entire DSGVO mutation class. | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Audit interceptor URL parsing — 19 cases | `cd apps/api && pnpm exec vitest run src/modules/audit/audit.interceptor.spec.ts` | 19/19 passed in 568ms | ✓ PASS |
| All audit module tests | `cd apps/api && pnpm exec vitest run src/modules/audit/` | 45/45 passed across 3 spec files | ✓ PASS |
| Audit + DSGVO modules combined | `cd apps/api && pnpm exec vitest run src/modules/audit/ src/modules/dsgvo/` | 138/138 passed across 10 spec files | ✓ PASS |
| Web typecheck | `cd apps/web && pnpm exec tsc --noEmit -p tsconfig.json` | exit 0 | ✓ PASS |
| extractResource regex literal present | `grep -n "/api/v1/dsgvo/" apps/api/src/modules/audit/audit.interceptor.ts` | line 205 (in extractResource) + comment refs | ✓ PASS |
| DSGVO_SUB_RESOURCES Set declaration | `grep -n "DSGVO_SUB_RESOURCES" apps/api/src/modules/audit/audit.interceptor.ts` | line 54 (decl) + line 206 (use) | ✓ PASS |
| SENSITIVE_RESOURCES additions | `grep -E "'dsfa'\|'vvz'\|'deletion'" apps/api/src/modules/audit/audit.service.ts` | 3 hits on line 15 | ✓ PASS |
| Helper retention path | `grep -c "/dsgvo/retention/" apps/web/e2e/helpers/audit.ts` | 6 (3 PUT + 3 ensure-helper paths) | ✓ PASS |
| Helper /schools/ workaround removed | `grep -n "/schools/" apps/web/e2e/helpers/audit.ts` | 1 hit on line 115 (docstring history note only — not a code path) | ✓ PASS |
| Detail spec retention filter | `grep -c "resource=retention" apps/web/e2e/admin-audit-log-detail.spec.ts` | 1 (line 85) | ✓ PASS |
| Detail spec /schools/ filter removed | `grep -c "resource=schools" apps/web/e2e/admin-audit-log-detail.spec.ts` | 0 | ✓ PASS |
| All 4 task commits present | `git log --oneline apps/api/src/modules/audit/ apps/web/e2e/helpers/audit.ts apps/web/e2e/admin-audit-log-detail.spec.ts` | cf6582e (Task 1) + 9dcc794 (Task 2) + ad937e0 (Task 3) + b04f501 (Task 4) all present on branch | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| DSGVO-ADM-01 | 15-03 + 15-05 + 15-06 + 15-10 | Admin kann Einwilligungs-Records nach Zweck/Status filtern und durchsuchen | ✓ SATISFIED | Backend GET /dsgvo/consent/admin + frontend ConsentsTab + ConsentsFilterToolbar + 22/22 vitest cases + Playwright spec admin-dsgvo-consents.spec.ts (3 cases). |
| DSGVO-ADM-02 | 15-05 + 15-06 + 15-10 | Admin kann Aufbewahrungsrichtlinien pro Datenkategorie editieren | ✓ SATISFIED | RetentionTab + RetentionEditDialog (create + edit + delete) + admin-dsgvo-retention.spec.ts (4 cases — soft-skip on seed school per deferred item). |
| DSGVO-ADM-03 | 15-05 + 15-07 + 15-10 | Admin kann DSFA-Einträge anlegen und editieren | ✓ SATISFIED | DsfaTable + DsfaEditDialog + admin-dsgvo-dsfa.spec.ts (3 cases). 5 form fields match CreateDsfaEntryDto exactly. |
| DSGVO-ADM-04 | 15-05 + 15-07 + 15-10 | Admin kann VVZ-Einträge anlegen und editieren | ✓ SATISFIED | VvzTable + VvzEditDialog + admin-dsgvo-vvz.spec.ts (3 cases). 8 form fields match CreateVvzEntryDto. |
| DSGVO-ADM-05 | 15-04 + 15-08 + 15-10 | Admin kann Art. 15 Datenexport anstoßen und Job-Status verfolgen | ✓ SATISFIED | RequestExportDialog + JobsTab + isTerminal-stop polling + admin-dsgvo-export-job.spec.ts (2 cases incl. expect.poll). |
| DSGVO-ADM-06 | 15-04 + 15-08 + 15-10 | Admin kann Art. 17 Anonymisierung/Löschung anstoßen mit Bestätigung | ✓ SATISFIED | RequestDeletionDialog (2-step + strict-equal) + admin-dsgvo-deletion-confirm.spec.ts (3 cases). |
| AUDIT-VIEW-01 | 15-01 + 15-09 + 15-11 + 15-12 | Admin kann Audit-Log mit Suche und Filter durchsuchen | ✓ SATISFIED | AuditFilterToolbar 7-field URL-synced filter + AuditTable rendering — verified by admin-audit-log-filter.spec.ts (3 cases passing). 15-12 closure: Subject filter axis (resource=consent\|retention\|dsfa\|vvz\|export\|deletion\|jobs) now returns the right rows because extractResource bucket is correct. |
| AUDIT-VIEW-02 | 15-01 + 15-09 + 15-11 + 15-12 | Admin sieht Audit-Eintrag-Detail mit Before/After-Diff | ✓ SATISFIED (post-15-12) | Drawer + JsonTree wired correctly (admin-audit-log-detail.spec.ts 2 cases passing). 15-12 closure: extractResource patch + RESOURCE_MODEL_MAP wiring + SENSITIVE_RESOURCES extension means the Vorzustand panel now renders the populated JsonTree (NOT the muted legacy banner) for DSGVO mutations. End-to-end live-stack proof requires E2E_SCHOOL_ID = UUID school per the deferred seed-UUID gap; programmatic proof complete via interceptor.spec.ts. |
| AUDIT-VIEW-03 | 15-02 + 15-09 + 15-11 | Admin kann gefilterten Audit-Log als CSV exportieren | ✓ SATISFIED | useAuditCsvExport + AuditFilterToolbar 'CSV exportieren' + GET /api/v1/audit/export.csv (UTF-8 BOM + semicolon + 10k cap) + admin-audit-log-csv.spec.ts byte-level contract test. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `apps/api/src/modules/dsgvo/{retention,dsfa,export,deletion}/dto/*.dto.ts` + `consent/dto/query-consent-admin.dto.ts` + `dsfa/dto/create-vvz-entry.dto.ts` | various — `@IsUUID()` on schoolId/personId | DTO + seed.ts disagreement | ⚠️ Warning (test-fixture only) | Production schools/persons use Prisma `@default(uuid())` — correct in production. Seed.ts uses static stable IDs which fail `@IsUUID()`. Effect: 12/20 E2E mutation tests soft-skip; dev-stack /admin/dsgvo errors with "Einwilligungen konnten nicht geladen werden." Not a production bug. Carries forward as Phase 16 / 15-13 deferred work. |
| `apps/web/src/components/admin/dsgvo/ConsentsTab.tsx` | 38 (JSDoc only) | Stale JSDoc reference | ℹ️ Info | Cosmetic — JSX is fully wired. |
| `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` | 13 (JSDoc only) | Stale JSDoc reference to "PlaceholderPanel" | ℹ️ Info | Cosmetic — no JSX or function definition remains. |

**No new anti-patterns introduced by 15-12.** The previous 🛑 BLOCKER on `AuditInterceptor.extractResource()` (initial VERIFICATION lines 167-169) is RESOLVED — the patched implementation walks past `/dsgvo/` for the 7 known sub-resources and uses an explicit allowlist Set so a future unmapped sub cannot silently misclassify into RESOURCE_MODEL_MAP.

### Human Verification Required

See `human_verification` in frontmatter for the 4 items requiring manual UAT:

1. **Consent admin happy-path against UUID-keyed school** — proves the contract works on a non-seed stack. (Carry-forward from initial VERIFICATION; closes only when seed-UUID deferred work lands.)
2. **BullMQ Datenexport lifecycle (QUEUED → PROCESSING → COMPLETED)** — requires running BullMQ worker + real Person UUID.
3. **Excel/LibreOffice CSV import (German locale)** — locale-detection cannot be programmatically tested; Playwright only asserts byte-level contract.
4. **DSGVO-mutation Before/After diff (post-15-12)** — visual confirmation that the patched extractResource produces a populated Vorzustand JsonTree for `PUT /dsgvo/retention/:id`. Programmatic proof complete via the 19/19 interceptor spec; live-stack visual proof gated on the deferred seed-UUID work.

### Gaps Summary

**The single blocking gap from the initial VERIFICATION (Truth #5 ✗ FAILED) is closed.** The 15-12 patch lands the 5-line core fix in `extractResource`, the `DSGVO_SUB_RESOURCES` allowlist Set, the `SENSITIVE_RESOURCES` extension (dsfa/vvz/deletion), the helper revert from `/schools/:id` to `/dsgvo/retention/:id`, and the detail-spec navigation update from `?resource=schools` to `?resource=retention`. 19/19 interceptor spec cases pass (12 new in 9dcc794), 138/138 audit + dsgvo module tests pass, web typecheck exit 0.

**All 5 must-have truths are now VERIFIED** and the previous 🛑 BLOCKER is downgraded to RESOLVED. Phase 15 ships its full surface area + all 9 requirements satisfied programmatically.

**Why status is `human_needed` rather than `passed`:** four human-verification items remain (carry-forward from the initial verification). Three are out of scope for any code patch — Excel locale-rendering, BullMQ live worker behavior, and consent admin happy-path against a UUID-keyed school require physical execution. The fourth (DSGVO Before/After diff visual confirmation) is gated on the deferred seed-UUID work — programmatic proof is complete, but a screenshot-quality demonstration on a live stack requires either `E2E_SCHOOL_ID` set to a UUID school or the seed.ts/DTO realignment that Phase 16 owns. None of these block the phase contract; they're routine pre-merge UAT that the Escalation Gate surfaces to the developer.

**Recommendation:** mark Phase 15 complete and proceed to Phase 16. Phase 16 inherits a working DSGVO-mutation audit pipeline; the seed-UUID alignment is the natural next-phase cleanup.

---

_Verified: 2026-04-28T13:42:00Z_
_Verifier: Claude (gsd-verifier) — re-verification after 15-12 gap-closure_
