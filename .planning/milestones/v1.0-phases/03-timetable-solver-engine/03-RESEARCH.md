# Phase 3: Timetable Solver Engine - Research

**Researched:** 2026-03-30
**Domain:** Constraint solver (Timefold/JVM), async job orchestration (BullMQ), real-time progress (Socket.IO), room management (Prisma/NestJS)
**Confidence:** HIGH

## Summary

Phase 3 is the highest-risk, highest-value component of SchoolFlow: an automatic timetable generator powered by Timefold Solver running as a JVM sidecar microservice. The NestJS backend orchestrates solve jobs via BullMQ, aggregates school data into a solver-compatible payload, sends it to the Timefold REST API, and streams progress updates to the admin via Socket.IO WebSocket.

The Timefold school timetabling quickstart provides a solid foundation (Lesson + Timeslot + Room domain model with ConstraintProvider), but the SchoolFlow requirements extend significantly beyond it: double periods, A/B weeks, room type constraints, equipment matching, home room preferences, configurable constraint weights, and grouped violation reporting. These extensions require custom domain modeling and approximately 15 constraint implementations.

**Primary recommendation:** Use Quarkus (not Spring Boot) for the Timefold sidecar due to 60%+ faster startup, 5x lower memory footprint in Docker, and Timefold's native Quarkus extension. Build the sidecar with a minimal REST API: POST /solve (async), GET /solve/{id}/status, DELETE /solve/{id} (terminate early). The NestJS backend owns all persistence; the sidecar is stateless.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Two-tier model: Hard + Soft only. Hard constraints must never be violated. Soft constraints are quality optimizations with weighted penalties. No medium tier.
- **D-02:** Hard constraints are physical only: teacher clash, room double-booking, teacher availability windows (BLOCKED_PERIOD, BLOCKED_DAY from Phase 2 AvailabilityRule), and student group clash. MAX_DAYS_PER_WEEK and Werteinheiten limits are soft constraints.
- **D-03:** Soft constraint weights ship with sensible researched defaults. Admin can tune individual constraint weights via API.
- **D-04:** Custom constraints via rule builder with templates. Admin picks from an extensible set of constraint templates.
- **D-05:** Per-subject double-period preference as soft constraint. ClassSubject gets a `preferDoublePeriod` flag.
- **D-06:** Default double-period preference for standard Austrian subjects: BSP, TEW/TXW, BE, lab hours, Informatik.
- **D-07:** Optional 2-week A/B cycle per school. Admin enables A/B mode in school settings. When enabled, some subjects alternate weekly.
- **D-08:** WebSocket progress dashboard via Socket.IO: current hard/soft score, remaining violations grouped by type, improvement rate, elapsed time, best-so-far score history chart data. No intermediate timetable preview.
- **D-09:** Time limit + manual stop. Default max solving time 5 minutes. Admin can click 'Stop'. Auto-terminate early if hard score reaches 0 and soft score stops improving for 30 seconds.
- **D-10:** Conflict explanation via grouped violation list with entity references.
- **D-11:** Keep last 3 solve runs per school. Admin can compare results and select which to activate. Old runs beyond 3 auto-deleted.
- **D-12:** Room model: type (Klassenzimmer, Turnsaal, EDV-Raum, Werkraum, Labor, Musikraum) + capacity + equipment tags. Subjects can require specific room types or equipment.
- **D-13:** Home room (Stammklasse-Raum) as soft preference.
- **D-14:** Subject-to-room-type mapping as hard constraint.
- **D-15:** Minimize room changes during the day as soft constraint.

### Claude's Discretion
- Timefold Constraint Streams API implementation details
- JVM sidecar framework choice (Spring Boot vs Quarkus)
- Timetable data model (Prisma schema for Lesson/TimetableSlot/SolveRun entities)
- WebSocket message format and Socket.IO room/namespace design for progress updates
- BullMQ job design for async solve orchestration
- REST API contract between NestJS and Timefold sidecar
- Solver configuration parameters and tuning
- Room CRUD API endpoint structure
- Constraint template data model and storage

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TIME-01 | System generiert automatisch Stundenplan unter Einhaltung von Hard Constraints | Timefold ConstraintProvider with forEachUniquePair for clash detection; HardSoftScore scoring |
| TIME-02 | System beruecksichtigt Soft Constraints (max. Stunden/Tag, keine Dopplung, bevorzugte Zeitfenster) | Timefold Constraint Streams groupBy + penalize with configurable weights via ConstraintWeightOverrides |
| TIME-03 | Admin kann individuelle Constraints definieren | ConstraintWeightOverrides API + constraint template system stored in PostgreSQL |
| TIME-04 | System unterstuetzt Doppelstunden und flexible Blocklangen | Double-period soft constraint via toConsecutiveSequences or forEachUniquePair with adjacent timeslot Joiner |
| TIME-05 | System unterstuetzt A/B-Wochen | Extended Timeslot model with weekType (A/B/BOTH) field; solver generates 2-week plan when enabled |
| TIME-06 | System zeigt Solving-Fortschritt in Echtzeit an | SolverManager.solveBuilder() with bestSolutionEventConsumer -> HTTP callback to NestJS -> Socket.IO broadcast |
| TIME-07 | System erklaert bei unlosbaren Stundenplaenen, welche Constraints in Konflikt stehen | SolutionManager.analyze() returns ScoreAnalysis with per-constraint breakdown + SolutionManager.explain() for indictments |
| ROOM-01 | Admin kann Raumkatalog pflegen (Typ, Kapazitaet, Ausstattung) | New Room Prisma model + NestJS CRUD module following established pattern |
| ROOM-02 | System verhindert Doppelbelegung von Raeumen (Hard Constraint) | Timefold roomConflict constraint: forEachUniquePair(Lesson, equal(timeslot), equal(room)).penalize(ONE_HARD) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Timefold 1.32.0** pinned exact -- solver behavior changes can break timetable quality
- **Java 21 LTS** for the constraint solver runtime (virtual threads)
- **NestJS 11** as API framework with DI, guards, interceptors
- **Prisma 7** for ORM with @@map() snake_case convention, UUID PKs
- **BullMQ 5** for async job queues backed by Redis
- **Socket.IO 4** via @nestjs/websockets for real-time communication
- **PostgreSQL 17** primary database
- **Redis 7** for cache, sessions, queues
- **Docker Compose** for local dev and deployment
- **API-First** -- all functionality via API
- **DSGVO** compliance from day 1
- **Global APP_GUARD** with @Public() opt-out -- all new endpoints protected by default
- **AuditInterceptor** as global APP_INTERCEPTOR for mutation logging
- **DTO definite assignment assertions (!)** for TypeScript 6.0 strict mode

