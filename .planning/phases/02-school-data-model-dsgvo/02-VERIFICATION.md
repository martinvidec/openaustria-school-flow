---
phase: 02-school-data-model-dsgvo
verified: 2026-03-29T17:59:27Z
status: gaps_found
score: 9/10 must-haves verified
gaps:
  - truth: "Production TypeScript build compiles with zero errors"
    status: failed
    reason: "nest build (TSC) exits with 3 type errors in DSGVO module files. Tests pass via Vitest/SWC but a Docker production build would fail."
    artifacts:
      - path: "apps/api/src/modules/dsgvo/dsgvo.module.ts"
        issue: "Line 50: 'cron' does not exist in type 'RepeatOptions' (BullMQ v5 API change — property is now 'pattern' not 'cron')"
      - path: "apps/api/src/modules/dsgvo/export/data-export.service.ts"
        issue: "Line 204: PersonExportData not assignable to Prisma InputJsonValue — needs 'as unknown as Prisma.InputJsonValue' cast"
      - path: "apps/api/src/modules/dsgvo/deletion/data-deletion.service.ts"
        issue: "Line 130: 'unknown' not assignable to Prisma InputJsonValue — needs type cast for audit metadata update"
    missing:
      - "Add type cast: 'as Prisma.InputJsonValue' on data-export.service.ts line 204 and data-deletion.service.ts line 130"
      - "Fix BullMQ repeat option: change 'cron:' to 'pattern:' in dsgvo.module.ts line 50"
human_verification:
  - test: "Run 'cd apps/api && npx prisma db seed' against a live PostgreSQL database"
    expected: "Seed completes without errors, sample school 'BG/BRG Musterstadt' and all RBAC permissions created"
    why_human: "Requires running PostgreSQL and Redis instances — cannot verify programmatically without live services"
  - test: "Trigger a data export job via POST /dsgvo/export with a valid personId and wait for BullMQ to process it"
    expected: "DsgvoJob transitions QUEUED -> PROCESSING -> COMPLETED with resultData containing jsonExport and pdfBase64"
    why_human: "Requires live Redis (BullMQ) and PostgreSQL — async job processing cannot be verified statically"
---

# Phase 02: School Data Model + DSGVO Verification Report

**Phase Goal:** The complete school entity model (teachers, classes, students, subjects) is populated and queryable, with DSGVO compliance infrastructure (consent tracking, data deletion, export, encryption, retention) operational from the start
**Verified:** 2026-03-29T17:59:27Z
**Status:** gaps_found (1 gap: 3 TypeScript build errors blocking production compilation)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Prisma schema contains all 18 Phase 2 models (Person, Teacher, Student, Parent, SchoolClass, Group, GroupMembership, Subject, ClassSubject, TeacherSubject, AvailabilityRule, TeachingReduction, ConsentRecord, RetentionPolicy, DsfaEntry, VvzEntry, DsgvoJob, ParentStudent) | ✓ VERIFIED | `grep "^model " schema.prisma` returns all 18 models |
| 2 | BullMQ queues configured with Redis connection (deletion, export, retention) | ✓ VERIFIED | `queue.module.ts` contains `BullModule.forRootAsync` with REDIS_HOST/REDIS_PORT; 3 queues registered |
| 3 | Encryption service roundtrips AES-256-GCM and Prisma extension encrypts Person sensitive fields | ✓ VERIFIED | `encryption.service.ts` implements `$enc:v1:` format; `prisma-encryption.extension.ts` maps `Person: ['phone','address','dateOfBirth','socialSecurityNumber','healthData']` |
| 4 | Teachers can be created with Werteinheiten calculation and Austrian Lehrverpflichtungsgruppen | ✓ VERIFIED | `werteinheiten.util.ts` exports `LEHRVERPFLICHTUNGSGRUPPEN` (9 groups), `calculateWerteinheiten`, `calculateMaxTeachingHours`; `teacher.service.ts` calls these |
| 5 | Students and Classes with Stammklasse/Gruppen model including auto-derivation | ✓ VERIFIED | `student.service.ts` creates Person with `personType: 'STUDENT'`; `group-membership-rule.service.ts` creates GroupMembership with `isAutoAssigned: true` |
| 6 | Stundentafel templates exist for AHS Unterstufe and Mittelschule (8 templates) and can be applied to classes | ✓ VERIFIED | `austrian-stundentafeln.ts` exports 8 templates (4 AHS_UNTER + 4 MS); `stundentafel-template.service.ts` calls `prisma.classSubject.createMany` |
| 7 | DSGVO consent tracking with 7 purposes, grant/withdraw lifecycle | ✓ VERIFIED | `consent.service.ts` implements grant/withdraw/hasConsent/findByPerson with `prisma.consentRecord`; ProcessingPurpose enum has all 7 values |
| 8 | Retention policies with Austrian defaults (noten=60yr) and daily BullMQ cron at 2 AM | ✓ VERIFIED | `retention.service.ts` has defaults noten=21900, anwesenheit=1825, kommunikation=365; `dsgvo.module.ts` schedules `cron: '0 2 * * *'` via BullMQ |
| 9 | Data deletion (anonymization) and export (JSON+PDF) with async BullMQ workers and DsgvoJob tracking | ✓ VERIFIED | `data-deletion.service.ts` atomically replaces PII with 'Geloeschte'/'Person #NNN'; `pdf-export.service.ts` uses pdfkit with DSGVO title; processors wire to services |
| 10 | All modules compile together and the full test suite (136 tests) passes; production nest build has zero errors | ✗ FAILED | Vitest: 136/136 pass. `nest build` (TSC) exits 1 with 3 type errors in DSGVO files (deferred-items.md) |

