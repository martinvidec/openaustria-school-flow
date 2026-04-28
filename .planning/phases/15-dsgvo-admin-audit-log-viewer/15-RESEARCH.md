# Phase 15: DSGVO-Admin & Audit-Log-Viewer — Research

**Researched:** 2026-04-26
**Domain:** Admin-Surface (TanStack-Router + shadcn) wiring against existing DSGVO + Audit backend modules; one new Prisma migration; one new CSV-export endpoint; interceptor refactor for pre-mutation snapshots.
**Confidence:** HIGH (every CONTEXT.md gap claim verified by reading the source files cited; only one CONTEXT-level inaccuracy surfaced — see §1 D-04 finding).

---

## Summary

CONTEXT.md’s 22 locked decisions are almost entirely accurate against the live codebase. Three substantive findings warrant the planner’s attention:

1. **CONTEXT.md D-04 ("`useTab` hook") is fictional.** No `useTab` hook exists in the repo. The Phase 14 reference (`SolverTuningTabs.tsx`) uses local `useState` seeded from a route-level Zod search param (`Route.useSearch()`). Phase 15 should mirror this pattern verbatim — no hook to import.
2. **Hidden 5th backend gap surfaced.** `DsgvoJob` has NO school-wide list endpoint. Only `GET /dsgvo/export/person/:personId` and `GET /dsgvo/deletion/person/:personId` exist. The Phase 15 "Jobs" tab (D-02) cannot show "all DSGVO jobs across the school" without a new `GET /dsgvo/jobs` endpoint. The CONTEXT.md "no-gap" claim in D-07 covers _per-id status_ only, not _list_.
3. **`papaparse` is already an `apps/api` dependency** (used by `import/parsers/csv.parser.ts`). `Papa.unparse(data)` returns a string — D-18’s "hand-rolled vs csv-stringify" is moot. Use `Papa.unparse` (zero new deps, RFC-4180-compliant escaping for free).

Everything else (4-tab `PageShell`, BullMQ polling pattern, Sheet drawer for audit-detail, Date-Range via paired `<Input type="date">`, all CASL subjects already seeded for admin) is a direct mirror of patterns already shipped in Phases 10–14.

**Primary recommendation:** Plan a 3-wave phase: Wave 1 (backend gaps + migration + interceptor), Wave 2 (frontend tabs + hooks), Wave 3 (E2E suite). Treat the new `/dsgvo/jobs` endpoint as the same shape as `audit/findAll` (paginated school-scoped list with status filter).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page Structure & Navigation**
- **D-01:** Phase 15 ships als zwei separate Admin-Routes: `/admin/dsgvo` und `/admin/audit-log`. Sidebar bekommt zwei neue admin-only Einträge.
- **D-02:** `/admin/dsgvo` ist eine 4-Tab-Seite (`Einwilligungen` / `Aufbewahrung` / `DSFA-VVZ` / `Jobs`) — folgt dem `PageShell + Tabs` Muster aus `solver-tuning.tsx`.
- **D-03:** `/admin/audit-log` ist eine Single-Page-Liste mit Filter-Toolbar + Detail-Drawer (kein Tab-Layout — Audit-UX unterscheidet sich fundamental von CRUD-Tabs).
- **D-04:** Tab-Deep-Linking via `useTab` Hook analog zu Phase 14 SolverTuningTabs (URL search-param). _**Note from research:** The "`useTab` hook" does not exist in the repo. Phase 14 implements deep-linking via a route-level Zod `validateSearch` schema feeding `Route.useSearch()` into the Tabs component’s `useState` initializer. Plan should mirror this exact mechanism — no hook to import._

**Backend Scope**
- **D-05:** Genau ein realer Backend-Gap aus den ROADMAP-Kandidaten: `AuditService.exportCsv()` + `GET /audit/export.csv` Controller-Route fehlen und werden in Phase 15 implementiert (streaming, server-side, respektiert aktuelle Filter).
- **D-06:** DSFA + VVZ individuelle CRUD-Endpoints sind bereits vollständig (`dsfa.controller.ts`, `vvz.controller.ts`) — kein Gap-Fix nötig, Frontend konsumiert direkt. _**Note:** Both DSFA and VVZ live in the SAME controller `dsfa.controller.ts`. There is no separate `vvz.controller.ts`._
- **D-07:** BullMQ Job-Status-Read-Endpoints sind bereits vorhanden (`GET /dsgvo/export/:id`, `GET /dsgvo/deletion/:id`) — kein Gap-Fix nötig. _**Note:** True for per-id status. NOT true for school-wide listing — see §1 finding 2._
- **D-08:** Consent-Modul braucht eine Erweiterung: Admin-Filter-Endpoint nach Zweck/Status/User für DSGVO-ADM-01 (read+grant+withdraw existieren, aber kein admin-orientiertes findAll mit Filtern).

**Audit Before/After Diff**
- **D-09:** v1-Rendering ist "After-only" structured JSON tree mit Hinweis "Before-Snapshot wurde für diesen Eintrag nicht erfasst" wenn Pre-State fehlt.
- **D-10:** Phase 15 enthält einen Backend-Task zur Erweiterung von `AuditInterceptor`: pre-mutation state für UPDATE/DELETE wird ab sofort erfasst und in `AuditEntry.metadata.before` (Schema-Migration) gespeichert. Historische Einträge bleiben After-only — kein Retro-Fill.
- **D-11:** Schema-Migration für AuditEntry folgt der Migration-Hard-Rule (siehe CLAUDE.md): echte `prisma migrate dev`, keine `db push`.
- **D-12:** Side-by-side Diff via `react-diff-viewer-continued` ist explizit DEFERRED.

**Job-Status Live Tracking**
- **D-13:** DSGVO export/deletion Job-Tracking nutzt TanStack Query polling mit `refetchInterval: 2000` analog zu `useImport.ts:127-141`.
- **D-14:** Polling stoppt sobald Job-Status terminal ist (`completed`, `failed`, `cancelled`) — `refetchInterval: (data) => terminal ? false : 2000`.
- **D-15:** Socket.IO-Sidecar für DSGVO-Jobs ist OUT-OF-SCOPE für Phase 15.

**CSV Export**
- **D-16:** CSV wird server-side generiert via dedicated `GET /audit/export.csv` Endpoint, der die aktuellen Filter (query-params) auswertet und als `text/csv` streamt.
- **D-17:** Client-side CSV-Generierung aus paginierten Frontend-Results ist explizit ABGELEHNT.
- **D-18:** Implementation ohne neue Dependency: hand-rolled CSV-Escaping (RFC 4180) im Service. Falls Komplexität explodiert, `csv-stringify` als Fallback. _**Note from research:** `papaparse` IS already in `apps/api/package.json:44`. `Papa.unparse(rows)` produces RFC-4180 CSV with zero new deps. The "hand-rolled vs csv-stringify" decision is moot — use `Papa.unparse`. See §4._

**Art. 17 Confirmation Pattern**
- **D-19:** 2-stufige Bestätigung für Art. 17 Anonymisierung/Löschung: erste Bestätigung im Dialog ("Diese Aktion ist irreversibel"), zweite Bestätigung durch Eingabe des User-Namens oder Email-Adresse als Confirmation-Token.

**Frontend Patterns (carry-forward from Phase 14)**
- **D-20:** Mutation-Hooks haben `onError` mit `toast.error` (Phase 10.2-04 invariant).
- **D-21:** Tabellen-Zeilen tragen `data-*` Attribute für E2E-Selektoren.
- **D-22:** Sidebar-Einträge sind admin-only (`roles: ['admin']`).

### Claude's Discretion
- Konkretes Diff-Tree-Component-Design (Tailwind-Styling, Indent-Tiefe)
- CSV-Spalten-Reihenfolge und Header-Naming
- DSGVO-Tab-Default (welcher Tab ist initial selected)
- Dialog-Layout für 2-stufige Art-17-Confirmation (Single-Dialog mit Steps oder zwei separate Dialoge)
- Pagination-Strategie für Audit-Log (cursor vs offset — abhängig von existing audit.findAll)
- Error-State-Design für Job-Status-Polling-Failures

### Deferred Ideas (OUT OF SCOPE)
- Side-by-side Before/After Diff-Rendering mit `react-diff-viewer-continued` (Follow-up phase)
- Socket.IO Live-Tracking für DSGVO-Jobs (polling reicht für v1)
- Mobile-Härtung der DSGVO/Audit-Surfaces (Phase 16)
- Audit-Log Retention/Cleanup-UI (`AuditService.cleanup()` existiert backend, aber kein UI)
- Audit-Entry Drill-Down (Click auf Subject-ID → Entity)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSGVO-ADM-01 | Admin kann Einwilligungs-Records nach Zweck/Status filtern und durchsuchen | Backend extension to `consent.service.ts::findBySchool` adding optional `purpose`, `status`, `personSearch` filter params; new `GET /dsgvo/consent/admin` endpoint or extend `school/:schoolId` route to accept those query params (verified gap §1 D-08). |
| DSGVO-ADM-02 | Admin kann Aufbewahrungsrichtlinien pro Datenkategorie editieren | Existing `RetentionController` provides full CRUD (`POST /`, `GET /school/:schoolId`, `PUT /:id`, `DELETE /:id`, `GET /school/:schoolId/check`). Frontend consumes directly (verified §1 D-06-equivalent). |
| DSGVO-ADM-03 | Admin kann DSFA-Einträge anlegen/editieren | Existing `DsfaController.createDsfa/findDsfaEntries/updateDsfa/removeDsfa` — full CRUD verified at `apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts:14-49`. |
| DSGVO-ADM-04 | Admin kann VVZ-Einträge anlegen/editieren | Same controller as DSFA (`dsfa.controller.ts:50-84`); VVZ co-located, no separate `vvz.controller.ts`. |
| DSGVO-ADM-05 | Admin kann Art. 15 Datenexport anstoßen + BullMQ-Job-Status verfolgen | `DataExportController.requestExport` (POST), `getStatus` (GET `:id`), `getExportData` (GET `:id/download`), `getExportsByPerson` (GET `person/:personId`) all exist. Polling via `useDsgvoExportJob` (new) mirroring `useImportJob` (§5). |
| DSGVO-ADM-06 | Admin kann Art. 17 Anonymisierung anstoßen + 2-stufige Bestätigung | `DataDeletionController.requestDeletion`, `getStatus`, `getDeletionsByPerson` all exist. Frontend adds 2-stage confirmation dialog per D-19. |
| AUDIT-VIEW-01 | Admin kann Audit-Log durchsuchen mit Filter (Actor, Action, Subject, Zeitraum) | Existing `GET /audit` with `userId`, `resource`, `category`, `startDate`, `endDate`, `page`, `limit` (verified `query-audit.dto.ts`). Action-filter ("create"/"update"/"delete"/"read") is NOT in DTO — must be added (minor extension, see §8). |
| AUDIT-VIEW-02 | Admin sieht Audit-Eintrag-Detail mit After-State + "Before fehlt" Hinweis | After-state already in `metadata.body`. Before requires interceptor refactor (§3) + `before Json?` schema migration (§2). Per D-09, historical entries render After-only. |
| AUDIT-VIEW-03 | Admin kann gefilterten Audit-Log als CSV exportieren | New `GET /audit/export.csv` endpoint via `Papa.unparse` (§4). Verified missing in `audit.controller.ts` and `audit.service.ts`. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

