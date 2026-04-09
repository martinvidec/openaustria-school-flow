# Milestones

## v1.0 MVP (Shipped: 2026-04-09)

**Phases completed:** 12 phases, 74 plans, 148 tasks

**Key accomplishments:**

- pnpm + Turborepo monorepo with NestJS 11 Fastify API, shared types package, Vitest test infra, and Docker Compose dev stack (PostgreSQL 17, Redis 7, Keycloak 26.5.6)
- Prisma 7 schema with 12 models (school profile, RBAC/ACL, audit trail), PrismaPg driver adapter service, and global NestJS module
- Keycloak realm with 5 roles and OIDC client, custom Passport-JWT strategy with JWKS validation, global auth guard with @Public() bypass, and session-persistent token configuration
- CASL-based hybrid RBAC+ACL authorization with database-persisted permissions, ACL override API, and seed data for 5 Austrian school roles with scoped conditions
- School CRUD REST API with Austrian time grid templates for 5 school types, nested creation of time grids/periods/school days/school years, and CASL-protected endpoints
- Two-layer audit logging with global interceptor for mutations/sensitive reads, role-scoped query API, and per-category retention management
- Swagger/OpenAPI at /api/docs with OAuth2 Keycloak flow, RFC 9457 problem details error responses, global validation pipe, and 12 passing tests across CASL, school, health, and e2e
- Prisma schema extended with 18 Austrian school domain + DSGVO models, BullMQ queue infrastructure with 3 DSGVO queues, and AES-256-GCM encryption service with transparent Prisma field encryption
- Teacher CRUD module with Austrian Lehrverpflichtung (Werteinheiten) calculation, 9 OEPU-standard groups, availability constraints, and teaching reductions
- Student CRUD with nested Person creation, Class CRUD with Stammklasse assignment, and Group auto-derivation rule engine for Religion/Leistung/Wahlpflicht splits
- Subject CRUD with Austrian Stundentafel template system for AHS Unterstufe and Mittelschule curriculum hour allocation
- DSGVO consent tracking with 7 processing purposes, retention policy management with Austrian-specific defaults, DSFA/VVZ CRUD with combined JSON export, and daily BullMQ retention cron
- DSGVO Art. 17 anonymization with 'Geloeschte Person' placeholders and Art. 15/20 data export with JSON bundle + pdfkit PDF rendering, both async via BullMQ
- CASL permission tests for 9 Phase 2 subjects across 5 roles, comprehensive seed data with sample AHS school, and extended audit logging for DSGVO-sensitive resources
- Fixed 3 TSC type errors (BullMQ v5 repeat.pattern, 2x Prisma InputJsonValue casts) enabling clean production nest build
- Prisma schema extended with 4 timetable solver models (Room, TimetableRun, TimetableLesson, ConstraintTemplate), Room CRUD API, and SOLVER_QUEUE BullMQ constant
- Timefold 1.32.0 constraint solver sidecar with 4 hard constraints (teacher/room clash, availability, student groups), async REST API with callback pattern, and Docker Compose integration
- 12-constraint solver with pedagogical quality optimization: subject distribution, double periods, room preferences, morning scheduling, and A/B week support
- Configurable soft constraint weights via @ConstraintConfiguration with 8 defaults, constraint template CRUD API, and ClassTimeslotRestriction/SubjectTimePreference domain types for admin-defined scheduling rules
- NestJS orchestration layer bridging admin solve requests to Timefold sidecar via BullMQ, with input aggregation, lifecycle management, and internal callback endpoints
- Socket.IO gateway for real-time solve progress with school-scoped rooms, conflict explanation endpoint with grouped violations and entity references, and ScoreAnalysis tests for teacher/room conflicts
- Vitest web workspace config with Testing Library setup and 8 test stub files covering all 10 Phase 4 requirements for behavioral sampling
- Extended Prisma schema with 4 new models (TimetableLessonEdit, RoomBooking, Resource, ResourceBooking) and shared TypeScript types for timetable views, room booking, and resource management
- Complete React SPA with Vite 8, TanStack Router, Keycloak OIDC auth, role-based sidebar, and shadcn/ui component library
- REST API endpoints for role-filtered timetable viewing, constraint-validated drag-and-drop lesson moves, and persistent edit history with full revert capability
- Room booking API with conflict detection against lessons and bookings, resource CRUD module, and TimetableEventsGateway on /timetable namespace for real-time change propagation
- CSS Grid timetable layout with Doppelstunde merging, subject color-coding, role-based perspective selector, day/week toggle, A/B week tabs, and change indicators wired to backend view API via TanStack Query
- Admin drag-and-drop timetable editing with @dnd-kit, debounced constraint validation, color-coded feedback overlays, and persistent edit history with revert capability
- Room availability CSS grid with ad-hoc booking dialog, day/type/capacity/equipment filters, and admin resource CRUD page
- Socket.IO client with TanStack Query cache invalidation for live timetable updates, plus PDF/iCal export endpoints and download UI
- Backend user-context endpoint resolving keycloakUserId to schoolId/classId, Zustand store for app-wide consumption, student/parent auto-perspective initialization
- TimetableLesson schema extended with changeType/originalTeacherSurname/originalRoomName and getView() mapper wired to populate ChangeIndicator from database
- Fixed three cascading bugs in drag-and-drop lesson move: relaxed @IsUUID DTO validation, added res.ok error handling, and defensive null checks on validationResult
- Lehrer room-booking CASL permissions in seed data and Socket.IO IoAdapter for Fastify WebSocket binding
- Fixed 5 frontend bugs blocking DnD lesson moves, resource DELETE, and room perspective selector
- Room type filter aligned to backend German enums (KLASSENZIMMER, EDV_RAUM), booking cancel sends UUID via bookingId, and empty state differentiates no-rooms from no-filter-matches
- Prisma schema with 7 classbook models (attendance, grades, excuses, notes), shared TypeScript DTOs, and Wave 0 test stubs for all BOOK requirements
- ClassBookModule with attendance bulk operations, lesson content auto-save, and TimetableLesson-to-ClassBookEntry resolution endpoint for D-03 navigation
- Grade CRUD with Austrian 1-5 Notensystem (D-05), weighted average calculation, grade matrix endpoint (D-07), and student notes with D-10 private flag visibility filtering
- Absence statistics with per-student/class aggregation (late >15min = absent per Schulunterrichtsgesetz) and parent excuse workflow with file upload, Klassenvorstand review, and automatic EXCUSED attendance updates
- CASL permission seeds for 4 classbook subjects across 5 roles + ClassBookEventsGateway with real-time Socket.IO events for attendance, grades, excuses, and entry updates
- TanStack Query hooks for all classbook endpoints (attendance, grades, excuses, notes) with Socket.IO /classbook namespace client and ClassBookHeader component
- Lesson detail page with tabbed layout (Anwesenheit/Inhalt/Noten/Notizen), quick-tap attendance grid with optimistic updates, lesson content form with auto-save, and timetable cell click navigation for teachers
- Grade matrix with Austrian 1-5 +/- Notensystem, category filters, weighted averages, and student notes panel with grouped display and private flag visibility
- Parent excuse submission with file upload, Klassenvorstand review with accept/reject dialogs, absence statistics with sortable table and PDF export, and sidebar navigation for Entschuldigungen and Abwesenheit
- Prisma schema extended with 5 Substitution-Planning models + 5 enums, @schoolflow/shared DTOs/events for api+web, empty SubstitutionModule scaffold, and 12 Wave 0 it.todo() spec stubs unblocking parallel implementation of Plans 06-02..06-06.
- TeacherAbsence range expansion with A/B week + period-bound support and the full Substitution lifecycle (assign with Serializable re-check, respond, entfall, stillarbeit) with D-14 ClassBookEntry linkage, shipping SUBST-01 + the mutation side of SUBST-05.
- Three orthogonal Phase 6 backends shipped in parallel with Plan 02: deterministic scored RankingService (SUBST-02), in-app NotificationService + Socket.IO gateway (SUBST-03) with JWT handshake auth and dedup, and HandoverService (SUBST-04) reusing the Phase 5 magic-byte upload pipeline -- 49 Wave 0 it.todo stubs replaced with real TDD tests.
- TimetableService.getView() rewritten as overlay-aware dated view (SUBST-05 read side), SubstitutionService wired to NotificationService + TimetableEventsGateway so every lifecycle transition emits the right events and persists the right notifications, SubstitutionStatsService shipped with configurable windows (SUBST-06), RankingController exposes the ranking endpoint (SUBST-02), CASL seed extended with 16 new abilities across 5 roles, retention cron extended with handover_materials: 365 (D-19), and SubstitutionModule fully assembled — the complete Phase 6 backend is now deployable.
- Admin Vertretungsplanung page with 3-tab layout (Abwesenheiten / Offene Vertretungen / Statistik) wired to the Phase 6 REST endpoints, ranked candidate list with score breakdown and Pitfall 2 stale-candidate handling, fairness statistics panel with 5-window selector, all copy in formal German per 06-UI-SPEC.
- Lehrer substitution response flow with real-time notification bell, ChangeIndicator stillarbeit variant, and Handover note components — Phase 6 frontend feature-complete, awaiting human verification of the end-to-end flow.
- Prisma communication schema with 7 models + 3 enums, shared TypeScript messaging types, NestJS DTOs, and 27 Wave 0 Nyquist test stubs for COMM-01..COMM-06
- ConversationService with 4-scope expansion (DIRECT/CLASS/YEAR_GROUP/SCHOOL) and RBAC, MessageService with send/read-receipts/recipient-detail and MESSAGE_RECEIVED notifications
- File attachments with magic byte validation (PDF/JPG/PNG/DOC/DOCX), inline polls with single/multi choice voting and named/anonymous results, absence reporting creating ExcuseService record + SYSTEM message to Klassenvorstand
- MessagingGateway at /messaging namespace with JWT JWKS auth, real-time message/read-receipt/poll-vote/conversation events wired post-transaction, CASL permission subjects for 5 roles with @CheckPermissions on all controllers
- Messages page with list-detail split view, Socket.IO real-time hooks, conversation/message TanStack Query hooks, ComposeDialog with broadcast/direct tabs, and sidebar navigation with unread badge
- Read receipt indicators with 4 visual states (sent/delivered/partial-read/all-read), detail Popover with per-recipient Gelesen/Nicht gelesen lists, and useReadReceipts hook wired to GET /:messageId/recipients endpoint
- File attachments with upload validation, inline polls with single/multi choice and result bars, and parent absence quick-action completing the Phase 7 Communication feature set
- AbsenceQuickAction rewired to POST /absence-report with children from user context, and file attachments uploaded via multipart POST after message/conversation creation in ConversationView and ComposeDialog
- 5 new Prisma models (Homework, Exam, ImportJob, CalendarToken, SisApiKey), 4 enums, shared TypeScript DTOs, and 67 Wave 0 test stubs covering all 7 Phase 8 requirements
- HomeworkService and ExamService with CRUD, exam collision detection (D-03 soft warning), HOMEWORK_ASSIGNED/EXAM_SCHEDULED notifications to class students and parents, and 20 passing tests
- Untis XML/DIF and CSV parsers with BullMQ background import processor, Socket.IO progress gateway, and admin-only import REST API with conflict resolution (skip/update/fail)
- iCal subscription with token-authenticated .ics endpoint combining timetable/homework/exams, plus SIS read-only API with X-Api-Key guard and CASL permission seeds for all Phase 8 entities
- TanStack Query hooks for homework/exam CRUD, create/edit dialogs with exam collision warning, BookOpen/ClipboardList badge overlays on timetable cells via renderCell, and classbook Aufgaben tab integration
- 5-step import wizard with Untis XML/CSV drag-and-drop, column mapping, dry-run preview, real-time Socket.IO progress, and iCal subscription management with clipboard copy and token rotation
- All 10 authenticated routes and 18 files now fully usable at 375px and 768px viewports with 44px touch targets, mobile day-only timetable view, horizontal scroll wrappers on tables, and full-screen dialogs
- PWA infrastructure with vite-plugin-pwa injectManifest mode, custom Workbox service worker (NetworkFirst timetable caching, push event stub, SKIP_WAITING), OfflineBanner + PwaInstallBanner + PwaInstallSettings components, and service worker update toast wired into the root layout.
- Web push backend with PushSubscription Prisma model, web-push 3.6.7 + VAPID delivery, BullMQ PushProcessor with 410/404 auto-cleanup, and NotificationService extended to queue push alongside Socket.IO so users get system notifications even when the tab is closed.
- usePushSubscription React hook + PushNotificationSettings card wiring the Phase 09-03 web push backend into the settings page with three visual states (disabled / active / blocked), feature-detection for iOS Safari, and a user-gesture-only permission prompt — plus the Phase 9 human verification checkpoint clearance for all 5 requirements.
- Liveness/readiness split (GET /health vs GET /health/ready with DB/Redis/Keycloak probes), pg_dump+Redis+uploads backup/restore scripts with manifest integrity verification, and multi-stage Dockerfiles with resource-limited docker-compose.prod.yml override.
- Removed `api/v1/` double-prefix from ImportController, wired `API_INTERNAL_URL` env var into docker-compose.prod.yml for the Timefold solver callback, added HOMEWORK/EXAM/IMPORT/PUSH to PermissionSubject enum, and refreshed Phase 6 verification report from gaps_found to passed.
- DSGVO Art. 15 export, Art. 17 anonymization, and retention deletion now extend across Phase 5-8 personal data tables (grades, attendance, messages, notifications, homework, exams, calendar tokens).
- Live /solver Socket.IO consumer with admin Stundenplan-Generator page, school-scoped connection, live hard/soft score display, and sidebar entry for admin/schulleitung -- closes v1.0 audit Finding 3 (TIME-06).

---
