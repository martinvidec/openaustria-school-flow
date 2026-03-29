# Domain Pitfalls

**Domain:** Open-source school management platform (Untis alternative, DACH market)
**Researched:** 2026-03-29
**Overall confidence:** MEDIUM-HIGH (multi-source verification across academic research, DSGVO legal sources, open-source project post-mortems, and timetabling domain literature)

---

## Critical Pitfalls

Mistakes that cause rewrites, legal exposure, or project failure.

---

### Pitfall 1: Treating All Timetable Constraints as Hard Constraints

**What goes wrong:** The solver treats every scheduling preference (teacher wants free Fridays, prefer morning math lessons, avoid back-to-back PE classes) as a hard constraint alongside genuine hard constraints (no double-booking rooms, no teacher in two places). This makes the problem over-constrained: research shows only ~40% of test cases find feasible solutions when soft constraints are incorrectly modeled as hard constraints. The solver returns "no solution found" with no explanation, and administrators lose trust in the system immediately.

**Why it happens:** Developers model constraints based on what stakeholders say they "need" without distinguishing non-negotiable rules from preferences. Austrian school regulations impose genuine hard constraints (minimum hours per subject, maximum daily teaching load), but schools also have dozens of soft preferences. Developers who lack timetabling domain expertise collapse these into a single constraint category.

**Consequences:**
- Solver fails to produce any timetable for realistic school configurations
- Administrators cannot understand WHY it failed -- which constraint caused the infeasibility
- Schools go back to manual planning or back to Untis
- Months of solver development wasted

**Prevention:**
- Separate constraints into exactly three tiers from day one: (1) **Hard/mandatory** -- violations make the timetable illegal or physically impossible, (2) **Medium/organizational** -- strong preferences that should be satisfied but can be relaxed, (3) **Soft/nice-to-have** -- optimize for these when possible
- Implement a constraint relaxation engine that can automatically identify which constraints to relax when no feasible solution exists, and report this to the user
- Build an "infeasibility explainer" that tells administrators exactly which constraints conflict: "Teacher Muller is assigned 32 hours but only 30 slots are available" -- this is the single most important UX feature of the solver
- Use weighted scoring (as Timefold does) rather than binary feasible/infeasible for soft constraints

**Detection:** Users report "the system never finds a solution" during pilot testing. Solver runs for hours without converging. Administrators create workarounds by manually removing constraints until something works.

**Phase relevance:** Must be addressed in the timetable engine design phase (Phase 1/2). Retrofitting constraint tiers into a flat constraint model requires a rewrite.

**Confidence:** HIGH -- supported by academic literature (UniTime papers, Baeldung CSP analysis), Timefold documentation, and multiple research papers on over-constrained timetabling.

---

### Pitfall 2: No Solver Progress Feedback or Timeout Strategy

**What goes wrong:** The timetable solver runs as a black box. The admin clicks "Generate timetable" and sees a spinner for 5 minutes, 30 minutes, 2 hours -- with no indication of progress, quality of current best solution, or whether the solver is stuck. School administrators are not computer scientists; they interpret long waits as "the system is broken."

**Why it happens:** CSP/metaheuristic solvers (genetic algorithms, simulated annealing) are iterative -- they progressively improve solutions. Developers focus on the algorithm and forget the UX. The solver thread runs in the background with no progress reporting infrastructure.

**Consequences:**
- Users kill the process thinking it is hung, losing a near-optimal solution
- No way to set time budgets ("give me the best solution you can find in 5 minutes")
- Impossible to offer "good enough" solutions for urgent rescheduling (substitution planning)
- Administrators lose trust and revert to manual planning

**Prevention:**
- Implement anytime solving: the solver always has a "current best" solution available, even if still improving
- Expose real-time metrics: current score, number of hard constraint violations remaining, improvement rate, estimated time to next improvement
- Implement configurable time limits with "best-so-far" return: admin chooses 2 min / 10 min / unlimited
- For substitution planning (Vertretungsplanung), implement a fast heuristic path (< 30 seconds) that produces an acceptable solution quickly, with optional optimization pass
- WebSocket or SSE push for live solver status to the frontend

**Detection:** User testing reveals people refreshing the page or force-closing the browser during solving. Support tickets about "the system hangs."

