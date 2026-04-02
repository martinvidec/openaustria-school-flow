# Phase 5: Digital Class Book - Research

**Researched:** 2026-04-02
**Domain:** Austrian Digital Klassenbuch -- attendance tracking, grade management, lesson documentation, absence excuses, file upload
**Confidence:** HIGH

## Summary

Phase 5 builds a digital class book (Klassenbuch) on top of the existing NestJS 11 + Prisma 7 backend and React 19 + Vite + TanStack Router frontend. The core domain is well-defined by Austrian school law (Schulunterrichtsgesetz): attendance per lesson, lesson content documentation, grade entry with Austrian 1-5 Notensystem, per-student notes, absence statistics, and parent excuse workflows.

The main technical challenges are: (1) designing the Prisma schema for 5+ new entities with proper relations to existing models (TimetableLesson, Student, Teacher, SchoolClass), (2) implementing file upload infrastructure on Fastify (no existing upload capability in the codebase), (3) building a responsive lesson-detail page with tabbed UI that mirrors the paper Klassenbuch, and (4) establishing the Klassenvorstand -> SchoolClass link that does not currently exist as a FK but is needed for excuse routing.

**Primary recommendation:** Structure as a single ClassBookModule on the backend with sub-services per concern (attendance, grades, notes, excuses, statistics). Use `@fastify/multipart` directly for file uploads (no wrapper library needed). Add a `klassenvorstandId` FK to SchoolClass. Frontend uses TanStack Router file-based route at `_authenticated/classbook/$lessonId` with a tabbed layout using existing shadcn Tabs component.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Quick-tap grid for attendance -- student list with tap-to-cycle status icons (present -> absent -> late -> excused). All students default to 'present', teacher only taps exceptions. "Alle anwesend" bulk button for the common case.
- **D-02:** Attendance is a tab on the lesson detail page alongside Inhalt (content), Noten (grades), and Notizen (notes). One page per Stunde, mirrors paper Klassenbuch layout.
- **D-03:** Teachers navigate to the class book by clicking a lesson cell in their timetable view. The timetable IS the entry point -- no separate /classbook route needed.
- **D-04:** Late arrivals (verspaetet) capture arrival time with minute entry. Important for Austrian Schulunterrichtsgesetz -- repeated lateness >15min counts as absence. Enables accurate statistics (e.g., "Gruber: 4x verspaetet, avg 14 min").
- **D-05:** Austrian 1-5 Notensystem with +/- modifiers (e.g., 2+ = 1.75, 2- = 2.25). Stored as decimal internally. Final semester grade is always a whole number 1-5.
- **D-06:** Three fixed grade categories: Schularbeit (written exam), Muendlich (oral), Mitarbeit (class participation). Admin sets default weights per school (e.g., SA 40%, M 30%, MA 30%). Teacher can override weights per subject.
- **D-07:** Student matrix view for grade overview -- spreadsheet-like grid with students as rows, grade entries as columns (chronological). Running weighted average at the end. Sortable by name or average. Filterable by category.
- **D-08:** Role-based grade visibility: Teacher sees full matrix for own classes. Schulleitung sees all classes read-only. Parents see only their child's grades with category breakdown and weighted average. Students see own grades only. Admin sees everything.
- **D-09:** Structured fields for lesson content: Thema (topic/title), Lehrstoff (content covered), Hausaufgabe (homework assigned). Matches the Austrian Klassenbuch format. Structured data enables search and reporting.
- **D-10:** Per-student notes visible to all teachers of that class + Schulleitung + Klassenvorstand. Private flag available for sensitive notes visible only to author + Schulleitung.
- **D-11:** Dedicated excuse form for parents -- 'Kind abwesend melden' button. Fields: child selector, date range (Von/Bis), reason category (krank, Arzttermin, familiaer, sonstig), optional free-text note, optional file upload (Arztbestaetigung).
- **D-12:** Klassenvorstand reviews excuses -- sees pending list, can accept or reject with optional note. Accepted excuses auto-update attendance records for all affected lessons to 'entschuldigt'. Matches Austrian school practice.
- **D-13:** Basic file upload supported in excuse form (PDF, JPG, PNG, max 5MB per file). Stored server-side with DSGVO retention (5 years, matching attendance data).

