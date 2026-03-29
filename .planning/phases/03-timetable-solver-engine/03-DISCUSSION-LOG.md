# Phase 3: Timetable Solver Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 03-timetable-solver-engine
**Areas discussed:** Constraint hierarchy, Double periods & A/B weeks, Solving experience, Room constraints

---

## Constraint Hierarchy

### Tier Model

| Option | Description | Selected |
|--------|-------------|----------|
| Hard + Soft only | Hard = must never violate, Soft = quality optimization. Simpler model, standard Timefold approach. | ✓ |
| Hard + Medium + Soft | Hard = physical, Medium = strong pedagogical, Soft = preferences. More nuanced but harder to tune. | |
| Hard + weighted Soft | Hard = must never violate. All soft have admin-tunable weights (1-100). Maximum control, complex to configure. | |

**User's choice:** Hard + Soft only
**Notes:** Standard Timefold approach, no medium tier needed.

### Hard Constraint Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Physical only | Teacher clash, room double-booking, availability windows, student group clash. MAX_DAYS_PER_WEEK soft. | ✓ |
| Physical + Werteinheiten | All physical PLUS teacher max weekly hours. Stricter, may cause infeasibility. | |
| Physical + pedagogical floor | Physical PLUS max 8 hours/day, no 6 consecutive periods. Prevents extreme schedules. | |

**User's choice:** Physical only
**Notes:** Fewest hard constraints = solver finds solutions faster. Werteinheiten as soft.

### Soft Constraint Weights

| Option | Description | Selected |
|--------|-------------|----------|
| Sensible defaults, admin-tunable | Ship with researched defaults. Admin can adjust weights per constraint via API/UI. | ✓ |
| Fixed weights only | Predefined weights, no admin UI. Simpler but less flexible. | |
| Preset profiles | 3-4 named profiles (Quality-first, Fast-solve, Teacher-friendly). Admin picks profile. | |

**User's choice:** Sensible defaults, admin-tunable
**Notes:** Best balance of ease and control.

### Custom Constraints (TIME-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Rule builder with templates | Admin picks from constraint templates. Each maps to a solver constraint. Extensible set. | ✓ |
| Free-form constraint language | Admin writes constraints in DSL. Maximum flexibility, steep learning curve. | |
| Predefined constraint toggles | Fixed list of ~20 constraints with on/off toggle. Simple but not extensible. | |

**User's choice:** Rule builder with templates
**Notes:** Extensible template approach, new types added via code.

---

## Double Periods & A/B Weeks

### Double Period Model

| Option | Description | Selected |
|--------|-------------|----------|
| Per-subject preference | ClassSubject gets preferDoublePeriod flag (soft constraint). Subjects default based on Austrian practice. | ✓ |
| Per-subject mandatory | Some subjects MUST be double (hard constraint). May cause infeasibility. | |
| Flexible blocks | Solver schedules 1-3 consecutive periods freely. No preference, solver optimizes transitions. | |

**User's choice:** Per-subject preference (soft constraint)
**Notes:** Matches Austrian practice without over-constraining.

### A/B Week Cycles (TIME-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Optional 2-week cycle | Admin enables A/B mode per school. Some subjects alternate weekly. 2-week plan when enabled. | ✓ |
| Flexible N-week cycles | Admin sets 1-4 week cycle. Subjects assigned to specific weeks. Exotic but hard to solve. | |
| A/B per subject only | No global mode. Individual subjects flagged as alternating with a partner. | |

**User's choice:** Optional 2-week cycle
**Notes:** Per-school toggle. Most Austrian schools use simple weekly plans.

### Default Double-Period Subjects

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Austrian set | BSP, TEW/TXW, BE, Physik/Chemie lab, Informatik default to double-period preference. | ✓ |
| No defaults, all manual | Admin sets everything manually. Clean but more work. | |
| You decide | Claude picks based on Austrian Lehrplan research. | |

**User's choice:** Standard Austrian set
**Notes:** Admin can override per class-subject.

---

## Solving Experience