**Phase relevance:** Must be designed into the solver architecture from the start. Cannot be bolted on to a solver that was built as a batch job.

**Confidence:** HIGH -- Timefold documentation explicitly addresses this with incremental score calculation and anytime solving patterns.

---

### Pitfall 3: DSGVO as Afterthought -- Retrofitting Privacy Into an Existing Data Model

**What goes wrong:** The team builds the data model, API, and features first, then tries to add DSGVO compliance (deletion concepts, consent tracking, audit trails, data minimization) later. This requires touching every entity, every API endpoint, and every data flow. The result is either an incomplete retrofit or a major rewrite.

**Why it happens:** DSGVO compliance feels like a non-functional requirement that can be addressed later. The team prioritizes feature velocity. Privacy-by-design requires upfront thinking about data lifecycle, retention, and purpose limitation that feels premature when "just getting things working."

**Consequences:**
- Every entity needs retroactive additions: deletion timestamps, retention policies, legal basis tracking, consent references
- Audit trail must be added to every write operation -- impossible to retrofit comprehensively without middleware rewrite
- Hard-delete vs. soft-delete decisions made inconsistently across the codebase
- Schools cannot legally deploy the software without DSGVO compliance, making all feature work worthless

**Prevention:**
- Design the data model with DSGVO fields from entity zero:
  - Every personal data entity gets: `created_at`, `legal_basis`, `retention_category`, `deletion_due_date`, `anonymized_at`
  - Implement a centralized audit trail middleware that logs all CUD operations on personal data automatically
  - Define retention categories matching Austrian/German school law (1 year for temporary data, 5 years for general student data, 10 years for exam results, up to 50 years for certain records per Schulgesetz)
- Build deletion as a first-class operation: cascade rules, anonymization (replace personal data with hashed placeholders while preserving statistical data), and archival workflows
- Implement consent management as a core service, not a plugin: track per-purpose consent with withdrawal capability
- Every API endpoint that returns personal data must support field-level filtering based on the caller's role and legal basis

**Detection:** First school pilot asks "where is the Loeschkonzept?" and the team has no answer. Data protection officer (DSB) review fails. Legal basis for processing cannot be documented per-record.

**Phase relevance:** Must be in Phase 1 (data model and core architecture). The PROJECT.md already states "DSGVO-Konformitaet von Tag 1" -- this pitfall is about actually doing it, not just stating it.

**Confidence:** HIGH -- verified through official German school data protection sources (datenschutz-schule.info, dr-datenschutz.de) and DSGVO legal requirements.

---

### Pitfall 4: Ignoring the Datenschutz-Folgenabschaetzung (DSFA) Requirement

**What goes wrong:** The team builds a digital class book (Klassenbuch), attendance tracking, and grade management without realizing that deploying such a system in a school requires a Data Protection Impact Assessment (DSFA) per Art. 35 DSGVO. Schools that deploy the software without completing a DSFA face regulatory action. If the software does not facilitate the DSFA process, adoption is blocked.

**Why it happens:** Developers think DSGVO compliance means "encrypt the data and add a privacy policy." The DSFA requirement is a process obligation that applies to the deploying school, but the software must support it by providing documentation and transparency about data flows.

**Consequences:**
- Schools cannot legally deploy the software without completing a DSFA first
- Data protection authorities (Datenschutzbehoerde) can prohibit use
- Each German Bundesland has different DSFA requirements and "Positivlisten" -- the software must accommodate this variance
- Without built-in DSFA support documentation, each school must hire consultants, dramatically increasing adoption friction

**Prevention:**
- Ship a DSFA template/guide as part of the software documentation that covers: what data is processed, purposes, legal bases, retention periods, technical measures, risk assessment
- Build a data processing registry (Verarbeitungsverzeichnis) export feature that schools can use to fulfill Art. 30 DSGVO
- Implement configurable data processing purposes so schools can align with their specific Bundesland requirements
- Provide privacy dashboards showing what personal data exists, who accessed it, and when deletion is due
- Critical: electronic class book (digitales Klassenbuch) specifically triggers DSFA requirements in multiple Bundeslaender

**Detection:** First adopter school's data protection officer rejects deployment. Bundesland-level school authority requires DSFA documentation that does not exist.

**Phase relevance:** Must be addressed alongside the data model phase. DSFA documentation must exist before the first pilot deployment.

