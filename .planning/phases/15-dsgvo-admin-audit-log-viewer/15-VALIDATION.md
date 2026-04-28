---
phase: 15
slug: dsgvo-admin-audit-log-viewer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: distilled from `15-RESEARCH.md` § 9 (Validation Architecture).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (apps/api + apps/web both pinned to ^4); Playwright 1.x for E2E |
| **Config files** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts` |
| **Quick run command** | `pnpm --filter @schoolflow/api test` (api unit + integration) |
| **Full suite command** | `pnpm test` (root) + `pnpm --filter @schoolflow/web e2e --workers=1` |
| **Estimated runtime** | ~60s api unit; ~180s web E2E (workers=1) |
| **E2E helpers** | `apps/web/e2e/helpers/login.ts` (`loginAsAdmin`, `loginAsRole`) |
| **Workers=1 mandatory** | Per Phase 14 lesson (`STATE.md:206`) — Playwright must run serial to avoid auth-state races |

---

## Sampling Rate

- **After every task commit:** `pnpm --filter @schoolflow/api test --reporter=basic` (changed-file-related specs)
- **After every plan wave:** `pnpm --filter @schoolflow/api test && pnpm --filter @schoolflow/web test`
- **Before `/gsd:verify-work`:** Full unit + integration green AND `pnpm --filter @schoolflow/web e2e --workers=1` green
- **Max feedback latency:** ~60 seconds for api quick-run

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Status |
|--------|----------|-----------|-------------------|-------------|
| DSGVO-ADM-01 | Consent admin filter returns rows matching purpose+status+search; tenant-scoped | unit + integration | `pnpm --filter @schoolflow/api test consent.service.spec` | extend existing `consent.service.spec.ts` |
| DSGVO-ADM-01 | UI: filter input → table updates → toast.error on 4xx | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-consents.spec.ts --workers=1` | ❌ NEW spec |
| DSGVO-ADM-02 | Retention CRUD round-trip via UI | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-retention.spec.ts --workers=1` | ❌ NEW spec |
| DSGVO-ADM-03 | DSFA create → list → edit → delete via UI | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-dsfa.spec.ts --workers=1` | ❌ NEW spec |
| DSGVO-ADM-04 | VVZ create → list → edit → delete via UI | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-vvz.spec.ts --workers=1` | ❌ NEW spec (or merged with DSFA) |
| DSGVO-ADM-05 | UI request-export → polling → terminal status → download link | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-export-job.spec.ts --workers=1` | ❌ NEW spec |
| DSGVO-ADM-06 | UI 2-stage confirmation: dialog open → wrong token disables submit → correct email enables → POST sent → polling | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-deletion-confirm.spec.ts --workers=1` | ❌ NEW spec |
| AUDIT-VIEW-01 | Filter toolbar: each combination produces correct row set; URL search-params reflect filters (deep-link) | E2E | `pnpm --filter @schoolflow/web e2e admin-audit-log-filter.spec.ts --workers=1` | ❌ NEW spec |
| AUDIT-VIEW-02 | Detail drawer opens; legacy entry shows "no snapshot" hint; new entry shows before+after JSON trees | E2E | `pnpm --filter @schoolflow/web e2e admin-audit-log-detail.spec.ts --workers=1` | ❌ NEW spec |
| AUDIT-VIEW-03 | Click "CSV exportieren" → download triggers → filename matches pattern → first line is header → BOM present | E2E | `pnpm --filter @schoolflow/web e2e admin-audit-log-csv.spec.ts --workers=1` | ❌ NEW spec |
| Backend: AuditService.exportCsv | Filter respect; semicolon delimiter (D-25); UTF-8 BOM; tenant-scoped | unit | `pnpm --filter @schoolflow/api test audit.service.spec` | extend existing |
| Backend: AuditInterceptor pre-state | UPDATE on `consent` row stores pre-state JSON in `audit_entries.before`; DELETE captures pre-state; legacy/unmapped resources leave NULL | integration | `pnpm --filter @schoolflow/api test audit.interceptor.spec` | ❌ NEW spec |
| Backend: GET /audit/export.csv | Returns `text/csv`, `Content-Disposition: attachment`, BOM + header | integration (Supertest) | `pnpm --filter @schoolflow/api test audit.controller.e2e-spec` | ❌ NEW spec |
| Backend: GET /dsgvo/jobs (D-23) | school-wide list with status+jobType filters; tenant-scoped | unit + integration | `pnpm --filter @schoolflow/api test dsgvo-jobs.service.spec` | ❌ NEW spec |
| RBAC negative | schulleitung cannot see `/admin/dsgvo` or `/admin/audit-log` sidebar entries; direct URL hit returns no UI | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-rbac.spec.ts --workers=1` | ❌ NEW spec; pattern from `admin-solver-tuning-rbac.spec.ts` |

*Status legend: ✅ green · ❌ red / not yet created · ⚠️ flaky · ⬜ pending*

---

## Wave 0 Requirements

- [ ] `apps/web/e2e/helpers/dsgvo.ts` — shared seed helpers (`createConsent` via API, `createPersonForExport`, `seedAuditEntryLegacy` for AUDIT-VIEW-02 NULL-before case)
- [ ] `apps/api/src/modules/audit/audit.interceptor.spec.ts` — does not exist; required for the refactor (D-10 + D-24 PII no-redact assertion)
- [ ] `apps/api/src/modules/audit/audit.controller.e2e-spec.ts` — does not exist; required for CSV endpoint
- [ ] `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts` — required for new D-23 endpoint
- [x] No new framework install needed — Vitest 4 + Playwright 1.x already configured

---

## Test Patterns to Mirror

- **Phase 10.5 `rooms-booking.spec.ts`** — pre-seed minimal data via authenticated API requests in `beforeAll`, throwaway data scoped by name pattern, `afterAll` cleanup
- **Phase 14 `admin-solver-tuning-catalog.spec.ts`** — `data-*` selectors, role-scoped `loginAsAdmin`, German label assertions, deep-link via `?tab=…` URL
- **Phase 14 `admin-solver-tuning-rbac.spec.ts`** — schulleitung negative case template (sidebar absence + direct URL hit shows no UI)
- **Phase 14 `admin-solver-tuning-audit.spec.ts`** — asserting AuditEntry row shape after a UI action (`page.request.get('/api/v1/audit?…')`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| German Excel opens CSV with semicolon delimiter without Import-Wizard | DSGVO-ADM-03 (D-25) | E2E asserts download + first-line shape; DACH/Excel UX validation requires actual Excel | After `/admin/audit-log` CSV export: open downloaded `.csv` file in Excel/LibreOffice with German locale → confirm columns auto-split (no Import-Wizard) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (4 items above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for api unit
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