### Claude's Discretion
- Prisma schema design for new entities (ClassBookEntry, AttendanceRecord, GradeEntry, StudentNote, AbsenceExcuse)
- NestJS module structure (ClassBookModule or separate modules per concern)
- File upload implementation (local disk vs S3-compatible storage)
- Exact tab UI component implementation within lesson detail page
- Grade entry dialog/form design
- Absence statistics calculation and caching strategy
- Mobile-responsive breakpoints and touch target sizing (BOOK-07)
- WebSocket events for real-time attendance/grade updates (extends existing Socket.IO setup)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOOK-01 | Lehrer kann Anwesenheit pro Stunde erfassen (anwesend, abwesend, verspaetet, entschuldigt) | Schema: AttendanceRecord model with status enum; API: CRUD endpoints on classbook module; UI: Quick-tap grid (D-01) on Anwesenheit tab |
| BOOK-02 | Lehrer kann Unterrichtsinhalt pro Stunde dokumentieren | Schema: ClassBookEntry with thema/lehrstoff/hausaufgabe fields (D-09); API: upsert endpoint; UI: Inhalt tab with structured form |
| BOOK-03 | Lehrer kann Noten erfassen (muendlich, schriftlich, praktisch) mit konfigurierbarer Gewichtung | Schema: GradeEntry with category enum + decimal value + GradeWeight config (D-05, D-06); API: grade CRUD + weight config; UI: Noten tab with matrix (D-07) |
| BOOK-04 | Lehrer kann Notizen zu einzelnen Schuelern pro Stunde hinterlegen | Schema: StudentNote with isPrivate flag (D-10); API: CRUD with visibility filtering; UI: Notizen tab |
| BOOK-05 | System erstellt Abwesenheitsstatistiken pro Schueler, Klasse und Zeitraum | API: Statistics aggregation endpoint with date range filtering; derived from AttendanceRecord data; caching with staleTime on frontend |
| BOOK-06 | Eltern koennen digitale Entschuldigungen einreichen | Schema: AbsenceExcuse with status workflow + file attachment; API: excuse CRUD + file upload via @fastify/multipart; UI: parent excuse form + Klassenvorstand review list (D-11, D-12, D-13) |
| BOOK-07 | Klassenbuch funktioniert auf Desktop, Tablet und Smartphone gleichermassen | Responsive design patterns with Tailwind CSS; touch-friendly tap targets (min 44px); mobile-first attendance grid; tab navigation |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.x | API framework | Already in use. ClassBookModule follows established module pattern. |
| Prisma | 7.6.0 | ORM, schema, migrations | Schema-first new entities. `db push` for schema updates (established pattern). |
| React | 19.x | Frontend UI | Existing SPA. New route + components. |
| TanStack Router | 1.x | Routing | File-based route at `_authenticated/classbook/$lessonId.tsx`. |
| TanStack Query | 5.x | Server state | Query hooks for classbook data, attendance, grades, excuses. |
| shadcn/ui | Latest | Component library | Existing Tabs, Card, Badge, Dialog, Select components ready to use. |
| Tailwind CSS | 4.x | Styling | Utility-first responsive design. |
| Socket.IO | 4.x | Real-time | Extend existing `/timetable` namespace or add `/classbook` namespace. |
| date-fns | 4.1.0 | Date utilities | Already a dependency. Use for date range calculations, statistics. |
| class-validator | 0.15.1 | DTO validation | Already in use. Validate attendance, grade, excuse DTOs. |

### New Dependencies Required
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @fastify/multipart | 9.4.0 | File upload parsing | Required for excuse file upload (D-13). Fastify-native multipart parsing. No wrapper library needed -- direct registration on Fastify instance. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @fastify/multipart (direct) | @blazity/nest-file-fastify 1.0.0 | Adds Express-like decorators (@UploadedFile) but adds dependency. Direct @fastify/multipart is simpler for a single endpoint. |
| Local disk file storage | S3-compatible (MinIO) | S3 adds infrastructure complexity. Local disk is simpler for self-hosted single-school deployments. Can migrate later. |
| Separate modules per concern | Single ClassBookModule | Attendance, grades, notes, excuses are tightly coupled in the class book context. One module with multiple services is cleaner than 4 tiny modules. |

**Installation:**
```bash
pnpm add @fastify/multipart --filter @schoolflow/api
```

**Version verification:** @fastify/multipart 9.4.0 is current (verified 2026-04-02). Compatible with Fastify 5.8.2 (already in project).

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/modules/classbook/
  classbook.module.ts           # Single module, multiple providers
  classbook.controller.ts       # REST endpoints for lesson-level classbook ops
  attendance.service.ts         # Attendance CRUD + bulk operations
  attendance.controller.ts      # Attendance-specific endpoints
  grade.service.ts              # Grade CRUD + weight configuration
  grade.controller.ts           # Grade endpoints + matrix view
  student-note.service.ts       # Student note CRUD with visibility
  lesson-content.service.ts     # Lesson documentation (thema, lehrstoff, hausaufgabe)
  excuse.service.ts             # Excuse workflow (create, review, accept/reject)
  excuse.controller.ts          # Excuse endpoints + file upload
  statistics.service.ts         # Absence statistics aggregation
  statistics.controller.ts      # Statistics endpoints
  classbook-events.gateway.ts   # Socket.IO gateway for real-time updates
  dto/
    attendance.dto.ts
    grade.dto.ts
    grade-weight.dto.ts
    student-note.dto.ts
    lesson-content.dto.ts
    excuse.dto.ts
    statistics.dto.ts

apps/web/src/routes/_authenticated/
  classbook/
    $lessonId.tsx               # Lesson detail page with tabs
  excuses/
    index.tsx                   # Parent: excuse submission form / Teacher: excuse review list

