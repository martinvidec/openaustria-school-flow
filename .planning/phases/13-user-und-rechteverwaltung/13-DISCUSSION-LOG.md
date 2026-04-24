# Phase 13: User- und Rechteverwaltung - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 13-user-und-rechteverwaltung
**Mode:** discuss (default, no --auto / --batch / --analyze / --text)
**Areas discussed:** User-Liste & KC-Sync, Rollenzuweisung & Lockout-Safety, Effective-Permissions + Override-Editor, Person-Linking & Plan-Scope

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| User-Liste & KC-Sync | Datenquelle, Pagination, Filter, Empty-State, Cache/Polling — USER-01 | ✓ |
| Rollenzuweisung & Lockout-Safety | Multi-Role-UX, Self-Lockout-Guard, min-1-Admin-Invariante, Audit — USER-02 | ✓ |
| Effective-Permissions + Override-Editor | Anzeige, Editor-Struktur, Conditions-Authoring, Simulate — USER-03 + USER-04 | ✓ |
| Person-Linking & Plan-Scope | Link-Richtung, Gap-Fix-Endpoints, Konflikt-Handling, E2E, Plan-Breakdown — USER-05 | ✓ |

**User's choice:** Alle 4 Gray Areas ausgewählt.

---

## Area 1 — User-Liste & KC-Sync

### Q1: Datenquelle

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid (KC + DB-Join) (Recommended) | Primary Keycloak Admin API, per-Row Hydration aus DB UserRole + Person-Link. Filter-by-Role via DB-Index. | ✓ |
| KC pur + Client-Side Enrichment | Frontend joint mehrere Batch-Calls. 3 Roundtrips, Filter-by-Role scheitert bei Pagination. | |
| DB-First mit KC-Shadow | Liste aus DB UserRole only — verliert KC-User ohne Rolle. Verletzt USER-01. | |

**User's choice:** Hybrid (KC + DB-Join) (Recommended)

### Q2: Pagination

| Option | Description | Selected |
|--------|-------------|----------|
| KC first/max + search-Param (Recommended) | KC-native offset/max, /users/count für Total. OK bis ~5k User. | ✓ |
| Server-side Full-Fetch + Cursor | In-memory cache 5min. RAM-Blowup + Staleness. | |
| Client-side Pagination | Alles auf einmal. Nicht skalierbar zu 1000+ User. | |

**User's choice:** KC first/max + search-Param (Recommended)

### Q3: Filter-Dimensionen

| Option | Description | Selected |
|--------|-------------|----------|
| Vollset: Search + Rolle + Linked + Enabled (Recommended) | Alle 4 Filter-Achsen. Deckt Admin-Workflow inkl. Cleanup-Use-Cases. | ✓ |
| Minimal: nur Search + Rolle | Admin kann Linked-Status nicht filtern. | |
| Reichhaltig + Schuljahr | Overkill für single-tenant. | |

**User's choice:** Vollset: Search + Rolle + Linked + Enabled (Recommended)

### Q4: KC-CRUD-Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Read-Only + Enabled-Toggle (Recommended) | UI kann nur enable/disable; Create/Delete bleibt außerhalb v1.1. | ✓ |
| Full-CRUD: Create + Delete + Reset Password | Scope-Inflation, nicht in REQ. | |
| Pure Read-Only | Bricht Onboarding-UX. | |

**User's choice:** Read-Only + Enabled-Toggle (Recommended)

---

## Area 2 — Rollenzuweisung & Lockout-Safety

### Q5: Rollen-UX

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox-Liste mit Beschreibung (Recommended) | 5 Rows mit Checkbox + Name + Description. Replace-all-in-Transaction. | ✓ |
| Chip-Selector + Command-Popover | Für nur 5 Rollen Overkill. | |
| Role-Picker mit Permission-Preview | Duplicate der Area-3-Ansicht. | |

**User's choice:** Checkbox-Liste mit Beschreibung (Recommended)

### Q6: Self-Lockout-Strategie

| Option | Description | Selected |
|--------|-------------|----------|
| Soft Guard + System-Invariante (Recommended) | Frontend WarnDialog + Backend-409 wenn <1 Admin. | ✓ |
| Hard Block | Admin kann sich nie selbst entziehen. Bricht Transfer-Flow. | |
| Keine Schutzmaßnahmen | Lockout-Risiko. | |

**User's choice:** Soft Guard + System-Invariante (Recommended)

### Q7: Min-1-Admin Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Globale Invariante (Recommended) | 409 egal ob Self- oder Foreign-Unassign. System-Garantie. | ✓ |
| Nur Self-Lockout-Guard | Erlaubt Race-Lockout via zwei concurrent Unassigns. | |
| UI-Warn ohne Backend-Enforcement | Nicht DSGVO-konform. | |

**User's choice:** Globale Invariante (Recommended)

### Q8: Rolle↔Person-Konsistenz

| Option | Description | Selected |
|--------|-------------|----------|
| Konsistenz-Hints, kein Hard-Enforce (Recommended) | InfoBanner bei Divergenz, kein Backend-Block. | ✓ |
| Hard-Enforce + Auto-Pair | Bricht 2-Step-Onboarding. | |
| Keine Checks | Admin debuggt erst wenn User nicht einloggen kann. | |

**User's choice:** Konsistenz-Hints, kein Hard-Enforce (Recommended)

---

## Area 3 — Effective-Permissions + Override-Editor

### Q9: Effective-Permissions-Anzeige

| Option | Description | Selected |
|--------|-------------|----------|
| Gruppiert nach Subject + Source-Spalte (Recommended) | Akkordeon pro Subject; per-Row Action + Granted/Denied + Source-Chip. | ✓ |
| Gruppiert nach Rolle (Source-first) | Subject-first ist praktikabler. | |
| Flache sortierbare Tabelle | 50+ Rows, overwhelming. | |

