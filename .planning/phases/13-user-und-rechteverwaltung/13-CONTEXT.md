# Phase 13: User- und Rechteverwaltung - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Mode:** Smart discuss (4 Gray Areas × 4 Fragen, recommended-first options)

<domain>
## Phase Boundary

Admin kann Keycloak-User listen und durchsuchen (paginiert + gefiltert), die 5 SchoolFlow-Rollen (Admin, Schulleitung, Lehrer, Eltern, Schüler) pro User zuweisen, die resultierenden effektiven CASL-Permissions mit Rollen-Vererbung einsehen, Per-User-ACL-Overrides (action + subject + granted/denied + conditions + reason) pflegen sowie Keycloak-User mit Teacher/Student/Parent-Person-Records bidirektional verknüpfen und wieder lösen. UI-Layer über v1.0-Backend (`KeycloakAdminModule`, `Auth/CaslAbilityFactory`, bereits existierende Prisma-Modelle `Role` / `Permission` / `PermissionOverride` / `UserRole`), erweitert um sechs Backend-Gap-Fixes als atomic tasks: KC-Admin-Pagination+Enabled-Toggle, Role-Management-Controller, PermissionOverride-CRUD, Effective-Permissions-Introspection-Endpoint, Student+Parent linkKeycloak/unlinkKeycloak (Mirror von Teacher), Reverse-Link-Endpoint auf User-Seite. Mobile-Parität bei 375px für alle Tabs. E2E mit Playwright voll ausgebreitet (~11 Specs).

Deckt: USER-01..05 (5 Requirements).

</domain>

<decisions>
## Implementation Decisions

### Area 1 — User-Liste & Keycloak-Sync

- **D-01:** Hybrid-Datenquelle — Backend ruft Keycloak Admin API (authoritativ für `enabled`, `email`, `firstName`, `lastName`, `createdTimestamp`) und hydratet pro Row aus DB: (a) `UserRole` (Rollen-Liste), (b) `Person.keycloakUserId` Reverse-Lookup (personType + Teacher/Student/Parent-Summary). Filter-by-Role läuft via DB-Index (UserRole.userId IN (...)) — KC-seitige Role-Scans wären nicht skalierbar. Ein neuer `UserDirectoryService` im Backend konsolidiert beide Quellen. Phase-11-Pattern (KeycloakAdminService.findUsersByEmail mit alreadyLinkedToPersonId-Enrichment) wird erweitert.
- **D-02:** Pagination via KC `first`/`max` + `search`-Param — neues Endpoint `GET /admin/users?first=0&max=25&search=foo&role=lehrer&linked=unlinked&enabled=active`. KC `search` deckt firstName/lastName/email/username ab (native case-insensitive substring). Total-Count via separatem `GET /admin/users/count` (KC `/users/count?search=` unterstützt gleiche Filter). Server filtert post-hoc nach Role/Linked/Enabled aus DB-Join. Performance-Ziel: OK bis ~5k KC-User pro Realm.
- **D-03:** Vollset-Filter-Bar — oben im `/admin/users`-Liste: (1) Search-Input (Name/Email), (2) Rolle-Multi-Select (5 Rollen + "Ohne Rolle"-Pseudo-Option), (3) Linked-Status-Toggle (`Alle | Verknüpft | Nicht verknüpft`), (4) Enabled-Toggle (`Alle | Aktiv | Deaktiviert`). Dense Table mit Spalten: Nachname | Vorname | Email | Rollen (chip-liste) | Verknüpft mit (Teacher/Student/Parent-Badge + Name) | Status (Enabled/Disabled) | Aktionen. Default-Sort: Nachname ASC. Empty-State: InfoBanner "Keine User gefunden" mit Filter-Reset-CTA (KEIN "Ersten User anlegen"-CTA, da KC-Accounts außerhalb der UI lifecycled werden, siehe D-04).
- **D-04:** Read-Only + Enabled-Toggle — UI exposes **keinen** KC-User-Create, **kein** Delete und **kein** Password-Reset. Einzige mutable KC-Action: `PUT /admin/users/:userId/enabled { enabled: boolean }` (Admin kann abwesende Lehrer/Eltern temporär sperren). KC-Account-Lifecycle bleibt außerhalb v1.1 (über KC-Admin-UI oder späteres SCIM-Ingest). Deckt Milestone-Goal "ohne SQL/Swagger"; KC-Bulk-Create + Password-Reset explizit deferred zu v1.2. Row-Action "Sperren"/"Reaktivieren" mit Confirm-Dialog, WarnDialog "User wird sich nicht mehr einloggen können".

### Area 2 — Rollenzuweisung & Lockout-Safety