## Standard Stack

### Core (JVM Sidecar)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Timefold Solver | 1.32.0 | Constraint solving engine | Locked in CLAUDE.md. Purpose-built for timetabling. Constraint Streams API. Apache 2.0. |
| Quarkus | 3.17 LTS | JVM microservice framework | Faster startup (< 2s vs 8s Spring Boot), 60% less memory in Docker, native Timefold extension, container-native design |
| Java 21 LTS | 21 | Runtime | Locked in CLAUDE.md. Virtual threads. Required by Timefold. |

### Core (NestJS Backend)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/websockets | ^11 | WebSocket gateway | NestJS-native Socket.IO integration with decorators |
| @nestjs/platform-socket.io | ^11 | Socket.IO adapter | Rooms, namespaces, fallback to long-polling for school networks |
| socket.io | 4.x | WebSocket engine | Locked in CLAUDE.md. Auto-fallback, rooms, broadcasting |
| @nestjs/bullmq | ^11.0.4 | Job queue integration | Already in project. Extend for solver queue. |
| bullmq | ^5.71.1 | Async job processing | Already in project. Redis-backed. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @socket.io/redis-adapter | ^8 | Multi-instance Socket.IO | Only if horizontal scaling needed (not v1) |
| timefold-solver-quarkus-jackson | 1.32.0 | JSON serialization for solver | Serialize/deserialize solution JSON |

**Installation (NestJS side):**
```bash
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**Quarkus sidecar (Maven):**
```xml
<dependency>
  <groupId>ai.timefold.solver</groupId>
  <artifactId>timefold-solver-quarkus</artifactId>
</dependency>
<dependency>
  <groupId>ai.timefold.solver</groupId>
  <artifactId>timefold-solver-quarkus-jackson</artifactId>
</dependency>
<dependency>
  <groupId>io.quarkus</groupId>
  <artifactId>quarkus-rest</artifactId>
</dependency>
<dependency>
  <groupId>io.quarkus</groupId>
  <artifactId>quarkus-rest-jackson</artifactId>
</dependency>
```

**BOM for version management:**
```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>ai.timefold.solver</groupId>
      <artifactId>timefold-solver-bom</artifactId>
      <version>1.32.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

## Architecture Patterns

### Recommended Project Structure

```
apps/
  api/                              # NestJS backend (existing)
    src/
      modules/
        room/                       # NEW: Room CRUD module
          room.module.ts
          room.controller.ts
          room.service.ts
          dto/
            create-room.dto.ts
            update-room.dto.ts
            room-response.dto.ts
        timetable/                  # NEW: Timetable orchestration module
          timetable.module.ts
          timetable.controller.ts   # REST endpoints for solve operations
          timetable.service.ts      # Orchestrates solver calls
          timetable.gateway.ts      # Socket.IO gateway for progress
          solver-input.service.ts   # Aggregates DB data into solver payload
          solver-client.service.ts  # HTTP client to Timefold sidecar
          processors/
            solve.processor.ts      # BullMQ processor for async solve jobs
          dto/
            start-solve.dto.ts
            solve-progress.dto.ts
            solve-result.dto.ts
            constraint-template.dto.ts
          entities/                  # TypeScript types mirroring solver domain
            solver-lesson.ts
            solver-timeslot.ts
            solver-room.ts
            solver-timetable.ts
      config/
        queue/
          queue.constants.ts        # Add SOLVER_QUEUE constant
          queue.module.ts           # Register solver queue
    prisma/
      schema.prisma                 # Add Room, TimetableRun, Lesson, ConstraintTemplate models

  solver/                           # NEW: Timefold Quarkus sidecar
    src/main/java/at/schoolflow/solver/
      domain/
        Lesson.java                 # @PlanningEntity
        SolverTimeslot.java         # Problem fact
        SolverRoom.java             # Problem fact
        SchoolTimetable.java        # @PlanningSolution
      constraints/
        TimetableConstraintProvider.java  # All constraints
      rest/
        SolverResource.java         # REST API (POST /solve, GET /status, DELETE /terminate)
      dto/
        SolveRequest.java           # Input from NestJS
        SolveProgress.java          # Progress callback payload
        SolveResult.java            # Final result
    src/main/resources/
      application.properties        # Solver config
    Dockerfile                      # Java 21 + Quarkus
    pom.xml

docker/
  docker-compose.yml                # Add solver service
```

### Pattern 1: Stateless Sidecar with Callback

**What:** The Timefold sidecar is stateless -- it receives a complete problem description via REST, solves it, and pushes progress updates back to NestJS via HTTP callbacks. NestJS owns all persistence.

**When to use:** Always for this architecture. The sidecar never touches PostgreSQL.

**Data flow:**
```
Admin clicks "Generate" -> NestJS API
  -> BullMQ enqueues solve job
  -> SolveProcessor picks up job
  -> SolverInputService aggregates data from Prisma:
     - Teachers + AvailabilityRules + Reductions
     - SchoolClasses + Groups + Students
     - Subjects + ClassSubjects + TeacherSubjects
     - TimeGrid + Periods + SchoolDays
     - Rooms (new)
     - ConstraintWeightOverrides (from admin settings)
  -> SolverClientService POSTs payload to sidecar /solve
  -> Sidecar solves with SolverManager.solveBuilder()
     - bestSolutionEventConsumer calls back NestJS /api/internal/solver/progress/{runId}
  -> NestJS receives progress, stores in TimetableRun, broadcasts via Socket.IO
  -> On completion, sidecar POSTs final result to /api/internal/solver/complete/{runId}
  -> NestJS stores Lesson entities in PostgreSQL, notifies admin
```