The following directives from `./CLAUDE.md` constrain Phase 15 plans. The plan-checker MUST verify each.

| # | Directive | Source | Phase 15 Implication |
|---|-----------|--------|---------------------|
| C-1 | **No `prisma db push`.** Every `schema.prisma` edit ships as a migration file under `apps/api/prisma/migrations/<timestamp>_<name>/`. | CLAUDE.md "Database migrations — hard rule" | The `AuditEntry.before Json?` migration (§2) MUST use `pnpm --filter @schoolflow/api exec prisma migrate dev --name add_audit_entry_before_snapshot`. The migration folder MUST land in the same commit as the schema diff. |
| C-2 | **`scripts/check-migration-hygiene.sh` is enforced locally + in CI.** | CLAUDE.md | If a Phase 15 task edits `schema.prisma` without producing a `migration.sql` in the same diff, CI rejects the PR. Plan tasks must keep schema edit + `migrate dev` in one commit. |
| C-3 | **Stack pinning.** NestJS 11, Prisma 7, React 19, TypeScript 6, PostgreSQL 17, Vitest 4, Playwright 1.x, Fastify adapter (not Express). | CLAUDE.md "Technology Stack" | CSV streaming uses Fastify `@Res() reply` pattern (verified at `message.controller.ts:131-146` and `handover.controller.ts:111-119`). Vitest 4 for unit tests. Playwright 1.x for E2E. |
| C-4 | **`apiFetch` body-less DELETE Content-Type bug.** Body-less DELETE must NOT carry `Content-Type: application/json`. | MEMORY `project_apifetch_bodyless_delete_resolved.md` | Phase 15 has DELETE endpoints (Retention, DSFA, VVZ). Mutation hooks must use `apiFetch` (post-fix), NOT raw `fetch` with `headers: { 'Content-Type': 'application/json' }`. |
| C-5 | **Tenant isolation guard.** Every `findAll(`-style endpoint scopes by `schoolId`. | MEMORY `project_useTeachers_tenant_leak.md` + 2 follow-ons | New `audit/export.csv` and consent admin-filter endpoints MUST scope by school. See §8. |
| C-6 | **GSD workflow enforcement.** No direct edits outside a GSD command. | CLAUDE.md "GSD Workflow Enforcement" | This research is part of `/gsd-plan-phase 15`. Implementation tasks must run through `/gsd:execute-phase`. |
| C-7 | **E2E-first delivery.** No "please test in browser" hand-offs; ship with Playwright coverage. | MEMORY `feedback_e2e_first_no_uat.md` | Phase 15 needs at minimum a Wave-3 E2E plan covering each requirement. See §9. |
| C-8 | **`useToast` `onError` invariant** (Phase 10.2-04). Every mutation hook must surface failures via `toast.error`. | MEMORY + CONTEXT.md D-20 | Plan-checker must verify EVERY new `useMutation` in Phase 15 hooks has `onError → toast.error(...)`. |
| C-9 | **Restart API after `prisma migrate dev`.** Long-running Nest binds Prisma Client at boot. | MEMORY `feedback_restart_api_after_migration.md` | Plan tasks that follow the migration must include a "restart API" step (or runner-handled supervisor restart). |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Consent admin filter | API (NestJS service + controller) | DB (PostgreSQL — composite WHERE) | Filter logic and tenant scoping must live behind authz boundary; client only renders. |
| Retention CRUD | API (existing `RetentionController`) | DB | No new tier work — frontend wires existing routes. |
| DSFA + VVZ CRUD | API (existing `DsfaController`) | DB | No new tier work. |
| DSGVO export request + status | API (existing) + BullMQ worker (existing) | Redis (queue), DB (`DsgvoJob` row) | Frontend triggers, polls; queue runs async work; DB persists state. |
| DSGVO deletion 2-step confirm | Browser (form + token validation) | API (request endpoint exists) | Confirmation token (User-email match) is browser-side UX gate; backend already validates `personId` ownership. |
| Audit log read + filter | API (existing role-scoped findAll) | DB | Existing route used as-is, plus action-filter DTO extension. |
| Audit CSV export | API (NEW endpoint, streaming reply) | DB | Server-side respects filters per AUDIT-VIEW-03. |
| Audit before-state capture | API (interceptor refactor — pre-handler DB read) | DB | Mutation interceptor reads pre-state from DB before allowing handler — server-tier responsibility. |
| Audit-log filter toolbar UI | Browser (React state, `<Input type="date">`, `<Select>`) | API (consumes existing query-params) | Pure client UX, no new server work for filter controls. |
| Tab deep-linking | Browser (TanStack Router search params + `useState`) | — | URL is the source of truth; `Route.useSearch()` hydrates the tab state. |
| Sidebar admin-only entries | Browser (`AppSidebar.tsx` `roles:['admin']`) | API (CASL guard double-checks on every request) | Sidebar gate is UX; API authorization is the real gate. |

---

## Standard Stack

The Phase 15 stack is fully constrained by CLAUDE.md and the existing Phases 10–14 conventions. No new top-level dependencies are required.

### Core (already in repo, no install needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/common` | ^11 | API framework | CLAUDE.md C-3. |
| `@nestjs/platform-fastify` | ^11 | Fastify adapter (verified `apps/api/src/main.ts:14`) | CSV streaming via `@Res() reply.header()` (Fastify reply, NOT Express). |
| `@prisma/client` (generated) | 7.x | DB access | CLAUDE.md C-3. Migration via `pnpm --filter @schoolflow/api exec prisma migrate dev`. |
| `class-validator` + `class-transformer` | latest | DTO validation | Existing pattern in `query-audit.dto.ts`. |
| `papaparse` (api) | ^5.5.3 | CSV unparse for AUDIT-VIEW-03 | Already an `apps/api` dep — verified `apps/api/package.json:44` and used in `import/parsers/csv.parser.ts`. `Papa.unparse(rows)` returns RFC-4180 string. |
| `@casl/ability` | latest | RBAC | Existing — all Phase 15 subjects (`audit`, `consent`, `retention`, `dsfa`, `export`, `person`) seeded for admin role at `apps/api/prisma/seed.ts:75-119`. |
| `@nestjs/bullmq` + `bullmq` | latest | Queue | Existing — DSGVO export and deletion processors at `apps/api/src/modules/dsgvo/processors/`. |

### Frontend (already in repo)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-router` | latest | File-based routing + `validateSearch` Zod schemas | Phase 14 pattern. |
| `@tanstack/react-query` | 5.x | TanStack Query polling | `useImportJob` reference at `apps/web/src/hooks/useImport.ts:127-141`. |
| `zod` | latest | Search-param validation | `solver-tuning.tsx:19-23` pattern. |
| `@radix-ui/react-tabs` | ^1.1.13 | Tabs primitive | Verified `apps/web/package.json:35`, used by `solver-tuning`. |
| `@radix-ui/react-dialog` | ^1.1.15 | 2-step Art-17 confirmation dialog | `apps/web/package.json:27`. |
| `cmdk` | ^1.1.1 | Command palette / multi-select for action filter | `apps/web/package.json:44`. |
| `sonner` | latest | `toast.error` invariant (CLAUDE.md C-8) | Existing `apps/web/src/components/ui/sonner.tsx`. |
| `lucide-react` | latest | Sidebar icons (e.g., `ShieldCheck`, `ScrollText`) | Phase 14 pattern. |
| `date-fns` | ^4.1.0 | Date formatting in audit-log table + DSGVO-jobs | `apps/web/package.json:45`. |
| Sheet primitive | local shadcn | Audit-detail drawer (D-03) | `apps/web/src/components/ui/sheet.tsx` already present. |

### NOT in repo (do NOT add — D-12 deferred)
| Library | Why deferred |
|---------|--------------|
| `react-diff-viewer-continued` | D-12 explicitly defers side-by-side diff to a follow-up phase. |
| `react-day-picker` / `Calendar` shadcn block | Date-Range UX uses paired `<Input type="date">` per the existing `FairnessStatsPanel.tsx:106-121` precedent — no new picker library needed. |
| `csv-stringify` / `fast-csv` | `papaparse` already does the job. |

**Installation:** None required.

**Version verification:** Every dep above is already pinned in the existing `package.json` files; no `npm view` lookups needed.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Browser                                                                  │
│                                                                          │
│  /admin/dsgvo (4-tab page)              /admin/audit-log (single page)  │
│  ├─ Tab 1 Einwilligungen                                                │
│  │   useConsents(school, filters) ──┐   useAuditEntries(filters) ──┐    │
│  ├─ Tab 2 Aufbewahrung               │   ┌──────────────────────┐   │    │
│  │   useRetention(school) ──────────┤   │ FilterToolbar        │   │    │
│  ├─ Tab 3 DSFA-VVZ                   │   │ (date range,         │   │    │
│  │   useDsfa/useVvz(school) ─────────┤   │ action multi-select, │   │    │
│  └─ Tab 4 Jobs                       │   │ subject text,        │   │    │
│      useDsgvoJobs(school) ───────────┤   │ user search)         │   │    │
│      useDsgvoExportJob(jobId) ──────┐│   └──────────┬───────────┘   │    │
│      (refetchInterval polling)      ││              │ querystring   │    │
│                                      ││              ▼               │    │
└──────────────────────────────────────┼┼──────────────┼───────────────┼────┘
                                       ▼▼              ▼               ▼
                                  HTTPS (apiFetch wrapper, JWT bearer)
                                       │
