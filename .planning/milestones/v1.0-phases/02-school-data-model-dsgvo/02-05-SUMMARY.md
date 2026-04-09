---
phase: 02-school-data-model-dsgvo
plan: 05
subsystem: api
tags: [dsgvo, consent, retention, dsfa, vvz, bullmq, nestjs, prisma]

# Dependency graph
requires:
  - phase: 02-01
    provides: Prisma schema with ConsentRecord, RetentionPolicy, DsfaEntry, VvzEntry, ProcessingPurpose enum
provides:
  - ConsentService with grant/withdraw/query per processing purpose (DSGVO Art. 6/7)
  - RetentionService with Austrian-specific defaults and expired record checking
  - DsfaService with DSFA/VVZ CRUD and JSON export
  - RetentionProcessor for daily BullMQ cron cleanup
  - DsgvoModule fully assembled with all DSGVO sub-modules
affects: [phase-03-timetable-solver, phase-05-classbook, phase-07-communication]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-purpose consent tracking, retention policy with system defaults and admin overrides, BullMQ repeatable cron job registration via OnModuleInit]

key-files:
  created:
    - apps/api/src/modules/dsgvo/consent/consent.controller.ts
    - apps/api/src/modules/dsgvo/consent/consent.service.ts
    - apps/api/src/modules/dsgvo/consent/consent.service.spec.ts
    - apps/api/src/modules/dsgvo/consent/dto/create-consent.dto.ts
    - apps/api/src/modules/dsgvo/consent/dto/withdraw-consent.dto.ts
    - apps/api/src/modules/dsgvo/consent/dto/consent-response.dto.ts
    - apps/api/src/modules/dsgvo/retention/retention.controller.ts
    - apps/api/src/modules/dsgvo/retention/retention.service.ts
    - apps/api/src/modules/dsgvo/retention/retention.service.spec.ts
    - apps/api/src/modules/dsgvo/retention/dto/create-retention-policy.dto.ts
    - apps/api/src/modules/dsgvo/retention/dto/retention-policy-response.dto.ts
    - apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts
    - apps/api/src/modules/dsgvo/dsfa/dsfa.service.ts
    - apps/api/src/modules/dsgvo/dsfa/dsfa.service.spec.ts
    - apps/api/src/modules/dsgvo/dsfa/dto/create-dsfa-entry.dto.ts
    - apps/api/src/modules/dsgvo/dsfa/dto/create-vvz-entry.dto.ts
    - apps/api/src/modules/dsgvo/dsfa/dto/dsfa-response.dto.ts
    - apps/api/src/modules/dsgvo/processors/retention.processor.ts
  modified:
    - apps/api/src/modules/dsgvo/dsgvo.module.ts

key-decisions:
  - "Austrian-specific retention defaults: noten=21900d (60yr), anwesenheit=1825d (5yr), kommunikation=365d (1yr)"
  - "Consent re-grant pattern: update existing record with version++ instead of creating new row"
  - "DsgvoModule OnModuleInit registers BullMQ repeatable job at cron 0 2 * * * for daily retention check"

patterns-established:
  - "Per-purpose consent tracking with grant/withdraw lifecycle and version tracking"
  - "Retention policy with DEFAULT_RETENTION_DAYS constant map and getEffectivePolicy fallback chain"
  - "DSFA/VVZ combined JSON export with school metadata envelope"

requirements-completed: [DSGVO-01, DSGVO-05, DSGVO-06]

# Metrics
duration: 6min
completed: 2026-03-29
---

# Phase 02 Plan 05: DSGVO Consent, Retention, and DSFA/VVZ Summary

**DSGVO consent tracking with 7 processing purposes, retention policy management with Austrian-specific defaults, DSFA/VVZ CRUD with combined JSON export, and daily BullMQ retention cron**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-29T17:39:26Z
- **Completed:** 2026-03-29T17:45:48Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments
- Consent tracking at /dsgvo/consent with grant, withdraw, and query per person and processing purpose (DSGVO Art. 6/7 Zweckbindung)
- Retention policy CRUD at /dsgvo/retention with Austrian Aufbewahrungspflicht defaults (noten=60yr, anwesenheit=5yr, kommunikation=1yr) and admin override capability
- DSFA + VVZ CRUD at /dsgvo/dsfa with JSON export for Datenschutzbeauftragte
- Daily BullMQ cron processor for automated retention checks at 2 AM
- DsgvoModule fully assembled with all consent, retention, DSFA, deletion, and export sub-modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Consent tracking and retention policy CRUD** - `938de0d` (feat)
2. **Task 2: DSFA/VVZ CRUD with export, retention BullMQ processor, and DsgvoModule assembly** - `81a2f3b` (feat, shared with parallel plan 02-06)

