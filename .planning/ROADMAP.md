# Roadmap: OpenAustria SchoolFlow

## Overview

SchoolFlow delivers a self-hosted, open-source school management platform for the DACH market. The build order follows a strict dependency chain: core platform with RBAC and DSGVO baked in from day one, then the timetable solver (the primary differentiator and hardest problem), then the daily-use features that depend on timetable data (class book, substitutions), then communication and data import, and finally mobile polish and production hardening. Each phase produces a deployable increment on a single Docker Compose stack plus a JVM solver sidecar.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Project Scaffolding & Auth** - Monorepo, Docker Compose, Keycloak OIDC, RBAC system, REST API shell with auto-docs
- [ ] **Phase 2: School Data Model & DSGVO** - Base entities for all school types, DSGVO audit infrastructure, consent and retention management
- [ ] **Phase 3: Timetable Solver Engine** - Timefold JVM sidecar, three-tier constraint model, async solving with real-time progress
- [ ] **Phase 4: Timetable Viewing, Editing & Room Management** - Role-based timetable views, drag-and-drop editing, room booking, PDF/iCal export
- [ ] **Phase 5: Digital Class Book** - Attendance tracking, lesson documentation, grades, absence workflows, responsive UI
- [ ] **Phase 6: Substitution Planning** - Absence management, automatic substitute suggestions, push notifications, statistics
- [ ] **Phase 7: Communication** - Messaging (direct, group, broadcast), read receipts, file attachments, polls
- [ ] **Phase 8: Homework, Exams & Data Import** - Homework/exam management in timetable, Untis XML import, CSV import, API integration
- [ ] **Phase 9: Mobile, PWA & Production Readiness** - Push notifications, offline timetable, backup/restore, rolling updates

## Phase Details

### Phase 1: Project Scaffolding & Auth
**Goal**: A running NestJS API with Keycloak authentication, scoped RBAC for all five roles, a documented REST API, and a Docker Compose dev environment -- the foundation every module builds on
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, DEPLOY-01, API-01, API-02, API-03
**Success Criteria** (what must be TRUE):
  1. Admin can create a school profile (name, type, time grid, school days) and the data persists across restarts
  2. Users can authenticate via Keycloak (OIDC) and sessions survive browser refresh
  3. Access to every API endpoint is restricted by role (Admin, Schulleitung, Lehrer, Eltern, Schueler) with module-level granularity, and data visibility is scoped (parents see only their child, teachers only their classes)
  4. Every data access and mutation is logged in an audit trail
  5. API documentation is auto-generated (OpenAPI/Swagger) and all endpoints use OAuth2/OIDC token auth
**Plans**: 7 plans

Plans:
- [x] 01-01-PLAN.md -- Monorepo scaffolding (pnpm, Turborepo, NestJS Fastify, Docker Compose, shared package)
- [x] 01-02-PLAN.md -- Prisma 7 schema (school profile, RBAC/ACL, audit trail models) and PrismaService
- [x] 01-03-PLAN.md -- Keycloak realm setup and custom Passport-JWT authentication strategy
- [x] 01-04-PLAN.md -- CASL-based RBAC+ACL authorization system with seed data and override API
- [x] 01-05-PLAN.md -- School profile CRUD API with Austrian school type templates
- [x] 01-06-PLAN.md -- Audit trail (mutation logging, sensitive read interceptor, role-scoped query API)
- [x] 01-07-PLAN.md -- Swagger/OpenAPI with OAuth2, RFC 9457 errors, validation pipe, and unit tests

### Phase 2: School Data Model & DSGVO
**Goal**: The complete school entity model (teachers, classes, students, subjects) is populated and queryable, with DSGVO compliance infrastructure (consent tracking, data deletion, export, encryption, retention) operational from the start
**Depends on**: Phase 1
**Requirements**: FOUND-02, FOUND-03, FOUND-04, FOUND-05, DSGVO-01, DSGVO-02, DSGVO-03, DSGVO-04, DSGVO-05, DSGVO-06
**Success Criteria** (what must be TRUE):
  1. Admin can create teachers with subject qualifications, availability windows, and employment percentage
  2. Admin can create classes/groups with student assignments and define per-class weekly lesson quotas for each subject
  3. System handles different school types (VS, MS, AHS, BHS) through configurable time grids and rule sets
  4. A user can request export of all their personal data (Art. 15 DSGVO) and receive a complete data package
  5. Admin can trigger full deletion of a person's data (right to be forgotten), and the system enforces configurable retention periods with automatic expiry
**Plans**: 8 plans

