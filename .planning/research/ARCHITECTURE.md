# Architecture Patterns

**Domain:** Open-source school management platform (Untis alternative)
**Researched:** 2026-03-29

---

## Recommended Architecture

**Modular monolith deployed as a single unit, with the timetabling solver running as an isolated sidecar service.** Internal modules communicate via an in-process event bus for loose coupling. All functionality is exposed through a unified API gateway. The plugin/connector system uses a registry + hooks pattern for third-party extensibility.

This is NOT a microservices architecture. It is a modular monolith that can evolve toward service extraction later if scaling demands it. The sole exception is the timetabling engine, which runs as a separate process due to its fundamentally different runtime characteristics (CPU-bound, long-running, JVM-based).

```
+------------------------------------------------------------------+
|                        API Gateway (REST/GraphQL)                 |
|              Authentication + RBAC + Rate Limiting                |
+------------------------------------------------------------------+
       |            |            |            |            |
+----------+ +----------+ +----------+ +----------+ +----------+
| Timetable| | ClassBook| | Communi- | |  Admin   | |  Plugin  |
|  Module   | |  Module  | | cation   | |  Module  | |  Manager |
|          | |          | |  Module  | |          | |          |
+----------+ +----------+ +----------+ +----------+ +----------+
       |            |            |            |            |
+------------------------------------------------------------------+
|                    Internal Event Bus                             |
|         (in-process pub/sub for cross-module events)             |
+------------------------------------------------------------------+
       |                                              |
+------------------+                      +-------------------+
| Shared Kernel    |                      | DSGVO/Audit Layer |
| (entities, auth, |                      | (logging, consent,|
|  base types)     |                      |  data lifecycle)  |
+------------------+                      +-------------------+
       |
+------------------------------------------------------------------+
|                       PostgreSQL                                  |
|            (schema-per-module isolation)                          |
+------------------------------------------------------------------+

                    -- separate process --

+------------------------------------------------------------------+
|              Timetable Solver Service (JVM/Timefold)              |
|      REST API | Async via SolverManager | Dedicated resources    |
+------------------------------------------------------------------+
```

### Why This Shape

1. **Modular monolith, not microservices** -- A school management system for single-tenant self-hosting must be operationally simple. One deployment unit (plus the solver) is far easier to host than 5+ services with message brokers. Modules with clear boundaries give us the same code quality without the operational tax.

2. **Solver as sidecar** -- Timetabling is CPU-intensive, long-running (minutes to hours), and best served by Timefold (JVM). The main app is TypeScript/Node. Running a JVM constraint solver inside a Node process is impractical. A separate container with a REST API solves this cleanly.

3. **Event bus, not direct calls** -- Modules publish domain events (e.g., "TeacherAbsenceRecorded") and other modules react. This prevents circular dependencies and lets features like substitution planning react to timetable changes without the timetable module knowing about substitutions.

4. **Schema-per-module in PostgreSQL** -- Each module owns its database schema. Modules NEVER directly query another module's tables. They request data via the module's internal API or react to events. This makes module boundaries enforceable, not just conventional.

---

## Component Boundaries

### 1. Core Platform (Shared Kernel)

**Responsibility:** Authentication, authorization (RBAC), user management, tenant configuration, base entity types, DSGVO audit infrastructure.

**Owns:**
- User accounts, roles, permissions
- School configuration (school types, academic year structure, periods)
- Base entities: Person, SchoolClass, Subject, Room, AcademicYear, Period
- Audit log infrastructure
- DSGVO consent and data lifecycle management

**Communicates with:** Every module (provides identity context and base entities)

**Key design decision:** The shared kernel is minimal. It provides identity, authorization, and foundational school data. Business logic lives in modules, not here.

| Entity | Owned By | Consumed By |
|--------|----------|-------------|
| User/Person | Core | All modules |
| SchoolClass | Core | Timetable, ClassBook, Communication |
| Subject | Core | Timetable, ClassBook |
| Room | Core | Timetable, Admin |
| AcademicYear/Period | Core | Timetable, ClassBook |
| Role/Permission | Core | API Gateway |

### 2. Timetable Module

**Responsibility:** Timetable CRUD, constraint definition, solver orchestration, substitution planning.

**Owns:**
- Lesson definitions (subject + teacher + class + preferred periods)
- Constraint rules (hard: no double-booking; soft: teacher preferences)
- Timetable versions (draft, published, archived)
- Substitution plans
- Teacher availability and absence records

