---
phase: 15
slug: dsgvo-admin-audit-log-viewer
mode: add_plans
preserved: [15-01, 15-02]
created: 2026-04-26
---

# Phase 15 — Plan Outline (NEW plans only)

> Outline für die noch offenen Pläne. `15-01` (audit-schema-interceptor) und `15-02` (audit-csv-export) sind bereits geshipped/locked und werden in dieser Outline NICHT erneut aufgeführt.
>
> Wave-Strategie folgt dem Backend-vor-Frontend-vor-E2E Pattern aus den Phasen 11/12/13/14:
> - **Wave 1:** Backend-Gaps (D-08 Consent admin filter, D-23 DSGVO-Jobs school-wide list) — Prerequisites für die Frontend-Tabs.
> - **Wave 2:** Frontend Foundation + 4 DSGVO-Tabs + Audit-Log-Page (parallelisiert auf Komponenten-Boundaries ohne file_modified-Overlap).
> - **Wave 3:** Playwright E2E-Suiten gegen die VALIDATION.md `## Per-Task Verification Map`.

## Plan Table

| Plan ID | Objective (one line) | Wave | Depends On | Requirements |
|---------|---------------------|------|------------|--------------|
| 15-03-consent-admin-filter | ConsentService admin findAll mit purpose/status/personSearch + tenant-required schoolId DTO + role-scoped controller route (D-08, Pitfall 4 schoolId silent leak) | 1 | [] | DSGVO-ADM-01 (backend) |
| 15-04-dsgvo-jobs-list-endpoint | Greenfield `apps/api/src/modules/dsgvo/jobs/` module mit `GET /dsgvo/jobs?status&jobType&page&limit` school-scoped (D-23) inkl. Person-Join für admin Jobs-Tab | 1 | [] | DSGVO-ADM-05 (backend list), DSGVO-ADM-06 (backend list) |
| 15-05-frontend-foundation | Routes (`dsgvo.tsx` + `audit-log.tsx`) mit `validateSearch` Zod, `DsgvoTabs.tsx` Shell + Tab-Routing via `Route.useSearch()` (D-04+D-26), `AppSidebar.tsx` 2 admin-Einträge (D-22), CRUD-Hooks (`useConsents`, `useRetention`, `useDsfa`, `useVvz`) | 2 | [15-03] | DSGVO-ADM-01 (route+nav), DSGVO-ADM-02 (hooks), DSGVO-ADM-03 (hooks), DSGVO-ADM-04 (hooks) |
| 15-06-consents-retention-tabs | `ConsentsTab.tsx` (filter toolbar + native table + `data-consent-id`/`data-consent-status` per D-21) + `RetentionTab.tsx` + `RetentionEditDialog.tsx` mit destructive-confirm Pattern aus UI-SPEC | 2 | [15-05] | DSGVO-ADM-01 (UI), DSGVO-ADM-02 (UI) |
| 15-07-dsfa-vvz-tab | `DsfaVvzTab.tsx` mit nested `<Tabs>` (sub=`dsfa`/`vvz` per UI-SPEC) + `DsfaTable`/`DsfaEditDialog` + `VvzTable`/`VvzEditDialog` (Textarea + RHF/Zod, body-less DELETE per Pitfall 2) | 2 | [15-05] | DSGVO-ADM-03 (UI), DSGVO-ADM-04 (UI) |
| 15-08-jobs-tab-and-art17-dialogs | `JobsTab.tsx` (status-Badge color map per UI-SPEC) + `useDsgvoJobs`/`useDsgvoExportJob`/`useDsgvoDeletionJob` mit terminal-stop polling (D-13/D-14) + `RequestExportDialog.tsx` + `RequestDeletionDialog.tsx` mit 2-Step internal state machine + email-token strict-equal (D-19, UI-SPEC destructive-escalation) | 2 | [15-04, 15-05] | DSGVO-ADM-05 (UI+polling), DSGVO-ADM-06 (UI+2-step) |
| 15-09-audit-log-frontend | `audit-log.tsx` Route + `AuditFilterToolbar.tsx` (date-range via paired `<Input type=date>` + cmdk multi-select Aktion) + `AuditTable.tsx` + `AuditDetailDrawer.tsx` (Sheet primitive) + `JsonTree.tsx` (~30 LOC recursive, no library) + `useAuditEntries`/`useAuditCsvExport` (blob-download mit BOM-aware filename parser) | 2 | [15-05] | AUDIT-VIEW-01 (UI), AUDIT-VIEW-02 (UI), AUDIT-VIEW-03 (UI) |
| 15-10-dsgvo-e2e-suite | 7 Playwright-Specs: `admin-dsgvo-consents.spec.ts` + `admin-dsgvo-retention.spec.ts` + `admin-dsgvo-dsfa.spec.ts` + `admin-dsgvo-vvz.spec.ts` + `admin-dsgvo-export-job.spec.ts` + `admin-dsgvo-deletion-confirm.spec.ts` + `admin-dsgvo-rbac.spec.ts` (schulleitung lockout) — Phase 14 RBAC-template + `--workers=1` per Pitfall 6 + Wave-0 helper `apps/web/e2e/helpers/dsgvo.ts` | 3 | [15-06, 15-07, 15-08] | DSGVO-ADM-01..06 (E2E coverage) |
| 15-11-audit-log-e2e-suite | 3 Playwright-Specs: `admin-audit-log-filter.spec.ts` (URL deep-link reflection) + `admin-audit-log-detail.spec.ts` (legacy NULL-before banner + neuer entry mit before+after JsonTree, seedet via Wave-0-Helper `seedAuditEntryLegacy`) + `admin-audit-log-csv.spec.ts` (download.suggestedFilename + first-line-header + BOM-Assert) | 3 | [15-09] | AUDIT-VIEW-01 (E2E), AUDIT-VIEW-02 (E2E), AUDIT-VIEW-03 (E2E) |

