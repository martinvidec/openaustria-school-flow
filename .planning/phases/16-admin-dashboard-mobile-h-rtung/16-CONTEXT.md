# Phase 16: Admin-Dashboard & Mobile-Härtung - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Zwei Liefergegenstände unter einem Dach:

**A) Admin-Dashboard** — Beim Login landet der Admin auf einer Setup-Completeness-Checkliste, die alle Admin-Surfaces aus den Phasen 10–15 zusammenführt. Pro Kategorie wird ein 3-State-Status (`erledigt` / `unvollständig` / `fehlt`) live angezeigt, jeder Eintrag ist Deep-Link auf die zugehörige Admin-Oberfläche. Erfüllt ADMIN-01, ADMIN-02, ADMIN-03.

**B) Mobile-Härtung** — Alle Admin-Surfaces aus den Phasen 10–15 werden bei 375px nutzbar gemacht: Tabellen bekommen eine Karten-/Listen-Alternative, Formulare 44px-Touch-Targets, Navigation funktioniert über das vorhandene `MobileSidebar`-Drawer-Pattern. Erfüllt MOBILE-ADM-01, MOBILE-ADM-02, MOBILE-ADM-03.

**Out of scope (deferred):**
- Weitere Dashboard-Widgets (Notification-Center, Admin-Activity-Feed) — eigene Phasen
- Socket.IO-basiertes Real-Time-Push für Dashboard-Updates (Polling + Invalidation reicht für v1.0 Single-Tenant — siehe D-09)
- Strikte Schwellwerte mit minimum counts pro Kategorie (z.B. ≥5 Lehrer für "erledigt") — explizit abgelehnt (siehe D-04)

</domain>

<decisions>
## Implementation Decisions

### Dashboard Route & Login-Redirect
- **D-01:** Neue Route `apps/web/src/routes/_authenticated/admin/index.tsx` als Admin-Dashboard. Sidebar bekommt einen neuen admin-only Eintrag „Dashboard" als oberste Position der admin-Gruppe.
- **D-02:** `apps/web/src/routes/index.tsx` wird role-aware: `beforeLoad` prüft Auth-Rolle und redirected `admin` nach `/admin`, alle anderen Rollen wie bisher nach `/timetable`. Keine Breaking-Change für non-admin-User.

### Setup-Completeness Status-Modell
- **D-03:** 3-State-Heuristik pro Kategorie (`erledigt` / `unvollständig` / `fehlt`) — matched ADMIN-03-Acceptance-Criterion explizit. Pro Kategorie kann der Status binär (erledigt/fehlt) oder ternär sein, je nachdem ob „unvollständig" sinnvoll ist.
- **D-04:** Permissive Schwellwerte für count-basierte Kategorien: Existenz reicht (`count ≥ 1` → erledigt). Ausnahme: Solver (siehe D-05). Begründung: kleine Schule mit nur 5 Lehrern soll nicht durch arbiträre minimum counts (≥10, etc.) demotiviert werden, und solche Schwellwerte sind je Schultyp (Volksschule vs BHS) ohnehin nicht universell rechtfertigbar.
- **D-05:** Solver-Kategorie strikt: `erledigt` erst wenn ≥1 Solver-Konfiguration existiert UND ≥1 erfolgreich generierter Stundenplan vorliegt. `unvollständig` wenn Config existiert aber kein Run. `fehlt` wenn keine Config. Begründung: Solver-Config alleine ist meaningless ohne ausgeführten Run — Admin soll motiviert werden, einen Plan zu generieren.
- **D-06:** Konkrete Status-Regeln pro Kategorie (Reihenfolge = Setup-Reihenfolge im Dashboard):

  | # | Kategorie | erledigt | unvollständig | fehlt |
  |---|-----------|----------|---------------|-------|
  | 1 | Schule | name + schultyp + komplette address (street, postalCode, city) | irgendein Required-Feld gesetzt | kein School-Record / leer |
  | 2 | Zeitraster | ≥1 Period definiert + Wochentage konfiguriert | ≥1 Period vorhanden aber Wochentage fehlen | 0 Periods |
  | 3 | Schuljahr | aktuelles Schuljahr mit start+end | irgendein SY existiert aber unvollständig | kein Schuljahr |
  | 4 | Fächer | count ≥ 1 | (n/a) | count = 0 |
  | 5 | Lehrer | count ≥ 1 | (n/a) | count = 0 |
  | 6 | Klassen | count ≥ 1 | (n/a) | count = 0 |
  | 7 | Schüler | count ≥ 1 + alle einer Klasse zugeordnet | count ≥ 1 aber ≥1 ohne Klassenzuordnung | count = 0 |
  | 8 | Solver | Config + ≥1 erfolgreicher Run | Config existiert ohne Run | keine Config |
  | 9 | DSGVO | Retention ≥ 1 + DSFA ≥ 1 + VVZ ≥ 1 | Retention ≥ 1 aber DSFA/VVZ fehlen | nichts angelegt |
  | 10 | Audit | AuditEntry-Count ≥ 1 (passive, entsteht durch Nutzung) | (n/a — passive) | AuditEntry-Count = 0 |