**Score:** 9/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/prisma/schema.prisma` | All 18 Phase 2 models + 8 enums | ✓ VERIFIED | 18 models confirmed via grep; migration 20260329172431_phase2_school_data_model_dsgvo applied |
| `apps/api/src/config/queue/queue.module.ts` | BullMQ global queue configuration | ✓ VERIFIED | `BullModule.forRootAsync` with Redis env vars; 3 queues registered |
| `apps/api/src/modules/dsgvo/encryption/encryption.service.ts` | AES-256-GCM field encryption | ✓ VERIFIED | Implements encrypt/decrypt/isEncrypted/isConfigured with `$enc:v1:` prefix |
| `apps/api/src/modules/dsgvo/encryption/prisma-encryption.extension.ts` | Prisma transparent encryption | ✓ VERIFIED | `ENCRYPTED_FIELDS` maps Person to 5 fields (phone, address, dateOfBirth, socialSecurityNumber, healthData) |
| `apps/api/src/modules/teacher/teacher.service.ts` | Teacher CRUD with Person+Werteinheiten | ✓ VERIFIED | Creates Person with `personType: 'TEACHER'`; calls `calculateMaxTeachingHours` |
| `apps/api/src/modules/teacher/werteinheiten.util.ts` | Austrian Lehrverpflichtung calculation | ✓ VERIFIED | 9 LEHRVERPFLICHTUNGSGRUPPEN; calculateWerteinheiten throws on unknown group |
| `apps/api/src/modules/student/student.service.ts` | Student CRUD with Person creation | ✓ VERIFIED | `prisma.person.create` with nested `student.create` and `personType: 'STUDENT'` |
| `apps/api/src/modules/class/class.service.ts` | SchoolClass CRUD with student assignment | ✓ VERIFIED | ConflictException on duplicate name; assignStudent/removeStudent implemented |
| `apps/api/src/modules/class/group-membership-rule.service.ts` | Group auto-derivation engine | ✓ VERIFIED | `applyRules` creates GroupMembership with `isAutoAssigned: true` |
| `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` | Static Stundentafel data | ✓ VERIFIED | 8 templates exported; AHS_UNTER yr1 totalWeeklyHours=31 |
| `apps/api/src/modules/subject/stundentafel-template.service.ts` | Template application service | ✓ VERIFIED | `applyTemplate` calls `prisma.classSubject.createMany` |
| `apps/api/src/modules/subject/subject.service.ts` | Subject CRUD + ClassSubject management | ✓ VERIFIED | addToClass/removeFromClass/updateClassHours/getClassSubjects all present |
| `apps/api/src/modules/dsgvo/consent/consent.service.ts` | Consent CRUD | ✓ VERIFIED | grant/withdraw/findByPerson/hasConsent with prisma.consentRecord |
| `apps/api/src/modules/dsgvo/retention/retention.service.ts` | Retention policy + expiry check | ✓ VERIFIED | Austrian defaults; checkExpiredRecords; getEffectivePolicy |
| `apps/api/src/modules/dsgvo/dsfa/dsfa.service.ts` | DSFA + VVZ CRUD and export | ✓ VERIFIED | createDsfaEntry/createVvzEntry/exportCombinedJson all present |
| `apps/api/src/modules/dsgvo/processors/retention.processor.ts` | BullMQ daily cron worker | ✓ VERIFIED | `@Processor(DSGVO_RETENTION_QUEUE)`, calls `retentionService.checkExpiredRecords` |
| `apps/api/src/modules/dsgvo/deletion/data-deletion.service.ts` | Person anonymization | ⚠️ WIRED (TSC error) | Logic correct — `Geloeschte`/`Person #NNN`, `isAnonymized: true`, `prisma.$transaction`. TSC type error at line 130 (Prisma JSON cast) |
| `apps/api/src/modules/dsgvo/export/data-export.service.ts` | Data aggregation across entities | ⚠️ WIRED (TSC error) | Aggregates Person+Teacher/Student/Parent+consent+audit. TSC type error at line 204 (Prisma JSON cast) |
| `apps/api/src/modules/dsgvo/export/pdf-export.service.ts` | PDF rendering via pdfkit | ✓ VERIFIED | PDFDocument with `Datenauskunft nach Art. 15 DSGVO` title; returns Buffer |
| `apps/api/src/modules/dsgvo/processors/deletion.processor.ts` | BullMQ deletion worker | ✓ VERIFIED | `@Processor(DSGVO_DELETION_QUEUE)`, calls `dataDeletionService.anonymizePerson` |
| `apps/api/src/modules/dsgvo/processors/export.processor.ts` | BullMQ export worker | ✓ VERIFIED | `@Processor(DSGVO_EXPORT_QUEUE)`, calls `dataExportService.generateExport` |
| `apps/api/src/modules/dsgvo/dsgvo.module.ts` | Full DsgvoModule assembly | ⚠️ WIRED (TSC error) | All 5 controllers + all processors registered. TSC error at line 50 (BullMQ 'cron' -> 'pattern') |
| `apps/api/src/modules/auth/casl/casl-ability.factory.spec.ts` | CASL Phase 2 subject tests | ✓ VERIFIED | Tests cover teacher/student/class/subject/consent/retention/export/dsfa/person across 5 roles |
| `apps/api/src/modules/audit/audit.service.ts` | Extended SENSITIVE_RESOURCES | ✓ VERIFIED | Array includes consent, export, person, retention |
| `apps/api/prisma/seed.ts` | Seed data with RBAC + sample school | ✓ VERIFIED | 5 roles, 61 permissions across Phase 2 entities; sample school "BG/BRG Musterstadt" with 3 teachers, 6 students, 7 retention defaults |
| `apps/api/src/app.module.ts` | All Phase 2 modules imported | ✓ VERIFIED | QueueModule, EncryptionModule, DsgvoModule, TeacherModule, StudentModule, ClassModule, SubjectModule all imported |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `queue.module.ts` | Redis (Docker Compose) | ioredis with REDIS_HOST/REDIS_PORT | ✓ WIRED | `config.get('REDIS_HOST', 'localhost')` + `config.get<number>('REDIS_PORT', 6379)` |
| `prisma-encryption.extension.ts` | `schema.prisma` Person model | ENCRYPTED_FIELDS map | ✓ WIRED | Maps `Person: ['phone','address','dateOfBirth','socialSecurityNumber','healthData']` — exactly the 5 schema fields |
| `teacher.service.ts` | `prisma.person + prisma.teacher` | Nested create | ✓ WIRED | `prisma.person.create({ data: { personType: 'TEACHER', teacher: { create: {...} } } })` |
| `student.service.ts` | `prisma.person + prisma.student` | Nested create | ✓ WIRED | `prisma.person.create({ data: { personType: 'STUDENT', student: { create: {...} } } })` |
| `group-membership-rule.service.ts` | `prisma.groupMembership` | Bulk create with isAutoAssigned=true | ✓ WIRED | `createMany` with `isAutoAssigned: true` at lines 77 and 107 |
| `stundentafel-template.service.ts` | `prisma.classSubject` | Creates ClassSubject entries | ✓ WIRED | `prisma.classSubject.createMany` at line 85 |
| `consent.service.ts` | `prisma.consentRecord` | CRUD operations | ✓ WIRED | `findUnique`, `create`, `update`, `findMany` on consentRecord |
| `retention.processor.ts` | `retention.service.ts` | BullMQ processor calls service | ✓ WIRED | `retentionService.checkExpiredRecords(job.data.schoolId)` |
| `dsgvo.module.ts` | BullMQ DSGVO_RETENTION_QUEUE | Daily cron `0 2 * * *` | ⚠️ PARTIAL | Logic correct but `cron:` property causes TSC TS2353 error (BullMQ v5 changed to `pattern:`) |
| `deletion.processor.ts` | `data-deletion.service.ts` | BullMQ worker calls anonymizePerson | ✓ WIRED | `dataDeletionService.anonymizePerson(personId, dsgvoJobId)` |
| `data-export.service.ts` | `prisma.person + prisma.teacher + prisma.student + prisma.consentRecord` | Aggregation query | ✓ WIRED | `prisma.person.findUnique` with include for teacher/student/parent/consentRecords |
| `seed.ts` | `prisma.role + prisma.permission` | Upsert permissions for new subjects | ✓ WIRED | Permissions created for subjects: teacher, student, class, subject, consent, retention, export, dsfa, person |
| `app.module.ts` | All Phase 2 modules | Import wiring | ✓ WIRED | All 7 modules present in imports array |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `teacher.service.ts findAll` | teachers list | `prisma.teacher.findMany` with schoolId filter + includes | Yes — DB query with includes | ✓ FLOWING |
| `student.service.ts findAll` | students list | `prisma.student.findMany` with schoolId filter | Yes — DB query | ✓ FLOWING |
| `consent.service.ts findByPerson` | consent records | `prisma.consentRecord.findMany` by personId | Yes — DB query | ✓ FLOWING |
| `data-export.service.ts generateExport` | exportData | `prisma.person.findUnique` with full includes + auditEntry query | Yes — aggregates 4+ tables | ✓ FLOWING |
| `retention.service.ts checkExpiredRecords` | expired list | Loops categories, queries each via `getEffectivePolicy` | Yes — queries against school IDs | ✓ FLOWING |
| `stundentafel-template.service.ts applyTemplate` | ClassSubject entries | `prisma.classSubject.createMany` with template data | Yes — writes real DB records | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 136 unit tests pass | `pnpm --filter @schoolflow/api test -- --run` | 17 test files, 136 tests, 0 failures | ✓ PASS |
| Encryption roundtrip | `pnpm --filter @schoolflow/api test -- --run -t "Encryption"` | All encryption tests pass | ✓ PASS |
| Werteinheiten calculation | `pnpm --filter @schoolflow/api test -- --run -t "Werteinheiten"` | All Werteinheiten tests pass | ✓ PASS |
| Production TypeScript build | `cd apps/api && npx nest build` | Exit 1 — 3 TSC errors in DSGVO files | ✗ FAIL |
| Schema validation | `cd apps/api && npx prisma validate` | Exit 0 — schema is valid | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FOUND-02 | 02-01, 02-02, 02-07 | Admin kann Lehrer mit Stammdaten erfassen (Name, Fächer, Verfügbarkeit, Beschäftigungsgrad) | ✓ SATISFIED | `teacher.service.ts` creates Person+Teacher with personType=TEACHER, subject qualifications via TeacherSubject, availability rules, employment percentage |
| FOUND-03 | 02-01, 02-03, 02-07 | Admin kann Klassen/Gruppen anlegen mit Schülerzuordnung | ✓ SATISFIED | `class.service.ts` + `group.service.ts` + `group-membership-rule.service.ts`; Student assigned to SchoolClass via classId |
| FOUND-04 | 02-01, 02-04, 02-07 | Admin kann Fächer mit Wochenstunden-Soll pro Klasse definieren | ✓ SATISFIED | `subject.service.ts` addToClass creates ClassSubject with weeklyHours; `stundentafel-template.service.ts` bulk-applies weekly hours from templates |
| FOUND-05 | 02-01, 02-04, 02-07 | System unterstützt verschiedene Schultypen (VS, MS, AHS, BHS) | ✓ SATISFIED | `AUSTRIAN_STUNDENTAFELN` templates for AHS_UNTER and MS; SubjectType enum (PFLICHT/WAHLPFLICHT/FREIGEGENSTAND/UNVERBINDLICH); SchoolType enum in schema |
| DSGVO-01 | 02-01, 02-05, 02-07 | System trackt Einwilligungen pro Datenverarbeitungszweck | ✓ SATISFIED | `consent.service.ts` grant/withdraw with 7 ProcessingPurpose values; ConsentRecord @@unique([personId, purpose]) |
| DSGVO-02 | 02-01, 02-06, 02-07 | Personenbezogene Daten können vollständig gelöscht werden | ✓ SATISFIED (TSC warning) | `data-deletion.service.ts` anonymizePerson replaces PII with placeholders in `prisma.$transaction`; BullMQ async processing; DsgvoJob tracking |
| DSGVO-03 | 02-01, 02-06, 02-07 | Nutzer können Export aller eigenen Daten anfordern (Art. 15) | ✓ SATISFIED (TSC warning) | `data-export.service.ts` aggregates Person+role data+consents+audit; `pdf-export.service.ts` pdfkit with German DSGVO title |
| DSGVO-04 | 02-01 | Datenbank-Felder mit sensiblen Daten sind verschlüsselt | ✓ SATISFIED | `encryption.service.ts` AES-256-GCM; `prisma-encryption.extension.ts` encrypts 5 Person fields transparently |
| DSGVO-05 | 02-01, 02-05, 02-07 | Automatisierte Aufbewahrungsfristen mit konfigurierbarer Ablaufzeit | ✓ SATISFIED (TSC warning) | `retention.service.ts` Austrian defaults; `retention.processor.ts` BullMQ worker; cron job registered (TSC error on 'cron' -> 'pattern') |
| DSGVO-06 | 02-01, 02-05, 02-07 | System liefert DSFA-Template und Verarbeitungsverzeichnis-Export | ✓ SATISFIED | `dsfa.service.ts` CRUD for DsfaEntry+VvzEntry; `exportCombinedJson` returns JSON export |