## Files Created/Modified
- `apps/api/src/modules/dsgvo/consent/consent.controller.ts` - POST /, POST /withdraw, GET /person/:id, GET /school/:id endpoints
- `apps/api/src/modules/dsgvo/consent/consent.service.ts` - grant, withdraw, findByPerson, findBySchool, hasConsent methods
- `apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` - 10 unit tests for consent lifecycle
- `apps/api/src/modules/dsgvo/consent/dto/create-consent.dto.ts` - 7 ProcessingPurpose enum values + 6 LegalBasis values
- `apps/api/src/modules/dsgvo/consent/dto/withdraw-consent.dto.ts` - personId + purpose for withdrawal
- `apps/api/src/modules/dsgvo/consent/dto/consent-response.dto.ts` - ApiProperty decorated response DTO
- `apps/api/src/modules/dsgvo/retention/retention.controller.ts` - POST, GET, PUT, DELETE, GET /check endpoints
- `apps/api/src/modules/dsgvo/retention/retention.service.ts` - CRUD + getEffectivePolicy + checkExpiredRecords with DEFAULT_RETENTION_DAYS
- `apps/api/src/modules/dsgvo/retention/retention.service.spec.ts` - 12 unit tests for retention policies and defaults
- `apps/api/src/modules/dsgvo/retention/dto/create-retention-policy.dto.ts` - schoolId, dataCategory, retentionDays
- `apps/api/src/modules/dsgvo/retention/dto/retention-policy-response.dto.ts` - ApiProperty decorated response DTO
- `apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts` - DSFA + VVZ CRUD + combined export endpoint
- `apps/api/src/modules/dsgvo/dsfa/dsfa.service.ts` - DSFA/VVZ CRUD + exportDsfaJson, exportVvzJson, exportCombinedJson
- `apps/api/src/modules/dsgvo/dsfa/dsfa.service.spec.ts` - 9 unit tests for DSFA/VVZ operations
- `apps/api/src/modules/dsgvo/dsfa/dto/create-dsfa-entry.dto.ts` - schoolId, title, description, dataCategories
- `apps/api/src/modules/dsgvo/dsfa/dto/create-vvz-entry.dto.ts` - activityName, purpose, legalBasis, dataCategories, affectedPersons
- `apps/api/src/modules/dsgvo/dsfa/dto/dsfa-response.dto.ts` - DsfaEntryResponseDto + VvzEntryResponseDto
- `apps/api/src/modules/dsgvo/processors/retention.processor.ts` - @Processor(DSGVO_RETENTION_QUEUE) extends WorkerHost
- `apps/api/src/modules/dsgvo/dsgvo.module.ts` - Full assembly with OnModuleInit cron registration

## Decisions Made
- Austrian-specific retention defaults defined as constants: noten=21900 days (60 years per Aufbewahrungspflicht), anwesenheit=1825 days (5 years), kommunikation=365 days (1 year)
- Consent re-grant after withdrawal updates existing record with version++ rather than creating a new row (preserves @@unique([personId, purpose]) constraint)
- DsgvoModule implements OnModuleInit to register a BullMQ repeatable job at cron '0 2 * * *' for daily retention checks
- DSFA/VVZ combined export envelope includes school metadata (name, type) for Datenschutzbeauftragte context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DsgvoModule and DSFA files committed by parallel agent**
- **Found during:** Task 2
- **Issue:** Parallel plan 02-06 execution created the DsgvoModule assembly and committed Task 2 files (DSFA, retention processor) in its commit `81a2f3b` because both plans wrote to the same module file
- **Fix:** Verified all files contain correct content from this plan's specifications. Task 2 commit is shared with parallel plan 02-06 at `81a2f3b`
- **Files affected:** apps/api/src/modules/dsgvo/dsgvo.module.ts, all DSFA and retention processor files
- **Verification:** All 130 tests pass including Consent, Retention, and DSFA suites

---

**Total deviations:** 1 auto-fixed (parallel execution collision)
**Impact on plan:** No functional impact. All plan artifacts exist with correct content.

## Issues Encountered
- Parallel execution with plan 02-06 resulted in shared commit for DsgvoModule assembly. Both plans converged on identical DsgvoModule structure, so no merge conflict occurred.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DSGVO consent infrastructure ready for integration with future module guards
- Retention policies ready for Phase 5 (ClassBook) data categories
- DSFA/VVZ export ready for admin dashboard in Phase 4
- All DSGVO controllers CASL-protected with @CheckPermissions

## Self-Check: PASSED

- All 19 created files verified present on disk
- Commit 938de0d (Task 1) verified in git log
- Commit 81a2f3b (Task 2, shared with 02-06) verified in git log
- All 130 tests passing (Consent + Retention + Dsfa suites)

---
*Phase: 02-school-data-model-dsgvo*
*Completed: 2026-03-29*