┌──────────────────────────────────────┼──────────────────────────────────┐
│ NestJS API (apps/api, Fastify adapter, Port 3000)                       │
│                                      │                                   │
│  ┌────────────────────────────────┐  │  ┌────────────────────────────┐  │
│  │ ConsentController              │  │  │ AuditController            │  │
│  │  GET /school/:id (paginated)   │  │  │  GET /audit (existing)     │  │
│  │  POST /                        │  │  │  GET /audit/export.csv NEW │  │
│  │  POST /withdraw                │  │  │   ─→ AuditService.exportCsv│  │
│  │  + NEW: filter by purpose,     │  │  │       Papa.unparse + reply │  │
│  │    status, personSearch        │  │  │       .header(text/csv)    │  │
│  └────────────────────────────────┘  │  │       .send(string|Stream) │  │
│  ┌────────────────────────────────┐  │  └────────────────────────────┘  │
│  │ RetentionController (full CRUD)│  │  ┌────────────────────────────┐  │
│  └────────────────────────────────┘  │  │ AuditInterceptor (REFACTOR)│  │
│  ┌────────────────────────────────┐  │  │  Pre-handler:              │  │
│  │ DsfaController (DSFA + VVZ)    │  │  │   if UPDATE/DELETE on      │  │
│  └────────────────────────────────┘  │  │   audited resource:        │  │
│  ┌────────────────────────────────┐  │  │     read pre-state         │  │
│  │ DataExportController           │  │  │     stash in request scope │  │
│  │  POST /  GET /:id  GET /:id/dl │  │  │  Post-handler (existing):  │  │
│  └────────────────────────────────┘  │  │   write to AuditEntry      │  │
│  ┌────────────────────────────────┐  │  │   metadata.before = stash  │  │
│  │ DataDeletionController         │  │  │   metadata.body  = current │  │
│  │  POST /  GET /:id              │  │  └────────────────────────────┘  │
│  └────────────────────────────────┘  │                                   │
│  ┌────────────────────────────────┐  │  All routes: @CheckPermissions  │
│  │ DsgvoJobsController NEW (gap)  │  │  via CaslAbilityFactory          │
│  │  GET /dsgvo/jobs?status=...    │  │                                   │
│  │   ─→ DsgvoJobService.findAll   │  │                                   │
│  │     (school-scoped)            │  │                                   │
│  └────────────────────────────────┘  │                                   │
└──────────────────────────────────────┼──────────────────────────────────┘
                                       ▼
                  ┌──────────────────────────────────────┐
                  │ PostgreSQL 17                        │
                  │  audit_entries(metadata Json,        │
                  │   metadata.before NEW)               │
                  │  consent_records, retention_policies │
                  │  dsfa_entries, vvz_entries           │
                  │  dsgvo_jobs(status, jobType,         │
                  │   bullmqJobId, schoolId)             │
                  └──────────────────────────────────────┘
                                       ▲
                                       │ BullMQ workers update status
                                       │
                  ┌──────────────────────────────────────┐
                  │ Redis (BullMQ broker)                │
                  │  DSGVO_EXPORT_QUEUE                  │
                  │  DSGVO_DELETION_QUEUE                │
                  └──────────────────────────────────────┘
```

### Recommended Project Structure
```
apps/api/src/modules/
├── audit/
│   ├── audit.controller.ts           # +exportCsv route
│   ├── audit.service.ts              # +exportCsv method, +action filter
│   ├── audit.interceptor.ts          # REFACTOR: pre-state capture
│   └── dto/
│       ├── query-audit.dto.ts        # +action enum field
│       └── export-audit.query.dto.ts # NEW (mirrors QueryAuditDto, no page/limit)
└── dsgvo/
    ├── consent/
    │   ├── consent.controller.ts     # +admin-filter endpoint
    │   ├── consent.service.ts        # +findBySchoolWithFilters
    │   └── dto/
    │       └── query-consent.dto.ts  # NEW
    └── jobs/                          # NEW MODULE (or co-locate in dsgvo.module.ts)
        ├── dsgvo-jobs.controller.ts  # NEW: GET /dsgvo/jobs (school-scoped)
        ├── dsgvo-jobs.service.ts     # NEW: findBySchoolWithFilters
        └── dto/
            └── query-dsgvo-jobs.dto.ts

apps/web/src/
├── routes/_authenticated/admin/
│   ├── dsgvo.tsx                     # NEW: PageShell + Tabs
│   └── audit-log.tsx                 # NEW: PageShell + FilterToolbar + Sheet
├── components/admin/
│   ├── dsgvo/
│   │   ├── DsgvoTabs.tsx             # NEW (mirror SolverTuningTabs structure)
│   │   ├── ConsentsTab.tsx
│   │   ├── RetentionTab.tsx
│   │   ├── DsfaVvzTab.tsx            # 2 sub-tabs OR side-by-side
│   │   ├── JobsTab.tsx
│   │   ├── RequestExportDialog.tsx
│   │   └── RequestDeletionDialog.tsx # 2-stage confirm (D-19)
│   └── audit-log/
│       ├── AuditFilterToolbar.tsx
│       ├── AuditTable.tsx            # data-* attrs (D-21)
│       └── AuditDetailDrawer.tsx     # Sheet primitive
└── hooks/
    ├── useConsents.ts                # NEW: list + filter
    ├── useRetention.ts               # NEW: CRUD wrappers
    ├── useDsfa.ts / useVvz.ts        # NEW
    ├── useDsgvoJobs.ts               # NEW: list + filter
    ├── useDsgvoExportJob.ts          # NEW: polling clone of useImportJob
    ├── useDsgvoDeletionJob.ts        # NEW: polling clone of useImportJob
    ├── useAuditEntries.ts            # NEW: list + filter
    └── useAuditCsvExport.ts          # NEW: imperative download trigger
```

### Pattern 1: Tab Page with Deep-Link Search Param
**What:** TanStack Router file route declares a Zod `validateSearch`. The page passes `Route.useSearch().tab` into the Tabs component as `initialTab`. The Tabs component holds local `useState`. URL ↔ state syncing on tab click is via `useNavigate({ search: { tab: newValue } })`.

**Source:** `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx:19-83` + `apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx:38-134`

**Phase 15 mapping for `/admin/dsgvo`:**
```typescript
// apps/web/src/routes/_authenticated/admin/dsgvo.tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { DsgvoTabs } from '@/components/admin/dsgvo/DsgvoTabs';
import { useAuth } from '@/hooks/useAuth';

const TabSearchSchema = z.object({
  tab: z.enum(['consents', 'retention', 'dsfa-vvz', 'jobs']).optional(),
});

export const Route = createFileRoute('/_authenticated/admin/dsgvo')({
  validateSearch: TabSearchSchema,
  component: DsgvoPage,
});