## Coverage Audit (vs phase requirements)

| Requirement | Backend Plan | Frontend Plan | E2E Plan |
|-------------|--------------|---------------|----------|
| DSGVO-ADM-01 | 15-03 | 15-05 (hook) + 15-06 (UI) | 15-10 |
| DSGVO-ADM-02 | (existing — RetentionController) | 15-05 (hook) + 15-06 (UI) | 15-10 |
| DSGVO-ADM-03 | (existing — dsfa.controller.ts) | 15-05 (hook) + 15-07 (UI) | 15-10 |
| DSGVO-ADM-04 | (existing — dsfa.controller.ts:50-84) | 15-05 (hook) + 15-07 (UI) | 15-10 |
| DSGVO-ADM-05 | 15-04 (list) + (existing per-id) | 15-08 (UI + polling) | 15-10 |
| DSGVO-ADM-06 | 15-04 (list) + (existing per-id) | 15-08 (2-step + token) | 15-10 |
| AUDIT-VIEW-01 | 15-01 (action filter — DONE) | 15-09 (toolbar + table) | 15-11 |
| AUDIT-VIEW-02 | 15-01 (interceptor + before col — DONE) | 15-09 (drawer + JsonTree) | 15-11 |
| AUDIT-VIEW-03 | 15-02 (CSV endpoint — DONE) | 15-09 (download hook) | 15-11 |

Jede Phase-15 Requirement-ID erscheint in mindestens einem Plan (Backend + Frontend + E2E). Keine GAPS.

## Wave Parallelism Notes

**Wave 1 parallelism:** `15-03` und `15-04` haben keinen `files_modified`-Overlap (verschiedene Module: `consent/` vs `jobs/`) → laufen parallel.

**Wave 2 parallelism:**
- `15-05` muss zuerst (foundation): erstellt Routes + Shell + Hooks-Datei für die Children
- Nach `15-05` parallelisierbar: `15-06`, `15-07`, `15-09` (Audit-Log) — jeweils eigene Komponenten-Subdirectories ohne Overlap
- `15-08` braucht ZUSÄTZLICH `15-04` (Jobs-list endpoint) → kann erst starten wenn beide Predecessor wave-1 backend gaps grün sind, läuft dann aber parallel zu 15-06/07/09

**Wave 3 parallelism:**
- `15-10` und `15-11` parallel — keine file overlaps (verschiedene spec-Dateien, eigene helpers per page object)

## Risks

- **Plan 15-08 Komplexität:** RequestDeletionDialog mit 2-Step state machine + token-validation ist die anspruchsvollste UI-Komponente — falls beim Detail-Plan-Drilldown >3 tasks nötig, könnte Plan in 15-08a (JobsTab + list polling) und 15-08b (Art-17 dialog + per-id polling) gesplittet werden.
- **Plan 15-10 Spec-Anzahl:** 7 specs in einem Plan ist über dem 2-3-tasks-Soft-Limit. Strategie: jeder spec als eigene `<task>` (file = spec + page-object) — falls Context-Cost >50% schätzbar, splitten in 15-10a (CRUD specs: consents/retention/dsfa/vvz) und 15-10b (Job-Tracking + 2-Step + RBAC). Detail-Plan-Schritt entscheidet.

## OUTLINE COMPLETE

Plan count: 9
