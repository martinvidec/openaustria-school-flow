---
phase: 02-school-data-model-dsgvo
plan: 01
subsystem: database
tags: [prisma, postgresql, bullmq, redis, encryption, aes-256-gcm, dsgvo, nestjs]

# Dependency graph
requires:
  - phase: 01-project-scaffolding-auth
    provides: "Prisma schema with School, TimeGrid, RBAC, Audit models; NestJS module architecture"
provides:
  - "18 new Prisma models covering Austrian school domain (Person, Teacher, Student, Parent, SchoolClass, Group, Subject) and DSGVO compliance (ConsentRecord, RetentionPolicy, DsfaEntry, VvzEntry, DsgvoJob)"
  - "8 new enums (PersonType, AvailabilityRuleType, ReductionType, GroupType, SubjectType, ProcessingPurpose, DsgvoJobType, DsgvoJobStatus)"
  - "BullMQ queue infrastructure with 3 DSGVO queues (deletion, export, retention)"
  - "AES-256-GCM encryption service with Prisma client extension for transparent Person field encryption"
  - "Database migration: 20260329172431_phase2_school_data_model_dsgvo"
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, phase-03]

# Tech tracking
tech-stack:
  added: ["@nestjs/bullmq", "bullmq", "@nestjs/schedule", "pdfkit", "ioredis", "@types/pdfkit"]
  patterns: ["Prisma client extension for transparent field encryption", "BullMQ forRootAsync with ConfigService", "Queue constants module pattern", "$enc:v1: prefix format for encrypted values"]

key-files:
  created:
    - "apps/api/src/config/queue/queue.module.ts"
    - "apps/api/src/config/queue/queue.constants.ts"
    - "apps/api/src/modules/dsgvo/encryption/encryption.service.ts"
    - "apps/api/src/modules/dsgvo/encryption/prisma-encryption.extension.ts"
    - "apps/api/src/modules/dsgvo/encryption/encryption.module.ts"
    - "apps/api/src/modules/dsgvo/encryption/encryption.service.spec.ts"
    - "apps/api/prisma/migrations/20260329172431_phase2_school_data_model_dsgvo/migration.sql"
  modified:
    - "apps/api/prisma/schema.prisma"
    - "apps/api/prisma.config.ts"
    - "apps/api/src/app.module.ts"
    - "apps/api/package.json"
    - "pnpm-lock.yaml"

key-decisions:
  - "Added datasource.url to prisma.config.ts for Prisma 7 migration support (was missing, blocking migrations)"
  - "Custom Prisma client extension for field encryption instead of third-party prisma-field-encryption library (Prisma 7 compatibility)"
  - "Encryption format $enc:v1:{iv}:{authTag}:{ciphertext} for versioned encryption with non-deterministic IV"
  - "Person model uses String type for dateOfBirth (not DateTime) for encryption compatibility"

patterns-established:
  - "Encryption prefix pattern: $enc:v1: for identifying encrypted values and enabling future algorithm migration"
  - "Queue constants pattern: Named exports in queue.constants.ts referenced by both module registration and processor injection"
  - "Global module pattern: QueueModule and EncryptionModule decorated with @Global() for app-wide availability"
  - "Prisma config datasource pattern: datasource.url in prisma.config.ts with env fallback for migration tooling"

requirements-completed: [FOUND-02, FOUND-03, FOUND-04, FOUND-05, DSGVO-01, DSGVO-02, DSGVO-04, DSGVO-05, DSGVO-06]

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 02 Plan 01: Schema & Infrastructure Summary