- **D-05:** Checkbox-Liste im Tab "Rollen" — 5 Rows (eine pro Role aus `prisma.role.findMany()`, dynamisch, nicht hardcodiert). Pro Row: Checkbox + `displayName` + `description` aus DB. Dirty-State triggert StickyMobileSaveBar (Phase 10 D-02 Pattern). Save → `PUT /admin/users/:userId/roles { roleNames: string[] }` — Backend löscht alle existierenden UserRole-Records und legt neue an in einer Prisma-Transaktion (replace-all-in-transaction, Phase 2 D-04 + Phase 11 D-07 Pattern). Audit-Log via bestehenden AuditInterceptor (Action-Types `update` auf subject `user-role`). JWT-Refresh nach Role-Change: User wird bei nächstem Request (Access-Token-Ablauf, max 15min Phase 1 D-04) automatisch neu authentifiziert — kein aktiver Force-Logout nötig. InfoBanner "Änderungen wirken spätestens nach erneutem Login vollständig" sichtbar im Tab.
- **D-06:** Self-Lockout Soft-Guard — Frontend: beim Un-Ticken der "Admin"-Rolle auf eigenem User-Detail (userId === currentUser.id) öffnet WarnDialog "Du entziehst dir selbst die Admin-Rolle. Nach Speichern wirst du beim nächsten Request andere Rechte haben. Andere Admins müssen existieren, damit die Rettung möglich bleibt." mit Confirm. Backend-Invariante (siehe D-07) greift immer als zusätzlicher Fail-Safe.
- **D-07:** Globale "Mindestens 1 Admin"-Invariante — Backend-Guard in `PUT /admin/users/:userId/roles` und in der neuen Role-Management-Service-Methode: zählt `prisma.userRole.count({ where: { role: { name: 'admin' } } })` nach dem simulierten Update. Falls count < 1 → `ConflictException` (HTTP 409) mit RFC 9457 problem+json: `{ type: 'schoolflow://errors/last-admin-guard', title: 'Mindestens ein Admin muss bestehen bleiben', detail: 'Weisen Sie einem anderen User die Admin-Rolle zu, bevor Sie diese entziehen.' }`. Wirkt egal ob Self- oder Foreign-Unassign, egal wer den Request macht. E2E-Error-Path verpflichtend (USR-02 lockout spec).
- **D-08:** Rolle ↔ Person-Link Konsistenz — Frontend zeigt InfoBanner im Tab "Rollen" wenn Rollenzuweisung und Person-Verknüpfung divergieren: (a) User hat `lehrer`-Rolle aber keinen TEACHER-Person-Link → "Tipp: Verknüpfe diesen User mit einem Lehrer-Record unter Tab 'Person-Verknüpfung'.", (b) analog für `schueler`/STUDENT und `eltern`/PARENT. Keine Backend-Enforcement — Divergenz ist valid (frisch angelegter KC-Account, Person-Link folgt). `admin`/`schulleitung`-Rollen haben keine Person-Link-Erwartung (können an Non-Person-Admins gebunden sein).

### Area 3 — Effective-Permissions + Override-Editor

- **D-09:** Effective-Permissions-Tab: gruppiert nach Subject + Source-Spalte — Tabelle mit Akkordeon-Gruppen pro `subject` (aggregiert aus `prisma.permission.findMany()` + Overrides). Pro Row: `action` (Badge), Granted/Denied-Icon (✓ grün / ✗ rot), Source (Chip: `Rolle: admin` / `Rolle: schulleitung` / `Override`), Conditions (kompakte Anzeige `{schoolId: "...", userId: "{{ id }}"}` — expandable bei langen JSONs). Subject-Gruppen scrollen vertikal; jedes Akkordeon zeigt Badge mit Anzahl effektiver Abilities. Neues Read-Endpoint `GET /admin/users/:userId/effective-permissions` berechnet Output analog `CaslAbilityFactory.createForUser` aber liefert flache Liste mit `source`-Attribution (per-Row: Role-Name oder `override`) statt kompilierte CASL-Ability. Interpolation (`{{ id }}`) wird pre-rendered mit actual userId für Anzeige-Transparenz.
- **D-10:** ACL-Override-Editor (strukturiert) im Tab "Overrides" — Row-Add-List. Pro Row: (a) `action`-Select (Union aus `prisma.permission.findMany({ distinct: ['action'] })` + Standard-Set `['create','read','update','delete','manage']`), (b) `subject`-Select (Union aus `distinct: ['subject']` + `'all'`), (c) Granted/Denied-Toggle (Binär-Switch mit Color-Coding green/red), (d) Collapsible Conditions-Panel (D-11), (e) Reason-Input (Pflichtfeld, audit-trail-relevant, z.B. "Vertretungs-Admin während Sommerferien 2026"), (f) Delete-Icon. "+ Override hinzufügen"-Button unten. Save-Pattern: individueller POST/PUT/DELETE pro Row (nicht replace-all, damit Audit-Action-Types korrekt bleiben — `create`/`update`/`delete` auf subject `permission-override`). `grantedBy` = automatisch current admin (aus AuthenticatedUser). `PermissionOverride.@@unique([userId, action, subject])` wird server-side enforced — UI fängt 409 ab und zeigt "Override für diese Action+Subject existiert bereits".
- **D-11:** Conditions-Authoring — Collapsible Panel "Erweitert: Bedingungen" pro Override-Row. Textarea mit JSON-Schema-Validation (Zod, `z.record(z.string(), z.unknown())`). Deutsche Variable-Hints unter Textarea: "Variablen: `{{ id }}` → Keycloak-User-ID; weitere Interpolations werden in späteren Phasen folgen." Parse-Validator zeigt Inline-Error bei invalid JSON. Default (empty Panel): `conditions = null` (un-conditioned ability). Placeholder-Autocomplete für `{{ id }}` via Monaco-Hint oder simpler Inline-Replace-Suggestion. Zukunftssicher: Phase 14+ kann `{{ schoolId }}`, `{{ classIds }}` ergänzen ohne UI-Rewrite, nur Variable-Hints-Liste ergänzen.
- **D-12:** Kein Simulator in Phase 13 — Effective-Permissions-Tab (D-09) liefert bereits vollen Resolution-Output mit Source-Attribution. "Can this user do X?"-Simulator deferred (Kandidat für Phase 16 Dashboard-Integration oder v1.2 Admin-Debug-Surface). REQ-Check: USER-03 schreibt "wirksame Permissions mit Rollen-Vererbung" → D-09 deckt vollständig.

### Area 4 — Person-Linking & Plan-Scope