### Live-Update-Mechanik (ADMIN-03)
- **D-07:** Hybrid-Pattern: gemeinsamer QueryKey `['dashboard-status']`. Sub-Surface-Mutations (createTeacher, deleteSubject, solverRun-onComplete, etc.) rufen zusätzlich zu ihrer eigenen Invalidierung `queryClient.invalidateQueries({ queryKey: ['dashboard-status'] })` auf.
- **D-08:** Sekundär: `refetchInterval: 30_000` (30s) als Backup für Multi-Device/Multi-Admin-Szenarien (selten in v1.0 Single-Tenant, aber kein Aufwand).
- **D-09:** `staleTime: 10_000` für die Dashboard-Query — verhindert Storm bei rapid-fire-Mutations.
- **D-10:** Backend liefert genau einen aggregierten Endpoint `GET /admin/dashboard/status`, der das Status-Objekt für alle 10 Kategorien in einem Round-Trip zurückgibt. Verhindert N+1-Frontend-Queries.
- **D-11:** Socket.IO-Broadcast explizit OUT-OF-SCOPE für Phase 16 (carry-forward Phase 15 D-15 Pattern: kein Socket-Sidecar in v1.0).

### Mobile-Tabellen-Strategie (MOBILE-ADM-01)
- **D-12:** Geteiltes `<DataList>`-Component mit `columns`-Schema und `mobileCard`-Render-Prop. Auf Desktop rendert es als `<Table>`, auf Mobile als Stack-of-Cards via `mobileCard(row)`. Einmal sauber gebaut, alle bestehenden Admin-Tabellen migrieren.
- **D-13:** `useIsMobile()` Hook existiert bereits in `apps/web/src/routes/__root.tsx:20` mit Default-Breakpoint 640px. Phase 16 extrahiert ihn nach `apps/web/src/hooks/useIsMobile.ts` (Wiederverwendbarkeit) UND behält 640px als Default-Breakpoint (`<sm` triggert Card-Mode). Alternative Override per Param möglich.
- **D-14:** `data-*` E2E-Selektoren werden im DataList-Component standardisiert: jede Row trägt `data-testid={getRowTestId(row)}` (carry-forward Phase 14 / Phase 15 D-21 Pattern).
- **D-15:** Migration aller bestehenden Admin-Tabellen erfolgt sequentiell. Reihenfolge nach Dependency-Graph: erst `<DataList>` bauen + tests, dann pro Surface migrieren. Konkrete Migration-Reihenfolge ist Planner-Detail.

### Mobile-Forms (MOBILE-ADM-02)
- **D-16:** Audit-First-Ansatz: Plan in Phase 16 enthält Playwright-Mobile-Viewport-Sweep (375px) über alle bestehenden Admin-Formulare als initialen Audit-Schritt. Resultierende Gap-Liste definiert konkrete Fix-Tasks.
- **D-17:** Globale Touch-Target-Härtung: shadcn/ui Input-/Button-Defaults werden auf `min-h-11` (44px) gehoben falls noch nicht gesetzt. Verhindert N-fache per-Form-Patches.