apps/web/src/components/classbook/
  AttendanceGrid.tsx            # Quick-tap attendance grid (D-01)
  LessonContentForm.tsx         # Thema/Lehrstoff/Hausaufgabe form (D-09)
  GradeMatrix.tsx               # Spreadsheet-like grade matrix (D-07)
  GradeEntryDialog.tsx          # Dialog for adding/editing a grade
  StudentNoteList.tsx           # Per-student note list with private flag (D-10)
  ExcuseForm.tsx                # Parent excuse submission form (D-11)
  ExcuseReviewList.tsx          # Klassenvorstand excuse review (D-12)

apps/web/src/hooks/
  useClassbook.ts               # TanStack Query hooks for classbook data
  useGrades.ts                  # TanStack Query hooks for grades
  useExcuses.ts                 # TanStack Query hooks for excuses
```

### Pattern 1: Lesson Detail Page with Tabs (D-02)
**What:** Single route `classbook/$lessonId` renders a tabbed page with 4 tabs: Anwesenheit, Inhalt, Noten, Notizen. Each tab is a standalone component fetching its own data.
**When to use:** All classbook data entry flows.
**Example:**
```typescript
// apps/web/src/routes/_authenticated/classbook/$lessonId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceGrid } from '@/components/classbook/AttendanceGrid';
import { LessonContentForm } from '@/components/classbook/LessonContentForm';
import { GradeMatrix } from '@/components/classbook/GradeMatrix';
import { StudentNoteList } from '@/components/classbook/StudentNoteList';

export const Route = createFileRoute('/_authenticated/classbook/$lessonId')({
  component: ClassBookLessonPage,
});

function ClassBookLessonPage() {
  const { lessonId } = Route.useParams();
  // Fetch lesson context (subject, class, teacher, period info)
  // ...
  return (
    <Tabs defaultValue="anwesenheit">
      <TabsList>
        <TabsTrigger value="anwesenheit">Anwesenheit</TabsTrigger>
        <TabsTrigger value="inhalt">Inhalt</TabsTrigger>
        <TabsTrigger value="noten">Noten</TabsTrigger>
        <TabsTrigger value="notizen">Notizen</TabsTrigger>
      </TabsList>
      <TabsContent value="anwesenheit">
        <AttendanceGrid lessonId={lessonId} />
      </TabsContent>
      <TabsContent value="inhalt">
        <LessonContentForm lessonId={lessonId} />
      </TabsContent>
      <TabsContent value="noten">
        <GradeMatrix lessonId={lessonId} />
      </TabsContent>
      <TabsContent value="notizen">
        <StudentNoteList lessonId={lessonId} />
      </TabsContent>
    </Tabs>
  );
}
```

### Pattern 2: Timetable Cell Click -> Class Book Navigation (D-03)
**What:** TimetableCell already has an `onClick` prop. In the teacher's timetable view, clicking a lesson cell navigates to `/classbook/{lessonId}`. The timetable IS the entry point.
**When to use:** Teacher workflow only (not admin edit mode).
**Example:**
```typescript
// In timetable view, when user is a teacher and not in edit mode:
const navigate = useNavigate();
<TimetableGrid
  onCellClick={(lesson) => navigate({ to: '/classbook/$lessonId', params: { lessonId: lesson.id } })}
  // ...
/>
```

### Pattern 3: Quick-Tap Attendance Grid (D-01)
**What:** A grid of student rows with tap-to-cycle status icons. Default is "present" (green check). Tap cycles: present -> absent -> late -> excused -> present. "Alle anwesend" button sets all to present.
**When to use:** Attendance tab.
**Key implementation details:**
- Use optimistic updates with TanStack Query `useMutation` + `onMutate` for instant feedback.
- Batch save: debounce 2 seconds after last change, then POST bulk attendance array.
- Touch targets: minimum 44x44px for mobile (BOOK-07).
- Late arrival: tapping "late" expands an inline minute input (D-04).

### Pattern 4: Grade Decimal Encoding (D-05)
**What:** Austrian 1-5 scale with +/- modifiers stored as decimals. Teachers enter "2+" in the UI; backend stores 1.75.
**Encoding:**
```
1  = 1.00    1+ = 0.75    1- = 1.25
2  = 2.00    2+ = 1.75    2- = 2.25
3  = 3.00    3+ = 2.75    3- = 3.25
4  = 4.00    4+ = 3.75    4- = 4.25
5  = 5.00    5+ = 4.75    5- = 5.25
```
**Display:** Backend returns decimal, frontend formats back to "2+" notation.
**Validation:** Must be between 0.75 and 5.25. Only specific values are valid (not arbitrary decimals).

### Pattern 5: Excuse Workflow State Machine (D-12)
**What:** Parent submits excuse -> Klassenvorstand reviews -> accept/reject. Accepted excuses auto-update attendance.
**States:** PENDING -> ACCEPTED | REJECTED
**When accepted:** Service iterates all TimetableLesson records in the date range for the student's class and updates AttendanceRecord status to 'EXCUSED' where the student was marked ABSENT.

### Pattern 6: File Upload with @fastify/multipart (D-13)
**What:** Register multipart plugin on Fastify instance. Parse file in controller. Store to local uploads directory.
**Example:**
```typescript
// main.ts - register multipart
import multipart from '@fastify/multipart';
// In bootstrap():
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// excuse.controller.ts - handle upload
@Post(':excuseId/attachment')
async uploadAttachment(
  @Param('excuseId') excuseId: string,
  @Req() req: FastifyRequest,
) {
  const file = await req.file();
  if (!file) throw new BadRequestException('No file uploaded');
  // Validate mime type (PDF, JPG, PNG)
  // Stream to disk: uploads/{schoolId}/excuses/{excuseId}/{filename}
  // Store metadata in DB (ExcuseAttachment model)
}
```

### Pattern 7: Klassenvorstand Link (NEW -- not in existing schema)
**What:** SchoolClass needs a `klassenvorstandId` FK pointing to Teacher. Currently Klassenvorstand exists only as a TeachingReduction type (informational). The excuse workflow (D-12) requires resolving which teacher is the Klassenvorstand for a class.
**Schema change:**
```prisma
model SchoolClass {
  // ... existing fields ...
  klassenvorstandId String?  @map("klassenvorstand_id")
  klassenvorstand   Teacher? @relation("Klassenvorstand", fields: [klassenvorstandId], references: [id])
}