- **D-13:** Bidirektionales Person-Linking — Tab "Person-Verknüpfung" im User-Detail. Zeigt aktuellen Zustand: (a) "Verknüpft mit: [Typ-Badge] [Vorname Nachname] [Deep-Link auf Detail-Seite]" oder (b) "Nicht verknüpft". Actions: "Verknüpfung ändern" → Dialog mit 3-Radio-Group (Teacher/Student/Parent) + Autocomplete-Search (Command-Popover, wiederverwendet aus Phase 11 D-08 + Phase 12 D-08) → Confirm → `POST /admin/users/:userId/link-person { personType: 'TEACHER' | 'STUDENT' | 'PARENT', personId: string }`. "Verknüpfung lösen" → Confirm-Dialog + `DELETE /admin/users/:userId/link-person`. **Phase 11 D-08 Teacher-Detail-Link-Surface bleibt funktional** — beide Richtungen nutzen denselben neuen link-person-Endpoint (Teacher.controller bekommt thin wrapper der intern ruft). Student + Parent bekommen als Gap-Fix analoge Link/Unlink-Endpoints auf ihren Detail-Seiten (für Phase 12 Parent-Module + Phase 11 Teacher-Symmetrie). UI-Deep-Link: User-Detail → "Verknüpft mit Teacher Max Mustermann" → klickt Link → `/admin/teachers/$teacherId`; reverse: Teacher-Detail Keycloak-Link-Card → Deep-Link → `/admin/users/$keycloakUserId`.
- **D-14:** Link-Konflikt-Handling via RFC 9457 + Umleitungsdialog — Backend-Invariante: `Person.keycloakUserId` bleibt UNIQUE (existing constraint); `person.personType` + `userId` eindeutig pro Link. `POST /admin/users/:userId/link-person` wirft `ConflictException` (409) bei: (a) KC-User-ID bereits einer anderen Person zugeordnet → Payload `{ type: 'schoolflow://errors/person-link-conflict', affectedEntities: [{ kind: 'person', id, name, personType }] }`; (b) Person bereits einem anderen KC-User zugeordnet → Payload mit `affectedEntities: [{ kind: 'user', id, email, name }]`. UI fängt 409 ab und zeigt `WarnDialog` mit zwei Aktionen: "Existierende Verknüpfung lösen und neu verknüpfen" (2-stufiger Confirm: erst Unlink-Done-Animation, dann Link-Anfrage) ODER "Abbrechen". Deep-Link zur konfliktierenden Entity im Dialog für inspection. Pattern konsistent mit Phase 11 D-12 + Phase 12 D-13 Orphan-Guard.
- **D-15:** Plan-Breakdown — 3 bundled plans (Phase 11 D-16 + Phase 12 D-16 Pattern-Continuation):
  - **Plan 13-01** — Shared foundation + Backend-Gap-Fixes (alle sechs, in atomic tasks): `packages/shared/src/validation/` Zod-Schemas (user-role, permission-override, person-link, keycloak-user-query). Backend: (1) `KeycloakAdminService.findUsers(filter)` paginierte Variante + `countUsers` + `setEnabled(userId, enabled)`; (2) neuer `UserDirectoryService` + `UserDirectoryController` mit `GET /admin/users` (hybrid: KC + DB-hydration), `GET /admin/users/:userId` Detail; (3) `RoleManagementController` mit `GET /admin/roles`, `GET /admin/users/:userId/roles`, `PUT /admin/users/:userId/roles` inkl. min-1-Admin-Guard (D-07); (4) `PermissionOverrideController` (CRUD) + bestehende Service-Logik erweitern; (5) `EffectivePermissionsService.resolve(userId)` + `GET /admin/users/:userId/effective-permissions` (read-only, parallel zu CaslAbilityFactory aber mit source-attribution); (6) `Student.linkKeycloakUser`/`unlinkKeycloakUser` + Controller-Endpoints + `Parent.linkKeycloakUser`/`unlinkKeycloakUser` + Controller-Endpoints (Mirror Phase-11-Teacher-Pattern); (7) `POST /admin/users/:userId/link-person` + `DELETE /admin/users/:userId/link-person` mit 409-Konflikt-Response + affectedEntities. Inkl. Unit-Tests für jeden Guard (min-1-admin, link-conflict). **Keine Schema-Migrations** — alle Prisma-Modelle existieren aus Phase 1 + 2.
  - **Plan 13-02** — Frontend Routes + Detail-Page mit 4 Tabs + neue Sidebar-Gruppe: Neue Sidebar-Gruppe "Zugriff & Berechtigungen" in `AppSidebar.tsx` + `MobileSidebar.tsx` mit Icon `ShieldCheck` (lucide), role-gating `roles: ['admin']` (strikter als Personal-Gruppe). Routes `/admin/users/index.tsx` + `/admin/users/$userId.tsx`. TanStack-Query-Hooks: `useUsers(filter)`, `useUser(userId)`, `useSetUserEnabled`, `useRoles`, `useUserRoles(userId)`, `useUpdateUserRoles`, `useEffectivePermissions(userId)`, `usePermissionOverrides(userId)`, `useCreatePermissionOverride`, `useUpdatePermissionOverride`, `useDeletePermissionOverride`, `useUserPersonLink(userId)`, `useLinkPerson`, `useUnlinkPerson`, `useTeacherSearch`, `useStudentSearch`, `useParentSearch`. Detail-Page mit 4 Tabs: **Stammdaten** (read-only KC-Felder + Enabled-Toggle mit Confirm), **Rollen** (D-05 Checkbox-Liste + Self-Lockout-Warn + Konsistenz-InfoBanner D-08), **Permissions** (D-09 Subject-Gruppen-Akkordeon, read-only Table), **Overrides + Person-Link** (Merge-Tab: obere Section Overrides-Editor D-10/D-11, untere Section Person-Verknüpfung D-13 mit Autocomplete-Search + Unlink). UnsavedChangesDialog pro Tab, StickyMobileSaveBar pro Tab. AffectedEntitiesList erweitert um `kind: 'user' | 'person-teacher' | 'person-student' | 'person-parent'`.
  - **Plan 13-03** — E2E Playwright voll ausgebreitet (~11 Specs, siehe D-16).