**Confidence:** HIGH -- verified through datenschutz-schule.info and Niedersachsen Bildungsportal official DSFA guidance for schools.

---

### Pitfall 5: Premature Abstraction of the School Data Model for "All School Types"

**What goes wrong:** The team tries to build a single abstract data model that handles Volksschule (ages 6-10, class teacher model, no subject-specific rooms), Mittelschule (subject teachers, ability grouping), AHS (Unter/Oberstufe, Matura, elective subjects, Wahlpflichtfaecher), and BHS/HTL/HAK (5 years, workshops, practicals, rotating lab schedules, company internship periods) from day one. The result is an over-engineered, configuration-heavy system that handles no school type well.

**Why it happens:** The project scope says "alle Schultypen von der Volksschule bis zur BHS." Developers interpret this as needing a unified model. Austrian school types have fundamentally different structures:
- Volksschule: 1 teacher per class, simple fixed schedule, no room changes
- AHS Oberstufe: Course selection system (Wahlpflichtfaecher), student groups that differ per subject
- HTL/HAK: Workshop rotations, semester-based practicals, company internship weeks, department structures
- Mittelschule: Ability grouping (Leistungsgruppen) where the same student is in different groups per subject

**Consequences:**
- Data model becomes a "God Object" trying to represent everything
- Every UI flow has conditional logic for school type variations
- Volksschule users face complexity they do not need (room assignments, subject teacher mapping)
- BHS-specific features (workshop rotations, practicals) are shoehorned into a generic model
- Testing matrix explodes: every feature x every school type

**Prevention:**
- Start with ONE school type (recommendation: AHS Unterstufe/Mittelschule -- large market, medium complexity, representative constraints)
- Use a modular data model with a common core and school-type-specific extensions:
  - Core: Teacher, Student, Class/Group, Subject, Room, TimeSlot, Lesson
  - Extension modules: AbilityGrouping (Mittelschule), CourseSelection (AHS Oberstufe), WorkshopRotation (BHS), SimplifiedSchedule (Volksschule)
- Define clear interfaces between core and extensions -- the plugin system should handle school-type-specific logic
- Each school type module adds its own constraint definitions to the solver
- Ship for one school type first, validate, then extend

**Detection:** Data model reviews show entities with 30+ nullable fields where 80% are NULL for any given school. Configuration screens become incomprehensible. Every feature requires a "which school type?" branch.

**Phase relevance:** Phase 1 architecture decision. The modular extension approach must be decided before the data model is built. The PROJECT.md already hints at this with "schultyp-agnostisch" -- but agnostic does not mean "one model fits all."

**Confidence:** MEDIUM-HIGH -- based on Austrian school system structure (verified via official sources), analysis of FET/AlekSIS limitations, and general software architecture principles.

---

### Pitfall 6: Plugin Architecture Without Stability Contracts

**What goes wrong:** The plugin/connector system is designed and shipped, third-party developers or schools build integrations (MS Teams calendar sync, Google Classroom connector, SIS data import), and then a core API change breaks all plugins. Without versioned stability contracts, every core release is a potential breaking change for the ecosystem.

**Why it happens:** The team designs the plugin API based on current internal needs. Internal consumers can be updated in lockstep (monorepo advantage), but external plugins cannot. No semantic versioning policy exists for the plugin API. No distinction between "stable public API" and "internal API subject to change."

**Consequences:**
- Plugin developers stop maintaining their plugins after repeated breakage
- Schools cannot update the core without risking their critical integrations
- The "open ecosystem" value proposition collapses
- Core team becomes bottleneck for all integrations

**Prevention:**
- Define a Plugin API stability contract from the first release:
  - `@stable` -- will not break within a major version, follows semver
  - `@experimental` -- may change, plugins should handle gracefully
  - `@internal` -- not for plugin use, no guarantees
- Implement a plugin API versioning scheme (e.g., `/api/plugins/v1/`) that allows old and new versions to coexist during transition periods
- Build a plugin compatibility test suite that runs against all registered plugins before each core release
- Design extension points (hooks, events, middleware) rather than exposing internal objects
- Provide a plugin SDK with typed interfaces that abstract the internal implementation
- Keep the initial plugin API surface small -- it is easier to add stable APIs than to remove or change them

**Detection:** First external plugin developer complains about breakage after a minor release. Schools refuse to update because "it will break our Teams integration."