### Mobile-Navigation (MOBILE-ADM-03)
- **D-18:** `apps/web/src/components/layout/MobileSidebar.tsx` existiert bereits — Phase 16 verifiziert ihre Funktion bei 375px für Admin-Navigation und ergänzt fehlende Admin-Links (Dashboard-Eintrag aus D-01, ggf. Phase-15-Surfaces falls noch nicht enthalten).

### Frontend Patterns (carry-forward aus Phasen 10-15)
- **D-19:** TanStack Query Mutation-onError → `toast.error` (Phase 10.2-04 invariant; Phase 14 D-12; Phase 15 D-20).
- **D-20:** Sidebar-Eintrag admin-only via `roles: ['admin']` (Phase 14 D-03; Phase 15 D-22).
- **D-21:** Tab-Routing falls benötigt (z.B. Dashboard-Sub-Bereiche): `useState` + `Route.useSearch()`-Pattern (Phase 15 D-26 — kein `useTab`-Hook).
- **D-22:** Migrations-Hard-Rule: keine `prisma db push` (CLAUDE.md). Falls neue Backend-Models nötig (z.B. cached dashboard-status) → echte `prisma migrate dev`.

### Claude's Discretion
- Konkretes Card-Style-Design der Dashboard-Einträge (Linear-style Card vs shadcn-Card vs custom)
- Status-Badge-Farben (Vorschlag: erledigt=green, unvollständig=amber, fehlt=red — wird im UI-Phase finalisiert)
- Lucide-Icon pro Kategorie (z.B. `School`, `Calendar`, `Users`, `BookOpen`, ...)
- DataList-Sort-Implementation (client-side für kleine Listen, server-side für audit-log/students)
- Empty-State-Design pro Surface
- DataList-Pagination-Strategy (cursor vs offset — abhängig vom existing endpoint)
- Welcher Tab im Dashboard initial selected ist (falls überhaupt Tabs benötigt werden — vermutlich nicht, ist eine Single-Page)
- Aggregations-Implementierung im Backend `dashboard.service.ts` (parallel queries via `Promise.all` vs sequential — Performance-Detail)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` (lines 17-19) — ADMIN-01/02/03 acceptance criteria
- `.planning/REQUIREMENTS.md` (lines 91-93) — MOBILE-ADM-01/02/03 acceptance criteria

### Frontend Routes & Layout
- `apps/web/src/routes/index.tsx` — Aktueller Login-Redirect (alle → /timetable); Phase 16 macht role-aware (D-02)
- `apps/web/src/routes/__root.tsx` (line 20-32) — Existing `useIsMobile()` Hook mit 640px-Default-Breakpoint (D-13)
- `apps/web/src/components/layout/AppSidebar.tsx` — Sidebar-Konfiguration mit `roles: ['admin']`-Pattern; Phase 16 fügt Dashboard-Eintrag hinzu (D-01, D-20)
- `apps/web/src/components/layout/MobileSidebar.tsx` — Bestehende mobile Drawer-Navigation (MOBILE-ADM-03 verifiziert + ergänzt — D-18)
- `apps/web/src/components/admin/shared/PageShell.tsx` — Admin-PageShell mit Breadcrumbs/Title/Subtitle — Container für Dashboard-Page

### Frontend Pattern References
- `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` — TanStack-Router Route-Pattern, Auth-Gate, Tab-Search-Schema
- `apps/web/src/hooks/useImport.ts` (lines 127-141) — TanStack Query polling Pattern (`refetchInterval`) — Reference für D-08

### Existing Admin Surfaces (Mobile-Härtung Targets — Phase 10-15)
- `apps/web/src/routes/_authenticated/admin/school.settings.tsx`
- `apps/web/src/routes/_authenticated/admin/subjects.index.tsx`
- `apps/web/src/routes/_authenticated/admin/teachers.index.tsx` + `teachers.$teacherId.tsx`
- `apps/web/src/routes/_authenticated/admin/classes.index.tsx` + `classes.$classId.tsx`
- `apps/web/src/routes/_authenticated/admin/students.index.tsx` + `students.$studentId.tsx`
- `apps/web/src/routes/_authenticated/admin/users.index.tsx` + `users.$userId.tsx`
- `apps/web/src/routes/_authenticated/admin/solver.tsx` + `solver-tuning.tsx`
- `apps/web/src/routes/_authenticated/admin/dsgvo.tsx`
- `apps/web/src/routes/_authenticated/admin/audit-log.tsx`
- `apps/web/src/routes/_authenticated/admin/import.tsx` + `resources.tsx` + `substitutions.tsx`
- `apps/web/src/routes/_authenticated/admin/timetable-edit.tsx` + `timetable-history.tsx`

### Backend Aggregations
- `apps/api/src/modules/school/school.service.ts` — School-Profile readout für D-06 Schule
- `apps/api/src/modules/timegrid/` (oder analog) — Period-Configs für D-06 Zeitraster
- `apps/api/src/modules/teacher/teacher.service.ts` — count für D-06 Lehrer
- `apps/api/src/modules/class/class.service.ts` — count für D-06 Klassen
- `apps/api/src/modules/student/student.service.ts` — count + Klassen-Zuordnung für D-06 Schüler
- `apps/api/src/modules/subject/subject.service.ts` — count für D-06 Fächer
- `apps/api/src/modules/solver/` — Config + Run-History für D-06 Solver
- `apps/api/src/modules/dsgvo/` — Retention/DSFA/VVZ-Counts für D-06 DSGVO
- `apps/api/src/modules/audit/audit.service.ts` — AuditEntry-Count für D-06 Audit

### Project Conventions
- `CLAUDE.md` — Database migrations hard rule (D-22), GSD workflow enforcement, technology stack constraints (TanStack Query, shadcn/ui)
- `apps/api/prisma/README.md` — Migration policy + shadow database setup

### Prior Phase Context (carry-forward decisions)
- `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md` — Polling-Pattern (D-13), Sidebar-Pattern (D-22), Toast-Invariant (D-20), data-* E2E (D-21)
- `.planning/phases/14-solver-tuning/14-CONTEXT.md` — Tab-Mobile-Pattern (D-04), admin-only sidebar (D-03), Mutation-onError-toast (D-12)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useIsMobile()` Hook**: existiert bereits in `__root.tsx:20` mit 640px-Default — Phase 16 extrahiert ihn nach `hooks/useIsMobile.ts` (D-13).
- **`MobileSidebar`**: drawer-basierte mobile-Navigation existiert (Phase 10.x) — Phase 16 verifiziert + ergänzt Admin-Links (D-18).
- **`PageShell`**: Admin-PageShell-Container (Breadcrumbs + Title + Subtitle) — direktes Template für Dashboard-Page.
- **TanStack Query polling pattern**: `useImport.ts:127-141` (`useImportJob`) — direktes Template für Dashboard-Status-Query mit `refetchInterval` + `staleTime` (D-08, D-09).
- **Sidebar admin-only Pattern**: `AppSidebar.tsx` `roles: ['admin']` — direkte Vorlage für Dashboard-Eintrag (D-01).
- **TanStack-Router validateSearch + role-Gate**: `solver-tuning.tsx` Route-Pattern — Vorlage für `/admin/index.tsx` Route-Definition.