- **D-16:** E2E Voll-Scope (User-Override) — **[USER-OVERRIDE: ~7 Specs war recommended, User wählte ~11 Specs voll ausgebreitet]**. 11 Spec-Files mit Prefix-Isolation `E2E-USR-*` (Phase 10.5-02 Pattern):
  1. **E2E-USR-01 list-filter** (desktop + mobile-375) — Liste lädt, Filter-by-Search, Filter-by-Rolle, Filter-by-Linked, Filter-by-Enabled, Pagination-Navigation.
  2. **E2E-USR-02 role-assign-happy** — Admin öffnet User-Detail, tickt Rolle, speichert, Toast "Rollen aktualisiert", UserRole in DB verifiziert.
  3. **E2E-USR-03 role-assign-lockout** — Admin entzieht letzten Admin → 409-Error-Toast "Mindestens ein Admin muss bestehen bleiben", DB unverändert (Regression-Guard für D-07).
  4. **E2E-USR-04 role-self-lockout-warn** — Self-Unassign Admin → WarnDialog erscheint, Admin bestätigt, zweiter User existiert als Admin → Speichern erfolgreich; wenn er alleiniger Admin ist → 409 (Verdrahtung von D-06 + D-07).
  5. **E2E-USR-05 effective-permissions-view** — Admin öffnet Permissions-Tab, sieht Subject-Gruppen-Akkordeon, expandiert "teacher"-Gruppe, sieht Rows mit Source-Chips `Rolle: admin`; fügt Override hinzu (in Tab 4), reload, neuer Row mit Source-Chip `Override` sichtbar.
  6. **E2E-USR-06 override-create-edit-delete** — Create-Happy (action+subject+granted=true+conditions=null+reason), Edit-Happy (switch to denied), Delete-Happy, 409-Duplicate (same action+subject).
  7. **E2E-USR-07 override-conditions-json** — Conditions-Panel expandieren, valides JSON eingeben `{"userId":"{{ id }}"}`, speichern, Effective-Permissions-Tab zeigt interpolated userId.
  8. **E2E-USR-08 person-link-happy-teacher** — User-Detail Tab 4, "Verknüpfung ändern" → Teacher-Search → auswählen → Confirm → Link-Success-Toast; reverse navigation: Teacher-Detail → Keycloak-Link-Card zeigt User-Email + Deep-Link.
  9. **E2E-USR-09 person-link-conflict** — Verknüpfe User A mit Teacher X; dann Versuch User B mit Teacher X → 409 Conflict-Dialog mit "Existierende lösen und neu verknüpfen" → Admin bestätigt → 2-Stage-Re-Link erfolgreich.
  10. **E2E-USR-10 person-unlink** — Tab 4 "Verknüpfung lösen" → Confirm-Dialog → Unlink-Success-Toast → Tab zeigt "Nicht verknüpft" + Teacher-Detail-Keycloak-Card zeigt "Nicht verknüpft".
  11. **E2E-USR-11 enable-disable-toggle** — Row-Action "Sperren" → Confirm → KC-API wird aufgerufen, UI zeigt "Deaktiviert"-Badge; "Reaktivieren" → Confirm → Badge "Aktiv".
  12. **E2E-USR-MOBILE-01 list + person-link mobile-375** (chromium-375, mobile-webkit-Bus-Error-10 acceptable via Phase 10.4-03 Precedent) — Filter-Bar Mobile-Adaption + Tab-Switches + Autocomplete-Popover Keyboard-Behavior.
  
  SILENT-4XX-Invariante codified (Phase 10.1-01 + 10.2-04). Prefix-Isolation (Phase 10.5-02): `E2E-USR-*` desktop + `E2E-USR-MOBILE-*` mobile. Reuse Phase 10.3 Harness (`loginAsRole`, `getRoleToken`, `globalSetup`) + Phase 10.4-01 `getByCardTitle`-Helper. Bumpt `.planning/E2E-COVERAGE-MATRIX.md`.

### Claude's Discretion
- Exakte Sidebar-Position der neuen "Zugriff & Berechtigungen"-Gruppe (wahrscheinlich unter "Personal & Fächer", vor "Solver & Operations")
- Icon-Wahl aus lucide-react: `ShieldCheck` für Gruppe, `UserCircle` für Users-Eintrag, `KeyRound` für Overrides, `Link2` für Person-Verknüpfung
- Mobile-Adaption des Effective-Permissions-Akkordeons (Gruppen-Header bleibt klebrig beim Scrollen)
- Loading-Skeleton-Design pro Tab (4 Tabs, jeder braucht ein Skeleton)
- Empty-State-Illustrations für Tab "Overrides" (noch keine Overrides) und Tab "Person-Verknüpfung" (nicht verknüpft)
- Search-Debounce-Timing für User-Liste (wahrscheinlich 300ms, konsistent mit Phase 11/12)
- Autocomplete-Dropdown Min-Length (2 Zeichen ab Phase 11 D-08 etabliert)
- JWT-Refresh-Behavior-Hinweis-Text in Rollen-Tab (Wording)
- Audit-Log-Action-Types: `create/update/delete` auf neue Subjects `user-role`, `permission-override`, `person-link`, `keycloak-user-enabled` — wiederverwendung bestehender AuditInterceptor-Pattern ohne Schema-Änderung
- Cache-Invalidation-Strategie: nach Role-Update alle User-Queries invalidieren; nach Override-Update nur spezifischen User invalidieren
- Performance-Optimization der Effective-Permissions-Berechnung bei Usern mit vielen Overrides (lazy-load Conditions-Details)
- Export-Button auf User-Liste (CSV) — nicht in Requirements, deferred
- Bulk-Role-Assignment (mehrere User gleichzeitig Lehrer-Rolle geben) — nicht in Requirements, deferred

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & Requirements
- `.planning/ROADMAP.md` §Phase 13 — Phase 13 goal, success criteria, REQ-IDs (USER-01..05), dependencies (Phase 12), Known risks (KC Admin API Adapter nur für Login, effective-permissions-resolution muss prüfen)
- `.planning/REQUIREMENTS.md` §User & ACL Management — Full requirement statements: USER-01, USER-02, USER-03, USER-04, USER-05, MOBILE-ADM-01, MOBILE-ADM-02 (375px + 44px Touch-Targets)
- `.planning/PROJECT.md` — v1.1 Milestone-Goal (Brownfield UI-only), Constraints (DSGVO, Single-Tenant, API-First), User-Mgmt-Paragraph