function DsgvoPage() {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const { user } = useAuth();
  const { tab } = Route.useSearch();
  const isAdmin = (user?.roles ?? []).includes('admin');

  if (!isAdmin) return <PageShell title="Aktion nicht erlaubt" …>…</PageShell>;
  if (!schoolId) return <PageShell title="DSGVO-Verwaltung" …>Lade…</PageShell>;

  return (
    <PageShell
      breadcrumbs={[{ label: 'Admin', href: '/admin/school/settings' }, { label: 'DSGVO' }]}
      title="DSGVO-Verwaltung"
      subtitle="Einwilligungen, Aufbewahrung, DSFA/VVZ und Jobs"
    >
      <DsgvoTabs schoolId={schoolId} initialTab={tab} />
    </PageShell>
  );
}
```

`DsgvoTabs.tsx` mirrors the structure from `SolverTuningTabs.tsx` line-for-line, swapping the 4 children. **No `useTab` hook is imported because none exists** (CONTEXT.md D-04 inaccuracy).

### Pattern 2: BullMQ Polling Hook (TanStack Query refetchInterval)
**Source:** `apps/web/src/hooks/useImport.ts:127-141`

```typescript
export function useImportJob(schoolId: string, importJobId: string | null) {
  return useQuery({
    queryKey: importKeys.job(schoolId, importJobId ?? ''),
    queryFn: async (): Promise<ImportJobDto> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/import/${importJobId}`);
      if (!res.ok) throw new Error('Failed to load import job');
      return res.json();
    },
    enabled: !!schoolId && !!importJobId,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}
```

**Note for Phase 15:** D-14 requires polling to STOP when status is terminal. `refetchInterval` accepts a function `(query) => number | false`. Use:
```typescript
refetchInterval: (query) => {
  const status = query.state.data?.status;
  return status === 'COMPLETED' || status === 'FAILED' ? false : 2000;
}
```
The `useImportJob` hook does NOT do this terminal-stop today — Phase 15 hooks should improve on the precedent, not just copy it.

### Pattern 3: Fastify Reply Streaming for File Downloads
**Source:** `apps/api/src/modules/communication/message/message.controller.ts:131-146`

```typescript
@Get(':messageId/attachments/:attachmentId/download')
async downloadAttachment(@Param('attachmentId') id: string, @Res() reply: any) {
  const { path, filename, mimeType } = await this.messageService.downloadAttachment(id, user.id);
  reply.header('Content-Type', mimeType);
  reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  const stream = createReadStream(path);
  return reply.send(stream);
}
```

For CSV (in-memory string from `Papa.unparse`), the simpler form is:
```typescript
reply.header('Content-Type', 'text/csv; charset=utf-8');
reply.header('Content-Disposition', 'attachment; filename="audit-log-2026-04-26.csv"');
return reply.send(csvString);
```
Fastify accepts a string body and sets `Content-Length` automatically. No `Readable` wrapper needed unless the result is too large to materialize.

### Anti-Patterns to Avoid
- **Hand-rolling CSV escaping when `papaparse` is already in the dep tree.** D-18 says "no new dep" — `papaparse` is already there.
- **Writing a `useTab` hook** because CONTEXT.md mentions one. None exists; mirror Phase 14’s `useState`+`Route.useSearch()` pattern.
- **Sending CSV with `Content-Type: application/json` accidentally** because the existing apiFetch defaults add it. The download must use a raw `fetch` or pass the option to `apiFetch` to omit body-derived headers. The audit-CSV download is GET-only so this risk is low, but the test must assert `text/csv` Content-Type on the response.
- **Returning the full `before` snapshot for `delete` operations on resources with PII** without redaction. The interceptor’s existing `sanitizeBody()` (`audit.interceptor.ts:99-112`) only handles request body; the new pre-state capture must apply the same sanitization to whatever it reads from the DB.
- **Polling DSGVO jobs without a terminal-stop predicate.** D-14 explicitly requires it; the existing `useImportJob` does NOT do this and is therefore an incomplete template.

---

## 1. Backend Gap Verification

Each CONTEXT.md backend assertion validated against the source code:

| Decision | Claim | Verified? | Evidence |
|----------|-------|-----------|----------|
| **D-05** | `AuditService.exportCsv()` and `GET /audit/export.csv` MISSING | ✅ **CONFIRMED** | `apps/api/src/modules/audit/audit.service.ts` (full file 145 lines) has only `log`, `findAll`, `cleanup` — no `exportCsv`. `audit.controller.ts` (42 lines) has only one `GET /` route. `audit.module.ts` exports only `AuditService` and `AuditInterceptor`. Grep `csv\|exportCsv` over the 3 files returns zero hits. |
| **D-06** | DSFA + VVZ individual CRUD endpoints EXIST | ✅ **CONFIRMED — with caveat** | `apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts:14-49` has DSFA CRUD (`POST /dsfa`, `GET /dsfa/school/:schoolId`, `PUT /dsfa/:id`, `DELETE /dsfa/:id`), and `:50-84` has VVZ CRUD (`POST /vvz`, `GET /vvz/school/:schoolId`, `PUT /vvz/:id`, `DELETE /vvz/:id`). **Caveat:** there is NO separate `apps/api/src/modules/dsgvo/vvz/` directory — VVZ routes co-exist in `dsfa.controller.ts`. CONTEXT.md’s `vvz.controller.ts` reference is inaccurate (wrong file path; logic is correct). |
| **D-07** | BullMQ Job-Status read endpoints EXIST | ✅ **CONFIRMED — partially** | `apps/api/src/modules/dsgvo/export/data-export.controller.ts:23-30` has `GET /dsgvo/export/:id`. `:42-48` has `GET /dsgvo/export/person/:personId`. `apps/api/src/modules/dsgvo/deletion/data-deletion.controller.ts:23-30` has `GET /dsgvo/deletion/:id`. `:32-38` has `GET /dsgvo/deletion/person/:personId`. **NEW GAP NOT IN CONTEXT.md:** there is NO `GET /dsgvo/jobs` school-wide list endpoint. The "Jobs" tab (D-02) needs school-wide aggregation across both `DATA_EXPORT` and `DATA_DELETION` job types. See §1-Addendum below. |
| **D-08** | Consent admin-filter endpoint MISSING | ✅ **CONFIRMED** | `apps/api/src/modules/dsgvo/consent/consent.controller.ts` has 4 routes: `POST /` (grant), `POST /withdraw`, `GET /person/:personId`, `GET /school/:schoolId` (paginated). `consent.service.ts::findBySchool` accepts only `pagination: PaginationQueryDto` — no `purpose`, `status`, or person-search filters. DSGVO-ADM-01 requires all three. |
| **D-10** | `AuditInterceptor` does NOT capture pre-state for UPDATE/DELETE | ✅ **CONFIRMED** | `apps/api/src/modules/audit/audit.interceptor.ts:36-83` uses RxJS `tap` AFTER `next.handle()`. The metadata stored is `{ body: this.sanitizeBody(request.body) }` for non-DELETE mutations and `undefined` for DELETE (`:58-60`). No DB read of pre-state happens anywhere in the file. `sanitizeBody` (`:99-112`) only operates on the inbound request body. |

### §1-Addendum: 5th gap (DsgvoJob school-wide list)

**Claim verified:** `DsgvoJob` has no list endpoint. The model lives at `apps/api/prisma/schema.prisma:658-674` with `schoolId` and `jobType` indices. The closest existing route is `GET /dsgvo/export/person/:personId` which returns only export jobs for a single person.

**Implication for Phase 15 plan:** Add a small new module (or new controller in `dsgvo.module.ts`) exposing:
```
GET /dsgvo/jobs?schoolId={uuid}&status={QUEUED|PROCESSING|COMPLETED|FAILED}&jobType={DATA_EXPORT|DATA_DELETION}&page&limit
```
Tenant scoping is mandatory (CLAUDE.md C-5). Return rows include `id`, `personId` (nullable), `jobType`, `status`, `bullmqJobId`, `errorMessage`, `createdAt`, `updatedAt`, plus `person.firstName/lastName` joined.

**Recommendation:** Surface this finding in the planner’s Risks section. The "Jobs" tab cannot be built without it. If user pushes back on a 5th backend task, fallback is to render the Jobs tab as "Recent jobs by user" with a Person-picker — but that violates the natural admin UX expectation.

---

## 2. AuditEntry Schema Migration Plan

### Schema diff
Add a single column to `AuditEntry`:

```prisma
// apps/api/prisma/schema.prisma  ~line 238
model AuditEntry {
  id         String        @id @default(uuid())
  userId     String        @map("user_id")
  action     String
  resource   String
  resourceId String?       @map("resource_id")
  category   AuditCategory
  metadata   Json?
  before     Json?         // NEW: pre-mutation snapshot for UPDATE/DELETE; null for create/read or legacy entries
  ipAddress  String?       @map("ip_address")
  userAgent  String?       @map("user_agent")
  createdAt  DateTime      @default(now()) @map("created_at")
  …
  @@map("audit_entries")
}
```

**Open question (Claude’s discretion):** CONTEXT.md D-10 phrases "in `AuditEntry.metadata.before` (Schema-Migration)". That wording is ambiguous — it could mean either (a) a top-level `before Json?` column, or (b) a nested key inside the existing `metadata Json?` blob. Recommendation: **top-level `before Json?` column** because (1) it makes index-based queries possible if ever needed, (2) it keeps `metadata` clean of mixed concerns, and (3) the migration footprint is identical (one column add).

### Migration command (CLAUDE.md C-1, C-2)

```bash
pnpm --filter @schoolflow/api exec prisma migrate dev --name add_audit_entry_before_snapshot
```

This produces (timestamp will differ):
```
apps/api/prisma/migrations/20260427_add_audit_entry_before_snapshot/migration.sql
```

### Generated SQL preview
```sql
-- AlterTable
ALTER TABLE "audit_entries" ADD COLUMN "before" JSONB;
```

(Format mirrors `apps/api/prisma/migrations/20260425172608_add_constraint_weight_overrides/migration.sql` style.)

### Constraints honored
- **CLAUDE.md C-1:** `migrate dev`, never `db push`. ✅
- **CLAUDE.md C-2:** Hygiene script will pass — schema diff and `migration.sql` land in the same commit.
- **CLAUDE.md C-9:** Plan must include "restart NestJS API after migration" step.
- **No retro-fill:** D-10 explicit. Existing rows have `before = NULL`; the UI shows the "Before-Snapshot wurde für diesen Eintrag nicht erfasst" hint when null (D-09).

### Backward compatibility
Adding a nullable JSON column is a non-breaking change. No code references `AuditEntry.before` today, so no compile-time impact until the interceptor refactor (§3) writes to it. The column is safe to land in a separate task before the interceptor task — keeps the diff small.

---

## 3. AuditInterceptor Refactor Strategy

### Current behavior (verified)
`audit.interceptor.ts` runs in `tap()` AFTER the handler returns. It captures only the request body:
```typescript
metadata: method !== 'DELETE'
  ? { body: this.sanitizeBody(request.body) }
  : undefined
```
For DELETE, no `metadata` is stored at all. For UPDATE, only the inbound patch payload is stored — never the pre-state of the affected row.

### Target behavior
For UPDATE and DELETE, capture the row’s state from the DB BEFORE the handler runs, then write both pre-state and (existing) request body in the post-handler tap.

### Recommended approach: pre-handler DB read keyed off `request.params.id`

```typescript
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  const request = context.switchToHttp().getRequest();
  const user = request.user as AuthenticatedUser | undefined;
  const method = request.method;
  const url = request.url;

  // NEW: capture pre-state for UPDATE/DELETE before handler runs
  let beforeSnapshot: unknown = undefined;
  const isMutationOnExistingRow =
    ['PUT', 'PATCH', 'DELETE'].includes(method) && request.params?.id;

  const captureBefore = isMutationOnExistingRow
    ? this.captureBeforeState(this.extractResource(url), request.params.id)
    : Promise.resolve(undefined);

  return from(captureBefore).pipe(
    tap((snapshot) => { beforeSnapshot = snapshot; }),
    switchMap(() => next.handle()),
    tap(async (handlerResult) => {
      if (!user) return;
      const resource = this.extractResource(url);
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        await this.auditService.log({
          userId: user.id,
          action: actionMap[method] ?? method.toLowerCase(),
          resource,
          resourceId: request.params?.id,
          category: 'MUTATION',
          metadata: method !== 'DELETE' ? { body: this.sanitizeBody(request.body) } : undefined,
          before: beforeSnapshot ? this.sanitizeBody(beforeSnapshot) : undefined,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
      }
      // …existing SENSITIVE_READ handling…
    }),
  );
}

private async captureBeforeState(resource: string, id: string): Promise<unknown> {
  // Map resource (URL segment) → Prisma model name
  const modelMap: Record<string, string> = {
    'consent': 'consentRecord',
    'retention': 'retentionPolicy',
    'dsfa': 'dsfaEntry',
    'vvz': 'vvzEntry',
    'school': 'school',
    // …extend per audited resource
  };
  const modelName = modelMap[resource];
  if (!modelName) return undefined;     // unknown resource → no snapshot, leave null
  try {
    return await (this.prisma as any)[modelName].findUnique({ where: { id } });
  } catch {
    return undefined;     // never block the handler on a snapshot read failure
  }
}
```

### Critical constraints

**Tenant-isolation safety (CLAUDE.md C-5).** The `findUnique({ where: { id } })` does NOT join schoolId — but this is a READ, not a return-to-user. The pre-state is then stored only in the `audit_entries` table, which is itself read-scoped by the existing `audit.service.ts::findAll` role gate. Risk is low BUT the planner should explicitly add a verification task: "Confirm `before` snapshots are NEVER returned to users outside the audit-log endpoint."

**Performance.** A pre-handler DB round trip adds 3-15ms to every UPDATE/DELETE. For Phase 15’s admin-only surfaces this is negligible. If a future high-throughput resource needs to opt out, add a `@SkipAuditBefore()` decorator (out of scope for Phase 15).

**Sanitization.** Apply `sanitizeBody()` (or a dedicated `sanitizeSnapshot()`) to the captured `before` value to redact `password`, `token`, etc. Persons may have `email`/`phone` — DECIDE whether DSGVO requires these to be redacted in audit logs (assumed: NO, because the audit log itself is admin-restricted; CONFIRM with user).

**Resource → Prisma model mapping.** The interceptor uses `extractResource(url)` to derive a string from the URL (e.g., "consent" from `/api/v1/dsgvo/consent/abc-123`). The `modelMap` in `captureBeforeState` must cover every audited mutation route. If a route hits an unmapped resource, `before` stays `null` and the UI just shows the "no snapshot" hint — same as legacy entries. Plan task should produce this map exhaustively from `apps/api/src/modules/**/*.controller.ts`.

**Tests don’t need rewrite.** The existing 145-line `audit.service.ts` is unchanged in behavior; only the interceptor adds a field. Existing audit specs (e.g., `admin-solver-tuning-audit.spec.ts`) may need updates if they assert exact `metadata` shape — verify in Wave-3.

### Out-of-scope alternative (NOT recommended for Phase 15)
PostgreSQL audit triggers via `pg_audit` extension or DB-level triggers populating an `audit_log` table. This is the "right" architecture for compliance-critical audit but requires PostgreSQL extension installs in Docker images and breaks the "all logic in TS" invariant. Defer to a v1.2 phase.

---

## 4. CSV Export Implementation Approach

### Decision: use `Papa.unparse` from existing `papaparse` dep

CONTEXT.md D-18 framed the choice as "hand-rolled vs `csv-stringify`". Both options are inferior to a third option that wasn’t considered:

**`papaparse` is already a dep** (`apps/api/package.json:44`, used in `import/parsers/csv.parser.ts:1` and `untis-dif.parser.ts:1`). `Papa.unparse(arrayOfObjects)` returns an RFC-4180-compliant CSV string with quote escaping handled. Zero net new deps. Zero net new code beyond the controller route + service method.

### Service method skeleton

```typescript
// apps/api/src/modules/audit/audit.service.ts (new method)
import Papa from 'papaparse';

async exportCsv(params: {
  userId?: string;
  resource?: string;
  category?: string;
  action?: string;          // NEW filter (see §8)
  startDate?: Date;
  endDate?: Date;
  requestingUser: { id: string; roles: string[] };
}): Promise<string> {
  const where: any = this.buildWhereClauseFromFilters(params);  // extract from findAll
  const rows = await this.prisma.auditEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10_000,             // hard cap to prevent unbounded export
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
  });

  const csvRows = rows.map((r) => ({
    Zeitpunkt: r.createdAt.toISOString(),
    Benutzer:   `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim(),
    Email:      r.user?.email ?? '',
    Aktion:     r.action,
    Ressource:  r.resource,
    'Ressource-ID': r.resourceId ?? '',
    Kategorie:  r.category,
    'IP-Adresse': r.ipAddress ?? '',
    Vorzustand: r.before ? JSON.stringify(r.before) : '',
    Nachzustand: r.metadata ? JSON.stringify(r.metadata) : '',
  }));

  return Papa.unparse(csvRows, { quotes: true, newline: '\r\n' });
}
```

### Controller route skeleton

```typescript
// apps/api/src/modules/audit/audit.controller.ts (new route)
@Get('export.csv')
@CheckPermissions({ action: 'read', subject: 'audit' })
@ApiOperation({ summary: 'Export audit log as CSV (respects all current filters)' })
async exportCsv(
  @Query() query: ExportAuditQueryDto,    // mirrors QueryAuditDto sans page/limit
  @CurrentUser() user: AuthenticatedUser,
  @Res() reply: any,
) {
  const csv = await this.auditService.exportCsv({
    userId: query.userId,
    resource: query.resource,
    category: query.category,
    action: query.action,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    requestingUser: user,
  });

  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send('\uFEFF' + csv);  // BOM for Excel UTF-8 detection
}
```

The leading BOM (`\uFEFF`) makes Excel open the file as UTF-8 instead of Windows-1252, preventing umlaut mojibake (German content). This matters for "Schöler", "über", "ä".

### Streaming vs buffering
With a 10 000-row hard cap, the result is at most ~5 MB string in memory. Buffering is fine. If future requirements lift the cap, swap `Papa.unparse` for a streaming variant (`papaparse` supports a `Stream` API in Node) and pipe through `reply.raw`. Out of scope for Phase 15.

### Testing
- **Unit:** `audit.service.spec.ts` — assert UTF-8 BOM present, header row matches expected German labels, quote-escaping for fields containing commas/newlines (use a metadata payload like `{ note: 'a, b\nc' }`), respects role gating (admin sees all, schulleitung sees pedagogical only).
- **Integration:** Supertest `.get('/audit/export.csv?…')` asserts `text/csv` Content-Type, `Content-Disposition: attachment`, body starts with BOM.
- **E2E:** Playwright triggers download via `page.waitForEvent('download')` and inspects `download.suggestedFilename()`.

---

## 5. BullMQ Polling Hook Pattern

### Existing reference (verbatim)
`apps/web/src/hooks/useImport.ts:127-141` (read in §step-zero). Uses `refetchInterval: 2000` flat — does NOT terminal-stop.

### Phase 15 hooks (skeleton)

```typescript
// apps/web/src/hooks/useDsgvoJobs.ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import type { DsgvoJobDto } from '@schoolflow/shared';