**Phase relevance:** Plugin architecture design phase. The stability contract must be defined before the first plugin API is published. Once external consumers exist, changing the contract is extremely expensive.

**Confidence:** MEDIUM-HIGH -- based on general plugin architecture best practices (Microsoft Engineering Playbook, Nx monorepo versioning) and analysis of education software ecosystems.

---

## Moderate Pitfalls

Mistakes that cause significant rework or delayed adoption but are recoverable.

---

### Pitfall 7: Neglecting Untis Data Import/Migration Path

**What goes wrong:** Schools using Untis (the vast majority in DACH -- ~26,000 schools) have years of data in Untis format. SchoolFlow launches with no way to import existing timetable data, teacher assignments, room definitions, or historical schedules from Untis. Schools cannot evaluate SchoolFlow without re-entering all their data manually, which is a non-starter.

**Why it happens:** The team focuses on building new features and treats migration as a "nice to have." Untis uses proprietary GPU file formats (GPU001.TXT through GPU021.TXT) and XML exports that are poorly documented.

**Prevention:**
- Implement an Untis import pipeline as a first-class feature, not a migration script:
  - Support Untis XML export format (most accessible)
  - Support Untis DIF/GPU text format (GPU012.TXT, GPU013.TXT, GPU014.TXT for core timetable data)
  - Validate imported data against SchoolFlow's data model with clear error reporting
- Build a "parallel run" mode where schools can import their Untis timetable and verify it looks correct before committing to migration
- Reference the Enbrea project's Untis import implementation (open source) for format specifications
- This is the number one adoption enabler: schools will not switch without a painless migration path

**Detection:** Pilot schools ask "how do I get my Untis data in?" on day one and there is no answer.

**Phase relevance:** Should be in the first usable release (MVP phase or immediately after). Not a V2 feature.

**Confidence:** HIGH -- verified through Enbrea documentation, Classter integration docs, and Untis export format references.

---

### Pitfall 8: RBAC Model That Does Not Reflect Real School Hierarchies

**What goes wrong:** The role system is designed with flat, generic roles (Admin, Teacher, Parent, Student) that do not reflect actual school organizational structures. In reality, Austrian schools have:
- Direktor/in (principal) -- full access to their school
- Administrator/in -- IT and system management
- Klassenvorstand (class teacher / homeroom teacher) -- special rights for their class
- Fachlehrer/in (subject teacher) -- access only to their subjects/classes
- Elternteil (parent) -- access only to their children's data
- Schueler/in (student) -- limited to own data
- Abteilungsvorstand (department head, BHS only) -- access to their department
- SGA-Mitglied (school community committee) -- specific governance rights

A flat RBAC system cannot express "Klassenvorstand of 3B can see all grades for class 3B but not 3A."

**Why it happens:** Developers implement standard web application RBAC without understanding school-specific scoping requirements. Generic RBAC tutorials do not cover resource-scoped roles.

**Prevention:**
- Implement scoped RBAC from the start: Role + Resource Scope
  - Example: `KLASSENVORSTAND` scoped to `class:3B` grants grade visibility, absence management, and parent communication for class 3B only
  - Example: `FACHLEHRER` scoped to `subject:Mathematik, classes:[3A, 3B, 4A]` grants grade entry for those specific class-subject combinations
- Allow role composition: one person can be `KLASSENVORSTAND(3B) + FACHLEHRER(Mathematik, [3A,3B,4A]) + SGA_MITGLIED`
- Implement an "effective permissions" view that shows exactly what a user can see/do -- critical for DSGVO audit compliance
- Do NOT hardcode roles -- make them configurable per school type, since BHS schools have roles (Abteilungsvorstand, Werkstaettenleiter) that do not exist in Volksschulen

**Detection:** Teachers complain they can see grades for classes they do not teach. Klassenvorstand cannot access their class's data. DSGVO audit reveals overly broad data access.

**Phase relevance:** Core architecture phase. RBAC model must be designed before any feature that checks permissions.

**Confidence:** MEDIUM-HIGH -- based on Austrian school structure analysis and RBAC best practice research.

---

### Pitfall 9: Substitution Planning (Vertretungsplan) as an Afterthought