### Prior phase decisions (foundation this phase builds on)
- `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-CONTEXT.md` — Keycloak-Search-by-Email-Pattern (D-08: Command-Popover, min 3 Zeichen, alreadyLinkedToPersonId-Enrichment), RFC 9457 409 mit affectedEntities (D-12), Shared Zod-Schemas Split (D-15), Bundled-Plan-Struktur (D-16), Sidebar-Gruppe-Pattern (D-03), Detail-Page vs Dialog (D-02), Replace-all-in-transaction für User-Role-Updates (analog Phase 2 D-04)
- `.planning/phases/12-sch-ler-klassen-und-gruppenverwaltung/12-CONTEXT.md` — ParentModule greenfield (D-13.1), Orphan-Guard-RFC-9457-Pattern (D-13.3/D-13.4), Apply-Rules Dry-Run-Preview (D-10, analog für Override-Impact-Preview nutzbar), 3-Plan-Breakdown (D-16), AffectedEntitiesList-Discriminated-Union-Erweiterung (D-14)
- `.planning/phases/10-schulstammdaten-zeitraster/10-CONTEXT.md` — Tabs mit Pro-Tab-Save (D-01, D-02), UnsavedChangesDialog-Pattern, StickyMobileSaveBar-Pattern, Validation-Hybrid (D-15), Destructive-Edit-Schutz mit WarnDialog (D-13 analog für Self-Lockout + Link-Konflikt)
- `.planning/milestones/v1.0-phases/01-project-scaffolding-auth/01-CONTEXT.md` — API-Conventions (RFC 9457 D-12, `/api/v1/` prefix D-13, offset/limit pagination D-14, English-API/German-UI D-15), RBAC+ACL (D-01 Keycloak OIDC, D-02 Per-User-ACL-Overrides, D-03 Dynamic-Permission-Loading, D-04 Role-Union für Multi-Role-Users), CheckPermissions-Decorator-Pattern, JWT-Refresh-Flow

### Backend code (existing v1.0 baseline — key for Phase 13 gap-fixes)
- `apps/api/prisma/schema.prisma` §171-219 — Models `Role`, `Permission`, `PermissionOverride`, `UserRole` (alle existieren, keine Migrations benötigt). `PermissionOverride` hat `@@unique([userId, action, subject])` + `granted: Boolean` + `grantedBy: String` (audit trail)
- `apps/api/prisma/schema.prisma` §313-330 — `Person` Model mit `keycloakUserId String? @unique` + `personType PersonType` (TEACHER/STUDENT/PARENT); Link-Endpoint-Mirror-Pattern
- `apps/api/prisma/schema.prisma` §251-255 — `enum PersonType { TEACHER, STUDENT, PARENT }` (wird in link-person-DTO referenziert)
- `apps/api/prisma/seed.ts` — 5 seeded Roles + Default-Permissions; UserDirectoryService MUSS diese Seed-Rollen respektieren (keine hardcoded Role-Liste im Backend)
- `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` — Existing `findUsersByEmail(email)` mit alreadyLinkedToPersonId-Enrichment; wird erweitert um `findUsers(filter)` paginiert + `countUsers(filter)` + `setEnabled(userId, enabled)` (Gap-Fix 1)
- `apps/api/src/modules/keycloak-admin/keycloak-admin.controller.ts` — Existing `GET /admin/keycloak/users?email=`; bleibt für Phase 11-Teacher-Link-Flow, neue Endpoints kommen unter `/admin/users` (D-13)
- `apps/api/src/modules/auth/casl/casl-ability.factory.ts` — `CaslAbilityFactory.createForUser(user)` — Gold-Standard-Resolution-Logic; `EffectivePermissionsService.resolve(userId)` (Gap-Fix 5) spiegelt diese Logik mit source-attribution (Role-Name oder `override`) und pre-rendered conditions
- `apps/api/src/modules/auth/guards/permissions.guard.ts` — Einsatz der CASL-Ability; muss sich nach Role-Change oder Override-Change nicht anpassen (JWT-Refresh regelt)
- `apps/api/src/modules/teacher/teacher.service.ts` §294-312 — `linkKeycloakUser(teacherId, keycloakUserId)` + `unlinkKeycloakUser(teacherId)` (Mirror-Pattern für Student + Parent Gap-Fix)
- `apps/api/src/modules/teacher/teacher.controller.ts` §96-110 — Existing Link/Unlink HTTP-Endpoints (Teacher-Side); zum Reuse im User-Side link-person-Endpoint (D-13)
- `apps/api/src/modules/student/student.service.ts` — **KEIN** linkKeycloakUser (Gap-Fix 6 nötig)
- `apps/api/src/modules/parent/` — **KEIN** linkKeycloakUser (Gap-Fix 6 nötig; Parent-Module erst Phase 12 geshipped)
- `apps/api/src/modules/user-context/` — Existing UserContextService liefert schoolId/role/classId für authentifizierte User; Reuse für User-Detail-Query in D-01

