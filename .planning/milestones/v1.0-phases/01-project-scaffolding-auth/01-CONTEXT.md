# Phase 1: Project Scaffolding & Auth - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

A running NestJS API with Keycloak authentication, scoped RBAC for all five roles, a documented REST API, and a Docker Compose dev environment. Includes school profile creation with full time grid, school year structure, and Austrian school type templates. This is the foundation every module builds on.

</domain>

<decisions>
## Implementation Decisions

### RBAC Granularity
- **D-01:** RBAC + ACL Hybrid — 5 Standardrollen (Admin, Schulleitung, Lehrer, Eltern, Schueler) definieren Default-Berechtigungen auf Action-Level (module.action, z.B. timetable.view, classbook.grades.write). Admins koennen per ACL einzelne Permissions pro Rolle/User ueberschreiben.
- **D-02:** ACL-Overrides ueber API + UI konfigurierbar — Admins koennen Rechte im Browser anpassen, Aenderungen sofort wirksam. Kein Config-File oder Server-Zugriff noetig.
- **D-03:** Admin = System (Keycloak, Docker, API-Keys, System-Einstellungen), Schulleitung = Paedagogik (Lehrer-/Klassenverwaltung, Stundenplan, Klassenbuch-Einsicht, Rechte-Overrides). Klare Trennung IT vs. Schulbetrieb.
- **D-04:** Multi-Rollen erlaubt — ein User kann mehrere Rollen gleichzeitig haben (z.B. Lehrer + Elternteil). Rechte werden vereinigt (Union aller Rollen-Permissions).

### Audit Trail
- **D-05:** Mutations + sensible Reads — alle Schreib-/Loeschoperationen werden geloggt. Lesezugriffe nur bei sensiblen Daten (Noten, persoenliche Daten, Gesundheitsdaten). Nicht-sensitive Reads (Stundenplan abrufen) werden nicht geloggt.
- **D-06:** Gestaffelte Sichtbarkeit — Admin sieht gesamten Audit Trail, Schulleitung sieht paedagogisch relevante Eintraege (Notenaenderungen, Klassenbuch), jeder User kann eigene Audit-Eintraege einsehen (DSGVO Art. 15 kompatibel).
- **D-07:** Retention konfigurierbar mit Default 3 Jahre (oesterreichische Aufbewahrungspflicht fuer Schulunterlagen). Automatische Bereinigung aelterer Eintraege. Admin kann Retention pro Kategorie setzen.

### School Profile
- **D-08:** Zeitraster mit Perioden + Pausen — jede Unterrichtsperiode mit Start/Ende-Zeit, Pausenzeiten dazwischen. Verschiedene Periodenlaengen moeglich (50min, 45min, Doppelstunden-Bloecke).
- **D-09:** Vordefinierte Templates fuer oesterreichische Schultypen (VS, MS, AHS Unterstufe, AHS Oberstufe, BHS) als Seed-Daten. Admin waehlt Template und kann es anpassen.
- **D-10:** Schultage frei konfigurierbar — Admin waehlt beliebige Wochentage. Default Mo-Fr, aber auch Mo-Sa oder andere Kombinationen moeglich.
- **D-11:** Volles Schuljahr im Schulprofil — Schuljahresstart, Semestergrenze, Schulschluss, Ferienzeiten, schulautonome Tage. Gibt dem Stundenplan-Solver spaeter den zeitlichen Rahmen.

### API Conventions
- **D-12:** RFC 9457 Problem Details als Error-Response-Format (application/problem+json mit type, title, status, detail, instance, traceId).
- **D-13:** URL-Praefix Versionierung: /api/v1/. Alte Versionen koennen bei Breaking Changes parallel weiterlaufen.
- **D-14:** Offset/Limit Paginierung mit Total Count als Standard. Response-Format: { data: [...], meta: { page, limit, total, totalPages } }.
- **D-15:** Englische API (Endpoints, Felder, Doku), deutsche UI-Texte und Fehlermeldungen. Internationale Contributors verstehen die API, deutschsprachige Schuladmins verstehen die Fehler.

### Claude's Discretion
- Monorepo Package-Struktur (apps/ vs packages/ Layout)
- NestJS Module-Organisation und Guard/Interceptor-Patterns
- Docker Compose Service-Konfiguration
- Prisma Schema-Design und Migrations-Strategie
- OpenAPI/Swagger Konfiguration und Decorator-Patterns
- Keycloak Realm/Client Setup und Token-Mapping

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs or ADRs exist yet — this is a greenfield project. Requirements are fully captured in:

- `.planning/REQUIREMENTS.md` -- Phase 1 requirements: FOUND-01, AUTH-01 through AUTH-06, DEPLOY-01, API-01 through API-03
- `.planning/PROJECT.md` -- Project constraints, core value, key decisions
- `.planning/ROADMAP.md` -- Phase 1 goal, success criteria, dependency chain
- `CLAUDE.md` -- Full technology stack decisions with rationale (NestJS 11, Prisma 7, PostgreSQL 17, Keycloak 26.5, Redis 7, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing source code — greenfield project. Only CLAUDE.md and GSD planning infrastructure exist.

### Established Patterns
- Technology stack fully defined in CLAUDE.md with version pins and rationale
- Monorepo with pnpm workspaces + Turborepo for build orchestration
- NestJS 11 with Fastify adapter as API framework
- Prisma 7 (pure TypeScript) for ORM and migrations
- Keycloak 26.5 for identity/auth, NestJS Guards for application-level RBAC

### Integration Points
- Keycloak provides JWT tokens; NestJS backend validates and maps roles to permissions
- Redis required for BullMQ job queues and session cache
- PostgreSQL 17 as primary database with Row-Level Security capability
- Docker Compose for local dev environment (api, postgres, redis, keycloak)

</code_context>

<specifics>
## Specific Ideas

- User erwartet ACL-basierte Zugriffskontrolle fuer volle Kontrolle ueber Berechtigungen
- Zeitraster soll sich an typischen oesterreichischen Schultypen orientieren (50min Stunden, grosse Pause, Mittagspause)
- Schuljahresstruktur mit Semestern und Ferien geht ueber FOUND-01 hinaus, aber explizit gewuenscht als Grundlage fuer den Solver

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-project-scaffolding-auth*
*Context gathered: 2026-03-29*