**User's choice:** Gruppiert nach Subject + Source-Spalte (Recommended)

### Q10: Override-Editor-Struktur

| Option | Description | Selected |
|--------|-------------|----------|
| Structured: Action×Subject-Select + Condition-Builder (Recommended) | Dropdowns aus aggregiertem Permission-Set + Granted/Denied + Reason. | ✓ |
| Free-Form: Text-Inputs + JSON-Textarea | Hohe Fehlerquote (Tippfehler silent). | |
| Template-Picker (presets) | Für v1.1 Overkill. | |

**User's choice:** Structured: Action×Subject-Select + Condition-Builder (Recommended)

### Q11: Conditions-Authoring

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible Raw-JSON + Variable-Hints (Recommended) | JSON-Validation + Placeholder-Auto-Complete für {{ id }}. | ✓ |
| Struct Builder (key/value Pairs) | Komplex, verlangt Schema-Knowledge je Subject. | |
| Keine Conditions in v1.1 | Würde USER-04 nicht voll decken. | |

**User's choice:** Collapsible Raw-JSON + Variable-Hints (Recommended)

### Q12: Simulator

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Effective-Tab, kein Simulator (Recommended) | Effective-Tab liefert vollen Output. | ✓ |
| Mini-Simulator im Effective-Tab | Scope-Inflation, nicht in REQ. | |
| Simulator in Phase 14 | Explizit deferred. | |

**User's choice:** Nur Effective-Tab, kein Simulator (Recommended)

---

## Area 4 — Person-Linking & Plan-Scope

### Q13: Link-Flow-Richtung

| Option | Description | Selected |
|--------|-------------|----------|
| Bidirektional — Reverse von Phase 11 D-08 (Recommended) | User-Detail-Tab + Teacher/Student/Parent-Detail-Link-Surface. Gemeinsame Endpoints. | ✓ |
| Nur Person→User | Phase-11-Only; User-Detail read-only. Admin muss 3 Seiten wechseln. | |
| Nur User→Person | Würde Phase-11-shipped-Feature abbauen. Negative ROI. | |

**User's choice:** Bidirektional — Reverse von Phase 11 D-08 (Recommended)

### Q14: Link-Konflikt-Handling

| Option | Description | Selected |
|--------|-------------|----------|
| RFC 9457 409 mit affectedEntities + Umleitungsdialog (Recommended) | 2-stufiger Confirm: erst Unlink, dann Re-Link. | ✓ |
| Silent-Overwrite | Daten-Konsistenz-Risiko. | |
| Hard-Error ohne Recovery | 2 Ops statt 1, frustrierend. | |

**User's choice:** RFC 9457 409 mit affectedEntities + Umleitungsdialog (Recommended)

### Q15: Plan-Breakdown

| Option | Description | Selected |
|--------|-------------|----------|
| 3 bundled plans (Phase 11/12 Continuation) (Recommended) | 13-01 Backend + 13-02 Frontend + 13-03 E2E. | ✓ |
| 2 plans | Backend+Frontend zusammen — zu groß für Review. | |
| 5 plans (fine-grained) | Maximale Parallelism, aber hoher Integration-Risk. | |

**User's choice:** 3 bundled plans (Phase 11/12 Continuation) (Recommended)

### Q16: E2E-Scope

| Option | Description | Selected |
|--------|-------------|----------|
| ~7 Specs: Phase-12-Parität (Recommended) | Happy+Error+Mobile + Lockout + Conflict; compact. | |
| ~11 Specs: voll ausgebreitet | Jede Action explicit. ~50% mehr Aufwand. | ✓ |
| ~4 Specs: minimal | Verletzt E2E-first-Direktive. | |

**User's choice:** ~11 Specs: voll ausgebreitet ⚠ **USER-OVERRIDE** vom Recommended
**Notes:** User bestätigt E2E-first-Direktive (memory `feedback_e2e_first_no_uat.md`) explizit. Rollen/Permissions-Security-Kritikalität rechtfertigt die höhere Coverage (Self-Lockout, Link-Conflicts, Condition-Interpolation brauchen dedizierte Regression-Guards).

---

## User Overrides from Recommendations

| Area | Question | Recommended | User Choice | Reason |
|------|----------|-------------|-------------|--------|
| Plan-Scope | E2E-Scope (Q16) | ~7 Specs (Phase-12-Parität) | ~11 Specs voll ausgebreitet | Security-Kritikalität der Role/Permission-Surface; E2E-first-Direktive |

---

## Claude's Discretion (captured in CONTEXT.md decisions)

- Exakte Sidebar-Position, Icon-Wahl, Mobile-Akkordeon-Stickiness
- Loading-Skeletons pro Tab, Empty-State-Illustrations
- Search-Debounce (300ms), Autocomplete-Min-Length (2 Zeichen)
- JWT-Refresh-Hinweis-Wording, Cache-Invalidation-Strategie
- Audit-Log-Action-Types (re-use bestehendes Pattern, keine neuen Schemas)
- Performance-Optimizations bei vielen Overrides
- Bulk-Actions + CSV-Export deferred

---

## Deferred Ideas (captured in CONTEXT.md)

- KC-User-Bulk-Create + Password-Reset (v1.2)
- Permission-Simulator (v1.2 oder Phase 16)
- Template-Override-Presets
- Bulk-Role-Assignment / Bulk-Override-Application
- User-Audit-Timeline (Phase 15 deckt via Filter)
- Effective-Permissions-Caching (Server-Redis)
- Self-Service-Role-Request-Workflow
- Override-Expiry-Timestamps
- Multi-School User-Membership (v2 Multi-Tenant)
- KC-Group-Sync
- User-CSV-Export/Import