**Communicates with:**
- Core (reads teachers, rooms, classes, subjects, periods)
- Solver Service (sends solving requests, receives solutions via REST)
- Event Bus (publishes: TimetablePublished, LessonChanged, SubstitutionCreated)
- ClassBook Module (ClassBook subscribes to timetable events to pre-populate lessons)

**Internal API surface:**
- `getTimetable(classId, weekId)` -- returns resolved schedule
- `getTeacherSchedule(teacherId, weekId)` -- returns teacher's lessons
- `requestSolve(timetableId, constraints)` -- triggers async solve
- `recordAbsence(teacherId, dateRange)` -- triggers substitution workflow
- `getSubstitutionSuggestions(lessonId)` -- returns ranked teacher options

### 3. Timetable Solver Service (Separate Process)

**Responsibility:** Pure constraint satisfaction. Takes problem definition, returns optimized schedule.

**Owns:**
- Solver configuration (algorithm parameters, termination criteria)
- Solving state (in-progress, best-solution-so-far, score)
- Nothing persistent -- stateless between requests

**Technology:** Timefold Solver on JVM (Java/Kotlin). Exposes REST API. Uses SolverManager for async solving with progress callbacks.

**Communicates with:**
- Timetable Module only (via REST API)
- No direct database access -- receives full problem as JSON, returns solution as JSON

**API surface:**
- `POST /solve` -- submit problem, returns job ID
- `GET /solve/{jobId}` -- poll status + best-solution-so-far
- `DELETE /solve/{jobId}` -- cancel solving
- `POST /solve/{jobId}/terminate` -- stop and return best solution found

**Why isolated:**
- CPU-intensive: a full school solve can run for 5-30 minutes
- JVM-based: Timefold runs on JVM, main app is Node/TypeScript
- Resource isolation: solver should not starve the main API of CPU
- Scaling: can run on a beefier container independently

### 4. ClassBook Module (Digitales Klassenbuch)

**Responsibility:** Daily lesson documentation, attendance tracking, grades, notes.

**Owns:**
- ClassBook entries (per lesson: topic, homework, notes)
- Attendance records (present, absent, late, excused)
- Grade records (per student per subject per assessment)
- Absence management (student absences with parent notification status)

**Communicates with:**
- Core (reads students, classes, subjects)
- Timetable Module (subscribes to TimetablePublished to generate daily lesson slots)
- Communication Module (triggers notifications for unexcused absences)
- Event Bus (publishes: AttendanceRecorded, GradeEntered, AbsenceReported)

**Internal API surface:**
- `getLessonsForDay(classId, date)` -- pre-filled from timetable
- `recordAttendance(lessonId, attendanceData)` -- teacher marks attendance
- `enterGrade(studentId, subjectId, gradeData)` -- record assessment
- `getStudentRecord(studentId, dateRange)` -- full history

### 5. Communication Module

**Responsibility:** In-app messaging, announcements, notifications, read receipts.

**Owns:**
- Messages (direct, group, broadcast)
- Conversations/threads
- Read receipts and delivery status
- Notification preferences per user
- Notification dispatch queue

**Communicates with:**
- Core (reads users, roles for recipient resolution)
- Plugin Manager (dispatches to external channels: email, push, SMS via connectors)
- Event Bus (subscribes to events from other modules for automated notifications, e.g., "absence recorded" triggers parent notification)

**Internal API surface:**
- `sendMessage(from, to, content, type)` -- direct or group message
- `broadcastAnnouncement(scope, content)` -- school-wide or class-wide
- `getConversations(userId)` -- message history
- `markAsRead(messageId, userId)` -- read receipt
- `getNotificationPreferences(userId)` -- delivery preferences

**Real-time:** WebSocket connection for live message delivery and read receipt updates.

### 6. Admin Module

**Responsibility:** School configuration, resource management, reporting, data import/export.

**Owns:**
- Room management (capacity, equipment, type)
- School year and period configuration
- Data import/export workflows (CSV, Untis format import)
- System-level reports and statistics
- DSGVO data export and deletion workflows

**Communicates with:**
- Core (manages school configuration entities)
- All modules (aggregates data for reports)
- Plugin Manager (import/export connectors)

### 7. Plugin Manager

**Responsibility:** Registry, lifecycle management, and hook system for external integrations.

