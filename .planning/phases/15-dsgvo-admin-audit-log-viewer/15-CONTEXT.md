# Phase 15: DSGVO-Admin & Audit-Log-Viewer - Context

**Gathered:** 2026-04-26 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin kann Einwilligungen, Aufbewahrungsrichtlinien, DSFA/VVZ und DSGVO-Jobs aus der UI verwalten und das Audit-Log durchsuchen, einsehen und exportieren.

In scope:
- Einwilligungs-Records: filter/search nach Zweck, Status, User (DSGVO-ADM-01)
- Aufbewahrungsrichtlinien CRUD pro Datenkategorie (DSGVO-ADM-02)
- DSFA + VVZ CRUD (DSGVO-ADM-03/04)
- Art. 15 Datenexport-Trigger + BullMQ-Job-Status-Tracking (DSGVO-ADM-05)
- Art. 17 Anonymisierung/Löschung-Trigger mit 2-stufiger Bestätigung + Job-Status-Tracking (DSGVO-ADM-06)
- Audit-Log Search/Filter (Actor, Action, Subject, Zeitraum) (AUDIT-VIEW-01)
- Audit-Eintrag-Detail mit After-State + Hinweis auf fehlenden Before-Snapshot bei Altdaten (AUDIT-VIEW-02)
- Audit-Log CSV-Export (AUDIT-VIEW-03)

Out of scope (deferred):
- Side-by-side Before/After Diff-Rendering (depends on interceptor refactor — follow-up phase)
- Socket.IO-basiertes Live-Tracking für DSGVO-Jobs (polling reicht für v1)
- Mobile-Härtung der DSGVO/Audit-Surfaces (Phase 16)

</domain>

<decisions>
## Implementation Decisions

### Page Structure & Navigation
- **D-01:** Phase 15 ships als zwei separate Admin-Routes: `/admin/dsgvo` und `/admin/audit-log`. Sidebar bekommt zwei neue admin-only Einträge.
- **D-02:** `/admin/dsgvo` ist eine 4-Tab-Seite (`Einwilligungen` / `Aufbewahrung` / `DSFA-VVZ` / `Jobs`) — folgt dem `PageShell + Tabs` Muster aus `solver-tuning.tsx`.
- **D-03:** `/admin/audit-log` ist eine Single-Page-Liste mit Filter-Toolbar + Detail-Drawer (kein Tab-Layout — Audit-UX unterscheidet sich fundamental von CRUD-Tabs).
- **D-04:** Tab-Deep-Linking via `useTab` Hook analog zu Phase 14 SolverTuningTabs (URL search-param).

### Backend Scope
- **D-05:** Genau ein realer Backend-Gap aus den ROADMAP-Kandidaten: `AuditService.exportCsv()` + `GET /audit/export.csv` Controller-Route fehlen und werden in Phase 15 implementiert (streaming, server-side, respektiert aktuelle Filter).
- **D-06:** DSFA + VVZ individuelle CRUD-Endpoints sind bereits vollständig (`dsfa.controller.ts`, `vvz.controller.ts`) — kein Gap-Fix nötig, Frontend konsumiert direkt.
- **D-07:** BullMQ Job-Status-Read-Endpoints sind bereits vorhanden (`GET /dsgvo/export/:id`, `GET /dsgvo/deletion/:id`) — kein Gap-Fix nötig.
- **D-08:** Consent-Modul braucht eine Erweiterung: Admin-Filter-Endpoint nach Zweck/Status/User für DSGVO-ADM-01 (read+grant+withdraw existieren, aber kein admin-orientiertes findAll mit Filtern).

### Audit Before/After Diff
- **D-09:** v1-Rendering ist "After-only" structured JSON tree mit Hinweis "Before-Snapshot wurde für diesen Eintrag nicht erfasst" wenn Pre-State fehlt.
- **D-10:** Phase 15 enthält einen Backend-Task zur Erweiterung von `AuditInterceptor`: pre-mutation state für UPDATE/DELETE wird ab sofort erfasst und in `AuditEntry.metadata.before` (Schema-Migration) gespeichert. Historische Einträge bleiben After-only — kein Retro-Fill.
- **D-11:** Schema-Migration für AuditEntry folgt der Migration-Hard-Rule (siehe CLAUDE.md): echte `prisma migrate dev`, keine `db push`.
- **D-12:** Side-by-side Diff via `react-diff-viewer-continued` ist explizit DEFERRED — gehört in eine Follow-up-Phase, weil der Interceptor-Refactor Tenant-Isolation-Guards berühren würde.