export const dsgvoJobsKeys = {
  all: ['dsgvo-jobs'] as const,
  list: (schoolId: string, filters: Record<string, unknown>) =>
    [...dsgvoJobsKeys.all, schoolId, 'list', filters] as const,
  job: (jobId: string) => [...dsgvoJobsKeys.all, 'job', jobId] as const,
};

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

/**
 * Per-job polling. Stops polling once status is terminal (D-14).
 */
export function useDsgvoExportJob(jobId: string | null) {
  return useQuery({
    queryKey: dsgvoJobsKeys.job(jobId ?? ''),
    queryFn: async (): Promise<DsgvoJobDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/export/${jobId}`);
      if (!res.ok) throw new Error('Failed to load DSGVO export job status');
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 2000;
    },
    staleTime: 1000,
  });
}

export function useDsgvoDeletionJob(jobId: string | null) {
  return useQuery({
    queryKey: dsgvoJobsKeys.job(jobId ?? ''),
    queryFn: async (): Promise<DsgvoJobDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/deletion/${jobId}`);
      if (!res.ok) throw new Error('Failed to load DSGVO deletion job status');
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 2000;
    },
    staleTime: 1000,
  });
}

/**
 * School-wide jobs list for the Jobs tab. Polls slowly (5s) for live updates.
 */
export function useDsgvoJobs(
  schoolId: string,
  filters: { status?: string; jobType?: string; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: dsgvoJobsKeys.list(schoolId, filters),
    queryFn: async () => {
      const qs = new URLSearchParams({ schoolId, ...stringifyFilters(filters) }).toString();
      const res = await apiFetch(`/api/v1/dsgvo/jobs?${qs}`);
      if (!res.ok) throw new Error('Failed to load DSGVO jobs');
      return res.json();
    },
    enabled: !!schoolId,
    refetchInterval: 5000,    // slower poll for the table (per-row useDsgvoExportJob handles fast polling)
    staleTime: 2000,
  });
}
```

### Mutation hooks (request export / request deletion)

```typescript
// apps/web/src/hooks/useDsgvoMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/apiFetch';

export function useRequestExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { personId: string; schoolId: string }) => {
      const res = await apiFetch('/api/v1/dsgvo/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Datenexport konnte nicht angestoßen werden.');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Datenexport gestartet. Sie können den Status verfolgen.');
      qc.invalidateQueries({ queryKey: dsgvoJobsKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);            // CLAUDE.md C-8 invariant
    },
  });
}