Plans:
- [x] 02-01-PLAN.md -- Prisma schema extension (18 models, 8 enums), BullMQ queue infrastructure, AES-256-GCM encryption service
- [x] 02-02-PLAN.md -- Teacher CRUD with Austrian Lehrverpflichtung/Werteinheiten model, availability rules, teaching reductions
- [x] 02-03-PLAN.md -- Student CRUD, Class/Group management, auto-derivation group membership rule engine
- [x] 02-04-PLAN.md -- Subject CRUD, Austrian Stundentafel templates (AHS Unterstufe + MS), ClassSubject weekly hour management
- [x] 02-05-PLAN.md -- DSGVO consent tracking (Art. 6/7), retention policy management with daily BullMQ cron, DSFA/VVZ CRUD with JSON export
- [x] 02-06-PLAN.md -- DSGVO data deletion/anonymization (Art. 17), data export with JSON + PDF (Art. 15/20), async BullMQ processing
- [x] 02-07-PLAN.md -- CASL permissions for all Phase 2 entities, audit interceptor updates, seed data with sample school
- [x] 02-08-PLAN.md -- Gap closure: fix 3 TSC build errors (BullMQ v5 repeat.pattern, Prisma InputJsonValue casts)

### Phase 3: Timetable Solver Engine
**Goal**: The system can automatically generate valid timetables that satisfy hard constraints (no clashes), respect soft constraints (pedagogical quality), and show solving progress in real time -- the core differentiator
**Depends on**: Phase 2
**Requirements**: TIME-01, TIME-02, TIME-03, TIME-04, TIME-05, TIME-06, TIME-07, ROOM-01, ROOM-02
**Success Criteria** (what must be TRUE):
  1. System generates a timetable that has zero hard-constraint violations (no teacher clashes, no room double-bookings, all time windows respected)
  2. Generated timetables respect soft constraints (max hours per day, no same-subject doubling, balanced weekly distribution) and support double periods and A/B week cycles
  3. Admin can define custom constraints (blocked time slots, teacher availability, part-time models) and the solver incorporates them
  4. Admin sees real-time solving progress (score, remaining violations, improvement rate) via WebSocket and can stop solving early to accept the best-so-far result
  5. When no feasible timetable exists, the system explains which constraints conflict
**Plans**: 6 plans

Plans:
- [x] 03-01-PLAN.md -- Prisma schema (Room, TimetableRun, TimetableLesson, ConstraintTemplate models), Room CRUD module, solver queue constant
- [x] 03-02-PLAN.md -- Timefold Quarkus sidecar scaffold, domain model, 4 hard constraints, REST API, Docker Compose integration
- [x] 03-03-PLAN.md -- Soft constraints (pedagogical quality), room-type hard constraint, double periods, A/B weeks, ConstraintVerifier tests
- [x] 03-04-PLAN.md -- Configurable constraint weights (ConstraintWeightOverrides), constraint template CRUD API
- [x] 03-05-PLAN.md -- NestJS solver orchestration (BullMQ processor, solver input aggregation, solver client, TimetableService, internal callbacks)
- [x] 03-06-PLAN.md -- Socket.IO WebSocket progress gateway, conflict explanation endpoint, ScoreAnalysis JVM tests

### Phase 4: Timetable Viewing, Editing & Room Management
**Goal**: Every role sees their relevant timetable with real-time updates, admins can manually adjust schedules via drag-and-drop, rooms are fully managed, and timetables can be exported
**Depends on**: Phase 3
**Requirements**: TIME-08, VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, ROOM-03, ROOM-04, ROOM-05
**Success Criteria** (what must be TRUE):
  1. Teachers see their personal timetable (daily and weekly view), students/parents see the class timetable, and admins can view all timetables (by teacher, class, or room)
  2. Substitutions, cancellations, and room changes appear in all views in real time with visual change indicators and color-coding by subject
  3. Admin can drag-and-drop lessons to manually adjust the generated timetable, with immediate constraint validation
  4. Teachers can book free rooms for ad-hoc use, admins can manage resources (tablet carts, lab equipment), and room changes propagate instantly to all views
  5. Any user can export their timetable as PDF or iCal for personal calendars
**Plans**: 15 plans
**UI hint**: yes