**What goes wrong:** The team builds the timetable solver as a batch process that generates a complete timetable for the semester. When a teacher calls in sick on Monday morning at 7:00 AM, the administrator needs a substitution plan within minutes. The batch solver takes 30+ minutes. There is no fast path for incremental changes.

**Why it happens:** Timetabling research focuses on the full timetable generation problem. Substitution planning is a different problem: modify an existing valid timetable minimally to accommodate an absence, using available teachers, with minimal disruption. It requires its own algorithm.

**Prevention:**
- Design substitution planning as a separate, fast algorithm from the start:
  - Input: current timetable + teacher absence + available substitute teachers
  - Constraint: minimize changes to the existing timetable
  - Output: modified timetable for the day with substitution assignments
  - Target: < 30 seconds for a single-day substitution plan
- Pre-compute "substitution readiness" data: for each teacher-timeslot, which substitute teachers are available and qualified?
- Implement teacher preference tracking: who prefers extra hours vs. who is already at maximum load?
- Build notification pipeline: affected teachers and students must be notified immediately when substitutions are made
- This is the feature administrators use DAILY -- it must be fast and reliable

**Detection:** First sick day during pilot: admin asks "how do I handle this?" and the answer is "run the full solver again."

**Phase relevance:** Must be planned alongside the timetable engine but can be implemented as a separate algorithm module. Should not be deferred past the timetabling MVP.

**Confidence:** HIGH -- substitution planning is the primary daily workflow for Austrian school administrators. Untis's Vertretungsplan module is one of its most-used features.

---

### Pitfall 10: Underestimating Digital Class Book (Klassenbuch) Complexity

**What goes wrong:** The digital Klassenbuch is treated as a simple CRUD app: teacher logs attendance and lesson content. In reality, the Austrian Klassenbuch has legal requirements that make it a complex domain:
- Lesson content must be recorded per period, linked to curriculum objectives
- Attendance must distinguish: present, absent excused, absent unexcused, late (with minutes), left early, excused by parent, excused by doctor
- Absence chains: a student absent for 3 consecutive days requires different handling than 3 separate days
- Parent notification thresholds: automatic alerts after X unexcused absences
- Legal record: the Klassenbuch is a legal document that may be required in disputes
- Corrections/amendments: once submitted, entries cannot simply be deleted -- they must be corrected with audit trail
- Multi-teacher per period: team teaching, support teachers present alongside subject teacher
- Period deviations: shortened periods, cancelled periods, swapped periods, supply teacher entries

**Why it happens:** Developers look at the Klassenbuch as "attendance + notes" and miss the legal and workflow complexity.

**Prevention:**
- Research Austrian Klassenbuch regulations (Schulunterrichtsgesetz, relevant Verordnungen) before designing the data model
- Model the Klassenbuch as an append-only log with corrections (not a mutable CRUD entity):
  - Entries are immutable once submitted
  - Corrections create new entries referencing the original with a reason for change
  - Full audit trail is mandatory
- Design absence workflows as state machines with proper transitions
- Build parent notification triggers as configurable rules, not hardcoded thresholds
- Support multi-teacher per period from the data model level (many-to-many relationship between lesson instance and teacher)

**Detection:** Legal review reveals the Klassenbuch implementation does not meet Schulunterrichtsgesetz requirements. Teachers complain they cannot correct mistakes. Absence statistics are wrong because edge cases (late arrivals, partial absences) are not handled.

**Phase relevance:** Klassenbuch design phase. Must be researched before implementation. This is a domain where getting the data model wrong means a rewrite.

**Confidence:** MEDIUM -- based on Austrian school law references and general Klassenbuch domain knowledge. Specific Verordnung details should be verified with Austrian legal sources during implementation.

---

### Pitfall 11: Docker/Kubernetes Deployment Complexity for School IT Staff

**What goes wrong:** The project ships with Kubernetes manifests and Helm charts as the default deployment method. School IT staff (often a single part-time teacher with basic Linux knowledge) cannot deploy, maintain, or update the system. Schools that cannot afford external IT support simply cannot use the software.

**Why it happens:** The development team uses Kubernetes in their workflow and assumes this is standard. The PROJECT.md specifies "Docker/Kubernetes" but does not prioritize simplicity.