### Pattern 2: Timefold Domain Model Extension

**What:** Extend the basic Timefold school timetabling model to support SchoolFlow's requirements.

**Standard Timefold quickstart model:**
```java
@PlanningEntity
public class Lesson {
    @PlanningId private String id;
    private String subject;
    private String teacher;
    private String studentGroup;
    @PlanningVariable private Timeslot timeslot;
    @PlanningVariable private Room room;
}
```

**Extended SchoolFlow model:**
```java
@PlanningEntity
public class Lesson {
    @PlanningId
    private String id;

    // Identifiers (from ClassSubject + TeacherSubject)
    private String subjectId;
    private String subjectName;
    private String teacherId;
    private String teacherName;
    private String classId;       // SchoolClass or Group ID
    private String className;
    private String groupId;       // null if whole-class lesson
    private int studentCount;

    // Scheduling metadata
    private boolean preferDoublePeriod;  // D-05
    private String requiredRoomType;     // D-14: "Turnsaal", "EDV-Raum", etc.
    private List<String> requiredEquipment; // D-12
    private String homeRoomId;           // D-13: preferred room for this class
    private String weekType;             // D-07: "A", "B", or "BOTH"

    // Planning variables (solver assigns these)
    @PlanningVariable
    private SolverTimeslot timeslot;

    @PlanningVariable
    private SolverRoom room;
}
```

**Extended SolverTimeslot (problem fact):**
```java
public class SolverTimeslot {
    private String id;
    private String dayOfWeek;        // MONDAY..FRIDAY
    private int periodNumber;        // 1..N from TimeGrid
    private String startTime;        // "08:00"
    private String endTime;          // "08:50"
    private String weekType;         // "A", "B", or "BOTH" (for A/B week support)
    private boolean isBreak;
    // Convenience: adjacent timeslot reference for double-period detection
    private String nextTimeslotId;
}
```

**Extended SolverRoom (problem fact):**
```java
public class SolverRoom {
    private String id;
    private String name;
    private String roomType;         // "Klassenzimmer", "Turnsaal", etc.
    private int capacity;
    private List<String> equipment;  // "Beamer", "Smartboard", "PCs"
}
```

### Pattern 3: Constraint Weight Configuration via ConstraintWeightOverrides

**What:** Timefold's `ConstraintWeightOverrides` allows runtime adjustment of soft constraint weights without recompiling the solver.

**Example:**
```java
@PlanningSolution
public class SchoolTimetable {
    @PlanningEntityCollectionProperty
    private List<Lesson> lessons;

    @ProblemFactCollectionProperty
    @ValueRangeProvider
    private List<SolverTimeslot> timeslots;

    @ProblemFactCollectionProperty
    @ValueRangeProvider
    private List<SolverRoom> rooms;

    // Runtime weight overrides from admin settings
    private ConstraintWeightOverrides<HardSoftScore> constraintWeightOverrides;

    @PlanningScore
    private HardSoftScore score;
}
```

**NestJS sends constraint weights in the solve request:**
```typescript
// solver-input.service.ts
const constraintWeightOverrides = {
  "No same subject doubling": HardSoftScore.ofSoft(adminSettings.sameSubjectDoublingWeight ?? 10),
  "Balanced weekly distribution": HardSoftScore.ofSoft(adminSettings.balancedDistributionWeight ?? 5),
  "Prefer double periods": HardSoftScore.ofSoft(adminSettings.doublePeriodWeight ?? 8),
  "Minimize room changes": HardSoftScore.ofSoft(adminSettings.roomChangeWeight ?? 3),
  "Home room preference": HardSoftScore.ofSoft(adminSettings.homeRoomWeight ?? 2),
};
```

### Pattern 4: A/B Week Modeling

**What:** For A/B weeks (D-07), duplicate the timeslot set with week designators. The solver treats it as a 2-week problem.

**When A/B mode is disabled (default):** All timeslots have weekType = "BOTH". Single-week plan.

**When A/B mode is enabled:** Timeslots are duplicated:
- Week A: Monday P1 (A), Monday P2 (A), ...
- Week B: Monday P1 (B), Monday P2 (B), ...
- Lessons that run every week have weekType = "BOTH" and get assigned to timeslots from either week (constrained to appear in both).
- Alternating lessons have weekType = "A" or "B" and only get assigned to matching week timeslots.

**Hard constraint:** A lesson with weekType "BOTH" must be assigned to the same timeslot in both weeks (effectively pinned to a slot that exists in both weeks). Alternating lessons are free.

### Pattern 5: Socket.IO Progress Gateway

**What:** NestJS WebSocket gateway for broadcasting solve progress to admin clients.

```typescript
@WebSocketGateway({ namespace: 'solver' })
export class TimetableGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Client joins a room for their school
    const schoolId = client.handshake.query.schoolId as string;
    client.join(`school:${schoolId}`);
  }

  broadcastProgress(schoolId: string, progress: SolveProgressDto) {
    this.server.to(`school:${schoolId}`).emit('solve:progress', progress);
  }

  broadcastComplete(schoolId: string, result: SolveResultDto) {
    this.server.to(`school:${schoolId}`).emit('solve:complete', result);
  }
}
```

**Progress message format (D-08):**
```typescript
interface SolveProgressDto {
  runId: string;
  hardScore: number;         // 0 = no violations, negative = violations remain
  softScore: number;         // higher is better
  elapsedSeconds: number;
  remainingViolations: {
    type: string;            // "Teacher clash", "Room double-booking", etc.
    count: number;
    examples: string[];      // "Mueller: Mon P3", "Room 101: Fri P5-P6"
  }[];
  improvementRate: 'improving' | 'plateauing' | 'stagnant';
  scoreHistory: { timestamp: number; hard: number; soft: number }[];
}
```