### Real-Time Progress (TIME-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Score + violations dashboard | WebSocket: hard/soft score, violations by type, improvement rate, elapsed time, score history. No live timetable. | ✓ |
| Full live timetable preview | All above PLUS live-updating timetable grid. Heavy on bandwidth and rendering. | |
| Minimal progress bar | Progress %, elapsed time, score. No violation breakdown. | |

**User's choice:** Score + violations dashboard
**Notes:** Rich enough to be useful, not so heavy as to require live timetable rendering.

### Early Stopping

| Option | Description | Selected |
|--------|-------------|----------|
| Time limit + manual stop | Default 5 min (configurable). Manual stop button. Auto-terminate on plateau (30s no improvement after hard score = 0). | ✓ |
| Target score + time limit | Admin sets target score. Stops when reached or time limit. Requires scoring knowledge. | |
| Unlimited until manual stop | No auto limit. Admin must remember to stop. | |

**User's choice:** Time limit + manual stop
**Notes:** Default 5 min, auto-terminate on plateau.

### Conflict Explanation (TIME-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped violation list | Violations grouped by type with entity references. Admin sees which constraints to relax. | ✓ |
| Constraint conflict graph | Visual graph of mutually exclusive constraints. Complex to render. | |
| Relaxation suggestions | System suggests specific fixes. Most actionable but requires analysis logic. | |

**User's choice:** Grouped violation list
**Notes:** Links to involved entities so admin can identify what to change.

### Solve History

| Option | Description | Selected |
|--------|-------------|----------|
| Keep last 3 runs | Store best result from last 3 solve runs. Compare and pick. Old auto-deleted. | ✓ |
| Keep all runs | Every result stored permanently. Full history but storage grows. | |
| Keep only active | Only active timetable stored. No rollback. | |

**User's choice:** Keep last 3 runs
**Notes:** Useful for iterating on constraint tweaks.

---

## Room Constraints

### Room Model (ROOM-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Type + capacity + equipment | Room type, capacity, equipment tags. Subjects require types/equipment. | ✓ |
| Simple room types only | Type and capacity only. No equipment. Can't distinguish labs. | |
| Freeform tags | Arbitrary admin-defined tags. Maximum flexibility, no structure. | |

**User's choice:** Type + capacity + equipment
**Notes:** Room types: Klassenzimmer, Turnsaal, EDV-Raum, Werkraum, Labor, Musikraum.

### Home Room

| Option | Description | Selected |
|--------|-------------|----------|
| Soft preference | Class optionally assigned home room. Solver prefers it (soft). | ✓ |
| Hard assignment | Class always in home room unless Fachraum needed. | |
| No home room concept | Pure availability-based assignment. | |

**User's choice:** Soft preference
**Notes:** Matches Austrian school practice. Reduces hallway traffic.

### Subject-Room Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Subject-to-room-type mapping | Subjects declare required room type (hard constraint). Regular subjects in any Klassenzimmer. | ✓ |
| Subject-to-specific-room | Subjects map to specific rooms. More rigid. | |
| You decide | Claude picks best approach. | |

**User's choice:** Subject-to-room-type mapping
**Notes:** Hard constraint. Turnen -> Turnsaal, Informatik -> EDV-Raum.

### Room Change Minimization

| Option | Description | Selected |
|--------|-------------|----------|
| Soft constraint to minimize | Penalize each room change. Keep classes in same room for consecutive lessons. | �� |
| No room change optimization | Pure availability assignment. May cause frequent moves. | |
| You decide | Claude picks based on best practices. | |

**User's choice:** Soft constraint to minimize
**Notes:** Especially important for younger students (VS/MS).

---

## Claude's Discretion

- Timefold Constraint Streams API implementation details
- JVM sidecar framework choice (Spring Boot vs Quarkus)
- Timetable data model (Prisma schema design)
- WebSocket message format and Socket.IO design
- BullMQ job design for solve orchestration
- REST API contract between NestJS and sidecar
- Solver configuration and tuning parameters
- Room CRUD API structure
- Constraint template data model

## Deferred Ideas

None -- discussion stayed within phase scope.