model Teacher {
  // ... existing fields ...
  klassenvorstandClasses SchoolClass[] @relation("Klassenvorstand")
}
```
**Critical for:** Excuse routing, private note visibility, class-level statistics.

### Anti-Patterns to Avoid
- **Separate route per tab:** Do NOT create `/classbook/{id}/attendance`, `/classbook/{id}/grades`, etc. The D-02 decision mandates a single page with tabs. Tab state should be URL search param at most, not a separate route.
- **Polling for attendance updates:** Use Socket.IO events, not polling. Teachers in the same class should see attendance changes in real-time (multiple teachers may be present for co-teaching).
- **Storing grades as integers:** D-05 requires decimal storage for +/- modifiers. `Float` in Prisma, `DECIMAL` or `DOUBLE PRECISION` in PostgreSQL. Using `Int` would lose the modifier information.
- **Global grade weights:** D-06 says admin sets defaults, teacher overrides per subject. Do NOT make weights global-only. GradeWeight must be scoped to school (default) + classSubject (override).
- **Fetching all students for grade matrix:** The grade matrix (D-07) should paginate or limit. For a class of 30 students with 50 grades each, the matrix has 1500 cells. Return the full dataset for the class but paginate by time range if needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload parsing | Custom multipart parser | @fastify/multipart 9.4.0 | Multipart boundary parsing, streaming, size limits, mime detection all handled. |
| Date range iteration | Custom date loop | date-fns `eachDayOfInterval` + `isWeekend` | Already in project. Handles DST, leap days, edge cases. |
| Weighted average calculation | Complex SQL | Prisma aggregation + TypeScript utility | Weighted avg is simple math. Keep in a pure function for testability (like werteinheiten.util.ts pattern from Phase 2). |
| File type validation | Regex on filename | Check magic bytes (file signature) | Extensions can be spoofed. Check first few bytes: PDF=%PDF, JPG=FFD8FF, PNG=89504E47. |
| CSV/PDF statistics export | Custom renderer | pdfkit (already installed) | pdfkit 0.18.0 is already a dependency. Use for absence statistics PDF export. |

**Key insight:** The classbook domain is data-entry-heavy CRUD with a few interesting patterns (excuse workflow state machine, weighted grade averages, attendance statistics aggregation). Resist the urge to over-engineer -- this is fundamentally forms and tables with role-based visibility.

## Common Pitfalls

### Pitfall 1: Lesson ID Instability
**What goes wrong:** TimetableLesson IDs change when the solver re-runs. If ClassBookEntry references a lessonId that gets deleted in a re-solve, all classbook data is orphaned.
**Why it happens:** TimetableRun creates new lesson records. The old run's lessons become stale.
**How to avoid:** ClassBookEntry should reference the *active* run's lesson. When a new solve occurs, classbook entries need migration or a stable lesson key. Use a composite key (classSubjectId + dayOfWeek + periodNumber + weekType) as the stable identifier, with a concrete lessonId as a convenience reference. Or, more practically: classbook entries store the composite key AND the lessonId, and a migration job re-links when the active run changes.
**Warning signs:** ClassBookEntry with lessonId FK that throws "record not found" after a timetable re-solve.

### Pitfall 2: Excuse Date Range vs Timetable Periods
**What goes wrong:** Parent submits excuse for "Mon-Wed" but the student only has lessons on Mon periods 1-4 and Wed periods 2-5. The system must know which specific lessons are affected.
**Why it happens:** Date range is calendar-based, but attendance is lesson-based.
**How to avoid:** When accepting an excuse, the service must: (1) find all active TimetableLessons for the student's class in the date range, (2) filter to only the student's lessons (accounting for group memberships), (3) create/update AttendanceRecords for each. This is a batch operation, not a simple date range update.
**Warning signs:** Excuses accepted but attendance not updated, or attendance updated for lessons the student doesn't attend.

### Pitfall 3: Concurrent Attendance Edits
**What goes wrong:** Two teachers (co-teaching) or a teacher and Klassenvorstand edit attendance for the same lesson simultaneously.
**Why it happens:** Optimistic UI updates without conflict resolution.
**How to avoid:** Use `updatedAt` field with optimistic locking (check timestamp on update, reject if stale). Socket.IO events notify other clients of changes. Frontend uses TanStack Query cache invalidation on WebSocket event.
**Warning signs:** Last-write-wins silently overwriting another teacher's attendance entry.

### Pitfall 4: Grade Weight Hierarchical Defaults
**What goes wrong:** Grade averages calculated with wrong weights because the system doesn't correctly resolve the weight hierarchy: school default -> teacher override per subject.
**Why it happens:** Missing fallback logic when teacher hasn't set custom weights.
**How to avoid:** GradeWeight model has `schoolId` (default) and optional `classSubjectId` (override). Service resolves: if classSubjectId weight exists, use it; otherwise fall back to school default. Pure function, easily testable.
**Warning signs:** Grade averages differ between what teacher sees and what parent sees, or averages change after admin updates default weights.

### Pitfall 5: File Upload on Fastify Without Registration
**What goes wrong:** `req.file()` throws "multipart not registered" error.
**Why it happens:** @fastify/multipart must be registered on the Fastify instance in main.ts BEFORE routes are loaded. NestJS registers routes during module init, so the plugin must be registered early.
**How to avoid:** Register multipart in `bootstrap()` right after creating the app: `await app.register(multipart, { limits: { fileSize: 5_242_880 } })`. The `app` is a NestFastifyApplication which exposes `.register()`.
**Warning signs:** Runtime error on first upload attempt, not caught by compilation.

### Pitfall 6: apiFetch Content-Type for File Upload
**What goes wrong:** The existing `apiFetch` wrapper in `apps/web/src/lib/api.ts` sets `Content-Type: application/json` when a body is present. File uploads use `FormData` which needs `multipart/form-data` with the browser-generated boundary.
**Why it happens:** The current logic: `if (options?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')`.
**How to avoid:** When uploading files, do NOT set Content-Type manually. Pass a `FormData` body and ensure the header is NOT set. The browser will set the correct multipart boundary. The existing code only sets it if not already present, so explicitly NOT setting it and letting the browser handle it should work -- but verify that `FormData` body doesn't trigger the auto-set. May need a small adjustment: check if body is `FormData` instance.
**Warning signs:** 400 Bad Request on file upload because Content-Type header has wrong boundary or is `application/json`.

### Pitfall 7: Lateness Minutes Threshold (D-04)
**What goes wrong:** Statistics don't count lateness >15min as absence, violating Austrian Schulunterrichtsgesetz.
**Why it happens:** Lateness stored as minutes but statistics query doesn't apply the 15-minute threshold.
**How to avoid:** AttendanceRecord stores `lateMinutes` (nullable Int). Statistics service applies the rule: `lateMinutes > 15` counts as `ABSENT` for absence statistics calculations. Document this business rule in the service code.
**Warning signs:** Absence statistics differ from official school reports.

### Pitfall 8: Missing Klassenvorstand FK
**What goes wrong:** Cannot route excuses to the correct teacher for review.
**Why it happens:** The existing schema has Klassenvorstand only as a TeachingReduction type (Phase 2), not as an FK on SchoolClass.
**How to avoid:** Add `klassenvorstandId` to SchoolClass in this phase's schema changes. Seed data already has teacher2 with a KLASSENVORSTAND reduction for class 1A -- link it explicitly.
**Warning signs:** Excuse review endpoint returns "no Klassenvorstand found" or excuses visible to all teachers instead of only the Klassenvorstand.

## Code Examples

### Prisma Schema Additions (Claude's Discretion -- recommended design)

```prisma
// --- Phase 5: Digital Class Book ---

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
}

enum GradeCategory {
  SCHULARBEIT    // Written exam
  MUENDLICH      // Oral
  MITARBEIT      // Class participation
}

enum ExcuseStatus {
  PENDING
  ACCEPTED
  REJECTED
}

enum ExcuseReason {
  KRANK           // Sick
  ARZTTERMIN      // Doctor appointment
  FAMILIAER       // Family reasons
  SONSTIG         // Other
}

// ClassBookEntry: one per lesson, links lesson to content documentation
model ClassBookEntry {
  id                String   @id @default(uuid())
  // Stable lesson reference (survives re-solves)
  classSubjectId    String   @map("class_subject_id")
  dayOfWeek         DayOfWeek @map("day_of_week")
  periodNumber      Int      @map("period_number")
  weekType          String   @default("BOTH") @map("week_type")
  date              DateTime // Actual calendar date of the lesson
  teacherId         String   @map("teacher_id")
  schoolId          String   @map("school_id")
  // Lesson content (D-09)
  thema             String?  // Topic/title
  lehrstoff         String?  // Content covered
  hausaufgabe       String?  // Homework assigned
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  attendanceRecords AttendanceRecord[]
  studentNotes      StudentNote[]

  @@unique([classSubjectId, date, periodNumber, weekType])
  @@index([schoolId, date])
  @@index([teacherId])
  @@map("class_book_entries")
}

// AttendanceRecord: one per student per ClassBookEntry
model AttendanceRecord {
  id               String           @id @default(uuid())
  classBookEntryId String           @map("class_book_entry_id")
  classBookEntry   ClassBookEntry   @relation(fields: [classBookEntryId], references: [id], onDelete: Cascade)
  studentId        String           @map("student_id")
  status           AttendanceStatus @default(PRESENT)
  lateMinutes      Int?             @map("late_minutes") // Only when status=LATE (D-04)
  excuseId         String?          @map("excuse_id")    // Links to accepted excuse
  recordedBy       String           @map("recorded_by")  // Teacher keycloakUserId
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  @@unique([classBookEntryId, studentId])
  @@index([studentId])
  @@map("attendance_records")
}

// GradeEntry: individual grade for a student in a subject
model GradeEntry {
  id              String        @id @default(uuid())
  schoolId        String        @map("school_id")
  classSubjectId  String        @map("class_subject_id")
  studentId       String        @map("student_id")
  teacherId       String        @map("teacher_id")
  category        GradeCategory
  value           Float                          // Decimal: 2+ = 1.75, 3- = 3.25 (D-05)
  description     String?                        // What was graded
  date            DateTime                       // When the grade was given
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([classSubjectId, studentId])
  @@index([studentId])
  @@map("grade_entries")
}

// GradeWeight: configurable weighting per category (D-06)
model GradeWeight {
  id              String   @id @default(uuid())
  schoolId        String   @map("school_id")
  classSubjectId  String?  @map("class_subject_id") // null = school default, set = teacher override
  schularbeitPct  Float    @default(40) @map("schularbeit_pct")
  muendlichPct    Float    @default(30) @map("muendlich_pct")
  mitarbeitPct    Float    @default(30) @map("mitarbeit_pct")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@unique([schoolId, classSubjectId])
  @@map("grade_weights")
}

// StudentNote: per-student note linked to a lesson entry
model StudentNote {
  id               String         @id @default(uuid())
  classBookEntryId String         @map("class_book_entry_id")
  classBookEntry   ClassBookEntry @relation(fields: [classBookEntryId], references: [id], onDelete: Cascade)
  studentId        String         @map("student_id")
  authorId         String         @map("author_id") // Teacher keycloakUserId
  content          String
  isPrivate        Boolean        @default(false) @map("is_private") // D-10: visible only to author + Schulleitung
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  @@index([classBookEntryId])
  @@index([studentId])
  @@map("student_notes")
}

// AbsenceExcuse: parent-submitted excuse for student absence
model AbsenceExcuse {
  id          String       @id @default(uuid())
  schoolId    String       @map("school_id")
  studentId   String       @map("student_id")
  parentId    String       @map("parent_id") // Parent who submitted
  startDate   DateTime     @map("start_date")
  endDate     DateTime     @map("end_date")
  reason      ExcuseReason
  note        String?                        // Optional free-text note
  status      ExcuseStatus @default(PENDING)
  reviewedBy  String?      @map("reviewed_by") // Klassenvorstand keycloakUserId
  reviewNote  String?      @map("review_note")
  reviewedAt  DateTime?    @map("reviewed_at")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  attachments ExcuseAttachment[]

  @@index([studentId])
  @@index([schoolId, status])
  @@map("absence_excuses")
}

// ExcuseAttachment: file uploaded with an excuse (D-13)
model ExcuseAttachment {
  id         String        @id @default(uuid())
  excuseId   String        @map("excuse_id")
  excuse     AbsenceExcuse @relation(fields: [excuseId], references: [id], onDelete: Cascade)
  filename   String                        // Original filename
  storagePath String       @map("storage_path") // Server-side path
  mimeType   String        @map("mime_type")
  sizeBytes  Int           @map("size_bytes")
  createdAt  DateTime      @default(now()) @map("created_at")

  @@map("excuse_attachments")
}

// SchoolClass extension: add Klassenvorstand FK
model SchoolClass {
  // ... existing fields ...
  klassenvorstandId String?  @map("klassenvorstand_id")
  klassenvorstand   Teacher? @relation("Klassenvorstand", fields: [klassenvorstandId], references: [id])
}
```

### Weighted Grade Average Utility
```typescript
// Source: Phase 2 pattern (werteinheiten.util.ts)
// apps/api/src/modules/classbook/grade-average.util.ts

interface GradeWithCategory {
  value: number;
  category: 'SCHULARBEIT' | 'MUENDLICH' | 'MITARBEIT';
}

interface WeightConfig {
  schularbeitPct: number;
  muendlichPct: number;
  mitarbeitPct: number;
}

/**
 * Calculate weighted average grade for a student in a subject.
 * Returns null if no grades exist.
 */
export function calculateWeightedAverage(
  grades: GradeWithCategory[],
  weights: WeightConfig,
): number | null {
  if (grades.length === 0) return null;

  const byCategory = {
    SCHULARBEIT: grades.filter((g) => g.category === 'SCHULARBEIT'),
    MUENDLICH: grades.filter((g) => g.category === 'MUENDLICH'),
    MITARBEIT: grades.filter((g) => g.category === 'MITARBEIT'),
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [cat, catGrades] of Object.entries(byCategory)) {
    if (catGrades.length === 0) continue;
    const avgInCategory = catGrades.reduce((s, g) => s + g.value, 0) / catGrades.length;
    const weight = cat === 'SCHULARBEIT' ? weights.schularbeitPct
      : cat === 'MUENDLICH' ? weights.muendlichPct
      : weights.mitarbeitPct;
    weightedSum += avgInCategory * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Format decimal grade to Austrian display notation.
 */
export function formatGradeDisplay(value: number): string {
  const base = Math.round(value);
  const diff = value - base;
  if (Math.abs(diff) < 0.01) return `${base}`;
  if (diff < 0) return `${base}+`;
  return `${base}-`;
}
```

### File Upload Registration
```typescript
// main.ts addition
import multipart from '@fastify/multipart';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register multipart BEFORE routes (Pitfall 5)
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB (D-13)
      files: 1,                   // One file per upload
    },
  });

  // ... rest of bootstrap
}
```

### CASL Permission Updates for Seed Data
```typescript
// New permissions to add in seed.ts

// Schulleitung: read all classbook and grades (D-08)
{ action: 'read', subject: 'classbook' },  // Already exists
{ action: 'read', subject: 'grades' },     // Already exists

// Lehrer: manage classbook and grades for own classes (D-08) -- Already exists with conditions
// { action: 'manage', subject: 'classbook', conditions: { teacherId: '{{ id }}' } },
// { action: 'manage', subject: 'grades', conditions: { teacherId: '{{ id }}' } },

// NEW: Excuse-specific permissions
// Eltern: create excuses for own children
{ action: 'create', subject: 'excuse' },
{ action: 'read', subject: 'excuse', conditions: { parentId: '{{ id }}' } },

// Lehrer (Klassenvorstand): manage excuses for own classes
{ action: 'manage', subject: 'excuse', conditions: { teacherId: '{{ id }}' } },

// Schulleitung: read all excuses
{ action: 'read', subject: 'excuse' },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multer for Fastify uploads | @fastify/multipart (native) | Fastify v5 (2024) | Multer wrappers deprecated. Use native multipart plugin. |
| Express-style @UseInterceptors(FileInterceptor) | Direct req.file() on Fastify | NestJS 11 + Fastify 5 | NestJS Fastify adapter does NOT have built-in file interceptors like Express. Use raw Fastify multipart API. |
| lessonId as FK for classbook | Composite key (classSubjectId + date + period) | This phase | Survives timetable re-solves. See Pitfall 1. |

**Deprecated/outdated:**
- `@nestjs/platform-express` file upload decorators (`@UploadedFile()`, `FileInterceptor()`) -- these DO NOT WORK with Fastify adapter. Must use `@fastify/multipart` directly.
- `fastify-multer` -- deprecated in favor of `@fastify/multipart` for Fastify v5.

## Open Questions

1. **Lesson ID Stability Strategy**
   - What we know: TimetableLesson IDs change on re-solve. ClassBookEntry needs a stable reference.
   - What's unclear: Whether to use composite key (classSubjectId + date + periodNumber) or a separate stable LessonSlot entity.
   - Recommendation: Use composite key on ClassBookEntry (classSubjectId + date + periodNumber + weekType). This is the natural stable identifier. The `date` field (actual calendar date) makes it unique per occurrence. No need for a LessonSlot entity.

2. **File Storage Location**
   - What we know: D-13 requires server-side file storage. Self-hosted deployment means local disk is simplest.
   - What's unclear: Whether to use a Docker volume mount or in-project directory. DSGVO retention means files must be deletable after 5 years.
   - Recommendation: Use `data/uploads/` directory mounted as a Docker volume. Path: `data/uploads/{schoolId}/excuses/{excuseId}/{uuid}-{originalFilename}`. Configure via `UPLOAD_DIR` env variable. Add to retention cleanup job.

3. **Real-Time Scope for Class Book**
   - What we know: Socket.IO is already set up with `/timetable` namespace.
   - What's unclear: Whether classbook changes need a separate namespace or can extend `/timetable`.
   - Recommendation: Add a `/classbook` namespace with rooms per class (`class:{classId}`). Events: `attendance:updated`, `grade:created`, `excuse:status-changed`. Keep separate from timetable namespace for clean separation.

4. **Grade Visibility Enforcement**
   - What we know: D-08 defines role-based grade visibility. CASL already has `grades` subject with conditions.
   - What's unclear: How to enforce "teacher sees own classes only" at the query level vs the guard level.
   - Recommendation: Use CASL guard for endpoint access control. Within the service, filter by teacherId for teacher role, no filter for schulleitung/admin. For parent/student, filter by studentId (resolved from Person -> Student -> ClassSubject -> GradeEntry).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Assumed (project runs) | 24.x | -- |
| PostgreSQL | Database | Assumed (Docker Compose) | 17.x | -- |
| Redis | BullMQ | Assumed (Docker Compose) | 7.x | -- |
| pnpm | Package manager | Assumed | 10.x | -- |
| @fastify/multipart | File upload (BOOK-06) | Not installed | 9.4.0 | Must install |
| File system write access | Upload storage | Available (local) | -- | S3-compatible storage |

**Missing dependencies with no fallback:**
- @fastify/multipart must be installed (`pnpm add @fastify/multipart --filter @schoolflow/api`)

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `pnpm --filter @schoolflow/api test -- --run` |
| Full suite command | `pnpm --filter @schoolflow/api test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-01 | Attendance CRUD (present, absent, late, excused) + bulk save | unit | `pnpm --filter @schoolflow/api test -- --run src/modules/classbook/attendance.service.spec.ts -x` | Wave 0 |
| BOOK-02 | Lesson content upsert (thema, lehrstoff, hausaufgabe) | unit | `pnpm --filter @schoolflow/api test -- --run src/modules/classbook/lesson-content.service.spec.ts -x` | Wave 0 |
| BOOK-03 | Grade CRUD + weighted average calculation + weight config | unit | `pnpm --filter @schoolflow/api test -- --run src/modules/classbook/grade.service.spec.ts -x` | Wave 0 |
| BOOK-03 | Grade average utility (pure function) | unit | `pnpm --filter @schoolflow/api test -- --run src/modules/classbook/grade-average.util.spec.ts -x` | Wave 0 |
| BOOK-04 | Student notes CRUD + private flag visibility filtering | unit | `pnpm --filter @schoolflow/api test -- --run src/modules/classbook/student-note.service.spec.ts -x` | Wave 0 |
| BOOK-05 | Absence statistics aggregation (per student, class, time period) | unit | `pnpm --filter @schoolflow/api test -- --run src/modules/classbook/statistics.service.spec.ts -x` | Wave 0 |
| BOOK-06 | Excuse workflow (create, review, accept/reject, auto-update attendance) | unit | `pnpm --filter @schoolflow/api test -- --run src/modules/classbook/excuse.service.spec.ts -x` | Wave 0 |
| BOOK-07 | Responsive UI (manual verification) | manual-only | N/A -- browser responsive mode inspection | N/A |

### Sampling Rate
- **Per task commit:** `pnpm --filter @schoolflow/api test -- --run`
- **Per wave merge:** Full suite across api + web
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/classbook/attendance.service.spec.ts` -- covers BOOK-01
- [ ] `apps/api/src/modules/classbook/lesson-content.service.spec.ts` -- covers BOOK-02
- [ ] `apps/api/src/modules/classbook/grade.service.spec.ts` -- covers BOOK-03
- [ ] `apps/api/src/modules/classbook/grade-average.util.spec.ts` -- covers BOOK-03 (pure function)
- [ ] `apps/api/src/modules/classbook/student-note.service.spec.ts` -- covers BOOK-04
- [ ] `apps/api/src/modules/classbook/statistics.service.spec.ts` -- covers BOOK-05
- [ ] `apps/api/src/modules/classbook/excuse.service.spec.ts` -- covers BOOK-06

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/api/prisma/schema.prisma` -- current 790-line schema with all existing models
- Existing codebase: `apps/api/prisma/seed.ts` -- permission structure with `classbook`, `grades`, `excuse` subjects already scaffolded
- Existing codebase: `apps/api/src/modules/timetable/` -- module pattern, service/controller/gateway/DTO structure
- Existing codebase: `apps/web/src/components/timetable/TimetableGrid.tsx` -- grid component with `onCellClick` prop ready for classbook navigation
- Existing codebase: `apps/web/src/lib/api.ts` -- apiFetch with Content-Type auto-detection (relevant for file upload)
- npm registry: @fastify/multipart 9.4.0 (verified 2026-04-02)

### Secondary (MEDIUM confidence)
- [NestJS file upload docs](https://docs.nestjs.com/techniques/file-upload) -- Fastify section documents @fastify/multipart integration
- [Fastify multipart GitHub](https://github.com/fastify/fastify-multipart) -- Official Fastify plugin, compatible with Fastify 5.x
- [NestJS Fastify file upload guides](https://dev.to/josethz00/fastify-nestjs-file-upload-3mip) -- Community patterns for multipart on Fastify
- Austrian Schulunterrichtsgesetz -- lateness >15min counting as absence (domain knowledge, D-04)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all technologies already in the project, only @fastify/multipart is new
- Architecture: HIGH -- follows established module/controller/service/DTO patterns from Phase 2-4
- Pitfalls: HIGH -- derived from concrete codebase analysis (schema, API patterns, seed data)
- Prisma schema design: MEDIUM -- recommended schema is well-grounded but is Claude's Discretion area

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable domain, no fast-moving dependencies)