**Owns:**
- Plugin registry (installed plugins, versions, status)
- Hook definitions and subscriptions
- Connector configurations (API keys, endpoints)
- Plugin sandboxing and permission scoping

**Communicates with:**
- All modules (provides hooks that plugins can subscribe to)
- External services (MS Teams, Google Calendar, Outlook, etc.)

**Architecture pattern:**

```
Plugin Manager
  |
  +-- Plugin Registry (what's installed, enabled, config)
  |
  +-- Hook System (named extension points)
  |     |
  |     +-- "timetable.published" -> [Google Calendar Sync, MS Teams Sync]
  |     +-- "absence.recorded" -> [Email Notifier, SMS Gateway]
  |     +-- "grade.entered" -> [Parent Portal Push]
  |
  +-- Connector SDK (interface plugins must implement)
        |
        +-- authenticate()
        +-- sync(event, data)
        +-- healthCheck()
```

Plugins implement a Connector interface and register for specific hooks. The Plugin Manager invokes registered connectors when hooks fire. Connectors run in a sandboxed context with scoped permissions (e.g., a calendar connector can read timetable data but not grades).

---

## Data Flow

### Primary Flow: Timetable Creation

```
1. Admin configures school data (rooms, periods, subjects)
                    |
                    v
2. Admin/Teachers define lessons (subject + teacher + class + constraints)
                    |
                    v
3. Timetable Module packages problem definition as JSON
                    |
                    v
4. Solver Service receives problem via REST POST /solve
                    |
                    v
5. Solver runs async (minutes). Progress available via GET /solve/{id}
                    |
                    v
6. Solution returned. Timetable Module stores as "draft" version
                    |
                    v
7. Admin reviews draft in UI, adjusts manually if needed
                    |
                    v
8. Admin publishes timetable -> Event "TimetablePublished" fires
                    |
                    v
9. ClassBook Module generates lesson slots for coming weeks
   Plugin Manager fires hooks (Google Calendar sync, etc.)
   Communication Module sends announcement to affected users
```

### Secondary Flow: Substitution Planning

```
1. Teacher reports absence (or admin enters it)
                    |
                    v
2. Timetable Module identifies affected lessons
                    |
                    v
3. Substitution engine ranks available teachers by:
   - Subject qualification
   - Free periods on that day
   - Current workload / substitution count
   - Familiarity with the class
                    |
                    v
4. Admin selects substitute from ranked suggestions
   (or system auto-assigns if configured)
                    |
                    v
5. Event "SubstitutionCreated" fires
                    |
                    v
6. ClassBook updates lesson assignment
   Communication notifies affected teachers, classes, parents
   Plugin hooks fire (update external calendars, etc.)
```

### Secondary Flow: Daily ClassBook Operation

```
1. Teacher opens ClassBook for current lesson
   (pre-populated from timetable: subject, class, room, time)
                    |
                    v
2. Teacher records attendance (marks present/absent/late)
                    |
                    v
3. Event "AttendanceRecorded" fires
                    |
                    v
4. If unexcused absence: Communication Module queues parent notification
   DSGVO Audit Layer logs the data access
                    |
                    v
5. Teacher enters lesson topic, homework, notes
                    |
                    v
6. Teacher enters grades for assessments
                    |
                    v
7. Event "GradeEntered" fires -> Plugin hooks (parent portal push)
```

### Cross-Cutting: DSGVO Audit Flow

```
Every data access/mutation across ALL modules:
                    |
                    v
Audit middleware intercepts request
                    |
                    v
Logs: WHO accessed WHAT data, WHEN, WHY (purpose), and the ACTION taken
                    |
                    v
Stored in append-only audit log (separate schema, tamper-evident)
                    |
                    v
Retention policy auto-purges expired audit records
Deletion requests trigger cascading data removal + audit record of deletion
```

---

## Monorepo Organization

