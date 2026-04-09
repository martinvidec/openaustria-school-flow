# Phase 1: Project Scaffolding & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 01-project-scaffolding-auth
**Areas discussed:** RBAC granularity, Audit trail scope, School profile setup, API conventions

---

## RBAC Granularity

### Permission System

| Option | Description | Selected |
|--------|-------------|----------|
| Action-level per module | Each module has read/write/delete permissions per role (e.g., timetable.read, classbook.grades.write) | |
| Module-level only | Each role either has access to a module or doesn't | |
| Fully dynamic ABAC | Attribute-based policies evaluated at runtime | |

**User's clarification:** User expected ACLs for full control. After explanation of ABAC vs ACL differences, the question was reformulated.

### Access Control Model

| Option | Description | Selected |
|--------|-------------|----------|
| RBAC + ACL Hybrid | 5 roles as defaults, admins can override permissions per role/user via ACL | X |
| Reine RBAC (fixed roles) | 5 roles with fixed permissions, no overrides | |
| Volle ACL pro Ressource | Each resource has its own access list | |

**User's choice:** RBAC + ACL Hybrid
**Notes:** Combines role-based defaults with per-user ACL overrides for school-specific policies.

### ACL Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| API + UI | Admin can adjust permissions in browser, changes immediately effective | X |
| Config/Seed only | Overrides in YAML/JSON file, loaded at deployment | |
| API now, UI later | API in Phase 1, UI in later phase | |

**User's choice:** API + UI

### Admin vs Schulleitung

| Option | Description | Selected |
|--------|-------------|----------|
| Admin = System, SL = Paedagogik | Clear separation: Admin handles IT/system, Schulleitung handles pedagogical management | X |
| Admin = Superset von SL | Admin can do everything Schulleitung can, plus system config | |
| Gleichwertig mit Zusatzrechten | Equal base rights, each with exclusive additional rights | |

**User's choice:** Admin = System, SL = Paedagogik

### Multi-Rollen

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, Multi-Rollen | User can hold multiple roles simultaneously, permissions are unioned | X |
| Nein, eine Rolle pro User | One role per user, multiple accounts needed for dual roles | |
| Primaerrolle + Sekundaerrollen | One main role determines UI, additional roles extend permissions | |

**User's choice:** Ja, Multi-Rollen

---

## Audit Trail Scope

### What to Log

| Option | Description | Selected |
|--------|-------------|----------|
| Mutations + sensible Reads | All writes/deletes logged, reads only for sensitive data (grades, personal data, health data) | X |
| Alles loggen | Every API call captured | |
| Nur Mutations | Only write/delete operations | |

**User's choice:** Mutations + sensible Reads

### Audit Trail Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Admin + Schulleitung | Admin sees all, Schulleitung sees pedagogical entries | |
| Nur Admin | Only IT admin has access | |
| Jeder sieht eigene Aktionen | Admin sees all, Schulleitung sees pedagogical, every user sees own entries | X |

**User's choice:** Jeder sieht eigene Aktionen
**Notes:** DSGVO Art. 15 compatible — users can see what actions were performed on their data.

### Retention

| Option | Description | Selected |
|--------|-------------|----------|
| Konfigurierbar mit Default 3 Jahre | Admin can set retention per category, default 3 years (Austrian requirement) | X |
| Unbegrenzt | Nothing auto-deleted | |
| Fix 1 Jahr | All entries deleted after 12 months | |

**User's choice:** Konfigurierbar mit Default 3 Jahre

---

## School Profile Setup

### Time Grid Detail

| Option | Description | Selected |
|--------|-------------|----------|
| Perioden + Pausen | Each period with start/end, flexible break lengths, different period durations | X |
| Nur Periodenanzahl | Only period count + start time + duration | |
| Vordefinierte Templates | Pre-built time grids for VS, MS, AHS, BHS | |

**User's choice:** Perioden + Pausen

### Austrian Templates

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, mit Templates + Custom | VS, MS, AHS, BHS templates as seed data, customizable | X |
| Nur Custom | No templates, fully manual setup | |
| Templates spaeter | Data structure now, templates in later phase | |

**User's choice:** Ja, mit Templates + Custom

### School Days

| Option | Description | Selected |
|--------|-------------|----------|
| Frei konfigurierbar | Any weekday combination, default Mo-Fr | X |
| Fix Mo-Fr | Monday to Friday only | |
| Mo-Fr oder Mo-Sa | Two options: 5-day or 6-day week | |

**User's choice:** Frei konfigurierbar

### School Year Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Basis-Kalender jetzt | School year start, semester boundary, end. Holidays later. | |
| Nur Name/Typ/Zeitraster | Strictly FOUND-01. Calendar when solver needs it. | |
| Volles Schuljahr + Ferien | Full year structure with semesters, holidays, school-autonomous days | X |

**User's choice:** Volles Schuljahr + Ferien
**Notes:** Goes beyond FOUND-01 scope but explicitly requested to provide the solver with complete temporal framework from the start.

---

## API Conventions

### Error Response Format

| Option | Description | Selected |
|--------|-------------|----------|
| RFC 9457 Problem Details | Standard format: type, title, status, detail, instance. Machine-readable, extensible. | X |
| Custom JSON Format | Custom code/message/errors[] format | |
| NestJS Default | Built-in HttpException format (statusCode, message, error) | |

**User's choice:** RFC 9457 Problem Details

### API Versioning

| Option | Description | Selected |
|--------|-------------|----------|
| URL-Praefix /api/v1/ | Version in URL, explicit, easy to route | X |
| Header-basiert | Version in Accept header | |
| Keine Versionierung vorerst | Version when breaking changes come | |

**User's choice:** URL-Praefix /api/v1/

### Pagination

| Option | Description | Selected |
|--------|-------------|----------|
| Offset/Limit als Standard | Total count included, "page X of Y" possible, trivial to implement | X |
| Cursor-basiert | Stable with changing data, no total count natively | |
| Beides je nach Endpoint | Offset for master data, cursor for streaming data | |

**User's clarification:** User wanted total count for paginated content. After detailed comparison of cursor vs offset pros/cons, chose offset/limit.
**User's choice:** Offset/Limit als Standard

### API Language

| Option | Description | Selected |
|--------|-------------|----------|
| Englische API, deutsche UI | English endpoints/fields/docs, German error messages and UI texts | X |
| Komplett Englisch | Everything in English including error messages | |
| Komplett Deutsch | German endpoints and field names | |

**User's choice:** Englische API, deutsche UI

---

## Claude's Discretion

- Monorepo package structure
- NestJS module organization and guard/interceptor patterns
- Docker Compose service configuration
- Prisma schema design and migration strategy
- OpenAPI/Swagger configuration
- Keycloak realm/client setup

## Deferred Ideas

None — discussion stayed within phase scope.