### Job-Status Live Tracking
- **D-13:** DSGVO export/deletion Job-Tracking nutzt TanStack Query polling mit `refetchInterval: 2000` analog zu `useImport.ts:127-141`.
- **D-14:** Polling stoppt sobald Job-Status terminal ist (`completed`, `failed`, `cancelled`) — `refetchInterval: (data) => terminal ? false : 2000`.
- **D-15:** Socket.IO-Sidecar für DSGVO-Jobs ist OUT-OF-SCOPE für Phase 15.

### CSV Export
- **D-16:** CSV wird server-side generiert via dedicated `GET /audit/export.csv` Endpoint, der die aktuellen Filter (query-params) auswertet und als `text/csv` streamt.
- **D-17:** Client-side CSV-Generierung aus paginierten Frontend-Results ist explizit ABGELEHNT — würde nur die aktuelle Seite exportieren und damit AUDIT-VIEW-03 ("gefilterter Audit-Log") verletzen.
- **D-18:** Implementation ohne neue Dependency: hand-rolled CSV-Escaping (RFC 4180) im Service. Falls Komplexität explodiert, `csv-stringify` als Fallback (Plan-Entscheidung).

### Art. 17 Confirmation Pattern
- **D-19:** 2-stufige Bestätigung für Art. 17 Anonymisierung/Löschung: erste Bestätigung im Dialog ("Diese Aktion ist irreversibel"), zweite Bestätigung durch Eingabe des User-Namens oder Email-Adresse als Confirmation-Token.

### Frontend Patterns (carry-forward from Phase 14)
- **D-20:** Mutation-Hooks haben `onError` mit `toast.error` (Phase 10.2-04 invariant; siehe Phase 14 D-12).
- **D-21:** Tabellen-Zeilen tragen `data-*` Attribute für E2E-Selektoren (analog Phase 14 `data-severity` / `data-constraint-name`).
- **D-22:** Sidebar-Einträge sind admin-only (`roles: ['admin']`) analog Phase 14 D-03.

### Claude's Discretion
- Konkretes Diff-Tree-Component-Design (Tailwind-Styling, Indent-Tiefe)
- CSV-Spalten-Reihenfolge und Header-Naming
- DSGVO-Tab-Default (welcher Tab ist initial selected)
- Dialog-Layout für 2-stufige Art-17-Confirmation (Single-Dialog mit Steps oder zwei separate Dialoge)
- Pagination-Strategie für Audit-Log (cursor vs offset — abhängig von existing audit.findAll)
- Error-State-Design für Job-Status-Polling-Failures

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### DSGVO Backend (existing)
- `apps/api/src/modules/dsgvo/consent/consent.controller.ts` — Consent read/grant/withdraw; needs admin-filter extension for DSGVO-ADM-01
- `apps/api/src/modules/dsgvo/retention/retention.controller.ts` — Retention CRUD complete (DSGVO-ADM-02)
- `apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts` — DSFA CRUD complete (DSGVO-ADM-03)
- `apps/api/src/modules/dsgvo/vvz/vvz.controller.ts` (or co-located in dsfa module) — VVZ CRUD complete (DSGVO-ADM-04)
- `apps/api/src/modules/dsgvo/export/data-export.controller.ts` — `GET /dsgvo/export/:id` job status (DSGVO-ADM-05)
- `apps/api/src/modules/dsgvo/deletion/data-deletion.controller.ts` — `GET /dsgvo/deletion/:id` job status (DSGVO-ADM-06)

### Audit Backend
- `apps/api/src/modules/audit/audit.controller.ts` — `findAll` only; CSV export missing (AUDIT-VIEW-03)
- `apps/api/src/modules/audit/audit.service.ts` — `log`, `findAll`, `cleanup`; needs `exportCsv` addition
- `apps/api/src/modules/audit/audit.interceptor.ts` — currently stores only request body; needs before-state capture for AUDIT-VIEW-02

### Schema
- `apps/api/prisma/schema.prisma` — Models: `AuditEntry` (line 231-248, needs `before` field migration), `ConsentRecord`, `RetentionPolicy`, `DsfaEntry`, `VvzEntry`, `DsgvoJob` (line 658-674)

### Frontend Patterns (reference)
- `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` — PageShell + Tabs pattern reference
- `apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx` — Tab-deep-linking via `useTab` reference
- `apps/web/src/hooks/useImport.ts` (line 127-141) — BullMQ polling reference (`useImportJob`)
- `apps/web/src/components/layout/AppSidebar.tsx` (line 106-108) — Admin-only sidebar entry reference