### Established Patterns
- **Login-Redirect-Strategie**: aktuell hardcoded auf `/timetable` für ALLE Rollen. Phase 16 muss role-aware umstellen — sicherzustellen, dass `lehrer`, `schulleitung`, `eltern`, `schueler` weiterhin `/timetable` sehen (Regression-Vermeidung).
- **CRUD-Tabellen-Pattern**: alle Admin-Tabellen heute direkt mit `<table>` aus shadcn/ui — kein gemeinsames Component. Phase 16 etabliert `<DataList>` als neue Konvention.
- **Mobile-Härtung war NICHT inkludiert in Phasen 10-15** — entsprechend KEINE Mobile-Tests in den E2E-Suites bisher. Phase 16 fügt 375px-Viewport-Sweep hinzu.
- **shadcn/ui Touch-Target-Defaults**: vermutlich nicht durchgängig 44px gesetzt — Audit erforderlich (D-16).

### Integration Points
- **Sidebar**: 1 neuer Admin-only Eintrag „Dashboard" oben (`AppSidebar.tsx`).
- **Routes**: `routes/index.tsx` umstellen + neu `routes/_authenticated/admin/index.tsx` anlegen.
- **Backend**: 1 neuer Endpoint `GET /admin/dashboard/status` (neuer `dashboard.module.ts` + `dashboard.controller.ts` + `dashboard.service.ts`). Service aggregiert über bestehende Service-Layer der 10 Kategorien (READ-only, kein Schema-Change nötig).
- **Sub-Surface-Mutations**: ALLE bestehenden Mutations in den Phase-10–15-Sub-Surfaces brauchen `queryClient.invalidateQueries({ queryKey: ['dashboard-status'] })` zusätzlich zu ihrer eigenen Invalidierung. Audit-First (Mobile-Sweep-Plan kann auch diesen Audit übernehmen).
- **`<DataList>` Migration**: bestehende Admin-Tabellen werden sequentiell auf `<DataList>` umgestellt (Reihenfolge = Planner-Detail). E2E-Tests müssen weiterhin grün bleiben (Selektoren via `data-testid` standardisiert in DataList).