### Frontend code (reuse + integration)
- `apps/web/src/routes/_authenticated/admin/` — Existing Routes-Pattern (teachers, subjects, students, classes, school.settings, solver, substitutions); neu: `users.index.tsx` + `users.$userId.tsx`
- `apps/web/src/components/admin/` — Shared Admin-Components aus Phase 10-12: PageShell, UnsavedChangesDialog, StickyMobileSaveBar, InfoBanner, WarnDialog, AffectedEntitiesList (wird um `kind: 'user' | 'person-teacher' | 'person-student' | 'person-parent'` erweitert)
- `apps/web/src/components/layout/AppSidebar.tsx` + `MobileSidebar.tsx` — Neue Gruppe "Zugriff & Berechtigungen" (role-gating `roles: ['admin']`, strikter als "Personal & Fächer")
- `apps/web/src/components/ui/` — shadcn primitives: tabs, dialog, input, select, button, card, label, popover, dropdown-menu, command, checkbox, switch, accordion (alle bereits vorhanden)
- `apps/web/src/lib/api.ts` — apiFetch + RFC 9457 Problem-Details-Parser (extensions-field für affectedEntities: `person-link-conflict`, `last-admin-guard`)
- `apps/web/src/stores/school-context-store.ts` — Reused für User-Queries (schoolId in Filter-Parameters, relevant für späteres v2-Multi-Tenant, aktuell single-tenant-no-op)
- `packages/shared/src/validation/` — Existing Zod-Schemas aus Phase 11/12; neu: `user-role.ts`, `permission-override.ts`, `person-link.ts`, `keycloak-user-query.ts`
- `apps/web/e2e/helpers/` — Phase 10.3 Harness (`loginAsRole`, `getRoleToken`, `getByCardTitle` aus 10.4-01); direkt reuse

### Auto-memory notes (from `/Users/vid/.claude/projects/...-school-flow/memory/`)
- `feedback_e2e_first_no_uat.md` — Ship mit Tests, E2E vor UAT (applies Phase 13 fully); User override auf ~11 Specs bestätigt Direktive
- `feedback_restart_api_after_migration.md` — Keine neuen Migrations in Phase 13 (alle Prisma-Modelle existieren), API-Restart trotzdem nach Service-Extension nötig wegen DI-Container-Rebuild
- `feedback_restart_vite.md` — Vite-Restart nach API-Rebuild
- `feedback_admin_requirements_need_ui_evidence.md` — "Admin kann X"-Requirements brauchen UI-Click-Evidence; D-16 11-Spec-E2E-Sweep erfüllt
- `CLAUDE.md` Migration-Hygiene-Policy — Phase 13 braucht **keine** Migrations (kein Schema-Delta); sollte sich eine Gap-Fix-Migration als nötig erweisen, MUSS `prisma migrate dev --name` statt `db push` benutzt werden

### Tech-Stack reference
- `CLAUDE.md` — Version pins: React 19, Vite 8, TanStack Query 5, TanStack Router 1, shadcn/ui + Radix UI, Tailwind 4, Zustand 5, RHF + Zod, NestJS 11, Prisma 7, PostgreSQL 17, Playwright 1.x, Keycloak 26.5, CASL
- `@keycloak/keycloak-admin-client` npm package — existing dependency, Phase 13 nutzt `find({ first, max, search })` + `count()` + `update({ id }, { enabled })` Methoden

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (v1.0 Backend)
- **KeycloakAdminModule** (`apps/api/src/modules/keycloak-admin/`) — Service + Controller + DTOs. Currently only `findUsersByEmail(email)` (max 10, exact=false). v1.1 Phase 13 erweitert Service um paginierte `findUsers(filter)`, `countUsers(filter)`, `setEnabled(userId, enabled)` + Controller um neue Endpoints unter `/admin/users` (D-01, D-02, D-04). Service-Account mit `view-users` + `manage-users` Role in `realm-management` nötig (erweitert von aktuellem `view-users`-only — Env-Check im Plan).
- **Auth/CaslAbilityFactory** (`apps/api/src/modules/auth/casl/`) — `createForUser(user)` liest `Permission` + `PermissionOverride`, baut CASL Ability. Resolution-Logic ist Phase-13-Gold-Standard; neuer `EffectivePermissionsService.resolve(userId)` spiegelt Logic mit source-attribution (D-09). Interpolation-Logic (`interpolateConditions`) wird geteilt.
- **Prisma-Modelle (Phase 1)** — `Role` (5 seeded), `Permission` (role-scoped), `PermissionOverride` (user-scoped mit unique [userId,action,subject] + granted + grantedBy), `UserRole` (userId,roleId junction, unique [userId,roleId]). **Keine Schema-Migrations nötig**. Teacher.linkKeycloakUser + unlinkKeycloakUser (teacher.service.ts §294-312) ist Mirror-Template für Student + Parent Gap-Fix.
- **Audit-Interceptor** (Phase 1 D-07) — Existing pattern; neue Action-Types (create/update/delete auf subjects `user-role`, `permission-override`, `person-link`, `keycloak-user-enabled`) werden automatisch über CRUD-Wiring geloggt, keine neuen Schemas.