Plans:
- [x] 04-00-PLAN.md -- Nyquist Wave 0: Vitest web config, Testing Library setup, test stub files for all requirements
- [x] 04-01-PLAN.md -- Prisma schema extensions (TimetableLesson edit fields, RoomBooking, Resource, ResourceBooking models) and shared TypeScript types
- [x] 04-02-PLAN.md -- React SPA scaffolding (Vite + React 19 + TanStack Router + Query + Zustand + shadcn/ui + Tailwind 4 + Keycloak auth) with role-based sidebar
- [x] 04-03-PLAN.md -- Backend timetable view API (role-filtered with joined data), constraint validation, lesson move, edit history, revert endpoints
- [x] 04-04-PLAN.md -- Room booking API with availability grid, resource CRUD module, WebSocket timetable events gateway (/timetable namespace)
- [x] 04-05-PLAN.md -- Frontend timetable grid (CSS Grid layout, TimetableCell, DayWeekToggle, ABWeekTabs, PerspectiveSelector, subject colors, change indicators)
- [x] 04-06-PLAN.md -- Frontend DnD editing (@dnd-kit draggable/droppable, constraint feedback, edit history panel, revert capability)
- [x] 04-07-PLAN.md -- Frontend room availability grid with ad-hoc booking dialog, admin resource CRUD page
- [x] 04-08-PLAN.md -- Socket.IO real-time integration (TanStack Query cache invalidation), PDF and iCal export (server-side pdfkit + ical-generator)
- [x] 04-09-PLAN.md -- Gap closure: schoolId resolution from user context, student/parent timetable perspective auto-initialization
- [x] 04-10-PLAN.md -- Gap closure: changeType/originalTeacher/originalRoom fields on TimetableLesson schema and getView() mapper
- [x] 04-11-PLAN.md -- UAT gap closure: fix DnD lesson move crash (DTO @IsUUID validation, 422 error handling, null safety)
- [x] 04-12-PLAN.md -- UAT gap closure: Lehrer room/resource CASL permissions, Socket.IO IoAdapter for Fastify
- [x] 04-13-PLAN.md -- UAT gap closure: apiFetch Content-Type fix, useRooms pagination unwrap, DnD 3 root causes (lessonId body, collision detection, CSS transform)
- [x] 04-14-PLAN.md -- UAT gap closure: room type enum alignment, filter empty state, bookingId in availability response for cancel handler

### Phase 5: Digital Class Book
**Goal**: Teachers can run their daily class book workflow digitally -- record attendance, document lessons, enter grades, and add student notes -- on any device, while parents can submit digital absence excuses
**Depends on**: Phase 4
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07
**Success Criteria** (what must be TRUE):
  1. Teacher can mark attendance per lesson (present, absent, late, excused) and document lesson content
  2. Teacher can enter grades (oral, written, practical) with configurable weighting and add per-student notes for each lesson
  3. System generates absence statistics per student, per class, and per time period
  4. Parents can submit digital absence excuses that teachers can review and accept
  5. The class book works equally well on desktop, tablet, and smartphone
**Plans**: 10 plans
**UI hint**: yes

Plans:
- [x] 05-01-PLAN.md -- Prisma schema (7 models, 4 enums, klassenvorstandId), shared TypeScript types, Wave 0 test stubs
- [x] 05-02-PLAN.md -- ClassBookModule, AttendanceService+Controller, LessonContentService+Controller, DTOs
- [x] 05-03-PLAN.md -- GradeService+Controller, grade-average utility (TDD), StudentNoteService+Controller, DTOs
- [x] 05-04-PLAN.md -- StatisticsService+Controller, ExcuseService+Controller with file upload (@fastify/multipart), DTOs
- [x] 05-05-PLAN.md -- CASL permission seeds for classbook domain, ClassBookEventsGateway (Socket.IO /classbook namespace)
- [x] 05-06-PLAN.md -- Frontend data layer: TanStack Query hooks (classbook, grades, excuses), Socket.IO classbook client, ClassBookHeader
- [x] 05-07-PLAN.md -- Lesson detail page with tabs, AttendanceGrid (quick-tap), LessonContentForm (auto-save), timetable cell click navigation
- [x] 05-08-PLAN.md -- GradeMatrix (spreadsheet, Austrian Notensystem, weighted averages), GradeEntryDialog, StudentNoteList with private flag
- [x] 05-09-PLAN.md -- ExcuseForm (parent), ExcuseReviewList (Klassenvorstand), AbsenceStatisticsPanel, sidebar navigation updates
- [x] 05-10-PLAN.md -- Integration: wire Noten/Notizen tabs, responsive polish (BOOK-07), human verification checkpoint