```
schoolflow/
|
+-- apps/
|   +-- api/                    # Main backend API server (Node/TypeScript)
|   |   +-- src/
|   |   |   +-- modules/
|   |   |   |   +-- timetable/  # Timetable module
|   |   |   |   +-- classbook/  # ClassBook module
|   |   |   |   +-- comms/      # Communication module
|   |   |   |   +-- admin/      # Admin module
|   |   |   |   +-- plugins/    # Plugin manager
|   |   |   +-- core/           # Shared kernel (auth, RBAC, base entities)
|   |   |   +-- infra/          # Database, event bus, middleware
|   |   +-- package.json
|   |
|   +-- web/                    # Web frontend (SPA)
|   |   +-- src/
|   |   +-- package.json
|   |
|   +-- mobile/                 # Mobile app (React Native or similar)
|   |   +-- src/
|   |   +-- package.json
|   |
|   +-- solver/                 # Timetable solver (JVM/Timefold)
|       +-- src/
|       +-- build.gradle.kts    # or pom.xml -- this is a Java/Kotlin project
|       +-- Dockerfile
|
+-- packages/
|   +-- @schoolflow/types/      # Shared TypeScript types (API contracts)
|   +-- @schoolflow/api-client/ # Generated API client for frontends
|   +-- @schoolflow/ui/         # Shared UI component library
|   +-- @schoolflow/validators/ # Shared validation rules (zod schemas etc.)
|   +-- @schoolflow/config/     # Shared config (ESLint, TypeScript, etc.)
|   +-- @schoolflow/connector-sdk/ # SDK for building plugins/connectors
|
+-- docker/
|   +-- docker-compose.yml      # Full stack: api + solver + postgres + redis
|   +-- Dockerfile.api
|   +-- Dockerfile.solver
|   +-- Dockerfile.web
|
+-- docs/                       # Architecture decision records, API docs
|
+-- pnpm-workspace.yaml
+-- turbo.json
+-- package.json                # Root (private: true)
```

**Key decisions:**
- `apps/solver/` is a JVM project (Gradle/Maven), not a Node package. It participates in the monorepo for co-location but is built separately.
- `packages/` contains only TypeScript shared code. Each package has explicit `exports` in its `package.json`.
- Modules inside `apps/api/src/modules/` are NOT separate packages. They are internal modules within the API application, enforced by import rules (e.g., ESLint boundaries plugin), not package boundaries. This keeps the module structure lightweight while maintaining discipline.
- The solver has its own Dockerfile because it runs as a separate container.

---

## Patterns to Follow

### Pattern 1: Module Boundary Enforcement via Internal API

**What:** Each module exposes a typed service interface. Other modules import ONLY the interface, never internal implementations.

**When:** Always, for all cross-module communication within the API.

**Example:**
```typescript
// modules/timetable/timetable.service.ts (public API)
export interface TimetableService {
  getTimetable(classId: string, weekId: string): Promise<Timetable>;
  getTeacherSchedule(teacherId: string, weekId: string): Promise<Lesson[]>;
}

// modules/timetable/index.ts (barrel -- the ONLY export)
export type { TimetableService } from './timetable.service';
export { createTimetableModule } from './timetable.module';

// modules/classbook/classbook.handler.ts (consumer)
import type { TimetableService } from '../timetable';
// NEVER: import { lessonRepository } from '../timetable/internal/repositories';
```

### Pattern 2: Domain Events for Cross-Module Side Effects

**What:** Modules publish typed events. Other modules subscribe to events they care about. The event bus is in-process (no external broker needed for a modular monolith).

**When:** Whenever an action in one module should trigger behavior in another module, especially if the originating module should not know about the subscriber.

**Example:**
```typescript
// Shared event types (in @schoolflow/types or core/events)
interface TimetablePublishedEvent {
  type: 'timetable.published';
  payload: { timetableId: string; schoolYearId: string; effectiveDate: string };
}

interface AbsenceRecordedEvent {
  type: 'absence.recorded';
  payload: { teacherId: string; dates: string[]; lessonIds: string[] };
}

// Timetable module publishes
eventBus.publish({ type: 'timetable.published', payload: { ... } });

// ClassBook module subscribes
eventBus.subscribe('timetable.published', async (event) => {
  await classbookService.generateLessonSlots(event.payload);
});

// Plugin Manager subscribes
eventBus.subscribe('timetable.published', async (event) => {
  await pluginManager.fireHook('timetable.published', event.payload);
});
```

### Pattern 3: Schema-Per-Module Database Isolation

**What:** Each module owns a PostgreSQL schema. Cross-module data access goes through the module's service interface, never via direct SQL joins.

**When:** Always. This is the primary mechanism for enforcing module boundaries at the data layer.