### Reusable Assets (v1.1 Frontend from Phase 10-12)
- **PageShell / UnsavedChangesDialog / StickyMobileSaveBar / InfoBanner / WarnDialog** (`apps/web/src/components/admin/`) — Phase 10 Shared Admin-Components; Phase 13 Detail-Pages reuse direkt (4 Tabs mit Pro-Tab-Dirty-State, StickyMobileSaveBar, WarnDialog für Self-Lockout + Link-Konflikt + Unlink)
- **AffectedEntitiesList** (Phase 11 D-12 + Phase 12 D-14) — Discriminated-Union-Komponente `kind: 'teacher' | 'subject' | 'student' | 'class' | 'group' | ...` mit backward-compat default. Phase 13 erweitert um `kind: 'user' | 'person-teacher' | 'person-student' | 'person-parent'` (siehe D-14 Link-Conflict-Payload)
- **shadcn/ui Primitives** — Alle benötigten vorhanden: tabs, dialog, input, select, button, card, label, popover, dropdown-menu, command (Autocomplete), checkbox, switch (Enabled-Toggle + Granted/Denied), accordion (Effective-Permissions-Subject-Gruppen)
- **apiFetch + Problem-Details-Parser** — RFC 9457 mit extensions (affectedEntities) already integrated
- **TanStack Query + RHF + Zod** — Phase-10-12-Stack-Pattern; useQuery-Key-Convention `['users', schoolId, filters]`, `['users', userId]`, `['user-roles', userId]`, `['effective-permissions', userId]`, `['permission-overrides', userId]`, `['user-person-link', userId]`, `['roles']`, `['keycloak-user-count', filters]`
- **Silent-4xx-Toast-Invariante** (Phase 10.1-01 + 10.2-04) — Alle neuen Mutation-Hooks MÜSSEN useMutation's onError explizit verdrahten
- **Playwright E2E Harness** (Phase 10.3 + 10.4-01 CardTitle-Helper) — `loginAsRole`, `getRoleToken`, `globalSetup`/`globalTeardown`, `getByCardTitle`. Reuse direkt

### Established Patterns
- **Deutsche UI-Texte, englische API-Feldnamen** (Phase 1 D-15) — "Zugriff & Berechtigungen" / "Rollen" / "Berechtigungen" / "Erweiterte Bedingungen" / "Verknüpfung" UI, `userId` / `roleNames` / `granted` / `conditions` / `personType` / `personId` API
- **CheckPermissions({ action, subject })** — Neue Subjects: `user` (für User-List/Detail + Role-Management) + `permission-override` (für Override-CRUD). Actions: `create | read | update | delete | manage`. Nur Admin-Role hat per default `manage user` + `manage permission-override` aus Phase-1-Seed.
- **Replace-all-in-transaction** (Phase 2 D-04 + Phase 11 D-07) — User-Role-Updates nutzen das Pattern (PUT ersetzt komplettes UserRole-Set in einer Tx); Permission-Overrides nutzen **nicht** replace-all (individuelles CRUD pro Row, damit Audit-Action-Types granular bleiben)
- **RFC 9457 problem+json 409** (Phase 1 D-12 + Phase 11 D-12 + Phase 12 D-13) — für Last-Admin-Guard (D-07) und Link-Konflikte (D-14) mit `affectedEntities`-Extension
- **Prisma-Migration via `prisma migrate dev --name`** (CLAUDE.md Migration-Hygiene) — **Phase 13 braucht keine Migrations** (alle Modelle existieren aus Phase 1+2); wenn sich ein Gap-Fix nachträglich als Schema-Change erweist (z.B. User-Audit-Table), dann strikt migration-Policy folgen
- **Mobile-Parity Nyquist Wave 0** (Phase 4/6/7/10/11/12 pattern) — Alle E2E-Specs werden als `it.todo()` vorgeplant, dann implementiert
- **Pagination standard** (Phase 1 D-14) — offset/limit via PaginationQueryDto; User-Liste mapped `first/max` (KC-native) auf `page/pageSize` Frontend-seitig
- **JWT-Refresh nach Role-Change** (Phase 1 D-04 Token-Lifetimes) — 15min Access-Token, User wird automatisch mit neuen Rollen re-authentifiziert; kein Force-Logout, aber InfoBanner im UI

### Integration Points
- **AppSidebar + MobileSidebar** — Neue Gruppe "Zugriff & Berechtigungen" mit Icon `ShieldCheck` + 1 Eintrag "User" (Icon `UserCircle`). Role-Gating `roles: ['admin']` (strikter als Personal-Gruppe `['admin', 'schulleitung']`, weil User-Mgmt Admin-only)
- **Shared Zod-Schemas** — `packages/shared/src/validation/user-role.ts` (roleNames array, min-1-admin-check ist Server-side), `permission-override.ts` (action + subject + granted + conditions JSON + reason), `person-link.ts` (personType enum + personId uuid), `keycloak-user-query.ts` (first + max + search + role + linked + enabled)
- **RFC 9457 AffectedEntitiesList-Extension** — Erweitert um neue entity kinds für Link-Conflict-Response (D-14); UI-Komponente AffectedEntitiesList bekommt neue kind-Varianten mit Deep-Links auf `/admin/teachers/$id`, `/admin/students/$id`, `/admin/parents/$id` (letzteres deferred wenn Phase 12 keine standalone Parent-Detail-Page hat, dann Fallback auf `/admin/students/$id?tab=parents`)
- **KeycloakAdminService Service-Account-Erweiterung** — Benötigt zusätzliche Role `manage-users` im `realm-management`-Client für `setEnabled`-Operation (D-04). Env-Doc + Deployment-Note im Plan
- **CASL-Ability-Cache-Strategy** — Current: neu bei jedem Request via JwtAuthGuard → loadUserPermissions. Phase 13 ändert das nicht; nach Role/Override-Change wirkt die Änderung beim nächsten Request (max 15min via Token-Refresh, typisch <5min)
- **AuditInterceptor** (Phase 1) — Keine neuen Schemas; Action-Types für role-assign, permission-override-CRUD, person-link/unlink, keycloak-user-enabled loggt automatisch über CRUD-Wiring