**Prevention:**
- Offer tiered deployment options:
  1. **Simple:** Single `docker-compose up` that runs everything (app, database, reverse proxy) on one machine. This must work out of the box with sensible defaults. Target audience: teacher with basic terminal knowledge.
  2. **Standard:** Docker Compose with separate services, backup scripts, and monitoring. Target: school with basic IT support.
  3. **Advanced:** Kubernetes manifests for larger deployments or districts. Target: professional IT departments.
- Ship a one-line installer script that handles Docker installation, certificate generation, and initial setup
- Include automated backup and restore scripts (not just database dumps -- full system state)
- Build an admin web UI for updates, backups, and health monitoring that does not require terminal access
- Document the "bare minimum" hardware requirements (a Raspberry Pi 5 or small NUC should suffice for a small school)

**Detection:** Pilot schools cannot complete the installation. Support requests are dominated by deployment issues rather than feature questions.

**Phase relevance:** Deployment packaging should be addressed in the MVP phase. The simplest deployment path must be tested with non-technical users.

**Confidence:** MEDIUM-HIGH -- based on self-hosted software deployment research and the reality of school IT capacity in the DACH region.

---

## Minor Pitfalls

Mistakes that cause friction and technical debt but are correctable.

---

### Pitfall 12: Calendar Complexity -- Austrian School Calendar Edge Cases

**What goes wrong:** The system assumes a simple Monday-Friday schedule with standard holidays. Austrian school calendars have:
- Different holiday dates per Bundesland (9 different holiday schedules)
- "Schulautonome Tage" -- school-specific holidays (each school gets a budget of free days to allocate)
- Semester break (Semesterferien) varies by Bundesland
- Religious holidays affecting different student subsets
- Saturday classes in some BHS schools
- "Blockwochen" in BHS -- entire weeks with different schedules for workshop rotations
- Shortened days before holidays (last day of semester, day before Christmas break)

**Prevention:**
- Build a calendar system that supports:
  - Bundesland-specific holiday calendars (importable, not hardcoded)
  - School-specific override days
  - Per-day schedule variations (shortened day, block schedule, special schedule)
  - Period timing that can differ by day (Monday 1st period = 8:00-8:50, but Thursday 1st period = 8:15-9:05 due to morning assembly)
- Make the calendar configurable per school instance, not globally defined

**Detection:** First school outside the developer's own Bundesland reports wrong holidays. BHS school cannot model their block week schedule.

**Phase relevance:** Calendar is a foundation component. Must be flexible from the start, but detailed Bundesland data can be added incrementally.

**Confidence:** MEDIUM -- based on Austrian school calendar structure. Specific edge cases should be validated with school administrators.

---

### Pitfall 13: Solver Technology Lock-in

**What goes wrong:** The team builds the timetable engine tightly coupled to a specific solver library (e.g., Timefold, OR-Tools, custom GA). When limitations are discovered (Timefold Python is significantly slower than Java/Kotlin; custom GA cannot handle large BHS schedules; OR-Tools CP-SAT does not support incremental solving for substitutions), switching requires rewriting the entire constraint model.

**Prevention:**
- Abstract the solver behind a well-defined interface:
  - `SolverInput` (teachers, rooms, classes, constraints, preferences)
  - `SolverOutput` (timetable assignment, score, violated soft constraints, constraint explanations)
  - `SolverConfig` (time limit, optimization level, strategy)
- Allow different solver implementations for different use cases:
  - Full timetable generation: metaheuristic (Timefold/GA) for quality
  - Substitution planning: fast heuristic or CP solver for speed
  - Constraint validation: lightweight checker for real-time feedback during manual editing
- Start with one solver, but ensure the abstraction layer exists

**Detection:** Performance testing reveals the solver cannot handle a large HTL with 80 teachers and workshop rotations within acceptable time. Switching solvers requires months of rewrite.

**Phase relevance:** Solver architecture design phase. The abstraction layer costs minimal effort upfront but saves potentially months later.

**Confidence:** MEDIUM -- based on Timefold documentation acknowledging Python performance limitations and general solver technology trade-offs.

---

### Pitfall 14: Ignoring Offline/Low-Connectivity Scenarios

**What goes wrong:** The web app requires constant internet connectivity. Austrian schools, especially rural ones, have unreliable internet. Teachers recording attendance during class cannot wait for page loads. Mobile network coverage in school buildings (thick walls, basements) is poor.

