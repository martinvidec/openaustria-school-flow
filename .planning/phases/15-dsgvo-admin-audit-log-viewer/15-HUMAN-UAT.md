---
status: partial
phase: 15-dsgvo-admin-audit-log-viewer
source: [15-VERIFICATION.md]
started: 2026-04-28T13:42:00Z
updated: 2026-04-28T13:42:00Z
note: "All 4 items have shipped E2E coverage. Listed here for /gsd:progress + /gsd:audit-uat tracking only — NOT a manual UAT request (per E2E-first directive 2026-04-21)."
---

## Current Test

[awaiting human testing — not gating phase completion per E2E-first directive]

## Tests

### 1. Consent admin happy-path against UUID-keyed school
expected: GET /admin/dsgvo (Einwilligungen tab) renders rows when current school has a UUID id; filter toolbar (Zweck/Status/Person) updates URL + result set without 4xx errors.
e2e_coverage: apps/web/e2e/admin-dsgvo-consents.spec.ts (3 cases — currently soft-skipped on seed school per deferred seed-UUID gap)
result: [pending — gated on Phase 16 / 15-13 seed-UUID alignment]

### 2. BullMQ Datenexport lifecycle (QUEUED → PROCESSING → COMPLETED)
expected: From ConsentsTab → "Datenexport anstoßen" → POST /api/v1/dsgvo/export creates job; JobsTab row transitions QUEUED → PROCESSING → COMPLETED; useDsgvoExportJob polls until terminal state.
e2e_coverage: apps/web/e2e/admin-dsgvo-export-job.spec.ts (2 cases incl. expect.poll terminal-stop assertion)
result: [pending — requires live BullMQ worker + Person UUID]

### 3. Excel/LibreOffice CSV import (German locale)
expected: Audit-Log "CSV exportieren" download opens cleanly in Excel + LibreOffice with German Umlaute intact, semicolon delimiter respected, date columns parsed as dates.
e2e_coverage: apps/web/e2e/admin-audit-log-csv.spec.ts (byte-level: UTF-8 BOM + ; delimiter + 10k cap)
result: [pending — locale rendering is a true human-only assertion; byte contract programmatically proven]

### 4. DSGVO-mutation Before/After diff visual confirmation (post-15-12)
expected: After the 15-12 patch lands on a live stack, /admin/audit-log entry detail for a `PUT /dsgvo/retention/:id` mutation shows a populated Vorzustand JsonTree (NOT the muted "Vorzustand wurde nicht erfasst" banner).
e2e_coverage: apps/web/e2e/admin-audit-log-detail.spec.ts (2 cases — programmatic proof) + apps/api src/modules/audit/audit.interceptor.spec.ts (19/19, 12 new in commit 9dcc794)
result: [pending — visual proof gated on E2E_SCHOOL_ID = UUID school OR Phase 16 seed-UUID alignment]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

(none — all 4 items carry forward unchanged from initial 15-VERIFICATION.md; all are gated on either Phase 16 seed-UUID cleanup or genuinely human-only locale-rendering checks. Programmatic E2E + unit-test coverage exists for every item.)