### Anti-Patterns to Avoid

- **Embedding Timefold in Node.js:** Timefold is Java-only. Do not try GraalVM polyglot or Java-to-JS bridges. Use a clean REST sidecar.
- **Storing solver state in the sidecar:** The sidecar must be stateless and disposable. All persistence lives in PostgreSQL via NestJS.
- **Synchronous solving via REST:** Solver runs 30s-5min. Never block an HTTP request. Always use BullMQ + async callback.
- **Polling for progress:** Do not poll the sidecar from NestJS. Use the callback pattern (sidecar pushes progress to NestJS).
- **Building a custom solver:** Timefold solves the timetabling problem out of the box. Do not hand-roll genetic algorithms or simulated annealing.
- **Sharing the Prisma schema with the sidecar:** The sidecar has its own Java domain model. NestJS translates between Prisma entities and solver DTOs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Constraint solving | Custom GA/SA/backtracking | Timefold Solver 1.32.0 | 6-12 months of algorithm R&D vs days with Timefold. Incremental scoring (O(n) vs O(n^2)). |
| Score explanation | Custom violation tracking | SolutionManager.analyze() + ScoreAnalysis | Built-in per-constraint breakdown with match counts and indictments |
| Constraint weight tuning | Custom config system | ConstraintWeightOverrides | Timefold-native. No recompilation. JSON-serializable. |
| Load balancing/fairness | Custom distribution algorithm | ConstraintCollectors.loadBalance() | Timefold-native fairness metric with mathematical unfairness score |
| Consecutive period detection | Custom adjacency logic | ConstraintCollectors.toConsecutiveSequences() | Built-in sequence detection for time-ordered problem facts |
| WebSocket rooms/broadcasting | Custom connection tracking | Socket.IO rooms via @nestjs/websockets | Automatic room management, reconnection, long-polling fallback |
| Async job orchestration | Custom Redis pub/sub | BullMQ via @nestjs/bullmq | Already in project. Job persistence, retry, progress tracking. |

**Key insight:** Timefold's Constraint Streams API is remarkably expressive. Nearly all constraints (clash detection, consecutive periods, balanced distribution, room type matching) can be expressed in 5-15 lines of declarative Java code. The temptation to "simplify" by building a custom scheduler always leads to months of work with inferior results.

## Common Pitfalls

### Pitfall 1: Solver Search Space Explosion with A/B Weeks
**What goes wrong:** Doubling timeslots for A/B weeks doubles the search space, causing solve times to balloon from minutes to hours.
**Why it happens:** Timefold explores combinations of lessons x timeslots x rooms. Doubling timeslots quadruples the search space.
**How to avoid:** For A/B weeks, only create A/B variants for timeslots that actually have alternating lessons. Lessons with weekType "BOTH" should only see the Week A timeslots (with a constraint ensuring Week B mirrors Week A for those lessons). This keeps the effective search space manageable.
**Warning signs:** Solve time exceeds 10 minutes for a medium school (20 classes, 50 teachers).

### Pitfall 2: Forgetting @PlanningId on Entities
**What goes wrong:** Multi-threaded solving and score analysis produce wrong results or throw exceptions.
**Why it happens:** Timefold uses @PlanningId for identity during solution cloning and constraint matching. Without it, object identity (==) is used, which breaks across clones.
**How to avoid:** Every @PlanningEntity and problem fact class used in scoring must have @PlanningId with a proper equals()/hashCode() implementation.
**Warning signs:** Intermittent wrong scores in parallel solving, ClassCastException in constraint matches.

### Pitfall 3: Mutating Solutions from bestSolutionEventConsumer
**What goes wrong:** Concurrent modification exception or corrupted solver state.
**Why it happens:** The bestSolutionEventConsumer receives the solver's internal solution reference. Modifying it interferes with active solving.
**How to avoid:** Timefold docs explicitly warn: "Do not modify the solutions returned by the events." Serialize the solution to JSON immediately in the callback and send it to NestJS as an immutable payload.
**Warning signs:** Sporadic solver crashes, non-deterministic results.

### Pitfall 4: Blocking BullMQ Processor on Solve Completion
**What goes wrong:** BullMQ worker thread is blocked for the entire 5-minute solve duration, preventing other jobs from processing.
**Why it happens:** The solve processor calls the sidecar synchronously and waits for completion.
**How to avoid:** The BullMQ processor should: (1) POST the solve request to the sidecar, (2) store the sidecar job reference in the TimetableRun record, (3) return immediately. The sidecar notifies NestJS via HTTP callback when done. The BullMQ job is marked complete by the callback handler, not the processor.
**Warning signs:** DSGVO jobs and other queued work stalls during timetable generation.

### Pitfall 5: Not Penalizing Unassigned Planning Variables
**What goes wrong:** The solver leaves some lessons unassigned because it is easier to avoid violations by not scheduling them.
**Why it happens:** If you use `allowsUnassigned = true` on planning variables but forget to penalize unassigned state, the solver finds the trivial solution: assign nothing.
**How to avoid:** Do NOT use `allowsUnassigned = true`. All lessons must be assigned. If the problem is infeasible, hard constraint violations reveal the conflicts (D-10).
**Warning signs:** Solved timetable has fewer lessons than expected.

### Pitfall 6: Double-Period Constraint Incorrectly Matching Non-Adjacent Periods
**What goes wrong:** Solver pairs lessons on Monday P1 and Monday P5 as a "double period" because they share subject+class but are not consecutive.
**Why it happens:** The constraint only checks subject/class equality but not timeslot adjacency.
**How to avoid:** The double-period constraint must verify that the two timeslots are consecutive: same day, periodNumber differs by exactly 1, and no break between them. Use the `nextTimeslotId` field on SolverTimeslot for O(1) adjacency checks.
**Warning signs:** Solver reports high soft scores but the timetable has scattered same-subject pairs.

