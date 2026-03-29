# Phase 2: School Data Model & DSGVO - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 02-school-data-model-dsgvo
**Areas discussed:** Teacher & availability modeling, Class structure & student groups, Subject & weekly hour quotas, DSGVO consent & deletion strategy

---

## Teacher & Availability Modeling

### Availability Model

| Option | Description | Selected |
|--------|-------------|----------|
| Per-period matrix | Day x period grid with available/unavailable/preferred. Maps directly to solver constraints. | |
| Time range blocks | Teachers specify available time ranges. Needs conversion to discrete periods. | |
| Constraint rules | Teachers define rules like 'max 4 days/week', 'no afternoons on Friday'. Most expressive. | ✓ |

**User's choice:** Constraint rules
**Notes:** Most expressive model, validated against TimeGrid periods.

### Teilzeit Employment

| Option | Description | Selected |
|--------|-------------|----------|
| Employment % + max hours | Store Beschaeftigungsgrad and derived max hours. Both visible to admin. | |
| Just max weekly hours | Admin sets max hours directly. Simpler but loses HR metadata. | |
| Full Lehrverpflichtung model | Track Werteinheiten, Faecherzuschlaege, Supplierverpflichtung. Most accurate for Austrian schools. | ✓ |

**User's choice:** Full Lehrverpflichtung model
**Notes:** Werteinheiten + Abschlaege model chosen for accurate Austrian payroll alignment.

### Teacher Metadata

| Option | Description | Selected |
|--------|-------------|----------|
| Core + contact + qualifications | Name, email, phone, subjects, employment %, availability. Enough for scheduling. | |
| Extended with HR fields | Core plus Personalnum, Dienstjahre, Pragmatisierung, Stammschule. Full Austrian admin data. | ✓ |
| Minimal for solver | Just name, subjects, availability, employment %. Lean start. | |

**User's choice:** Extended with HR fields

### Shared Teachers (Wanderlehrer)

| Option | Description | Selected |
|--------|-------------|----------|
| Model Stammschule + Einsatzschule | Full multi-school scheduling. | |
| Flag only, details later | isShared boolean + Stammschule reference. Full logic later. | ✓ |
| Skip for now | All teachers belong to one school in v1. | |

**User's choice:** Flag only, details later

### Lehrverpflichtung Detail Level

| Option | Description | Selected |
|--------|-------------|----------|
| Werteinheiten + Abschlaege | Full WE tracking with Kustodiate, Klassenvorstand, Mentor reductions. | ✓ |
| Simplified: base hours + reductions | Base Lehrverpflichtung with listed reductions. Less precise. | |
| You decide | Claude picks based on solver/admin needs. | |

**User's choice:** Werteinheiten + Abschlaege

### Qualification Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Teachable subjects only | List of subjects the teacher can teach. Simple, solver-ready. | ✓ |
| Formal qualifications + teachable | Track Lehramtspruefung AND 'can teach' list. | |
| Qualification levels per subject | Per subject: hauptfach, nebenfach, fachfremd. | |

**User's choice:** Teachable subjects only

---

## Class Structure & Student Groups

### Core Class/Group Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Stammklasse + Gruppen | Home class + additional groups for splits (Religion, WPF, Leistungsgruppen). | ✓ |
| Flat group-only model | No class/group distinction, everything is a 'group' with type tag. | |
| Hierarchical: Jahrgang -> Klasse -> Gruppe | Three-level hierarchy. | |

**User's choice:** Stammklasse + Gruppen

### Student-Group Membership

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit membership per group | Student independently assigned to each group. Most flexible. | |
| Auto-derive from Stammklasse + rules | Student assigned to Stammklasse, splits derived from rules. Admin manages exceptions. | ✓ |
| You decide | Claude picks best approach. | |

**User's choice:** Auto-derive from Stammklasse + rules

### Leistungsgruppen

| Option | Description | Selected |
|--------|-------------|----------|
| First-class entity | Dedicated entity with student lists. | |
| Group type tag | Groups with type='leistungsgruppe' and level attribute. | ✓ |
| Skip for now | Model concept but don't build out logic. | |

**User's choice:** As a group type tag

---

## Subject & Weekly Hour Quotas

### Stundentafel Definition

