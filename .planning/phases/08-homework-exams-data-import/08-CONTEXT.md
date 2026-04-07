# Phase 8: Homework, Exams & Data Import - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Homework and exams are visible in the timetable with collision detection, and schools can migrate their existing data from Untis or CSV files into SchoolFlow. This phase delivers: homework assignment linked to lessons, exam scheduling with collision detection, timetable badges for homework/exams, Untis XML import, CSV import with column mapping, iCal subscription URLs, read-only SIS API, and homework/exam notifications. Requirements: HW-01 through HW-03, IMPORT-01 through IMPORT-04.

</domain>

<decisions>
## Implementation Decisions

### Homework & Exam Data Model
- **D-01:** Homework entity linked to ClassBookEntry via classBookEntryId FK. Fields: id, title, description, dueDate, classSubjectId, classBookEntryId, createdBy, createdAt, updatedAt. Reuses Phase 5 lesson relationship -- homework is scoped to a specific lesson.
- **D-02:** Separate Exam entity (not combined with Homework). Fields: id, title, date, classSubjectId, classId, duration, description, createdBy, createdAt, updatedAt. Collision detection via unique constraint check at creation time.
- **D-03:** Per-class per-day exam collision detection. No two exams on the same calendar day for the same class. Checked at creation time with a DB query. Soft warning with admin override option (not strict block).
- **D-04:** Homework/exam badges on timetable cells. Small icon indicators on lesson cells in all timetable views (teacher, class, student). Clicking shows detail. Students see their class's homework and exams.

### Data Import (Untis XML + CSV)
- **D-05:** Untis XML import via BullMQ async job. Admin uploads XML file, import runs as background job with progress reporting via Socket.IO. Parses Untis GPU format (teachers, classes, rooms, lessons). Dry-run preview before commit -- admin reviews parsed data before finalizing.
- **D-06:** CSV import with column mapping UI. Admin uploads CSV, system detects headers and delimiter (comma, semicolon, tab). Admin maps columns to SchoolFlow fields (name, email, etc.). Validation before commit.
- **D-07:** Import conflict resolution: skip-or-update per row. On duplicate (matched by name or email), admin chooses mode: skip duplicates, update existing, or fail entire import. Default: skip. Results logged in import report.
- **D-08:** Import is admin-only, school-scoped. All imported data scoped to the current school. Import history persisted for audit trail (who imported what, when, how many records).

### iCal Export & SIS API
- **D-09:** Per-user iCal calendar URL with token authentication. /api/v1/calendar/:token.ics where token is a per-user UUID stored in DB. Includes timetable lessons, homework due dates, and exams. Auto-updates. No session required -- works with Google Calendar, Apple Calendar, Outlook. Token revocable by user.
- **D-10:** Read-only REST API for SIS integration. /api/v1/sis/students, /api/v1/sis/teachers, /api/v1/sis/classes. API key authentication (separate from Keycloak). No write from SIS into SchoolFlow -- that's handled by the import feature.
- **D-11:** In-app notifications for homework/exams reusing Phase 6 Notification entity. New types: HOMEWORK_ASSIGNED, EXAM_SCHEDULED. Parents and students get notified when homework is assigned or exam is scheduled. Push notification deferred to Phase 9 (MOBILE-02).

### Claude's Discretion
- Prisma schema design for Homework, Exam, ImportJob, ImportHistory, CalendarToken entities
- NestJS module structure (HomeworkModule, ImportModule, CalendarModule, or combined)
- Untis XML parsing library choice or custom parser
- CSV parsing library (papaparse, csv-parse, etc.)
- Column mapping UI component design
- iCal generation library (ical-generator already in dependencies)
- SIS API key management and rotation
- Import progress WebSocket event design
- Exam collision detection query optimization

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BullMQ job infrastructure** (Phase 2 DSGVO retention, Phase 3 solver) -- async job pattern with progress
- **Socket.IO namespaces** (/timetable, /classbook, /notifications, /messaging) -- real-time event delivery
- **NotificationService** (Phase 6) -- generic Notification entity, extensible type enum
- **@fastify/multipart** (Phase 5) -- file upload with magic byte validation
- **ical-generator** (Phase 4) -- already in dependencies for iCal export
- **ClassBookEntry model** (Phase 5) -- lesson-scoped entity for homework FK
- **TimetableGrid component** (Phase 4) -- renderCell/renderEmptySlot render props for badge integration
- **apiFetch utility** -- REST calls with JWT auth
- **CASL permissions** -- fine-grained RBAC with NestJS Guards

### Established Patterns
- Nested resource routing: /api/v1/schools/:schoolId/{resource}
- TanStack Query hooks for server state
- Socket.IO per-domain namespace pattern
- Wave 0 Nyquist test stubs before implementation
- Zustand for client-only UI state

### Integration Points
- TimetableGrid cells -- add homework/exam badge indicators
- ClassBookEntry -- FK for homework assignment
- NotificationType enum -- add HOMEWORK_ASSIGNED, EXAM_SCHEDULED
- Sidebar navigation -- add /import route for admin
- CASL factory -- add homework, exam, import permission subjects

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. All decisions were accepted at recommended defaults based on prior phase patterns and established codebase conventions.

</specifics>

<deferred>
## Deferred Ideas

- Push notifications for homework/exams (Phase 9 MOBILE-02)
- Recurring homework templates
- Exam grade integration with Phase 5 grade book
- Bidirectional SIS sync (write back to SIS)
- Import from other systems beyond Untis (ASV, SchILD)
- Homework file attachments (reuse messaging attachment infrastructure later)

</deferred>