export function useRequestDeletion() { /* analogous */ }
```

### Confirmation token validation (D-19)
Browser-side only. The dialog renders an `<Input>` and disables the submit button until the entered string === `person.email`. No backend change needed because `DataDeletionController.requestDeletion` validates `personId` ownership.

---

## 6. Tab Page Skeleton

Already laid out in Pattern 1 above. Mapping table from Phase 14 reference to Phase 15:

| Phase 14 file | Phase 15 mapping |
|---------------|------------------|
| `routes/_authenticated/admin/solver-tuning.tsx` | `routes/_authenticated/admin/dsgvo.tsx` (new) |
| `components/admin/solver-tuning/SolverTuningTabs.tsx` | `components/admin/dsgvo/DsgvoTabs.tsx` (new) |
| Tab values: `constraints` / `weights` / `restrictions` / `preferences` | Tab values: `consents` / `retention` / `dsfa-vvz` / `jobs` |
| `ConstraintCatalogTab.tsx` etc. (4 files) | `ConsentsTab.tsx` / `RetentionTab.tsx` / `DsfaVvzTab.tsx` / `JobsTab.tsx` (4 new files) |
| `LastRunScoreBadge` + `DriftBanner` (header surfaces) | None initially — DSGVO has no equivalent header KPI |

### `DsfaVvzTab.tsx` design (Claude’s discretion)

CONTEXT.md leaves DSFA/VVZ tab layout to Claude. Two reasonable options:

| Option | Pro | Con |
|--------|-----|-----|
| (a) Single tab, two sections (DSFA list above VVZ list, separator between) | Simpler, no nested tabs, easier mobile collapse | Long page; less focus per entity |
| (b) Nested 2 sub-tabs ("DSFA" / "VVZ") | Mirrors Phase 14 SubjectPreferencesTab nested-tabs pattern (proven) | Adds nav depth |

**Recommendation: (b) nested 2 sub-tabs**, mirroring Phase 14 `SubjectPreferencesTab.tsx` precedent. Same `<ToggleGroup>` mobile fallback pattern is reusable. Keeps each entity’s CRUD focused.

### Default tab (Claude’s discretion)
Recommend `consents` as the default (most-frequent admin task in DSGVO context). Set in `DsgvoTabs.tsx`:
```typescript
const safeInitial = (['consents','retention','dsfa-vvz','jobs'] as const).includes(initialTab as any)
  ? initialTab
  : 'consents';
```

---

## 7. Audit-Log Filter Toolbar Approach

### Available primitives (verified in `apps/web/src/components/ui/`)
- `input.tsx` — has `<Input type="date">` precedent (`FairnessStatsPanel.tsx:106-121`).
- `select.tsx` — Radix-based single-select. Use for `category` (MUTATION/SENSITIVE_READ).
- `popover.tsx` + `command.tsx` (cmdk) — for multi-select Action filter (`create`/`update`/`delete`/`read`).
- `button.tsx` — for "Filter zurücksetzen" reset.
- `dialog.tsx` + `sheet.tsx` — Sheet for the audit-detail drawer (D-03 right-side slide-in).

### NOT available (intentionally — D-18 no-new-deps)
- `react-day-picker` / shadcn `Calendar` block — NOT in deps.
- Headless `DateRangePicker` — would need build-from-scratch.

### Recommended toolbar layout

```tsx
// AuditFilterToolbar.tsx (sketch)
<div className="flex flex-wrap items-end gap-3 mb-4">
  <FilterField label="Von">
    <Input type="date" value={filters.startDate ?? ''} onChange={…} />
  </FilterField>
  <FilterField label="Bis">
    <Input type="date" value={filters.endDate ?? ''} onChange={…} />
  </FilterField>
  <FilterField label="Aktion">
    <ActionMultiSelect value={filters.actions} onChange={…} />
  </FilterField>
  <FilterField label="Ressource">
    <Input placeholder="z.B. consent, school" value={filters.resource ?? ''} onChange={…} />
  </FilterField>
  <FilterField label="Benutzer">
    <UserAutocomplete value={filters.userId} onSelect={…} />
  </FilterField>
  <FilterField label="Kategorie">
    <Select value={filters.category ?? 'all'} onValueChange={…}>
      <SelectItem value="all">Alle</SelectItem>
      <SelectItem value="MUTATION">Mutationen</SelectItem>
      <SelectItem value="SENSITIVE_READ">Sensible Lesezugriffe</SelectItem>
    </Select>
  </FilterField>
  <Button variant="outline" onClick={resetFilters}>Filter zurücksetzen</Button>
  <Button variant="default" onClick={triggerCsvExport}>
    <Download className="h-4 w-4 mr-1" /> CSV exportieren
  </Button>