| Option | Description | Selected |
|--------|-------------|----------|
| School-type templates + override | Default Stundentafeln per school type. Admin overrides per class. | |
| Fully manual per class | Admin defines everything from scratch. | |
| Template library + custom | Library by school type AND year level. Admin picks and customizes. | ✓ |

**User's choice:** Template library + custom

### Wahlpflichtfaecher

| Option | Description | Selected |
|--------|-------------|----------|
| Regular subjects with group link | WPF is a Subject linked to a student Group. Scheduled for group. | ✓ |
| Separate elective model | Dedicated WPF entity with enrollment and preferences. | |
| You decide | Claude picks for solver compatibility. | |

**User's choice:** As regular subjects with group link

### Subject Type Distinction

| Option | Description | Selected |
|--------|-------------|----------|
| Subject type enum | PFLICHT, WAHLPFLICHT, FREIGEGENSTAND, UNVERBINDLICH. | ✓ |
| Just a tag/category | Freeform category string. | |
| No distinction | All subjects equal. | |

**User's choice:** Subject type enum

---

## DSGVO Consent & Deletion Strategy

### Consent Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Per processing purpose | Per Verarbeitungszweck with timestamp, version, withdrawal. Meets Art. 6/7. | ✓ |
| Per data category | Per Stammdaten, Noten, Gesundheitsdaten, etc. Coarser. | |
| Binary opt-in/out | Single consent per user. Risky for Zweckbindung. | |

**User's choice:** Per processing purpose

### Deletion Strategy (Art. 17)

| Option | Description | Selected |
|--------|-------------|----------|
| Anonymize + retain structure | Replace personal data with placeholders. Keep grades/attendance. | ✓ |
| Hard cascade delete | Remove all records. Clean but destroys school records. | |
| Hybrid: anonymize + selective delete | Anonymize core, delete messages, keep grades. Admin decides. | |

**User's choice:** Anonymize + retain structure

### Data Export Format (Art. 15/20)

| Option | Description | Selected |
|--------|-------------|----------|
| JSON primary + PDF summary | JSON bundle + human-readable PDF. Covers Art. 15 and 20. | ✓ |
| JSON only | Machine-readable only. | |
| PDF only | Human-readable only. Doesn't meet Art. 20. | |

**User's choice:** JSON primary + PDF summary

### Retention Periods

| Option | Description | Selected |
|--------|-------------|----------|
| Per-category defaults + admin override | Different retention per data type. BullMQ daily job. | ✓ |
| Global retention period | One period for all data. Doesn't match Austrian law. | |
| You decide | Claude picks based on legal requirements. | |

**User's choice:** Per-category defaults + admin override

### Field-Level Encryption (DSGVO-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Sensitive PII only | Geburtsdatum, SVNr, Gesundheitsdaten, Telefon, Adressen. Leaves names/grades queryable. | ✓ |
| All personal data | Maximum protection, severely limits queries. | |
| Database-level TDE | Full disk encryption via PostgreSQL. No app-level encryption. | |

**User's choice:** Sensitive PII only

### DSFA/Verarbeitungsverzeichnis Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON export + PDF render | Structured JSON + formatted PDF for Datenschutzbeauftragte. | ✓ |
| Static template download | Pre-filled Word/PDF templates. Simpler but less dynamic. | |
| You decide | Claude picks best approach. | |

**User's choice:** JSON export + PDF render

### Encryption Layer

| Option | Description | Selected |
|--------|-------------|----------|
| Application-level via Prisma middleware | Encrypt/decrypt in Node.js. Portable, transparent. | ✓ |
| Database-level pgcrypto | PostgreSQL handles encryption. DB-locked. | |
| Both: app-level + TDE | Belt and suspenders. | |

**User's choice:** Application-level via Prisma middleware

---

## Claude's Discretion

- Prisma schema design for new entities
- Migration strategy from Phase 1 schema
- Seed data for Austrian school type templates
- Encryption key management approach
- BullMQ job design for retention/deletion
- Person base entity pattern
- API endpoint structure
- Group membership rule engine implementation

## Deferred Ideas

- Full multi-school scheduling for Wanderlehrer
- Formal Lehramtspruefung tracking
- Faecher uebergreifender Unterricht
- Doppelstunden-Praeferenz pro Fach
- Fachgruppen (subject departments)