### Pitfall 7: Socket.IO Connection Blocked by School Proxy
**What goes wrong:** WebSocket upgrade fails, no progress updates reach the admin.
**Why it happens:** School networks commonly block WebSocket upgrades at the HTTP proxy level.
**How to avoid:** Socket.IO automatically falls back to HTTP long-polling. Ensure the NestJS server allows both transports. Do NOT disable long-polling transport.
**Warning signs:** Progress dashboard shows "connecting..." indefinitely in some school environments.

## Code Examples

### Timefold Constraint: Room Conflict (Hard, ROOM-02)
```java
// Source: Timefold school timetabling quickstart
Constraint roomConflict(ConstraintFactory constraintFactory) {
    return constraintFactory
        .forEachUniquePair(Lesson.class,
            Joiners.equal(Lesson::getTimeslot),
            Joiners.equal(Lesson::getRoom))
        .penalize(HardSoftScore.ONE_HARD)
        .asConstraint("Room conflict");
}
```

### Timefold Constraint: Teacher Clash (Hard, TIME-01)
```java
Constraint teacherConflict(ConstraintFactory constraintFactory) {
    return constraintFactory
        .forEachUniquePair(Lesson.class,
            Joiners.equal(Lesson::getTimeslot),
            Joiners.equal(Lesson::getTeacherId))
        .penalize(HardSoftScore.ONE_HARD)
        .asConstraint("Teacher conflict");
}
```

### Timefold Constraint: Room Type Requirement (Hard, D-14)
```java
Constraint roomTypeRequirement(ConstraintFactory constraintFactory) {
    return constraintFactory
        .forEach(Lesson.class)
        .filter(lesson -> lesson.getRequiredRoomType() != null)
        .filter(lesson -> !lesson.getRequiredRoomType()
            .equals(lesson.getRoom().getRoomType()))
        .penalize(HardSoftScore.ONE_HARD)
        .asConstraint("Room type requirement");
}
```

### Timefold Constraint: Prefer Double Periods (Soft, D-05)
```java
Constraint preferDoublePeriod(ConstraintFactory constraintFactory) {
    return constraintFactory
        .forEach(Lesson.class)
        .filter(Lesson::isPreferDoublePeriod)
        .ifNotExists(Lesson.class,
            Joiners.equal(Lesson::getSubjectId),
            Joiners.equal(Lesson::getClassId),
            Joiners.equal(lesson -> lesson.getTimeslot().getDayOfWeek()),
            Joiners.filtering((lesson1, lesson2) ->
                lesson1.getTimeslot().getNextTimeslotId() != null &&
                lesson1.getTimeslot().getNextTimeslotId()
                    .equals(lesson2.getTimeslot().getId())))
        .penalize(HardSoftScore.ONE_SOFT)
        .asConstraint("Prefer double periods");
}
```

### Timefold Constraint: No Same-Subject Doubling (Soft, TIME-02)
```java
Constraint noSameSubjectDoubling(ConstraintFactory constraintFactory) {
    return constraintFactory
        .forEachUniquePair(Lesson.class,
            Joiners.equal(Lesson::getClassId),
            Joiners.equal(Lesson::getSubjectId),
            Joiners.equal(lesson -> lesson.getTimeslot().getDayOfWeek()))
        // Two lessons of same subject on same day for same class (not double period)
        .filter((l1, l2) -> !areConsecutive(l1, l2))
        .penalize(HardSoftScore.ONE_SOFT)
        .asConstraint("No same subject doubling");
}
```

### Timefold Constraint: Balanced Weekly Distribution (Soft, TIME-02)
```java
Constraint balancedWeeklyDistribution(ConstraintFactory constraintFactory) {
    return constraintFactory
        .forEach(Lesson.class)
        .groupBy(Lesson::getClassId, Lesson::getSubjectId,
            ConstraintCollectors.loadBalance(
                lesson -> lesson.getTimeslot().getDayOfWeek()))
        .penalizeBigDecimal(HardSoftBigDecimalScore.ONE_SOFT,
            (classId, subjectId, balance) -> balance.unfairness())
        .asConstraint("Balanced weekly distribution");
}
```

### Score Analysis for Conflict Explanation (TIME-07)
```java
// In SolverResource.java -- called when solve completes or admin requests explanation
SolutionManager<SchoolTimetable, HardSoftScore> solutionManager =
    SolutionManager.create(solverFactory);
ScoreAnalysis<HardSoftScore> analysis = solutionManager.analyze(solution);

// Build grouped violation response
Map<String, ConstraintViolationGroup> groups = new HashMap<>();
analysis.constraintMap().forEach((ref, constraint) -> {
    if (constraint.score().hardScore() < 0) {
        groups.put(ref.constraintId(), new ConstraintViolationGroup(
            ref.constraintId(),
            constraint.matchCount(),
            constraint.score()
        ));
    }
});
```

### NestJS BullMQ Solve Processor
```typescript
// Source: Established pattern from dsgvo/processors/deletion.processor.ts
@Processor(SOLVER_QUEUE)
export class SolveProcessor extends WorkerHost {
  constructor(
    private solverInputService: SolverInputService,
    private solverClient: SolverClientService,
    private timetableService: TimetableService,
  ) {
    super();
  }

  async process(job: Job<{ schoolId: string; runId: string }>) {
    const { schoolId, runId } = job.data;
    // 1. Aggregate solver input from Prisma
    const solverPayload = await this.solverInputService.buildSolverInput(schoolId);
    // 2. Submit to sidecar (non-blocking, sidecar calls back)
    await this.solverClient.submitSolve(runId, solverPayload);
    // 3. Return immediately -- sidecar will callback on progress/completion
    return { submitted: true, runId };
  }
}
```