**Prisma schema extended with 18 Austrian school domain + DSGVO models, BullMQ queue infrastructure with 3 DSGVO queues, and AES-256-GCM encryption service with transparent Prisma field encryption**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-29T17:19:49Z
- **Completed:** 2026-03-29T17:27:51Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Extended Prisma schema with 18 new models (Person, Teacher, Student, Parent, ParentStudent, SchoolClass, Group, GroupMembership, Subject, ClassSubject, TeacherSubject, AvailabilityRule, TeachingReduction, ConsentRecord, RetentionPolicy, DsfaEntry, VvzEntry, DsgvoJob) and 8 new enums
- Configured BullMQ with Redis connection and 3 DSGVO queues (deletion, export, retention) via global QueueModule
- Implemented AES-256-GCM encryption service with Prisma client extension for transparent encryption of Person.phone, .address, .dateOfBirth, .socialSecurityNumber, .healthData
- Migration applied successfully to PostgreSQL with all new tables and indexes

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with all Phase 2 entity models and run migration** - `96e42b2` (feat)
2. **Task 2: Install dependencies, configure BullMQ queue module, and implement encryption service** - `8547598` (feat)

## Files Created/Modified
- `apps/api/prisma/schema.prisma` - Extended with 18 new models and 8 new enums for Austrian school domain and DSGVO
- `apps/api/prisma.config.ts` - Added datasource.url for Prisma 7 migration support
- `apps/api/prisma/migrations/20260329172431_phase2_school_data_model_dsgvo/migration.sql` - Phase 2 database migration
- `apps/api/src/config/queue/queue.module.ts` - Global BullMQ module with Redis connection and 3 DSGVO queues
- `apps/api/src/config/queue/queue.constants.ts` - Queue name constants
- `apps/api/src/modules/dsgvo/encryption/encryption.service.ts` - AES-256-GCM field encryption service
- `apps/api/src/modules/dsgvo/encryption/prisma-encryption.extension.ts` - Prisma client extension for transparent Person field encryption
- `apps/api/src/modules/dsgvo/encryption/encryption.module.ts` - Global encryption module
- `apps/api/src/modules/dsgvo/encryption/encryption.service.spec.ts` - 10 unit tests for encryption service
- `apps/api/src/app.module.ts` - Added QueueModule and EncryptionModule imports
- `apps/api/package.json` - Added @nestjs/bullmq, bullmq, @nestjs/schedule, pdfkit, ioredis
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- **Prisma config datasource URL:** Added `datasource.url` to `prisma.config.ts` because Prisma 7 requires it for `migrate dev`. Uses `process.env.DATABASE_URL` with fallback to local dev default.
- **Custom encryption extension over library:** Built custom Prisma client extension (~120 lines) instead of using `prisma-field-encryption` library which only documents support up to Prisma 6.13.0.
- **String type for dateOfBirth:** Person.dateOfBirth stored as String (not DateTime) to allow transparent encryption/decryption without type conversion issues.
- **Encryption format versioning:** `$enc:v1:` prefix enables future algorithm migration (e.g., v2 could switch to AES-256-CBC or ChaCha20).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added datasource.url to prisma.config.ts**
- **Found during:** Task 1 (Prisma migration)
- **Issue:** `prisma migrate dev` failed with "The datasource.url property is required in your Prisma config file when using prisma migrate dev" -- Prisma 7 requires explicit datasource URL in config for migrations (not just at runtime via adapter)
- **Fix:** Added `datasource: { url: process.env.DATABASE_URL ?? 'postgresql://...' }` to prisma.config.ts
- **Files modified:** apps/api/prisma.config.ts
- **Verification:** `prisma migrate dev` succeeded after fix
- **Committed in:** 96e42b2 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Essential fix for migration tooling to work with Prisma 7. No scope creep.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required. Docker services (PostgreSQL, Redis) were already configured in Phase 1.

## Next Phase Readiness
- All 18 entity models are in the database and available via Prisma client
- BullMQ queues ready for DSGVO job processors (Plans 02-05, 02-06)
- Encryption service ready for use in all Phase 2 CRUD modules
- All subsequent plans (02-02 through 02-07) can now proceed

## Self-Check: PASSED

- All 11 key files verified present on disk
- Both task commits (96e42b2, 8547598) verified in git log
- prisma validate: exits 0
- prisma generate: exits 0
- Encryption tests: 23/23 pass (10 new + 13 existing)
- nest build: 0 errors, 88 files compiled

---
*Phase: 02-school-data-model-dsgvo*
*Completed: 2026-03-29*