### Phase 6: Substitution Planning
**Goal**: When a teacher is absent, the system automatically suggests qualified substitutes, notifies them, and propagates changes to all timetable views -- turning a daily admin headache into a one-click workflow
**Depends on**: Phase 5
**Requirements**: SUBST-01, SUBST-02, SUBST-03, SUBST-04, SUBST-05, SUBST-06
**Success Criteria** (what must be TRUE):
  1. Admin can record a teacher absence with reason and duration, and the system immediately suggests ranked substitutes based on availability, qualification, and workload fairness
  2. Substitute teachers receive push notifications and can accept or decline the assignment
  3. The absent teacher can leave handover notes per lesson for the substitute
  4. All substitution changes propagate instantly to every timetable view (teacher, class, room)
  5. System tracks substitution statistics per teacher (given and received) for workload fairness monitoring
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 06-01-PLAN.md -- Wave 0: Prisma schema (5 models + 5 enums + ClassBookEntry.substitutionId), shared types, SubstitutionModule scaffold, 12 spec stubs
- [x] 06-02-PLAN.md -- TeacherAbsenceService with range expansion (ab-week util) + SubstitutionService lifecycle (assign/respond/entfall/stillarbeit) with ClassBookEntry linkage
- [x] 06-03-PLAN.md -- RankingService (D-05 weighted scoring) + NotificationService+Gateway (JWT handshake, per-user rooms, dedup) + HandoverService (reuses Phase 5 multipart)
- [ ] 06-04-PLAN.md -- Overlay-aware getView() rewrite + SubstitutionStatsService + ranking controller + CASL seeds + retention extension + module assembly
- [ ] 06-05-PLAN.md -- Admin /admin/substitutions page (3-tab layout: AbsenceForm, OpenSubstitutionsPanel, FairnessStatsPanel) + TanStack Query hooks
- [ ] 06-06-PLAN.md -- NotificationBell + Popover primitive + useNotificationSocket + Lehrer /teacher/substitutions + HandoverNote components + stillarbeit ChangeIndicator variant + human verification

### Phase 7: Communication
**Goal**: Teachers, parents, and admins can communicate within the platform -- replacing SchoolFox/email chains with role-scoped messaging, read tracking, and file sharing
**Depends on**: Phase 4
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06
**Success Criteria** (what must be TRUE):
  1. Teacher or admin can send messages to a class, year group, or entire school, and each recipient sees the message in their inbox
  2. Teachers and parents can exchange private direct messages
  3. Senders see read receipts (who has read, who has not) for every message
  4. Messages support file attachments (photos, PDFs, documents) and parents can report a child's absence via message
  5. Teachers can create polls/surveys (event planning, feedback) and see aggregated results
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD
- [ ] 07-04: TBD
- [ ] 07-05: TBD
- [ ] 07-06: TBD

### Phase 8: Homework, Exams & Data Import
**Goal**: Homework and exams are visible in the timetable with collision detection, and schools can migrate their existing data from Untis or CSV files into SchoolFlow
**Depends on**: Phase 5
**Requirements**: HW-01, HW-02, HW-03, IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04
**Success Criteria** (what must be TRUE):
  1. Teacher can assign homework to a lesson and it appears in the student's timetable view
  2. Teacher can schedule exams with automatic collision detection (no two exams on the same day for a class), and students/parents see exams and homework with push notifications
  3. Admin can import teachers, classes, rooms, and timetables from Untis XML format
  4. Admin can import student lists, teacher lists, and room lists from CSV files
  5. Users can export personal calendars as iCal/ICS, and external SIS systems can sync data via the API
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD
- [ ] 08-04: TBD
- [ ] 08-05: TBD
- [ ] 08-06: TBD

### Phase 9: Mobile, PWA & Production Readiness
**Goal**: The platform works seamlessly on mobile devices with push notifications and offline access, and the deployment is production-grade with backup/restore and zero-downtime updates
**Depends on**: Phase 7, Phase 8
**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. All features are fully usable on smartphone and tablet via responsive web app
  2. Users receive push notifications for timetable changes, new messages, and absence alerts
  3. Today's timetable is viewable offline via PWA cache
  4. Admin can run documented backup/restore scripts and verify data integrity
  5. System supports rolling updates without downtime
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD
- [ ] 09-04: TBD
- [ ] 09-05: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
(Phases 7 and 8 can run in parallel after their dependencies are met)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Scaffolding & Auth | 7/7 | Complete | 2026-03-29 |
| 2. School Data Model & DSGVO | 7/8 | Gap closure | - |
| 3. Timetable Solver Engine | 0/6 | Not started | - |
| 4. Timetable Viewing, Editing & Room Management | 12/15 | UAT gap closure | - |
| 5. Digital Class Book | 0/10 | Not started | - |
| 6. Substitution Planning | 0/6 | Not started | - |
| 7. Communication | 0/6 | Not started | - |
| 8. Homework, Exams & Data Import | 0/6 | Not started | - |
| 9. Mobile, PWA & Production Readiness | 0/5 | Not started | - |