### NestJS Socket.IO Gateway for Progress
```typescript
@WebSocketGateway({ namespace: 'solver', cors: true })
export class TimetableGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const schoolId = client.handshake.query.schoolId as string;
    if (schoolId) {
      client.join(`school:${schoolId}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Socket.IO auto-removes from rooms on disconnect
  }

  emitProgress(schoolId: string, progress: SolveProgressDto) {
    this.server.to(`school:${schoolId}`).emit('solve:progress', progress);
  }

  emitComplete(schoolId: string, result: SolveResultDto) {
    this.server.to(`school:${schoolId}`).emit('solve:complete', result);
  }
}
```

### Prisma Schema Extensions (New Models)
```prisma
// Room (D-12, ROOM-01, ROOM-02)
enum RoomType {
  KLASSENZIMMER
  TURNSAAL
  EDV_RAUM
  WERKRAUM
  LABOR
  MUSIKRAUM
}

model Room {
  id         String   @id @default(uuid())
  schoolId   String   @map("school_id")
  school     School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name       String
  roomType   RoomType @map("room_type")
  capacity   Int
  equipment  String[] // ["Beamer", "Smartboard", "PCs"]
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  lessons    TimetableLesson[]

  @@unique([schoolId, name])
  @@map("rooms")
}

// TimetableRun (D-09, D-11)
enum SolveStatus {
  QUEUED
  SOLVING
  COMPLETED
  FAILED
  STOPPED
}

model TimetableRun {
  id               String      @id @default(uuid())
  schoolId         String      @map("school_id")
  school           School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  status           SolveStatus @default(QUEUED)
  hardScore        Int?        @map("hard_score")
  softScore        Int?        @map("soft_score")
  elapsedSeconds   Int?        @map("elapsed_seconds")
  constraintConfig Json?       @map("constraint_config") // weight overrides used
  violations       Json?       // grouped violation summary
  isActive         Boolean     @default(false) @map("is_active")
  maxSolveSeconds  Int         @default(300) @map("max_solve_seconds")
  abWeekEnabled    Boolean     @default(false) @map("ab_week_enabled")
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")

  lessons          TimetableLesson[]

  @@index([schoolId, createdAt])
  @@map("timetable_runs")
}

// TimetableLesson (solved assignment)
model TimetableLesson {
  id            String        @id @default(uuid())
  runId         String        @map("run_id")
  run           TimetableRun  @relation(fields: [runId], references: [id], onDelete: Cascade)
  classSubjectId String       @map("class_subject_id")
  teacherId     String        @map("teacher_id")
  roomId        String        @map("room_id")
  room          Room          @relation(fields: [roomId], references: [id])
  dayOfWeek     DayOfWeek     @map("day_of_week")
  periodNumber  Int           @map("period_number")
  weekType      String        @default("BOTH") @map("week_type") // "A", "B", "BOTH"

  @@unique([runId, roomId, dayOfWeek, periodNumber, weekType])
  @@unique([runId, teacherId, dayOfWeek, periodNumber, weekType])
  @@index([runId])
  @@map("timetable_lessons")
}