**Example:**
```sql
-- Schema layout
CREATE SCHEMA core;       -- users, roles, school config
CREATE SCHEMA timetable;  -- lessons, constraints, schedules
CREATE SCHEMA classbook;  -- attendance, grades, entries
CREATE SCHEMA comms;      -- messages, conversations, receipts
CREATE SCHEMA admin;      -- reports, import logs
CREATE SCHEMA plugins;    -- registry, configs, hook subscriptions
CREATE SCHEMA audit;      -- append-only audit log (DSGVO)
```

### Pattern 4: Solver as Stateless REST Service

**What:** The Timefold solver runs in a separate JVM container. The timetable module sends the complete problem (teachers, rooms, lessons, constraints) as a JSON payload. The solver returns the optimized assignment. No shared database.

**When:** For all timetable solving operations.

**Why stateless:** The solver does not persist anything. If it crashes, the timetable module simply re-submits the problem. This makes the solver trivially replaceable and testable.

### Pattern 5: DSGVO Audit Middleware

**What:** An audit middleware wraps all data-access operations. Every read/write of personal data is logged with actor, timestamp, purpose, and action.

**When:** Every API request that touches personal data (student records, grades, attendance, contact information).

**Example:**
```typescript
// Middleware applied at API gateway level
async function auditMiddleware(ctx: Context, next: Next) {
  const auditEntry = {
    actor: ctx.user.id,
    role: ctx.user.role,
    action: ctx.method + ' ' + ctx.path,
    timestamp: new Date().toISOString(),
    purpose: ctx.headers['x-processing-purpose'] || 'operational',
    dataCategories: detectDataCategories(ctx.path),
  };

  await next();

  auditEntry.statusCode = ctx.status;
  await auditLog.append(auditEntry); // append-only, separate schema
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Shared Database Tables Across Modules

**What:** Modules directly query each other's tables, or share tables for "convenience."

**Why bad:** Creates invisible coupling. Changing a table in one module silently breaks another. Makes module extraction impossible. Schema migrations become a coordination nightmare.

**Instead:** Each module owns its schema. Cross-module data flows through service interfaces or events. Acceptable cost: some data duplication (e.g., ClassBook stores a denormalized copy of lesson info from Timetable).

### Anti-Pattern 2: Synchronous Solver Calls

**What:** The API handler calls the solver and waits for a response before returning to the client.

**Why bad:** Timetable solving takes 5-30 minutes. HTTP connections will timeout. The API thread is blocked. Users get no feedback.

**Instead:** Submit solving as an async job. Return a job ID immediately. Client polls for status or subscribes to WebSocket updates showing progress and score improvement.

### Anti-Pattern 3: God Module (Everything in Core)

**What:** Putting business logic in the shared kernel "because it needs data from multiple modules."

**Why bad:** Core becomes a dumping ground. Modules lose cohesion. Every change touches core, which touches everything.

**Instead:** Core provides identity, authorization, and base entities only. Business logic that spans modules uses the event bus or a dedicated orchestration flow.

### Anti-Pattern 4: Plugin System with Full Database Access

**What:** Giving plugins direct access to the application database or internal module APIs.

**Why bad:** A broken or malicious plugin can corrupt data, leak personal information, or violate DSGVO. Plugin updates can break with internal API changes.

**Instead:** Plugins interact through the hook system and a scoped read-only API. They receive event payloads, not raw database access. The connector SDK defines the contract explicitly.

### Anti-Pattern 5: Premature Microservice Extraction

**What:** Starting with separate deployable services for each module from day one.

**Why bad:** Massively increases operational complexity for self-hosted deployments. Schools don't have DevOps teams. Docker Compose with 8+ services, a message broker, service discovery -- this is hostile to the target audience.

**Instead:** Start as a modular monolith with strict boundaries. Extract services only when a clear scaling or technology need arises (the solver is the one justified exception from day one).

---

## Scalability Considerations

| Concern | Single School (100-500 users) | Large School Cluster (5K users) | Notes |
|---------|------|--------|------|
| API Load | Single Node.js instance | Horizontal scaling behind load balancer | Stateless API makes this trivial |
| Database | Single PostgreSQL instance | Read replicas for reporting queries | Schema-per-module enables targeted optimization |
| Solver | Dedicated container, 2-4 CPU cores | Larger container, 8+ cores, longer timeout | Solver is the bottleneck; scale vertically |
| Real-time (WebSocket) | Single instance with in-memory pub/sub | Redis pub/sub adapter for multi-instance | Only needed at multi-instance scale |
| File Storage | Local filesystem or single S3 bucket | S3 / MinIO for self-hosted | Attachments, exports, documents |
| Background Jobs | In-process job queue (BullMQ + Redis) | Same, with dedicated worker processes | Grade calculations, report generation, notifications |

For the v1 target (single school, self-hosted), a single API instance + solver container + PostgreSQL + Redis is sufficient. This runs comfortably on a 4-core, 8GB VPS.

---

## Technology Boundary Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API Server | Node.js + TypeScript | Fast, lightweight, excellent ecosystem for REST/GraphQL APIs |
| Solver | JVM (Kotlin) + Timefold | Timefold is the best open-source constraint solver; JVM is its native runtime |
| Database | PostgreSQL | Battle-tested, schema isolation, JSON support, excellent TypeScript drivers |
| Cache/Queue | Redis | Pub/sub for events, BullMQ for background jobs, session store |
| Real-time | WebSocket (via the API server) | Live messaging, solver progress, timetable updates |
| Monorepo | pnpm workspaces + Turborepo | Fast builds, dependency hoisting, task caching, proven at scale |

---

## Suggested Build Order (Dependencies Between Components)

The build order is dictated by dependency flow. Components higher in the list are depended upon by those below.

```
Phase 1: Foundation
  Core Platform (auth, RBAC, base entities, DB schemas)
  API Gateway shell (routing, middleware, auth enforcement)
  Monorepo scaffolding (pnpm, Turborepo, shared packages)

