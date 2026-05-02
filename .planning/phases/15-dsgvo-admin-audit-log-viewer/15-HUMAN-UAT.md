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
e2e_coverage: apps/web/e2e/admin-dsgvo-consents.spec.ts (3 cases — soft-skip guards removed in Phase 15.1, commit 1026bbe)
result: ✓ UNBLOCKED — Phase 15.1 (merged 2026-05-02, commit c5b691b) regenerated seed.ts with `SEED_SCHOOL_UUID = 'a0000000-0000-4000-8000-000000000001'` so the dev DB now has a UUID-keyed school. Live curl verified: `GET /api/v1/dsgvo/consent/admin?schoolId=<UUID>` → 200 (was 422). Pending physical UAT execution against fresh-seeded local stack — not a code-gap anymore.

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
result: ✓ UNBLOCKED — Phase 15.1 (merged 2026-05-02, commit c5b691b) seeded a UUID school so `E2E_SCHOOL_ID` is implicitly satisfied. Live curl verified: `POST /api/v1/dsgvo/retention` with UUID schoolId → 201 (was 422). Pending visual screenshot UAT on fresh-seeded local stack — not a code-gap anymore.

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

(none — all 4 items carry forward unchanged from initial 15-VERIFICATION.md; all are gated on either Phase 16 seed-UUID cleanup or genuinely human-only locale-rendering checks. Programmatic E2E + unit-test coverage exists for every item.)