**Prevention:**
- Design the mobile/web client with offline-first capability for critical daily operations:
  - Attendance recording must work offline and sync when connectivity returns
  - Timetable viewing must be cached locally
  - Substitution plan must be cached after first load
- Use service workers and local storage for offline data
- Design conflict resolution for when offline edits conflict with changes made by others
- This does NOT mean building a full offline app -- just ensure the 3 operations teachers do 20 times per day work without connectivity

**Detection:** Teachers in classrooms with poor WiFi cannot record attendance. Rural school pilot reports constant "connection lost" errors.

**Phase relevance:** Must be considered in the frontend architecture phase. Retrofitting offline capability into a purely server-rendered app is a major effort.

**Confidence:** MEDIUM -- based on general understanding of school building connectivity. Should be validated with actual school IT infrastructure surveys.

---

### Pitfall 15: Locale and Terminology Assumptions

**What goes wrong:** The app uses German terminology from one country/region, but DACH schools use different terms:
- Austria: "Schularbeit" (exam), "Mitarbeit" (participation grade), "Klassenbuch," "Supplierung" (substitution)
- Germany: "Klassenarbeit," "Muendliche Note," "Klassenbuch," "Vertretung"
- Switzerland: "Pruefung," "Erfahrungsnote," different grading scales (6 = best in CH, 1 = best in AT/DE)
- Within Austria: terminology varies between Volksschule (verbal assessments, no numerical grades in early years) and AHS/BHS (numerical 1-5 scale)

**Prevention:**
- Use terminology keys, not hardcoded strings, for all domain-specific terms
- Support locale variants: de-AT, de-DE, de-CH as separate terminology sets
- Make grading scales configurable per school (1-5 numeric, verbal assessments, 1-6 Swiss, percentage-based)
- Do NOT assume a single grading or assessment model -- this is school-type-specific

**Detection:** First German or Swiss school tries the software and reports confusing terminology. Grading system does not match their school's scale.

**Phase relevance:** Internationalization should be built into the framework from the start (string externalization), but complete DACH coverage can be incremental.

**Confidence:** MEDIUM -- based on known DACH educational terminology differences. Specific terminology inventories should be built with school stakeholders.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Data model design | Pitfall 3 (DSGVO afterthought), Pitfall 5 (premature abstraction), Pitfall 10 (Klassenbuch complexity) | DSGVO fields on every entity from day one. Start with one school type. Research Klassenbuch legal requirements before modeling. | Critical |
| Timetable engine | Pitfall 1 (constraint tiers), Pitfall 2 (no feedback), Pitfall 13 (solver lock-in) | Three-tier constraint model. Anytime solving with progress reporting. Solver abstraction layer. | Critical |
| Substitution planning | Pitfall 9 (afterthought) | Design as separate fast algorithm, not a rerun of the full solver. | High |
| RBAC and permissions | Pitfall 8 (flat roles) | Scoped RBAC with resource-level permissions from the start. | High |
| Plugin/API system | Pitfall 6 (no stability contracts) | Define and publish API stability tiers before first external consumer. | High |
| Deployment | Pitfall 11 (Kubernetes complexity) | Docker Compose as primary path. One-command setup. | Moderate |
| Migration/adoption | Pitfall 7 (no Untis import) | Untis XML/DIF import as a launch feature, not a later addition. | High |
| Frontend/mobile | Pitfall 14 (offline), Pitfall 15 (locale) | Offline-first for daily operations. String externalization from day one. | Moderate |
| Calendar system | Pitfall 12 (Austrian calendar edge cases) | Configurable per-Bundesland and per-school calendar. | Moderate |
| Compliance/legal | Pitfall 4 (DSFA requirement) | Ship DSFA template. Build Verarbeitungsverzeichnis export. | High |

---

## Anti-Patterns to Watch For

### "We'll Add Tests Later"
Timetable solver correctness is critical. A bug that creates a double-booked room or teacher propagates to hundreds of affected people. Constraint tests must be written alongside constraint definitions -- not after.