</div>
```

### CSV export trigger
Server-side per D-16. Browser-side hook:
```typescript
function useAuditCsvExport() {
  return async (filters: AuditFilters) => {
    const qs = new URLSearchParams(stringify(filters)).toString();
    const res = await apiFetch(`/api/v1/audit/export.csv?${qs}`);
    if (!res.ok) {
      toast.error('CSV-Export fehlgeschlagen.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
      ?? 'audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
}
```

### Audit detail drawer
Use the existing `Sheet` primitive (`apps/web/src/components/ui/sheet.tsx`, verified). Right-side slide-in. Renders:
- Header: action + resource + timestamp + actor
- Section "Vorzustand": if `entry.before` → JSON tree; else `<InfoBanner variant="muted">Before-Snapshot wurde für diesen Eintrag nicht erfasst (Eintrag entstand vor dem Interceptor-Refactor).</InfoBanner>`
- Section "Nachzustand": JSON tree of `entry.metadata`

JSON-tree component: build a small recursive `<JsonTree value={…} indent={0} />` (recursive React component, ~30 LOC). No library.

---

## 8. Tenant Isolation Audit

### Existing audit endpoint scoping (verified)

`audit.service.ts::findAll` (`apps/api/src/modules/audit/audit.service.ts:56-108`):
- **Admin:** sees ALL entries — NO `schoolId` scoping. Confirmed at `:69-70` (empty branch).
- **Schulleitung:** sees pedagogical resources (`grades`, `classbook`, `student`, `teacher`) — NO `schoolId` scoping.
- **Other:** sees only own entries (`userId` scoping).

**This is intentional** for a single-tenant deployment (CLAUDE.md "Constraints: Single-Tenant, Self-Hosted via Docker/Kubernetes as Default-Deployment"). Each school has its own DB, so `schoolId` is implicit at the deployment layer, not the row layer.

**Phase 15 implication:** The new `audit/export.csv` endpoint inherits the SAME role-scoping logic from `findAll`. No new scope check needed beyond the existing `requestingUser.roles` discrimination. The interceptor refactor preserves this — `before` snapshots are stored on the same row and surface only via the same role-gated query.

### New endpoints — required scoping

| New endpoint | Tenant scope required? | How |
|--------------|-----------------------|-----|
| `GET /audit/export.csv` | NO additional school scoping (inherits role-scoped `findAll` logic) | Reuse `audit.service.ts` role gate; admin sees all entries in this deployment. |
| `GET /dsgvo/consent` (admin filter) | YES — must scope by `schoolId` | New endpoint extends existing `findBySchool` pattern (`apps/api/src/modules/dsgvo/consent/consent.service.ts:85-110` — already uses `where: { person: { schoolId } }`). |
| `GET /dsgvo/jobs` (school-wide list, NEW gap) | YES — must scope by `schoolId` | `DsgvoJob.schoolId` is non-null FK to `School`; query `where: { schoolId }`. |

### Memory-flagged regression family (CLAUDE.md C-5)

Three prior incidents documented in MEMORY:
1. `useTeachers()` cross-tenant leak (RESOLVED — `project_useTeachers_tenant_leak.md`)
2. `subject.service.ts::findAll` leak (RESOLVED — `project_subject_tenant_leak.md`)
3. `useClasses()` silent omission (RESOLVED — `project_useClasses_missing_schoolId.md`)

**Common root cause:** `where: { schoolId: query.schoolId }` where `query.schoolId` is `undefined` resolves to `where: { schoolId: undefined }` which Prisma silently treats as "no filter". Phase 15 NEW endpoints must use one of:
- (a) Required `@IsString() @IsNotEmpty()` on the schoolId DTO field (compile-time guarantee).
- (b) Defensive guard: `if (!schoolId) throw new BadRequestException('schoolId required');` in the service.

Plan-checker should add a verification step: "For each new `findAll`-style endpoint in Phase 15, confirm the query DTO marks `schoolId` as required AND the service throws on missing."

### Audit endpoint action-filter extension (AUDIT-VIEW-01)
The existing `query-audit.dto.ts` does NOT support an `action` filter (verified — only `userId`, `resource`, `category`, `startDate`, `endDate`, `page`, `limit`). AUDIT-VIEW-01 says "Actor, Action, Subject, Zeitraum" — Action is missing.

Add to DTO:
```typescript
enum AuditActionFilter { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', READ = 'read' }

@ApiPropertyOptional({ enum: AuditActionFilter })
@IsOptional()
@IsEnum(AuditActionFilter)
action?: string;
```
And add `if (params.action) where.action = params.action;` in `audit.service.ts::findAll`.

---

## 9. Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (apps/api + apps/web both pinned to ^4) |
| Config files | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| Quick run command | `pnpm --filter @schoolflow/api test` (api unit + integration); `pnpm --filter @schoolflow/web test` (web unit) |
| Full suite command | `pnpm test` at repo root + `pnpm --filter @schoolflow/web e2e` (Playwright 1.x) |
| E2E runner | Playwright 1.x with helpers at `apps/web/e2e/helpers/login.ts` (`loginAsAdmin`, `loginAsRole`) |
| E2E command | `pnpm --filter @schoolflow/web e2e --workers=1` (workers=1 mandatory per Phase 14 lesson — `STATE.md:206`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Status |
|--------|----------|-----------|-------------------|-------------|
| DSGVO-ADM-01 | Consent admin filter returns rows matching purpose+status+search; tenant-scoped | unit + integration | `pnpm --filter @schoolflow/api test consent.service.spec` | extend existing `consent.service.spec.ts` |
| DSGVO-ADM-01 | UI: filter input → table updates → toast.error on 4xx | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-consents.spec.ts --workers=1` | NEW spec |
| DSGVO-ADM-02 | Retention CRUD round-trip via UI | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-retention.spec.ts --workers=1` | NEW spec |
| DSGVO-ADM-03 | DSFA create → list → edit → delete via UI | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-dsfa.spec.ts --workers=1` | NEW spec |
| DSGVO-ADM-04 | VVZ create → list → edit → delete via UI | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-vvz.spec.ts --workers=1` | NEW spec (or merge with DSFA spec) |
| DSGVO-ADM-05 | UI request-export → polling → terminal status → download link | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-export-job.spec.ts --workers=1` | NEW spec; uses `await page.waitForResponse((r) => r.url().includes('/dsgvo/export/') && r.status() === 200)` |
| DSGVO-ADM-06 | UI 2-stage confirmation: dialog open → wrong token disables submit → correct email enables → POST sent → polling | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-deletion-confirm.spec.ts --workers=1` | NEW spec |
| AUDIT-VIEW-01 | Filter toolbar: each combination produces correct row set; URL search-params reflect filters (deep-link) | E2E | `pnpm --filter @schoolflow/web e2e admin-audit-log-filter.spec.ts --workers=1` | NEW spec |
| AUDIT-VIEW-02 | Detail drawer opens; legacy entry shows "no snapshot" hint; new entry shows before+after JSON trees | E2E | `pnpm --filter @schoolflow/web e2e admin-audit-log-detail.spec.ts --workers=1` | NEW spec; pre-seed one mutation via API (post-interceptor-refactor) and one raw DB row with `before=NULL` |
| AUDIT-VIEW-03 | Click "CSV exportieren" → download triggers → filename matches pattern → first line is header → BOM present | E2E | `pnpm --filter @schoolflow/web e2e admin-audit-log-csv.spec.ts --workers=1` | NEW spec |
| Backend: AuditService.exportCsv | Filter respect (admin sees all, schulleitung sees pedagogical only); RFC-4180 escaping; UTF-8 BOM | unit | `pnpm --filter @schoolflow/api test audit.service.spec` | extend existing |
| Backend: AuditInterceptor pre-state | UPDATE on `consent` row stores pre-state JSON in `audit_entries.before`; DELETE captures pre-state; legacy/unmapped resources leave NULL | integration | `pnpm --filter @schoolflow/api test audit.interceptor.spec` | NEW spec |
| Backend: GET /audit/export.csv | Returns `text/csv`, `Content-Disposition: attachment`, BOM + header | integration (Supertest) | `pnpm --filter @schoolflow/api test audit.controller.e2e-spec` | NEW spec |
| RBAC negative | schulleitung cannot see `/admin/dsgvo` or `/admin/audit-log` sidebar entries | E2E | `pnpm --filter @schoolflow/web e2e admin-dsgvo-rbac.spec.ts --workers=1` | NEW spec; pattern from `admin-solver-tuning-rbac.spec.ts` |

### Sampling Rate
- **Per task commit:** `pnpm --filter @schoolflow/api test --reporter=basic` (changed-file-related specs).
- **Per wave merge:** `pnpm --filter @schoolflow/api test && pnpm --filter @schoolflow/web test`.
- **Phase gate:** Full unit + integration green AND `pnpm --filter @schoolflow/web e2e --workers=1` green before `/gsd-verify-work`.

### Test patterns to mirror
- **Phase 10.5 `rooms-booking.spec.ts`** — pre-seed minimal data via authenticated API requests in `beforeAll`, throwaway data scoped by name pattern, `afterAll` cleanup. Use the same approach for DSGVO/audit specs.
- **Phase 14 `admin-solver-tuning-catalog.spec.ts`** — `data-*` selectors, role-scoped `loginAsAdmin`, German label assertions, deep-link via `?tab=…` URL.
- **Phase 14 `admin-solver-tuning-rbac.spec.ts`** — schulleitung negative case template (sidebar absence + direct URL hit shows no UI).
- **Phase 14 `admin-solver-tuning-audit.spec.ts`** — pattern for asserting AuditEntry row shape after a UI action (`page.request.get('/api/v1/audit?…')`).

### Wave 0 Gaps
- [ ] `apps/web/e2e/helpers/dsgvo.ts` — shared seed helpers (createConsent via API, createPersonForExport)
- [ ] `apps/api/src/modules/audit/audit.interceptor.spec.ts` — does not exist; required for the refactor
- [ ] `apps/api/src/modules/audit/audit.controller.e2e-spec.ts` — does not exist; required for CSV endpoint
- [ ] No new framework install needed — Vitest 4 + Playwright 1.x already configured.

---

## 10. Open Questions (Claude's Discretion)

Based on the CONTEXT.md "Claude’s Discretion" section, here are concrete recommendations the planner should bake in:

1. **Diff-Tree component design.** Recommend a recursive `<JsonTree value indent={0} />` (~30 LOC). Uses Tailwind `pl-{2*indent}` for indentation, monospace font, color-tokens by JSON type (string=accent, number=primary, null=muted). Defer animations and collapse-toggles.
2. **CSV column order + headers.** Recommended (German, admin-readable, RFC-4180 stable):
   `Zeitpunkt | Benutzer | Email | Aktion | Ressource | Ressource-ID | Kategorie | IP-Adresse | Vorzustand | Nachzustand`
3. **DSGVO-Tab-Default.** `consents` (most frequent admin task).
4. **Art-17 Confirmation dialog layout.** **Single dialog with two visual stages** (step indicator). Step 1: warning banner + "Weiter" button. Step 2: User-email input + "Endgültig löschen" button (disabled until email matches). Single dialog avoids state-management gymnastics across two `<Dialog>` instances.
5. **Audit-log pagination.** Existing `findAll` uses **offset pagination** (`page` + `limit`, returns `totalPages`). Stay with offset for consistency; document that cursor pagination is a follow-up if scale demands it.
6. **Job-status polling failure UX.** When the polling query fails (network blip), TanStack Query continues retrying. Show a small inline `<InfoBanner variant="warn">Status-Aktualisierung fehlgeschlagen — neuer Versuch in Kürze</InfoBanner>` when `isError && !isRefetching`. Do NOT show toast (would spam on flaky networks).

### Additional questions surfaced during research (NEW — not in CONTEXT.md)

7. **Pre-state sanitization for PII.** `Person` rows have `email`/`phone`. Should the audit `before` snapshot redact these? Default: NO (audit log is admin-restricted). User confirm.
8. **`AuditEntry.before` location.** Top-level column vs nested in `metadata`? Recommend top-level. User confirm before plan locks.
9. **DSGVO Jobs school-wide list endpoint scope.** This is a 5th backend gap not in CONTEXT.md. Confirm with user that adding a new `GET /dsgvo/jobs` endpoint is in scope, OR fall back to per-Person job listing (which forces the Jobs tab to require a Person picker — degraded UX).

---

## Runtime State Inventory

This phase is **not** a rename/refactor/migration phase, so the full Runtime State Inventory does not apply. The relevant slice:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — phase only ADDS data (`audit_entries.before`, new `consent` filter results, new DSGVO Job-list rows). No existing data renamed. | None. |
| Live service config | None. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | Existing BullMQ Redis URL + Postgres URL — unchanged. | None. |
| Build artifacts | After the schema migration, Prisma Client must be regenerated and the API restarted (CLAUDE.md C-9). | Plan task: `pnpm --filter @schoolflow/api exec prisma generate` (auto by `migrate dev`) + supervisor restart. |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV escaping (commas, quotes, newlines) | Custom string concatenation per D-18 | `Papa.unparse` from existing `papaparse` dep | RFC-4180-compliant, edge cases (embedded `"`, CRLF) handled; zero new deps. |
| Polling + terminal-stop | `setInterval` + `useEffect` | TanStack Query `refetchInterval: (q) => terminal ? false : 2000` | Built-in cancellation, race-free, devtools-visible. |
| Dialog state machine for 2-step Art-17 confirm | Two separate `<Dialog>` components with manual coordination | Single `<Dialog>` with internal `step` state | Less surface area for state bugs. |
| Audit before/after JSON diff rendering | Side-by-side word-level diff | Out-of-scope per D-12. v1 ships JSON trees only. | Diff-rendering libs (`react-diff-viewer-continued`) deferred. |
| Date range picker | `react-day-picker` + Calendar shadcn block | Two `<Input type="date">` per `FairnessStatsPanel.tsx` | No new dep, native browser pickers respect locale, accessible by default. |
| BullMQ direct introspection from frontend | Direct BullMQ client call | Existing `DsgvoJob` PostgreSQL row + status read via REST | Frontend never touches Redis directly; backend wraps all BullMQ access. |

**Key insight:** Phase 15 is heavy on _wiring existing primitives_ and light on _novel solutions_. Every problem has a precedent in Phases 10-14.

---

## Common Pitfalls

### Pitfall 1: `useTab` hook does not exist
**What goes wrong:** Following CONTEXT.md D-04 literally leads to `import { useTab } from '@/hooks/useTab'` — a module that does not exist.
**How to avoid:** Mirror Phase 14’s `solver-tuning.tsx` + `SolverTuningTabs.tsx` pattern: route-level Zod search schema → `Route.useSearch().tab` → passed as `initialTab` prop → `useState` initializer in the Tabs component.
**Warning sign:** TypeScript module-not-found error on first build.

### Pitfall 2: `apiFetch` body-less DELETE Content-Type bug recurrence
**What goes wrong:** Phase 15 has DELETE endpoints (Retention, DSFA, VVZ removal). A naive mutation hook adds `headers: { 'Content-Type': 'application/json' }` to a DELETE with no body → Fastify 5 rejects.
**How to avoid:** Use `apiFetch` post-fix (resolved 2026-04-26 — see MEMORY `project_apifetch_bodyless_delete_resolved.md`). For body-less DELETE, do NOT pass `headers` at all OR pass an explicit empty headers object.
**Warning sign:** 400/415 responses on DELETE in dev tools.

### Pitfall 3: AuditEntry interceptor refactor breaks existing audit specs
**What goes wrong:** Phase 14 specs (`admin-solver-tuning-audit.spec.ts`) assert exact `metadata` shape. Adding a `before` field is non-breaking, but if the interceptor refactor accidentally moves `body` into `before` (or vice versa), the spec fails.
**How to avoid:** Refactor preserves the exact `metadata.body` shape for non-DELETE; ONLY adds a separate `before` field. Add a regression-test that covers this exactly.
**Warning sign:** Phase 14 audit specs go red after the interceptor task.

### Pitfall 4: Tenant scope drift on new `consent admin-filter` and `/dsgvo/jobs`
**What goes wrong:** Per the 3 memory-documented incidents, `where: { schoolId: undefined }` silently returns ALL rows. New filter endpoints replicate the bug.
**How to avoid:** DTO marks `schoolId` as `@IsString() @IsNotEmpty()`. Service throws `BadRequestException` if absent. Add explicit unit-test for missing-schoolId case.
**Warning sign:** Cross-tenant data appears in tests when running with seeded multi-school data.

### Pitfall 5: CSV download missing UTF-8 BOM → Excel mangles umlauts
**What goes wrong:** `Schöler` becomes `SchÃ¶ler` when opened in Excel without a BOM hint.
**How to avoid:** Prepend `\uFEFF` to the CSV string before `reply.send`.
**Warning sign:** German users report broken umlauts in exports.

### Pitfall 6: Phase 14 specs require `--workers=1`
**What goes wrong:** `STATE.md:206` documents that Phase 14 cleanup helpers wipe school-wide state, requiring serial execution. Phase 15 specs that reuse the same login flow may inherit this constraint.
**How to avoid:** All new Playwright specs run with `--workers=1` explicitly. Document in spec files.
**Warning sign:** Flaky tests when running parallel.

### Pitfall 7: Long-running NestJS holds stale Prisma Client after migration
**What goes wrong:** Per MEMORY `feedback_restart_api_after_migration.md`, the Nest process binds Prisma Client at boot. After `migrate dev` adds the `before` column, Prisma queries silently strip the new field until restart.
**How to avoid:** Plan task explicitly runs API restart after `migrate dev`.
**Warning sign:** `audit_entries.before` is null in DB but the column exists.

---

## Code Examples

(All examples were embedded inline in §3, §4, §5, §6, §7. They cite their source files. Reproduced here is only the single most load-bearing snippet.)

### Fastify reply for CSV download (mirrors `message.controller.ts:131-146`)
```typescript
@Get('export.csv')
async exportCsv(@Query() query: ExportAuditQueryDto, @CurrentUser() user, @Res() reply: any) {
  const csv = await this.auditService.exportCsv({ …query, requestingUser: user });
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0,10)}.csv"`);
  return reply.send('\uFEFF' + csv);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolling CSV escaping (D-18) | `Papa.unparse` from existing dep | Phase 15 research | Zero new deps, RFC-4180 free. |
| Polling without terminal-stop (`useImportJob` reference) | `refetchInterval: (q) => terminal ? false : N` | TanStack Query v4+ | Eliminates wasted requests; matches D-14 exactly. |
| `db push` schema changes | `prisma migrate dev --name …` | Post-Phase-9 baseline (CLAUDE.md hard rule) | Reproducible deployments; CI-enforced. |
| Per-handler audit calls | `AuditInterceptor` global with pre-state read | Phase 15 D-10 | Captures before-state without sprinkling capture logic across every controller. |

**Deprecated/outdated for this phase:**
- `react-diff-viewer-continued` integration (D-12 deferred)
- Socket.IO live updates for jobs (D-15 deferred — polling is sufficient for v1)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `before` should be a top-level column on `AuditEntry`, not nested in `metadata` | §2 | Choosing nested would require changing the migration SQL but no other code (low risk). |
| A2 | PII fields (email/phone) on Person snapshots do NOT need redaction in audit log | §3, §10 (q7) | If wrong, must extend `sanitizeSnapshot()` — small code change. |
| A3 | The `DsgvoJob` school-wide list endpoint (5th gap) is in-scope for Phase 15 | §1-Addendum | If user defers, "Jobs" tab degrades to person-picker UX. |
| A4 | `Papa.unparse` output is acceptable for German Excel import (BOM + CRLF + comma delim) | §4 | Fallback: switch delimiter to `;` (German Excel default). User confirm. |
| A5 | The 2-step Art-17 confirmation token is the User’s **email** (not name, not random token) | §10 (q4), §5 | Pure UX; trivial to swap. |
| A6 | `consents` is the right default tab for `/admin/dsgvo` | §10 (q3) | Pure UX. |
| A7 | DSFA + VVZ render as nested 2 sub-tabs (not single tab with two sections) | §6 | Pure UX; layout change only. |
| A8 | The interceptor refactor’s `modelMap` covers every audited resource | §3 | If a route is missed, `before` stays NULL — UI gracefully degrades to "no snapshot" hint. Low risk. |
| A9 | All Phase 15 E2E specs run with `--workers=1` (mirroring Phase 14 constraint) | §9, Pitfall 6 | If parallel works fine, just slower than necessary. |

If the user confirms A1, A2, A4, A5, A6, A7, the planner can lock these as Decisions before plan execution. A3 should be raised to the user as a NEW decision because it expands backend scope.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 17 | Schema migration, all queries | ✓ (existing) | 17.x | — |
| Redis | BullMQ queues for export/deletion (already used) | ✓ (existing) | 7.x | — |
| Node.js 24 LTS | API + frontend build | ✓ (CLAUDE.md C-3) | 24 LTS | — |
| pnpm 10 | Workspace, scripts | ✓ (existing) | 10.33 | — |
| `papaparse` ^5.5.3 | CSV unparse | ✓ (`apps/api/package.json:44`) | 5.5.3 | n/a |
| `@types/papaparse` ^5.5.2 | TS types | ✓ (verified `node_modules/.pnpm/@types+papaparse@5.5.2/`) | 5.5.2 | — |
| `react-day-picker` | NOT used (date pickers are native `<Input type="date">`) | ✗ | — | Native HTML5 date input (existing `FairnessStatsPanel.tsx` precedent). |
| `react-diff-viewer-continued` | D-12 deferred | ✗ | — | None — feature deferred. |
| Playwright 1.x | E2E tests | ✓ (existing) | 1.x | — |
| Vitest 4.x | Unit + integration | ✓ (existing) | 4.x | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None (all "missing" entries are intentionally absent).

---

## Sources

### Primary (HIGH confidence — verified by reading the file)
- `apps/api/src/modules/audit/audit.controller.ts` — confirmed missing `exportCsv` route
- `apps/api/src/modules/audit/audit.service.ts` — confirmed missing `exportCsv` method, role-scoped findAll logic
- `apps/api/src/modules/audit/audit.interceptor.ts` — confirmed no pre-state capture
- `apps/api/src/modules/audit/audit.module.ts` — confirmed module exports
- `apps/api/src/modules/audit/dto/query-audit.dto.ts` — confirmed missing `action` field
- `apps/api/src/modules/dsgvo/consent/consent.controller.ts` — confirmed 4 routes, no admin-filter
- `apps/api/src/modules/dsgvo/consent/consent.service.ts` — confirmed `findBySchool` uses pagination only
- `apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts` — confirmed DSFA + VVZ co-located, full CRUD
- `apps/api/src/modules/dsgvo/dsfa/dsfa.service.ts` — confirmed CRUD methods exist
- `apps/api/src/modules/dsgvo/retention/retention.controller.ts` — confirmed full CRUD
- `apps/api/src/modules/dsgvo/retention/retention.service.ts` — confirmed implementation
- `apps/api/src/modules/dsgvo/export/data-export.controller.ts` — confirmed `GET /:id` and `GET /person/:personId`
- `apps/api/src/modules/dsgvo/export/data-export.service.ts` — confirmed BullMQ enqueue + `getExportsByPerson`
- `apps/api/src/modules/dsgvo/deletion/data-deletion.controller.ts` — confirmed `GET /:id` and `GET /person/:personId`
- `apps/api/src/modules/dsgvo/deletion/data-deletion.service.ts` — confirmed BullMQ enqueue
- `apps/api/src/modules/dsgvo/` directory listing — confirmed NO `jobs/` and NO `vvz/` subdirectory
- `apps/api/prisma/schema.prisma` — `AuditEntry` (line 231-248), `ConsentRecord` (587), `RetentionPolicy` (606), `DsfaEntry` (620), `VvzEntry` (638), `DsgvoJob` (658-674)
- `apps/api/prisma/migrations/20260425172608_add_constraint_weight_overrides/migration.sql` — recent migration format
- `apps/api/prisma/seed.ts:75-119` — confirmed CASL subjects `audit`, `consent`, `retention`, `dsfa`, `export`, `person` already granted to admin
- `apps/api/src/modules/auth/casl/casl-ability.factory.ts` — DB-driven permissions, no hardcoded subjects
- `apps/api/src/main.ts:14` — confirmed `FastifyAdapter`
- `apps/api/package.json:44` — confirmed `papaparse: ^5.5.3` already installed
- `apps/api/src/modules/import/parsers/csv.parser.ts:1` — confirmed papaparse import precedent
- `apps/api/src/modules/communication/message/message.controller.ts:131-146` — Fastify `@Res() reply` streaming pattern
- `apps/api/src/modules/substitution/handover/handover.controller.ts:111-119` — second Fastify reply precedent
- `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` — entire file confirms PageShell + Tabs + Zod search-param pattern (NO `useTab` import)
- `apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx` — entire file confirms `useState`-based tab nav
- `apps/web/src/components/admin/shared/PageShell.tsx` — confirmed shape (breadcrumbs, title, subtitle, children)
- `apps/web/src/hooks/useImport.ts:127-141` — `useImportJob` polling reference
- `apps/web/src/components/layout/AppSidebar.tsx:106-108` — admin-only sidebar entry pattern
- `apps/web/src/components/ui/sheet.tsx` — Sheet primitive present
- `apps/web/src/components/admin/student/StudentStammdatenTab.tsx:178,220` + `apps/web/src/components/substitution/FairnessStatsPanel.tsx:106,121` — `<Input type="date">` precedent
- `apps/web/package.json:23-44` — Radix primitives and `cmdk` confirmed present
- `apps/api/prisma/README.md` — migration policy + shadow DB setup
- `CLAUDE.md` — full project conventions
- `.planning/STATE.md:202-206` — Phase 14 audit endpoint contract + `--workers=1` constraint

### Secondary (MEDIUM confidence)
- [Papa.unparse documentation](https://www.papaparse.com/docs#json-to-csv) — confirmed string return type and config options

### Tertiary (LOW confidence)
- None — every claim above is verified against the live codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already installed and pinned in `package.json` files
- Architecture: HIGH — every pattern has a Phase 10-14 precedent verified in the source
- Pitfalls: HIGH — pitfalls are derived from MEMORY records of resolved bugs in this repo
- Backend gaps: HIGH — each gap claim was confirmed by reading the cited file
- New gap (DSGVO Jobs list): HIGH — verified by exhaustive grep of dsgvo/ module

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (30 days — codebase is stable, dependencies are pinned, no upcoming framework migrations expected)

---

## RESEARCH COMPLETE