Phase 2: Timetable (the core differentiator)
  Timetable Module (CRUD: lessons, constraints, manual scheduling)
  Solver Service (Timefold container with REST API)
  Solver integration (async job submission + progress tracking)

Phase 3: ClassBook (the daily workhorse)
  ClassBook Module (depends on timetable for lesson slots)
  Attendance tracking
  Grade management

Phase 4: Communication
  Communication Module (messaging, announcements)
  WebSocket infrastructure for real-time delivery
  Notification dispatch (email/push -- basic channels first)

Phase 5: Plugin System + Integrations
  Plugin Manager (registry, hooks, connector SDK)
  First connectors: Google Calendar, MS Teams, iCal export
  Untis data import connector (migration path for existing schools)

Phase 6: Admin + Polish
  Reporting and statistics
  DSGVO data export/deletion workflows
  Substitution planning automation
  Mobile app
```

**Phase ordering rationale:**
- Core must come first because everything depends on it.
- Timetable before ClassBook because ClassBook needs timetable data to populate lesson slots. This is also the primary differentiator vs. competitors.
- Communication can be built in parallel with ClassBook but is placed after because messaging without something to message about (absences, grades) has limited value.
- Plugin system comes late because it needs stable internal APIs to hook into. Building hooks before the modules they extend is premature.
- Admin and reporting aggregate data from all modules, so they benefit from being built last.

---

## Sources

- [Timefold Solver Integration Docs](https://docs.timefold.ai/timefold-solver/latest/integration/integration) -- HIGH confidence, official documentation
- [Timefold School Timetabling Quickstart](https://docs.timefold.ai/timefold-solver/latest/quickstart/spring-boot/spring-boot-quickstart) -- HIGH confidence, official documentation
- [Turborepo Repository Structure Guide](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) -- HIGH confidence, official documentation
- [AlekSIS School Information System](https://aleksis.org/) -- MEDIUM confidence, verified project site
- [Modular Monolith with DDD (GitHub reference)](https://github.com/kgrzybek/modular-monolith-with-ddd) -- MEDIUM confidence, community reference architecture
- [University Timetable Database Schema](https://dev.to/pocharis/relational-database-design-to-store-university-timetables-and-record-of-students-attendance-3jg4) -- MEDIUM confidence, community pattern
- [Untis Substitution Planning](https://www.untis.at/en/products/untis-basic-software/substitution-planning-1) -- HIGH confidence, competitor reference
- [Plugin Architecture Pattern](https://intuit.github.io/hooks/wiki/plugin-architecture/) -- MEDIUM confidence, industry pattern
- [Event-Driven Communication in Modular Monolith](https://dev.to/er1cak/monoliths-that-scale-architecting-with-command-and-event-buses-2mp) -- MEDIUM confidence, pattern reference
- [RBAC in Educational Administration Systems](https://www.researchgate.net/publication/321583614_Role_-_based_Access_Control_in_Educational_Administration_System) -- MEDIUM confidence, academic reference