### "One Big Database"
Mixing operational data (today's attendance), analytical data (absence trends over 3 years), and archival data (graduated student records under retention) in one schema leads to performance problems and DSGVO deletion complexity. Separate concerns early with clear data lifecycle boundaries.

### "The Admin Will Configure It"
School administrators are teachers with extra responsibilities, not system administrators. Every configuration screen that requires understanding of technical concepts (cron expressions, regex patterns, JSON configuration) is a deployment blocker. Default configurations must work. Power-user configuration should be optional, not required.

### "We'll Handle Multi-School Later"
Even in single-tenant mode, some Austrian school locations host multiple school types under one roof (e.g., a Volksschule and Mittelschule sharing a building with shared rooms and some shared teachers). If the data model assumes exactly one school per instance, this common scenario requires a workaround from day one.

---

## Sources

### Timetabling and Constraint Satisfaction
- [Baeldung: How to Make a School Timetable (CSP)](https://www.baeldung.com/cs/school-timetable-constraint-satisfaction)
- [UniTime: Constraint-based Timetabling (PhD thesis)](https://www.unitime.org/papers/phd05.pdf)
- [UniTime: University Course Timetabling with Soft Constraints](https://www.unitime.org/papers/patat03.pdf)
- [Timefold Solver: School Timetabling Constraints](https://docs.timefold.ai/timefold-solver/latest/quickstart/shared/school-timetabling/school-timetabling-constraints)
- [Timefold: Performance Tips and Tricks](https://docs.timefold.ai/timefold-solver/latest/constraints-and-score/performance)
- [Interactive School Timetabling (HAL)](https://hal.science/hal-00312705/document)
- [Models and Algorithms for School Timetabling](https://d-nb.info/967478146/34)
- [School Timetabling with Constraint Programming (Medium, Feb 2026)](https://medium.com/suboptimally-speaking/school-timetabling-with-constraint-programming-495f1126c28d)

### DSGVO and School Data Protection
- [datenschutz-schule.info: Aufbewahrung und Loeschung](https://datenschutz-schule.info/themen/aufbewahrung-aussonderung-loeschung-und-vernichtung-der-dateien-und-akten/)
- [datenschutz-schule.info: DSFA durchfuehren](https://datenschutz-schule.info/themen/spezialthemen/datenschutz-folgenabschaetzung-durchfuehren/)
- [dr-datenschutz.de: IT-Tools und Software in Schulen](https://www.dr-datenschutz.de/datenschutz-bei-it-tools-software-in-schulen/)
- [dr-datenschutz.de: Datenschutz an Schulen](https://www.dr-datenschutz.de/datenschutz-an-schulen-entwicklungen-und-empfehlungen/)
- [Bildungsportal Niedersachsen: DSFA Leitfaden](https://bildungsportal-niedersachsen.de/schulorganisation/datenschutz-an-schulen/dsgvo-an-schulen-und-studienseminaren/datenschutz-folgenabschaetzung)
- [Datenschutz in Schule und Unterricht 2026](https://www.datenschutz.org/schule/)
- [SchuldatenV Berlin: Aufbewahrungsdauer und Loeschfristen](https://www.schulgesetz-berlin.de/berlin/verordnung-verarbeitung-personenbezogener-daten-im-schulwesen/teil-2-datenverarbeitung-in-den-schulen/abschnitt-2-schuelerunterlagen/sect-16-aufbewahrungsdauer-und-loeschfristen.php)

### School Management Systems and Open Source
- [Enbrea: Datenimport von Untis](https://www.enbrea.org/admins/data-exchange/untis/)
- [FET: Free Timetabling Software](https://lalescu.ro/liviu/fet/)
- [GibbonEdu: Flexible Open Source School Platform](https://gibbonedu.org/)
- [Untis: Export/Import DIF files](https://platform.untis.at/HTML/WebHelp/uk/untis/hid_export.htm)

### Architecture and Plugin Systems
- [Microsoft Engineering Playbook: Component Versioning](https://microsoft.github.io/code-with-engineering-playbook/source-control/component-versioning/)
- [Nx Blog: Versioning and Releasing in a Monorepo](https://nx.dev/blog/versioning-and-releasing-packages-in-a-monorepo)
- [Plugin Architecture Design Pattern (DevLeader)](https://www.devleader.ca/2023/09/07/plugin-architecture-design-pattern-a-beginners-guide-to-modularity)

### Austrian Education System
- [Work in Austria: The Austrian School System](https://www.workinaustria.com/en/your-personal-guide/education/the-austrian-schooling-system/)
- [Education in Austria (Wikipedia)](https://en.wikipedia.org/wiki/Education_in_Austria)