// ConstraintTemplate (D-04)
model ConstraintTemplate {
  id           String   @id @default(uuid())
  schoolId     String   @map("school_id")
  school       School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  templateType String   @map("template_type") // "BLOCK_TIMESLOT", "SUBJECT_MORNING", "NO_LESSONS_AFTER"
  params       Json     // { teacherId: "...", dayOfWeek: "FRIDAY", periods: [5,6] }
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("constraint_templates")
}
```

### ClassSubject Schema Extension (D-05)
```prisma
model ClassSubject {
  // ... existing fields ...
  preferDoublePeriod Boolean @default(false) @map("prefer_double_period") // D-05 NEW
}
```

### School Schema Extension (D-07)
```prisma
model School {
  // ... existing fields ...
  abWeekEnabled Boolean @default(false) @map("ab_week_enabled") // D-07 NEW
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OptaPlanner (Red Hat) | Timefold Solver (fork) | 2023 | Timefold is actively developed; OptaPlanner in maintenance mode |
| Drools DRL for constraints | Constraint Streams API | Timefold 1.0+ | Declarative Java API, no DRL files, IDE support, type safety |
| @ConstraintConfiguration + @ConstraintWeight | ConstraintWeightOverrides | Timefold 1.x | Simpler runtime weight adjustment without extra annotations |
| Spring Boot default for Java microservices | Quarkus for container-first workloads | 2023+ | 60% less memory, 5x faster startup in Docker, native Timefold extension |
| Timefold 1.31 (last feature release) | Timefold 1.32 (maintenance) | 2026-Q1 | 1.32.0 is bugfix-only; all new features target 2.0.0. Safe to pin. |
| EasyScoreCalculator | ConstraintProvider | Timefold 1.0+ | O(n) incremental vs O(n^2) full recalculation |

**Deprecated/outdated:**
- **Timefold 2.0.0 (beta):** Pre-release, API breaking changes. Do NOT use. 1.32.0 is the stable choice.
- **OptaPlanner:** Maintenance mode. Timefold is the successor with the same core team.
- **EasyScoreCalculator:** Only for prototyping. Always use ConstraintProvider in production.

## Complete Constraint Catalog

### Hard Constraints (D-02)
| # | Constraint | Timefold Pattern | Source |
|---|-----------|-----------------|--------|
| H1 | Teacher clash | forEachUniquePair(equal(timeslot), equal(teacherId)) | TIME-01 |
| H2 | Room double-booking | forEachUniquePair(equal(timeslot), equal(room)) | ROOM-02 |
| H3 | Student group clash | forEachUniquePair(equal(timeslot), equal(classId or groupId)) | TIME-01 |
| H4 | Teacher availability (BLOCKED_PERIOD) | forEach.filter(blocked).penalize(ONE_HARD) | TIME-03, D-02 |
| H5 | Teacher availability (BLOCKED_DAY) | forEach.filter(blockedDay).penalize(ONE_HARD) | TIME-03, D-02 |
| H6 | Room type requirement | forEach.filter(wrongRoomType).penalize(ONE_HARD) | D-14 |
| H7 | Room capacity exceeded | forEach.filter(tooManyStudents).penalize(ONE_HARD) | D-12 |
| H8 | Custom: Block timeslot for teacher | forEach.join(BlockedSlot).penalize(ONE_HARD) | D-04 |

### Soft Constraints (D-01, D-03)
| # | Constraint | Default Weight | Timefold Pattern | Source |
|---|-----------|---------------|-----------------|--------|
| S1 | No same-subject doubling | 10 | forEachUniquePair.filter(!consecutive) | TIME-02 |
| S2 | Balanced weekly distribution | 5 | groupBy.loadBalance(dayOfWeek) | TIME-02 |
| S3 | Prefer double periods | 8 | forEach.ifNotExists(consecutiveMatch) | D-05 |
| S4 | Max hours per day per class | 7 | groupBy(class, day, count).filter(>max) | TIME-02 |
| S5 | Minimize room changes | 3 | forEach.groupBy(class, day).penalize(distinctRooms-1) | D-15 |
| S6 | Home room preference | 2 | forEach.filter(notHomeRoom).penalize | D-13 |
| S7 | Teacher MAX_DAYS_PER_WEEK | 6 | groupBy(teacher, countDistinct(day)).filter(>max) | D-02 |
| S8 | Teacher Werteinheiten limit | 4 | groupBy(teacher, sum(hours)).filter(>limit) | D-02 |
| S9 | Custom: Subject in morning | 3 | forEach.filter(afternoon).penalize | D-04 |
| S10 | Custom: No lessons after period N | 3 | forEach.filter(period>N).penalize | D-04 |

## Sidecar REST API Contract

### POST /solve
**Input:** Complete SchoolTimetable JSON (lessons, timeslots, rooms, constraint weight overrides, callback URL)
**Response:** `202 Accepted` with `{ jobId: string }`

### GET /solve/{jobId}/status
**Response:** `{ status: "SOLVING" | "COMPLETED" | "NOT_FOUND", score: { hard: int, soft: int }, elapsedSeconds: int }`

### DELETE /solve/{jobId}
**Action:** Calls `solverManager.terminateEarly(jobId)`
**Response:** `204 No Content`

### Callback from sidecar to NestJS:
**POST /api/internal/solver/progress/{runId}** -- Progress update (score, violations)
**POST /api/internal/solver/complete/{runId}** -- Final result (full solution + violations)

These internal endpoints are protected by a shared secret (sidecar auth token), not Keycloak JWT.

## Open Questions

1. **Quarkus version pinning**
   - What we know: Quarkus 3.17 LTS is current. Timefold 1.32 supports it. Quarkus 3.33 LTS upgrade planned for Timefold 1.33.
   - What's unclear: Exact Quarkus 3.x LTS version compatible with Timefold 1.32.0 BOM.
   - Recommendation: Use `quarkus-bom` version from Timefold 1.32.0's own BOM to ensure compatibility. Verify with `mvn dependency:tree`.

2. **Solver warm-up time**
   - What we know: Timefold's construction heuristic typically finds an initial solution in seconds. Improvement phase is where quality gains happen.
   - What's unclear: Exact time to first feasible solution for a typical Austrian school (20-30 classes, 50-80 teachers, 15-20 rooms).
   - Recommendation: Profile with realistic test data early. The auto-terminate logic (D-09: stop if hard=0 and soft plateaus for 30s) needs real timing data.

3. **BigDecimal vs Long score for loadBalance**
   - What we know: Timefold's loadBalance collector returns BigDecimal unfairness. Mixing HardSoftScore (long-based) and HardSoftBigDecimalScore in one solver is not possible.
   - What's unclear: Whether to use HardSoftBigDecimalScore throughout or convert loadBalance to a long approximation.
   - Recommendation: Use HardSoftScore (long-based) for all constraints. For loadBalance fairness, multiply unfairness by 1000 and convert to long. Avoids BigDecimal overhead.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java 21 LTS | Timefold sidecar | X (local: Java 11 only) | 11.0.11 (wrong) | Docker: eclipse-temurin:21-jre-alpine. Sidecar runs in Docker, not locally. |
| Maven | Sidecar build | YES | 3.8.3 | Docker multi-stage build does not require local Maven |
| Docker | Sidecar container | YES | 29.2.0 | -- |
| Docker Compose | Orchestration | YES | 5.0.2 | -- |
| Node.js | NestJS backend | YES | 25.8.2 | -- |
| pnpm | Package manager | YES | 10.33.0 | -- |
| Redis | BullMQ, Socket.IO adapter | YES (via Docker) | 7-alpine | -- |
| PostgreSQL | Primary DB | YES (via Docker) | 17 | -- |

**Missing dependencies with no fallback:**
- None -- all dependencies are available via Docker.

**Missing dependencies with fallback:**
- Java 21 is not installed locally (only Java 11). The Timefold sidecar will build and run inside Docker using `eclipse-temurin:21-jre-alpine` base image. Local Java development is possible via Docker exec or by installing SDKMAN + Java 21.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (NestJS side) + JUnit 5 (Timefold side) |
| Config file | `apps/api/vitest.config.ts` (exists) + `apps/solver/pom.xml` (Wave 0) |
| Quick run command | `cd apps/api && pnpm test -- --run` |
| Full suite command | `cd apps/api && pnpm test -- --run && cd apps/solver && mvn test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TIME-01 | Hard constraints: no teacher/room/student clashes | unit (Timefold ConstraintVerifier) | `cd apps/solver && mvn test -Dtest=TimetableConstraintProviderTest#hardConstraints` | Wave 0 |
| TIME-02 | Soft constraints: distribution, no doubling, preferences | unit (ConstraintVerifier) | `cd apps/solver && mvn test -Dtest=TimetableConstraintProviderTest#softConstraints` | Wave 0 |
| TIME-03 | Custom constraint templates applied | unit | `cd apps/api && pnpm test -- --run -t "constraint template"` | Wave 0 |
| TIME-04 | Double periods scheduled correctly | unit (ConstraintVerifier) | `cd apps/solver && mvn test -Dtest=TimetableConstraintProviderTest#doublePeriod` | Wave 0 |
| TIME-05 | A/B week cycle generates 2-week plan | integration | `cd apps/api && pnpm test -- --run -t "A/B week"` | Wave 0 |
| TIME-06 | Real-time progress via WebSocket | integration | `cd apps/api && pnpm test -- --run -t "solve progress"` | Wave 0 |
| TIME-07 | Conflict explanation when infeasible | unit (ScoreAnalysis) | `cd apps/solver && mvn test -Dtest=ScoreExplanationTest` | Wave 0 |
| ROOM-01 | Room CRUD operations | unit | `cd apps/api && pnpm test -- --run -t "RoomService"` | Wave 0 |
| ROOM-02 | Room double-booking prevented | unit (ConstraintVerifier) | `cd apps/solver && mvn test -Dtest=TimetableConstraintProviderTest#roomConflict` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && pnpm test -- --run` (NestJS unit tests)
- **Per wave merge:** `cd apps/api && pnpm test -- --run && cd apps/solver && mvn test` (both stacks)
- **Phase gate:** Full suite green + manual verification of a solved timetable for test school data

### Wave 0 Gaps
- [ ] `apps/solver/` -- Entire Quarkus project scaffold (pom.xml, domain classes, constraints, tests)
- [ ] `apps/solver/src/test/java/.../TimetableConstraintProviderTest.java` -- ConstraintVerifier tests for all constraints
- [ ] `apps/solver/src/test/java/.../ScoreExplanationTest.java` -- Score analysis tests
- [ ] `apps/api/src/modules/room/room.service.spec.ts` -- Room CRUD tests
- [ ] `apps/api/src/modules/timetable/timetable.service.spec.ts` -- Solve orchestration tests
- [ ] `apps/api/src/modules/timetable/solver-input.service.spec.ts` -- Solver input aggregation tests
- [ ] `apps/api/src/modules/timetable/timetable.gateway.spec.ts` -- Socket.IO gateway tests
- [ ] `apps/api/src/modules/timetable/processors/solve.processor.spec.ts` -- BullMQ processor tests

## Sources

### Primary (HIGH confidence)
- [Timefold school timetabling constraints](https://docs.timefold.ai/timefold-solver/latest/quickstart/shared/school-timetabling/school-timetabling-constraints) -- ConstraintProvider implementation, hard/soft scoring
- [Timefold school timetabling model](https://docs.timefold.ai/timefold-solver/latest/quickstart/shared/school-timetabling/school-timetabling-model) -- Lesson, Timeslot, Room domain classes with annotations
- [Timefold Spring Boot quickstart](https://docs.timefold.ai/timefold-solver/latest/quickstart/spring-boot/spring-boot-quickstart) -- SolverManager usage, REST patterns, termination config
- [Timefold Quarkus quickstart](https://docs.timefold.ai/timefold-solver/latest/quickstart/quarkus/quarkus-quickstart) -- Quarkus-specific setup, dependencies, config
- [Timefold running the solver](https://docs.timefold.ai/timefold-solver/latest/using-timefold-solver/running-the-solver) -- SolverManager.solveBuilder(), bestSolutionEventConsumer, terminateEarly()
- [Timefold modeling planning problems](https://docs.timefold.ai/timefold-solver/latest/using-timefold-solver/modeling-planning-problems) -- @PlanningEntity, @PlanningVariable, @PlanningSolution, shadow variables
- [Timefold understanding the score](https://docs.timefold.ai/timefold-solver/latest/constraints-and-score/understanding-the-score) -- ScoreAnalysis, explain(), indictments, ConstraintMatchTotal
- [Timefold constraint configuration](https://docs.timefold.ai/timefold-solver/latest/constraints-and-score/constraint-configuration) -- ConstraintWeightOverrides for runtime weight adjustment
- [Timefold score calculation](https://docs.timefold.ai/timefold-solver/latest/constraints-and-score/score-calculation) -- Constraint Streams API (forEach, join, groupBy, collectors, penalize)
- [Timefold load balancing](https://docs.timefold.ai/timefold-solver/latest/constraints-and-score/load-balancing-and-fairness) -- loadBalance collector for fairness constraints
- [Timefold design patterns](https://docs.timefold.ai/timefold-solver/latest/design-patterns/design-patterns) -- Timeslot vs TimeGrain pattern
- [Timefold GitHub releases](https://github.com/timefoldai/timefold-solver/releases) -- Version 1.32.0 confirmation
- [NestJS WebSocket gateways](https://docs.nestjs.com/websockets/gateways) -- Socket.IO integration, rooms, namespaces

### Secondary (MEDIUM confidence)
- [Quarkus vs Spring Boot performance](https://simply-how.com/quarkus-vs-spring-boot-production-performance) -- Container performance benchmarks
- [NestJS Socket.IO integration patterns](https://deepwiki.com/nestjs/nest/6.1-socket.io-integration) -- Room management, broadcasting
- [Timefold Solver 2.0 Spring Boot 4 plans](https://github.com/TimefoldAI/timefold-solver/issues/1941) -- Future roadmap context

### Tertiary (LOW confidence)
- A/B week multi-week scheduling pattern: No direct Timefold documentation found. The approach of duplicating timeslots with week type designators is a custom modeling pattern derived from the Timeslot design pattern. Needs validation with realistic test data.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Timefold 1.32.0 confirmed on Maven Central, Quarkus integration documented, NestJS patterns established in codebase
- Architecture: HIGH -- Sidecar pattern is standard for JVM/Node.js hybrid, callback pattern proven at scale
- Constraint modeling: MEDIUM -- Basic constraints from official quickstart, extended constraints (double periods, A/B weeks, room types) are custom but follow established Constraint Streams patterns
- Pitfalls: HIGH -- Most pitfalls documented in official Timefold docs or derived from established patterns

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (Timefold 1.32.0 is a maintenance release; no API changes expected)