</code_context>

<specifics>
## Specific Ideas

- **Dashboard-Layout-Vibe:** Linear's „Setup checklist" auf der Workspace-Settings-Seite — schlichte vertikale Liste, jeder Eintrag mit Icon + Titel + Status-Badge + Pfeil-Icon. Kein Card-Grid, kein Hero-Header.
- **Setup-Reihenfolge der Checklist** ist die natürliche Onboarding-Reihenfolge: Schule → Zeitraster → Schuljahr → Fächer → Lehrer → Klassen → Schüler → Solver → DSGVO → Audit. Reihenfolge ist NICHT alphabetisch.
- **Status-Sprache:** deutsche UI-Strings — `Erledigt`, `Unvollständig`, `Fehlt` (carry-forward UI-Sprache aus Phasen 10-15).
- **Mobile-Card-Density:** auf 375px sollte eine Card pro Bildschirm-Höhe NICHT mehr als ~80px brauchen — Admin scrollt eine Liste mit 50 Lehrern, das muss flüssig sein. shadcn-Card ohne Padding-Override ist zu groß.
- **Mobile-Form-Touch-Targets:** der existierende shadcn-Input hat eine Default-Höhe von ~36px (`h-9`) — das ist UNTER 44px. D-17 ist nicht optional.

</specifics>

<deferred>
## Deferred Ideas

- **Dashboard-Notification-Center** (z.B. „3 neue Audit-Einträge seit letztem Login") — eigene Phase, gehört zu User-Engagement-Features.
- **Quick-Actions-Buttons im Dashboard** (z.B. „Neuen Lehrer anlegen" direkt vom Dashboard) — out-of-scope für ADMIN-01/02/03, könnte v1.2-Feature sein.
- **Customizable Dashboard** (Admin kann Reihenfolge der Kategorien anpassen / Kategorien ausblenden) — overkill für v1.0.
- **Multi-School-Aggregation** (z.B. Landesschulrat sieht Dashboards mehrerer Schulen) — Future-Requirement v1.2+ (`MULTI-TENANT`).
- **Dashboard-Widgets für Schulleitung-Rolle** — explizit NICHT in Phase 16, da ROADMAP nur Admin-Rolle adressiert. Eigene Phase wenn Schulleitung-spezifisches Dashboard gewünscht.
- **Strikte Mindest-Counts pro Kategorie** (z.B. ≥5 Lehrer) — explizit abgelehnt in D-04 (arbiträr je Schultyp). Falls später gewünscht: per-Schultyp-Konfiguration in Schule-Settings.
- **Socket.IO Live-Push für Dashboard** — explizit aus Phase 16 ausgeklammert (D-11). Falls UX-Feedback echtes Real-Time fordert, Backlog-Item für `DashboardGateway`.

</deferred>

---

*Phase: 16-admin-dashboard-mobile-h-rtung*
*Context gathered: 2026-04-28*