**All 10 requirements have implementation evidence. DSGVO-02, DSGVO-03, DSGVO-05 are marked with TSC warning because the files containing their logic have type errors that prevent production compilation.**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/modules/dsgvo/dsgvo.module.ts` | 50 | `repeat: { cron: '...' }` — BullMQ v5 changed this property to `pattern:` | 🛑 Blocker | Cron job registration will fail at runtime if BullMQ rejects the option; TSC error already flags it |
| `src/modules/dsgvo/export/data-export.service.ts` | 204 | `resultData: { jsonExport, pdfBase64 }` — needs Prisma type cast | ⚠️ Warning | Won't fail at runtime (Prisma accepts the value) but prevents production build |
| `src/modules/dsgvo/deletion/data-deletion.service.ts` | 130 | `data: { metadata: sanitized }` — `unknown` type not cast to `InputJsonValue` | ⚠️ Warning | Won't fail at runtime but prevents production build |

*Note: No stub anti-patterns found. All service methods contain real database queries, not placeholder returns.*

### Human Verification Required

#### 1. Database Seed Execution

**Test:** Run `cd apps/api && npx prisma db seed` against a running PostgreSQL + Redis stack
**Expected:** Seed completes without errors. Sample school "BG/BRG Musterstadt" visible in database with 3 teachers, 6 students, 2 classes, 4 subjects, 61 RBAC permissions across 5 roles, and 7 retention policies
**Why human:** Requires live Docker services (PostgreSQL, Redis) — cannot verify without running infrastructure

#### 2. BullMQ Async Job Processing (Data Export)

**Test:** With app running, POST to `/dsgvo/export` with a valid personId; poll job status endpoint
**Expected:** DsgvoJob transitions QUEUED -> PROCESSING -> COMPLETED; resultData contains `jsonExport` (aggregated JSON) and `pdfBase64` (base64-encoded PDF)
**Why human:** Requires live Redis for BullMQ worker to process the job; async flow cannot be tested statically

#### 3. Field Encryption in Database

**Test:** Create a teacher with a phone number via POST `/teachers`, then inspect the `persons` table directly via psql
**Expected:** The `phone` column contains an encrypted value starting with `$enc:v1:`, but the API returns the decrypted value
**Why human:** Requires live database access to verify at-rest encryption

### Gaps Summary

The phase goal is substantively achieved: all 18 entity models are in the database, all CRUD APIs are implemented and wired, all DSGVO compliance features (consent, deletion, export, encryption, retention, DSFA) have real implementation with async BullMQ processing.

The single gap blocking a clean production build is 3 TypeScript type errors in DSGVO module files:

1. **`dsgvo.module.ts:50`** — BullMQ v5 changed `repeat.cron` to `repeat.pattern`. This is both a type error and a potential runtime bug where the daily retention cron may not register correctly.
2. **`data-export.service.ts:204`** — Prisma JSON field type cast missing. Runtime behavior is unaffected (Prisma accepts the value) but TSC rejects it.
3. **`data-deletion.service.ts:130`** — Same Prisma JSON field type cast issue.

These were acknowledged and deferred in `deferred-items.md` from Plan 07. Fix requires ~5 lines of code total: add `as Prisma.InputJsonValue` casts and change `cron:` to `pattern:`.

---

_Verified: 2026-03-29T17:59:27Z_
_Verifier: Claude (gsd-verifier)_