</code_context>

<specifics>
## Specific Ideas

- **Hybrid KC + DB Source-of-Truth (D-01)** — Keycloak bleibt authoritativ für Account-Lifecycle (Email-Change, Password-Reset-Flow, enable/disable); SchoolFlow-DB bleibt authoritativ für Rollen + Overrides + Person-Links. UI konsolidiert beide, aber jede Mutation geht zum richtigen System.
- **Phase-11-Keycloak-Search-by-Email-Pattern (D-13 reverse)** — User erwartet dieselbe UX wie Phase 11 Teacher-Detail Keycloak-Link-Card. Reverse-Richtung: auf User-Detail klickt Admin "Person suchen" → Autocomplete Teacher/Student/Parent → Link. Beide Flows nutzen denselben Backend-Endpoint `link-person`.
- **Last-Admin-Guard als System-Invariante (D-07)** — Nicht nur UX-Warnung, sondern Backend-Constraint. Concurrent-Admin-Unassign-Race wird geblockt: zwei gleichzeitige Admin-Remove-Requests können nicht beide committen wenn Summe → 0. DSGVO-Context: ohne Admin kein Art-15/17-Trigger möglich — Integrität der Compliance-Chain.
- **Raw-JSON Conditions (D-11)** — User bevorzugt Transparenz über UX-Magic. `{{ id }}`-Placeholder ist Phase-1-Contract zur CASL-Factory; Raw-JSON legt vollen Contract offen statt zu verstecken. Schmerzt für neue Admins, aber UI zeigt Variable-Hint-Liste + Schema-Validation. Upgrade auf Struct-Builder wenn Conditions-Interpolation reicher wird (späterer Phase).
- **11-Spec-E2E-Sweep (User-Override D-16)** — User bestätigt E2E-first-Direktive explizit; gewählte 50% Extra-Coverage über Phase-12-Basis. Rationale vom User: Rollen/Permissions sind Security-kritisch — 409-Error-Paths, Self-Lockout, Link-Conflicts, Condition-Interpolation brauchen dedizierte Regression-Guards.
- **3 Plans (D-15)** — User bestätigt Phase-11/12-Pattern-Continuation. Plan 13-01 (Backend-Gap-Fixes gebündelt) ist der größte aller v1.1-Backend-Plans bislang — 6 Gap-Fixes in 7 atomic tasks; Plan-Checker muss Wave-Decomposition prüfen.

</specifics>

<deferred>
## Deferred Ideas

- **KC-User-Bulk-Create aus der UI** — Admin hat Teacher-Record, aber noch keinen KC-Account → UI könnte "KC-Account anlegen"-Aktion anbieten (POST /admin/keycloak/users mit initial-password-reset-email). Gap: KeycloakAdminService.create + Password-Flow. Deferred zu v1.2 oder als Phase-16-Dashboard-Feature.
- **KC-Password-Reset-Trigger** — "Send password reset email" aus User-Detail. Benötigt KC `send-email` Action-Token + Email-Template-Config. Deferred zu v1.2.
- **Permission-Simulator ("Kann dieser User das?")** — Interaktiver What-If-Check-Dialog. Kandidat für Phase 16 Dashboard oder v1.2 Admin-Debug-Surface.
- **Template-Presets für Overrides** — Kuratierte Override-Sets ("Lehrer X sieht alle Klassen", "Elternteil Y sieht Noten aller Kinder"). Nicht in MVP-Scope; deferred bis User-Case-Pattern klar sind (~3-6 Monate Produktiv-Nutzung).
- **Bulk-Role-Assignment** — Multi-Select User in Liste + "Rolle hinzufügen" → atomic bulk UPDATE. Nicht in Requirements, deferred.
- **Bulk-Override-Application** — Gleicher Override auf mehreren Usern (Klassenverband-Zuweisung). Deferred.
- **User-Audit-Log-Timeline pro User** — Chronologischer Log aller Änderungen an User (Role-Changes, Override-Changes, Link-Changes). Phase-15-Audit-Viewer deckt das mit Filter-by-subject+actor ab; kein separater User-Detail-Tab nötig.
- **Effective-Permissions-Caching Server-Side** — Redis-gecachte Resolution (TTL 5min). v1.1 berechnet on-demand (wenige User aktiv gleichzeitig). Optimierung deferred bis Perf-Problem sichtbar.
- **Self-Service-Role-Request-Workflow** — User fragt Admin um Rolle, Notification-Flow. Aus Scope; gehört zu Phase-7-Communication oder v1.3.
- **Override-Expiry-Timestamps** — "Dieser Override läuft am X ab" für temporäre Vertretungs-Admins. Nicht in REQ, deferred.
- **Multi-School User-Membership** (v2-Multi-Tenant-Vorarbeit) — User gehört zu mehreren Schulen. Aus Scope; v1 ist Single-Tenant.
- **Keycloak Group Sync (statt Role Sync)** — KC-Gruppen auf SchoolFlow-Rollen mappen statt direkter Role-Assign. Overkill für v1; nur sinnvoll wenn AD-Federation Gruppen liefert.
- **User-CSV-Export / Import** — Admin exportiert User-Liste (DSGVO-Art-15 adjacent) oder importiert KC-User aus CSV. Phase-16-Dashboard-Kandidat oder v1.2.

</deferred>

---

*Phase: 13-user-und-rechteverwaltung*
*Context gathered: 2026-04-24*