### Project Conventions
- `CLAUDE.md` — Database migrations hard rule (Phase 15 D-11), GSD workflow enforcement
- `apps/api/prisma/README.md` — Migration policy + shadow database setup

### Requirements
- `.planning/REQUIREMENTS.md` (lines 76-87) — DSGVO-ADM-01 through 06 + AUDIT-VIEW-01/02/03 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **PageShell + Tabs pattern:** `solver-tuning.tsx` + `SolverTuningTabs.tsx` — direct template for `/admin/dsgvo` 4-tab page
- **`useTab` hook:** Tab-deep-linking via URL search-param — reuse for both new routes
- **`useImportJob` polling pattern:** `useImport.ts:127-141` — direct template for `useDsgvoExportJob` + `useDsgvoDeletionJob` hooks
- **Sidebar admin-only entry:** `AppSidebar.tsx` `roles: ['admin']` pattern — reuse for two new entries
- **Toast error handling:** Phase 10.2-04 invariant via `useToast` + `toast.error` in `onError` — carry forward
- **Existing DSGVO controllers:** Retention, DSFA, VVZ, Export, Deletion — frontend consumes directly without backend changes

### Established Patterns
- **Admin sidebar:** German labels, lucide-icon, `roles: ['admin']` predicate
- **Tab structure:** ToggleGroup mobile fallback + Tabs desktop (Phase 14 D-04 + MOBILE-ADM-01/02)
- **Mutation hooks:** `onError → toast.error`, `onSuccess → toast.success` + `queryClient.invalidateQueries`
- **E2E selectors:** `data-*` attributes on row containers (carry forward from Phase 14)
- **Migration discipline:** Real `prisma migrate dev`, never `db push` (CLAUDE.md hard rule)

### Integration Points
- **Sidebar:** Add 2 entries — `DSGVO-Verwaltung` (`/admin/dsgvo`) and `Audit-Log` (`/admin/audit-log`)
- **Routes:** New `_authenticated/admin/dsgvo.tsx` (with tab sub-routing) and `_authenticated/admin/audit-log.tsx`
- **Backend modules:**
  - Extend `consent.service.ts` + `consent.controller.ts` with admin-filter endpoint
  - Add `audit.service.ts::exportCsv()` + `audit.controller.ts::GET /audit/export.csv`
  - Modify `audit.interceptor.ts` to capture pre-mutation state for UPDATE/DELETE
  - Schema migration: `AuditEntry` adds `before Json?` field
- **API client:** Generate types/hooks for new endpoints via existing OpenAPI/Zod pipeline

</code_context>

<specifics>
## Specific Ideas

- Audit-Log-Filter-Toolbar visuell ähnlich zu den Filter-Patterns aus den Phase 10.5 Operations-Surfaces (Date-Range-Picker, Multi-Select für Action-Type, Search-Input für Subject)
- Art. 17 Confirmation-Token sollte etwas sein, das Copy-Paste-resistent ist (z.B. Email-Adresse des betroffenen Users muss exakt eingegeben werden)
- CSV-Export-Button platziert in der Filter-Toolbar, exportiert exakt die aktuell sichtbaren Filter (User-Erwartung: "WYSIWYG export")

</specifics>

<deferred>
## Deferred Ideas

- **Side-by-side Before/After Diff-Rendering** mit `react-diff-viewer-continued` — Follow-up-Phase nach Phase 15. Begründung: Interceptor-Refactor zur Pre-State-Erfassung berührt jeden Mutation-Endpoint und damit die Tenant-Isolation-Guards aus den Memory-Einträgen `useTeachers`/`subject.service`/`useClasses`. Regression-Risk zu hoch für Phase 15.
- **Socket.IO Live-Tracking für DSGVO-Jobs** — Phase 15 polled. Falls UX-Feedback echtes Real-Time fordert, Backlog-Item für `DsgvoGateway`.
- **Mobile-Härtung der DSGVO/Audit-Surfaces** — Phase 16 (MOBILE-ADM-01/02/03).
- **Audit-Log Retention/Cleanup-UI** — `AuditService.cleanup()` existiert backend-seitig, aber keine UI dafür. Backlog.
- **Audit-Entry Drill-Down** (z.B. Click auf Subject-ID navigiert zur Entity) — Backlog, nice-to-have.

</deferred>

---

*Phase: 15-dsgvo-admin-audit-log-viewer*
*Context gathered: 2026-04-26*
