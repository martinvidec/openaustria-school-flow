# Phase 2: School Data Model & DSGVO - Research

**Researched:** 2026-03-29
**Domain:** Prisma schema design, Austrian school domain modeling, DSGVO compliance infrastructure, application-level encryption, BullMQ job queues
**Confidence:** HIGH

## Summary

Phase 2 extends the Phase 1 foundation (School, TimeGrid, Period, RBAC, Audit) with the full school entity model (Teacher, Student, Class/Group, Subject, Stundentafel) and DSGVO compliance infrastructure (consent tracking, data export, anonymization-based deletion, field encryption, retention automation, DSFA/VVZ export). The codebase already has well-established patterns from Phase 1: NestJS module structure (module + controller + service + DTOs), CASL-based permissions with `@CheckPermissions`, global AuditInterceptor, Prisma 7.6.0 with `@@map()` naming, UUID PKs, and pagination DTOs. All Phase 2 entities follow these patterns.

The most technically complex areas are: (1) application-level field encryption via Prisma client extensions (the `prisma-field-encryption` library claims `>= 4.7` peer dep but documents support only up to 6.13.0 -- recommend a custom extension using Node.js crypto for Prisma 7 safety), (2) the Austrian Lehrverpflichtung/Werteinheiten model which requires domain-specific calculation logic, and (3) the DSGVO data export which needs JSON aggregation across all entities plus PDF rendering.

**Primary recommendation:** Build all entity modules (Teacher, Student, Class/Group, Subject) following the Phase 1 School module pattern exactly. Implement DSGVO infrastructure as a dedicated `dsgvo` module containing consent tracking, export, deletion, retention, and DSFA/VVZ services. Use a custom Prisma client extension for field encryption rather than the third-party library. Use BullMQ for all async DSGVO operations (deletion, export generation, retention cleanup).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Constraint rules for availability -- teachers define rules like 'max 4 days/week', 'no afternoons on Friday', 'not available period 1-2 on Mondays'. Most expressive model, validated against TimeGrid periods.
- **D-02:** Full Lehrverpflichtung model -- track Werteinheiten (value units), Faecherzuschlaege (subject bonuses), and Abschlaege (reductions: Kustodiat, Klassenvorstand, Mentor, etc.). Derive max weekly teaching hours from these. Matches Austrian payroll logic.
- **D-03:** Extended teacher data with HR fields -- Name, Email, Telefon, Personalnum, Dienstjahre, Pragmatisierung, Stammschule (for shared teachers), Beschaeftigungsgrad, subject qualifications, availability constraints.
- **D-04:** Shared teachers (Wanderlehrer): Flag only in Phase 2 -- isShared boolean + Stammschule reference. Full multi-school scheduling logic deferred to a later phase.
- **D-05:** Qualifications: Teachable subjects list only -- admin assigns which subjects a teacher can teach. No formal Lehramtspruefung tracking. Simple and directly usable by solver.
- **D-06:** Stammklasse + Gruppen model -- every student belongs to exactly one Stammklasse (home class, e.g., 3B). Additional Gruppen for splits: Religionsgruppen, Wahlpflichtfaecher, Leistungsgruppen. Solver schedules both class-level and group-level lessons.
- **D-07:** Auto-derive group membership from Stammklasse + rules -- student assigned to Stammklasse, Religion/Ethik split and Leistungsgruppen derived from configurable rules. Admin manages exceptions only. Reduces manual admin work.
- **D-08:** Leistungsgruppen as a group type tag -- groups with type='leistungsgruppe' and a level attribute (Standard/AHS). No dedicated entity. Sufficient for Mittelschule scheduling.
- **D-09:** Template library + custom Stundentafeln -- library of templates by school type AND year level (based on Austrian Lehrplan). Admin picks a template for each class, can customize individual subjects. Best balance of speed and flexibility.
- **D-10:** Wahlpflichtfaecher as regular subjects with group link -- a Wahlpflichtfach is a Subject linked to a student Group. Appears in Stundentafel like any subject. Solver schedules it for the group, not the whole class.
- **D-11:** Subject type enum -- PFLICHT (mandatory), WAHLPFLICHT (elective), FREIGEGENSTAND (optional), UNVERBINDLICH (Uebung). Affects scheduling priority and student assignment rules.
- **D-12:** Per processing purpose consent tracking -- track consent per Verarbeitungszweck (Stundenplanerstellung, Kommunikation, Notenverarbeitung, Fotofreigabe, etc.). Each purpose has its own consent record with timestamp, version, and withdrawal option. Meets DSGVO Art. 6/7 Zweckbindung.
- **D-13:** Anonymize + retain structure for deletion (Art. 17) -- replace personal data with anonymized placeholders (Name -> 'Geloeschte Person #123'). Keep structural records (grades, attendance) with anonymized references. Preserves statistics and class history.
- **D-14:** JSON primary + PDF summary for data export (Art. 15/20) -- machine-readable JSON bundle with all personal data (Art. 20 portability) plus human-readable PDF summary for non-technical parents (Art. 15 info).
- **D-15:** Per-category retention defaults + admin override -- default retention per data category (e.g., Noten: 60 Jahre, Anwesenheit: 5 Jahre, Kommunikation: 1 Jahr). Admin can override per category. BullMQ daily job checks and executes expiry. Extends Phase 1 audit retention pattern (D-07).
- **D-16:** Sensitive PII only encrypted at rest (DSGVO-04) -- encrypt: Geburtsdatum, Sozialversicherungsnummer, Gesundheitsdaten, Telefonnummern, Adressen. Leave names, emails, grades unencrypted for query/index capability.
- **D-17:** Application-level encryption via Prisma middleware -- encrypt/decrypt in Node.js before/after DB writes. Keys managed by application. Portable across databases, transparent to codebase.
- **D-18:** DSFA and Verarbeitungsverzeichnis as JSON export + PDF render -- system stores DSFA/VVZ data as structured JSON. Export as JSON for machine processing AND render as formatted PDF for Datenschutzbeauftragte. Admin updates entries via API.

### Claude's Discretion
- Prisma schema design for new entities (Teacher, Student, Class, Group, Subject, Consent, etc.)
- Migration strategy from Phase 1 schema
- Seed data for Austrian school type templates (Stundentafeln)
- Encryption key management approach
- BullMQ job design for retention/deletion
- Person base entity pattern (shared fields between Teacher/Student/Parent)
- API endpoint structure for new CRUD operations
- Group membership rule engine implementation

### Deferred Ideas (OUT OF SCOPE)
- Full multi-school scheduling for Wanderlehrer -- flagged in Phase 2, full logic in a later phase
- Formal Lehramtspruefung tracking per subject -- not needed for solver, could be added later for quality metrics
- Faecher uebergreifender Unterricht (cross-subject teaching blocks) -- separate scheduling concern
- Doppelstunden-Praeferenz pro Fach -- solver concern, Phase 3
- Fachgruppen (subject departments) -- organizational structure, not needed for scheduling
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-02 | Admin kann Lehrer mit Stammdaten erfassen (Name, Faecher, Verfuegbarkeit, Beschaeftigungsgrad) | Teacher entity with HR fields (D-03), availability constraint rules (D-01), Werteinheiten/Lehrverpflichtung model (D-02), subject qualifications M:N (D-05) |
| FOUND-03 | Admin kann Klassen/Gruppen anlegen mit Schuelerzuordnung | Stammklasse + Gruppen model (D-06), auto-derive group membership (D-07), Leistungsgruppen as group type tag (D-08), Student entity with Stammklasse FK |
| FOUND-04 | Admin kann Faecher mit Wochenstunden-Soll pro Klasse definieren | Subject entity with type enum (D-11), Stundentafel template library (D-09), Wahlpflichtfaecher as Subject+Group link (D-10), ClassSubject junction for weekly hours |
| FOUND-05 | System unterstuetzt verschiedene Schultypen (VS, MS, AHS, BHS) ueber konfigurierbare Zeitraster und Regelwerke | SchoolType enum (existing), Stundentafel templates per type+year (D-09), configurable rule sets as JSON, school-type-specific subject lists |
| DSGVO-01 | System trackt Einwilligungen pro Datenverarbeitungszweck | ConsentRecord entity per person+purpose (D-12), processing purpose enum, consent version tracking, withdrawal timestamps |
| DSGVO-02 | Personenbezogene Daten koennen vollstaendig geloescht werden (Recht auf Vergessenwerden) | Anonymization strategy (D-13), BullMQ deletion job, anonymize personal fields while retaining structural records |
| DSGVO-03 | Nutzer koennen Export aller eigenen Daten anfordern (Art. 15 DSGVO) | JSON bundle + PDF summary (D-14), BullMQ export generation job, aggregate all person-related data across entities |
| DSGVO-04 | Datenbank-Felder mit sensiblen Daten sind verschluesselt (at rest + in transit) | Application-level encryption via Prisma client extension (D-17), selective PII fields only (D-16), AES-256-GCM |
| DSGVO-05 | Automatisierte Aufbewahrungsfristen mit konfigurierbarer Ablaufzeit | Per-category retention defaults (D-15), BullMQ daily cron job, admin override API, extends Phase 1 audit cleanup pattern |
| DSGVO-06 | System liefert DSFA-Template und Verarbeitungsverzeichnis-Export | DSFA/VVZ as structured JSON + PDF render (D-18), CRUD API for entries, export endpoints |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | ^11 | API framework | Already installed, Phase 1 foundation |
| Prisma | ^7.6.0 | ORM, migrations | Already installed, schema extension via `prisma migrate dev` |
| PostgreSQL | 17 | Database | Already running in Docker Compose |
| Vitest | ^4 | Tests | Already configured with SWC plugin |

### New Dependencies Required
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/bullmq | 11.0.4 | NestJS BullMQ integration | Official NestJS queue module, supports NestJS 11, registerQueue/registerFlowProducer |
| bullmq | 5.71.1 | Job queue engine | Peer dep for @nestjs/bullmq, Redis-backed, cron repeatable jobs, dead letter queues |
| @nestjs/schedule | 6.1.1 | Cron scheduling | Optional complement for simple cron triggers that enqueue BullMQ jobs |
| pdfkit | 0.18.0 | PDF generation | Lightweight, no browser/puppeteer needed, pure Node.js PDF generation for DSGVO export PDFs and DSFA/VVZ renders |
| ioredis | 5.10.1 | Redis client | Required by BullMQ, already implicitly available if Redis is in stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfkit | puppeteer (24.x) | Headless Chrome is 300MB+ install, overkill for data-centric PDFs. pdfkit is 2MB, pure JS. |
| pdfkit | @react-pdf/renderer (4.3.2) | React dependency for backend PDF is architectural smell. pdfkit is framework-agnostic. |
| Custom encryption extension | prisma-field-encryption (1.6.0) | Library documents support up to Prisma 6.13.0. Peer dep says `>= 4.7` but Prisma 7 architecture rewrite may cause issues. Custom extension is safer with ~50 lines of code. |
| BullMQ cron | @nestjs/schedule standalone | Schedule module alone cannot handle distributed locks, retries, or dead letter queues needed for DSGVO deletion reliability |

**Installation:**
```bash
cd apps/api && pnpm add @nestjs/bullmq bullmq @nestjs/schedule pdfkit ioredis
cd apps/api && pnpm add -D @types/pdfkit
```

**Version verification:** All versions verified via `npm view` on 2026-03-29.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/modules/
  teacher/             # FOUND-02: Teacher CRUD + availability + qualifications
    dto/
    teacher.controller.ts
    teacher.service.ts
    teacher.module.ts
  student/             # FOUND-03: Student CRUD + Stammklasse assignment
    dto/
    student.controller.ts
    student.service.ts
    student.module.ts
  class/               # FOUND-03: Klasse + Gruppen CRUD
    dto/
    class.controller.ts
    class.service.ts
    group.controller.ts
    group.service.ts
    group-membership-rule.service.ts  # D-07: auto-derive
    class.module.ts
  subject/             # FOUND-04: Subject + Stundentafel CRUD
    dto/
    subject.controller.ts
    subject.service.ts
    stundentafel-template.service.ts  # D-09: template library
    subject.module.ts
    templates/
      austrian-stundentafeln.ts       # Seed data per school type + year
  dsgvo/               # DSGVO-01 through DSGVO-06
    dto/
    consent/
      consent.controller.ts
      consent.service.ts
    export/
      data-export.controller.ts
      data-export.service.ts          # JSON bundle aggregation
      pdf-export.service.ts           # pdfkit PDF rendering
    deletion/
      data-deletion.controller.ts
      data-deletion.service.ts        # Anonymization logic
    retention/
      retention.service.ts            # Per-category retention check
    dsfa/
      dsfa.controller.ts
      dsfa.service.ts                 # DSFA + VVZ CRUD and export
    encryption/
      encryption.service.ts           # AES-256-GCM encrypt/decrypt
      prisma-encryption.extension.ts  # Prisma client extension
    processors/
      deletion.processor.ts           # BullMQ worker
      export.processor.ts             # BullMQ worker
      retention.processor.ts          # BullMQ daily cron worker
    dsgvo.module.ts
apps/api/src/config/
  queue/
    queue.module.ts                   # BullMQ global config
    queue.constants.ts                # Queue names
```

### Pattern 1: NestJS Module with CRUD (replicating Phase 1 SchoolModule)

**What:** Each domain entity gets a NestJS module with controller, service, and DTOs following the exact same pattern as `modules/school/`.
**When to use:** Every new entity (Teacher, Student, Class, Group, Subject, Consent, etc.)
**Example:**
```typescript
// Source: Phase 1 SchoolController pattern
@ApiTags('teachers')
@ApiBearerAuth()
@Controller('teachers')
export class TeacherController {
  constructor(private teacherService: TeacherService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'teacher' })
  @ApiOperation({ summary: 'Create a new teacher' })
  async create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'teacher' })
  @ApiOperation({ summary: 'List teachers with pagination' })
  async findAll(@Query() pagination: PaginationQueryDto) {
    return this.teacherService.findAll(pagination);
  }
}
```

### Pattern 2: Prisma Client Extension for Field Encryption (D-17)

**What:** Custom Prisma `$extends` query component that intercepts writes to encrypt sensitive fields and reads to decrypt them. Uses AES-256-GCM via Node.js `crypto` module.
**When to use:** All models with encrypted fields (Teacher, Student, Parent -- specifically Geburtsdatum, SVNr, Gesundheitsdaten, Telefon, Adresse).
**Example:**
```typescript
// Source: Prisma official docs - client extensions query component
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTED_PREFIX = '$enc:';

// Map of model.field pairs that should be encrypted
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Teacher: ['phone', 'address', 'socialSecurityNumber', 'healthData'],
  Student: ['dateOfBirth', 'address', 'socialSecurityNumber', 'healthData'],
  Parent: ['phone', 'address'],
};

export function createEncryptionExtension(encryptionKey: string) {
  const key = scryptSync(encryptionKey, 'schoolflow-salt', 32);

  return {
    name: 'field-encryption',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const fields = model ? ENCRYPTED_FIELDS[model] : undefined;
          if (!fields) return query(args);

          // Encrypt on writes
          if (['create', 'update', 'upsert'].includes(operation) && args.data) {
            args.data = encryptFields(args.data, fields, key);
          }

          const result = await query(args);

          // Decrypt on reads
          if (result && typeof result === 'object') {
            return decryptResult(result, fields, key);
          }
          return result;
        },
      },
    },
  };
}
```

### Pattern 3: BullMQ Processor for DSGVO Jobs

**What:** Dedicated BullMQ processors for long-running DSGVO operations (data export, deletion, retention cleanup).
**When to use:** DSGVO-02, DSGVO-03, DSGVO-05 -- operations that should not block HTTP request/response.
**Example:**
```typescript
// Source: NestJS official queues docs + BullMQ NestJS guide
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('dsgvo-deletion')
export class DeletionProcessor extends WorkerHost {
  constructor(private dataDeletionService: DataDeletionService) {
    super();
  }

  async process(job: Job<{ personId: string; personType: 'teacher' | 'student' | 'parent' }>) {
    const { personId, personType } = job.data;
    await this.dataDeletionService.anonymizePerson(personId, personType);
    return { anonymized: true, personId };
  }
}
```

### Pattern 4: Person Base Pattern (Discretion Area)

**What:** A `Person` base model in Prisma that holds shared PII fields (name, email, encrypted fields), with Teacher/Student/Parent extending it via 1:1 relations.
**When to use:** Avoids duplicating PII fields across Teacher, Student, Parent. DSGVO export/deletion operates on Person, not on each subtype.
**Recommendation:** Use a shared `Person` model with a `personType` discriminator. Teacher, Student, Parent each have a 1:1 FK to Person. This centralizes DSGVO operations -- export collects all data via `personId`, deletion anonymizes the Person record.
**Example:**
```prisma
model Person {
  id                    String    @id @default(uuid())
  schoolId              String    @map("school_id")
  school                School    @relation(fields: [schoolId], references: [id])
  keycloakUserId        String?   @unique @map("keycloak_user_id")
  personType            PersonType
  firstName             String    @map("first_name")
  lastName              String    @map("last_name")
  email                 String?
  phone                 String?   // @encrypted (D-16)
  address               String?   // @encrypted (D-16)
  dateOfBirth           String?   @map("date_of_birth")  // @encrypted (D-16)
  socialSecurityNumber  String?   @map("social_security_number")  // @encrypted (D-16)
  healthData            String?   @map("health_data")  // @encrypted (D-16)
  isAnonymized          Boolean   @default(false) @map("is_anonymized")
  anonymizedAt          DateTime? @map("anonymized_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  teacher               Teacher?
  student               Student?
  parent                Parent?
  consentRecords        ConsentRecord[]

  @@map("persons")
}

enum PersonType {
  TEACHER
  STUDENT
  PARENT
}
```

### Pattern 5: Stundentafel Template Library (D-09)

**What:** Static TypeScript data structures representing standard Austrian Stundentafeln per school type and year level. Admin picks a template and can customize.
**When to use:** FOUND-04, FOUND-05 -- when creating a class and assigning its weekly subject hours.
**Structure:**
```typescript
export interface StundentafelTemplate {
  schoolType: string;  // SchoolType enum value
  yearLevel: number;   // 1-4 (or 5-8 for Oberstufe)
  displayName: string;
  subjects: Array<{
    name: string;        // German subject name
    shortName: string;   // Abbreviation (D, M, E, etc.)
    subjectType: string; // PFLICHT, WAHLPFLICHT, etc.
    weeklyHours: number;
    lehrverpflichtungsgruppe: string; // I, II, III, etc.
  }>;
  totalWeeklyHours: number;
}
```

### Anti-Patterns to Avoid
- **Hard-deleting person records:** D-13 requires anonymization, not deletion. Never `DELETE FROM persons`. Always anonymize fields and set `isAnonymized = true`.
- **Encrypting queryable fields:** D-16 explicitly says names, emails, grades stay unencrypted. Only encrypt Geburtsdatum, SVNr, Gesundheitsdaten, Telefon, Adressen.
- **Synchronous DSGVO operations in request handlers:** Data export and deletion are long-running. Always enqueue via BullMQ and return a job ID.
- **Separate encryption per entity:** Centralize encryption on the Person model. Do not scatter encrypted fields across Teacher, Student, Parent.
- **Ignoring Prisma.DbNull:** Phase 1 decision -- nullable JSON fields require `Prisma.DbNull`, not `null`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | HTML-to-PDF with puppeteer | pdfkit | No 300MB Chrome dep, pure Node.js, sufficient for data reports |
| Job queue | setTimeout/setInterval cron | BullMQ + @nestjs/bullmq | Persistence, retries, dead letter queues, distributed locks, monitoring |
| Field encryption algorithm | Custom cipher composition | Node.js `crypto` with AES-256-GCM | Battle-tested, NIST-approved, authenticated encryption |
| Cron scheduling | Manual setInterval | BullMQ repeatable jobs | Handles process restarts, cluster-safe, no duplicate execution |
| UUID generation | Custom ID generators | Prisma `@default(uuid())` | Consistent with Phase 1 pattern |
| Pagination | Manual skip/take | PaginationQueryDto from Phase 1 | Already exists in `common/dto/pagination.dto.ts` |
| Permission checks | Custom middleware | @CheckPermissions + CASL | Already exists in auth module |

**Key insight:** Phase 1 already provides the CRUD module blueprint, pagination, error handling (RFC 9457), audit logging, and RBAC. Phase 2 should replicate these patterns exactly, not reinvent them.

## Common Pitfalls

### Pitfall 1: Prisma Migration Ordering with Foreign Keys
**What goes wrong:** New entities reference each other (Teacher -> Person, ClassSubject -> Subject + Class). If migrations are created in the wrong order, FK constraints fail.
**Why it happens:** Prisma generates one migration per `prisma migrate dev` run. Complex schema additions with circular references need careful ordering.
**How to avoid:** Add entities in dependency order: (1) Person, (2) Teacher/Student/Parent (depend on Person), (3) Subject, (4) Class/Group, (5) junction tables (ClassSubject, TeacherSubject, GroupMembership), (6) DSGVO entities (ConsentRecord, RetentionPolicy, etc.). Use a single `prisma migrate dev` for the full schema if possible.
**Warning signs:** "Foreign key constraint violated" during migration.

### Pitfall 2: Encryption Breaking Prisma Queries
**What goes wrong:** Encrypted fields return ciphertext in `where` clauses, making filtering impossible.
**Why it happens:** AES-GCM encryption is non-deterministic (random IV). Same plaintext produces different ciphertext each time.
**How to avoid:** D-16 already addresses this -- only encrypt fields that are NOT used in queries (SVNr, health data, address, phone). Names, emails, and grades stay unencrypted. If exact-match search is needed on encrypted fields later, add a deterministic hash column (HMAC-SHA256).
**Warning signs:** Empty result sets when filtering by encrypted fields.

### Pitfall 3: Anonymization Completeness
**What goes wrong:** DSGVO Art. 17 request is served, but personal data leaks in audit trail metadata, consent records, or other junction tables.
**Why it happens:** Person data is scattered across entities. Anonymization misses some tables.
**How to avoid:** The Person base model centralizes PII. Anonymization must also: (1) clear audit entry metadata that contains PII, (2) anonymize consent record names, (3) check JSONB metadata fields in related records. Create a comprehensive anonymization checklist per entity.
**Warning signs:** Data export after anonymization still shows personal data fragments.

### Pitfall 4: BullMQ Redis Connection Without ioredis
**What goes wrong:** BullMQ fails to connect because the Redis client is not configured.
**Why it happens:** BullMQ requires ioredis, which must be configured in the NestJS BullModule.forRoot() call with the Redis connection URL.
**How to avoid:** Configure BullModule.forRoot() with the Redis URL from environment variables. Redis is already in Docker Compose from Phase 1.
**Warning signs:** "ECONNREFUSED" errors on startup.

### Pitfall 5: Stundentafel Template vs Custom Overrides
**What goes wrong:** Admin customizes a Stundentafel, then the template is updated -- admin's customizations are lost.
**Why it happens:** Templates are applied at class creation time. No distinction between template-sourced and admin-customized entries.
**How to avoid:** ClassSubject junction stores the actual weekly hours per class. The template is only used as initial data. Once applied, the class has its own copy. Template changes do NOT retroactively modify existing classes. Add an `isCustomized` flag per ClassSubject.
**Warning signs:** Admin complaints about lost customizations.

### Pitfall 6: Consent Withdrawal vs Data Retention
**What goes wrong:** User withdraws consent for a processing purpose, but the system continues to process data for that purpose because retention rules override.
**Why it happens:** Retention periods (e.g., Noten: 60 years) may legally require keeping data even after consent withdrawal.
**How to avoid:** Consent withdrawal stops active processing but does not trigger deletion if a legal retention basis exists (DSGVO Art. 17(3)(b) -- legal obligation). The consent record should track both active consent and legal retention basis separately.
**Warning signs:** User withdraws consent but expects immediate deletion that conflicts with retention.

### Pitfall 7: Definite Assignment Assertions on DTOs
**What goes wrong:** TypeScript 6.0 strict mode errors on DTO properties without initializers.
**Why it happens:** Phase 1 decision -- DTO properties use `!` (definite assignment assertion) because class-validator populates them at runtime.
**How to avoid:** All new DTOs must use `!` on required properties: `name!: string;`. This is documented in Phase 1 STATE.md.
**Warning signs:** TypeScript compilation errors "Property has no initializer and is not definitely assigned."

## Code Examples

### Prisma Schema: Teacher Entity (Verified against Phase 1 patterns)
```prisma
// Source: Phase 1 @@map pattern + D-02/D-03 decisions
model Teacher {
  id                    String   @id @default(uuid())
  personId              String   @unique @map("person_id")
  person                Person   @relation(fields: [personId], references: [id])
  schoolId              String   @map("school_id")
  school                School   @relation(fields: [schoolId], references: [id])

  // HR fields (D-03)
  personalNumber        String?  @map("personal_number")
  yearsOfService        Int?     @map("years_of_service")
  isPermanent           Boolean  @default(false) @map("is_permanent")  // Pragmatisierung
  employmentPercentage  Float    @default(100) @map("employment_percentage")

  // Shared teacher (D-04)
  isShared              Boolean  @default(false) @map("is_shared")
  homeSchoolId          String?  @map("home_school_id")

  // Lehrverpflichtung (D-02)
  werteinheitenTarget   Float    @default(20) @map("werteinheiten_target")  // Full = 20 WE

  // Relations
  qualifications        TeacherSubject[]
  availabilityRules     AvailabilityRule[]
  reductions            TeachingReduction[]

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("teachers")
}
```

### Prisma Schema: Availability Constraint Rules (D-01)
```prisma
// Source: D-01 constraint rule model
enum AvailabilityRuleType {
  MAX_DAYS_PER_WEEK     // maxValue: 4 -> max 4 days/week
  BLOCKED_PERIOD        // dayOfWeek + periodNumbers -> not available
  BLOCKED_DAY_PART      // dayOfWeek + dayPart (MORNING/AFTERNOON) -> no afternoons Friday
  PREFERRED_FREE_DAY    // dayOfWeek -> preference (soft constraint)
}

model AvailabilityRule {
  id              String               @id @default(uuid())
  teacherId       String               @map("teacher_id")
  teacher         Teacher              @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  ruleType        AvailabilityRuleType @map("rule_type")
  dayOfWeek       DayOfWeek?           @map("day_of_week")
  periodNumbers   Int[]                @map("period_numbers")  // PostgreSQL array
  maxValue        Int?                 @map("max_value")
  dayPart         String?              @map("day_part")  // MORNING, AFTERNOON
  isHard          Boolean              @default(true) @map("is_hard")  // hard vs soft constraint

  @@map("availability_rules")
}
```

### Prisma Schema: Werteinheiten Reductions (D-02)
```prisma
// Source: D-02 Lehrverpflichtung model
enum ReductionType {
  KUSTODIAT         // Room/equipment custodian
  KLASSENVORSTAND   // Class teacher
  MENTOR            // Mentor for new teachers
  PERSONALVERTRETUNG // Staff representative
  ADMINISTRATION    // Administrative duties
  OTHER
}

model TeachingReduction {
  id              String        @id @default(uuid())
  teacherId       String        @map("teacher_id")
  teacher         Teacher       @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  reductionType   ReductionType @map("reduction_type")
  werteinheiten   Float         // WE reduction amount
  description     String?
  schoolYearId    String?       @map("school_year_id")

  @@map("teaching_reductions")
}
```

### Prisma Schema: Class + Group (D-06, D-07, D-08)
```prisma
// Source: D-06 Stammklasse + Gruppen model
model SchoolClass {
  id              String    @id @default(uuid())
  schoolId        String    @map("school_id")
  school          School    @relation(fields: [schoolId], references: [id])

  name            String    // "3B"
  yearLevel       Int       @map("year_level")  // 1-4 (or 5-8)
  schoolYearId    String    @map("school_year_id")

  students        Student[]
  groups          Group[]
  classSubjects   ClassSubject[]

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@unique([schoolId, name, schoolYearId])
  @@map("school_classes")
}

enum GroupType {
  RELIGION          // Religionsgruppe (kath, evang, islam, ethik)
  WAHLPFLICHT       // Wahlpflichtfach group
  LEISTUNG          // Leistungsgruppe (Standard/AHS)
  LANGUAGE          // Second/third language split
  CUSTOM            // Admin-defined
}

model Group {
  id              String    @id @default(uuid())
  classId         String    @map("class_id")
  schoolClass     SchoolClass @relation(fields: [classId], references: [id], onDelete: Cascade)

  name            String    // "3B-Ethik", "3B-Deutsch-AHS"
  groupType       GroupType @map("group_type")
  level           String?   // For LEISTUNG: "Standard" or "AHS" (D-08)
  subjectId       String?   @map("subject_id")  // For WAHLPFLICHT groups (D-10)

  memberships     GroupMembership[]

  @@map("groups")
}

model GroupMembership {
  id              String    @id @default(uuid())
  groupId         String    @map("group_id")
  group           Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  studentId       String    @map("student_id")
  student         Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)

  isAutoAssigned  Boolean   @default(true) @map("is_auto_assigned")  // D-07: auto vs manual
  assignedAt      DateTime  @default(now()) @map("assigned_at")

  @@unique([groupId, studentId])
  @@map("group_memberships")
}
```

### Prisma Schema: Subject + ClassSubject (D-09, D-10, D-11)
```prisma
// Source: D-09/D-10/D-11 subject decisions
enum SubjectType {
  PFLICHT         // Mandatory
  WAHLPFLICHT     // Elective (chosen from options)
  FREIGEGENSTAND  // Optional (voluntary)
  UNVERBINDLICH   // Non-binding exercise
}

model Subject {
  id                        String      @id @default(uuid())
  schoolId                  String      @map("school_id")
  school                    School      @relation(fields: [schoolId], references: [id])

  name                      String      // "Deutsch", "Mathematik"
  shortName                 String      @map("short_name")  // "D", "M", "E"
  subjectType               SubjectType @map("subject_type")
  lehrverpflichtungsgruppe  String?     @map("lehrverpflichtungsgruppe")  // "I", "II", "III" etc.
  werteinheitenFactor       Float?      @map("werteinheiten_factor")  // 1.167 for group I, etc.

  classSubjects             ClassSubject[]
  teacherSubjects           TeacherSubject[]

  createdAt                 DateTime    @default(now()) @map("created_at")
  updatedAt                 DateTime    @updatedAt @map("updated_at")

  @@unique([schoolId, shortName])
  @@map("subjects")
}

model ClassSubject {
  id              String      @id @default(uuid())
  classId         String      @map("class_id")
  schoolClass     SchoolClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  subjectId       String      @map("subject_id")
  subject         Subject     @relation(fields: [subjectId], references: [id])
  groupId         String?     @map("group_id")  // D-10: if Wahlpflicht, link to group

  weeklyHours     Int         @map("weekly_hours")
  isCustomized    Boolean     @default(false) @map("is_customized")  // vs template default

  @@unique([classId, subjectId, groupId])
  @@map("class_subjects")
}

model TeacherSubject {
  id              String    @id @default(uuid())
  teacherId       String    @map("teacher_id")
  teacher         Teacher   @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subjectId       String    @map("subject_id")
  subject         Subject   @relation(fields: [subjectId], references: [id])

  @@unique([teacherId, subjectId])
  @@map("teacher_subjects")
}
```

### Prisma Schema: DSGVO Consent (D-12)
```prisma
// Source: D-12 per-purpose consent tracking
enum ProcessingPurpose {
  STUNDENPLANERSTELLUNG    // Timetable generation
  KOMMUNIKATION            // Communication
  NOTENVERARBEITUNG        // Grade processing
  FOTOFREIGABE             // Photo release
  KONTAKTDATEN_WEITERGABE  // Contact data sharing
  LERNPLATTFORM            // Learning platform usage
  STATISTIK                // Statistical analysis
}

model ConsentRecord {
  id              String            @id @default(uuid())
  personId        String            @map("person_id")
  person          Person            @relation(fields: [personId], references: [id])

  purpose         ProcessingPurpose
  granted         Boolean           @default(false)
  version         Int               @default(1)  // Consent text version
  grantedAt       DateTime?         @map("granted_at")
  withdrawnAt     DateTime?         @map("withdrawn_at")
  legalBasis      String?           @map("legal_basis")  // "consent", "legal_obligation", "legitimate_interest"

  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  @@unique([personId, purpose])
  @@map("consent_records")
}
```

### Prisma Schema: Retention Policy (D-15)
```prisma
// Source: D-15 per-category retention defaults
model RetentionPolicy {
  id              String    @id @default(uuid())
  schoolId        String    @map("school_id")
  school          School    @relation(fields: [schoolId], references: [id])

  dataCategory    String    @map("data_category")  // "noten", "anwesenheit", "kommunikation", "audit", etc.
  retentionDays   Int       @map("retention_days")
  isDefault       Boolean   @default(true) @map("is_default")  // false = admin override

  @@unique([schoolId, dataCategory])
  @@map("retention_policies")
}
```

### BullMQ Queue Configuration
```typescript
// Source: NestJS official queues docs
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const DSGVO_DELETION_QUEUE = 'dsgvo-deletion';
export const DSGVO_EXPORT_QUEUE = 'dsgvo-export';
export const DSGVO_RETENTION_QUEUE = 'dsgvo-retention';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: DSGVO_DELETION_QUEUE },
      { name: DSGVO_EXPORT_QUEUE },
      { name: DSGVO_RETENTION_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

### Retention Cron Job (D-15)
```typescript
// Source: BullMQ repeatable jobs pattern
// In dsgvo.module.ts onModuleInit:
async onModuleInit() {
  const queue = this.retentionQueue;
  await queue.add('retention-check', {}, {
    repeat: { cron: '0 2 * * *' },  // Daily at 2 AM
    removeOnComplete: { count: 30 },
    removeOnFail: { count: 100 },
  });
}
```

### Austrian Werteinheiten Calculation (D-02)
```typescript
// Source: Austrian OEPU (oepu.at) Lehrverpflichtung documentation
export const LEHRVERPFLICHTUNGSGRUPPEN: Record<string, { factor: number; fullHours: number }> = {
  'I':   { factor: 1.167, fullHours: 18 },   // Languages (Deutsch, English, etc.)
  'II':  { factor: 1.105, fullHours: 19 },   // Math, Physics, Bio with exams, Informatik
  'III': { factor: 1.050, fullHours: 20 },   // History, Geography, Religion, Sport theory
  'IVb': { factor: 0.977, fullHours: 21.5 }, // Art/Music with exams
  'IVa': { factor: 0.955, fullHours: 22 },   // PE, Art, Music
  'IV':  { factor: 0.913, fullHours: 23 },   // Technical drawing, Design
  'V':   { factor: 0.875, fullHours: 24 },   // Choir, Theatre
  'Va':  { factor: 0.825, fullHours: 25.45 },// Practical nutrition
  'VI':  { factor: 0.750, fullHours: 28 },   // Household economics practical
};

export function calculateWerteinheiten(
  weeklyHours: number,
  gruppe: string,
): number {
  const config = LEHRVERPFLICHTUNGSGRUPPEN[gruppe];
  if (!config) throw new Error(`Unknown Lehrverpflichtungsgruppe: ${gruppe}`);
  return weeklyHours * config.factor;
}

export function calculateMaxTeachingHours(
  werteinheitenTarget: number,  // default 20
  reductions: Array<{ werteinheiten: number }>,
): number {
  const totalReductions = reductions.reduce((sum, r) => sum + r.werteinheiten, 0);
  return werteinheitenTarget - totalReductions;
}
```

### Austrian Stundentafel Seed Data (D-09 -- Example for AHS Unterstufe)
```typescript
// Source: Austrian Lehrplan (BGBl. II Nr. 1/2023), OEPU.at subject group tables
// Note: These are the subsidiary (nicht-autonome) Stundentafel defaults.
// Schools with autonomous Stundentafeln may deviate within total hour limits.
export const AHS_UNTERSTUFE_TEMPLATES: StundentafelTemplate[] = [
  {
    schoolType: 'AHS_UNTER',
    yearLevel: 1,
    displayName: 'AHS Unterstufe 1. Klasse',
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Geschichte und politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geografie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Musik', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Technik und Design', shortName: 'TXD', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IV' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Digitale Grundbildung', shortName: 'DGB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
    ],
    totalWeeklyHours: 31,
  },
  // Templates for yearLevel 2, 3, 4 follow same pattern with adjusted hours
  // (Physik and Chemie start in yearLevel 2-3, Latein/2nd language in 3-4)
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma middleware for encryption | Prisma client extensions ($extends query component) | Prisma 4.16.0 (2023) / Prisma 7 removed middleware | Use $extends, not middleware. The `prisma-field-encryption` library still says Prisma 6.13.0 max. |
| GDPR hard delete | EDPB 2025 report: anonymization acceptable but must be robust | February 2026 EDPB report | D-13 anonymization approach aligns with current guidance, but anonymization must truly prevent re-identification. |
| BullMQ 4.x | BullMQ 5.71.1 with OpenTelemetry support | March 2026 | Can integrate with project's planned OpenTelemetry stack |
| PostgreSQL pgcrypto for encryption | Application-level encryption | Prisma 7 trend | Application-level is more portable and works with Prisma's query builder |

**Deprecated/outdated:**
- Prisma middleware API: Removed in Prisma 6.14.0+. Use client extensions instead.
- `prisma-field-encryption` with Prisma 7: Library officially supports up to 6.13.0. Custom extension is recommended.

## Open Questions

1. **prisma-field-encryption Prisma 7 compatibility**
   - What we know: Peer dep says `>= 4.7` but README says "up to 6.13.0". Prisma 7 removed the Rust engine.
   - What's unclear: Whether the library actually works with Prisma 7 without errors.
   - Recommendation: Build a custom encryption extension (~50 LOC) using Node.js crypto. This is safer, simpler, and avoids third-party dependency risk. The Prisma client extension query component API is well-documented and stable.

2. **Exact Austrian Stundentafel numbers per year level**
   - What we know: Subject names, Lehrverpflichtungsgruppen with conversion factors, and approximate hours from official Lehrplan references.
   - What's unclear: Exact weekly hours for every subject in every year level for all school types (VS 1-4, MS 1-4, AHS Unter 1-4, AHS Ober 5-8, BHS varies by specialty).
   - Recommendation: Start with AHS Unterstufe and Mittelschule templates (primary target per Roadmap). Use the official nicht-autonome Stundentafel as defaults. Mark templates as `isDefault: true` so schools can customize. Expand to VS, AHS Ober, BHS in later iterations.

3. **Encryption key management in self-hosted environments**
   - What we know: D-17 says "keys managed by application."
   - What's unclear: How encryption keys are stored, rotated, backed up in a self-hosted Docker environment.
   - Recommendation: Use environment variable `SCHOOLFLOW_ENCRYPTION_KEY` (minimum 32 bytes, base64-encoded). Document key backup requirements. Key rotation support (decrypt with old key, re-encrypt with new) can be a Phase 2+ feature, but the schema should support it via a key version identifier in the encrypted payload.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v25.8.2 | -- (exceeds 24 LTS requirement) |
| PostgreSQL | Database | Yes (Docker) | 17 | -- |
| Redis | BullMQ queues | Yes (Docker) | 7.x | -- |
| Prisma CLI | Migrations | Yes | 7.6.0 | -- |
| pnpm | Package manager | Yes | 10.x | -- |

**Missing dependencies with no fallback:** None -- all infrastructure from Phase 1 is available.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x with SWC plugin |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `cd apps/api && pnpm test -- --run` |
| Full suite command | `cd apps/api && pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-02 | Teacher CRUD with qualifications, availability, Lehrverpflichtung | unit | `cd apps/api && pnpm vitest run src/modules/teacher/teacher.service.spec.ts` | Wave 0 |
| FOUND-03 | Class/Group CRUD with student assignment, auto-derive | unit | `cd apps/api && pnpm vitest run src/modules/class/class.service.spec.ts` | Wave 0 |
| FOUND-04 | Subject CRUD, Stundentafel template application | unit | `cd apps/api && pnpm vitest run src/modules/subject/subject.service.spec.ts` | Wave 0 |
| FOUND-05 | School type templates load correctly | unit | `cd apps/api && pnpm vitest run src/modules/subject/stundentafel-template.service.spec.ts` | Wave 0 |
| DSGVO-01 | Consent record CRUD per purpose | unit | `cd apps/api && pnpm vitest run src/modules/dsgvo/consent/consent.service.spec.ts` | Wave 0 |
| DSGVO-02 | Person anonymization flow | unit | `cd apps/api && pnpm vitest run src/modules/dsgvo/deletion/data-deletion.service.spec.ts` | Wave 0 |
| DSGVO-03 | Data export JSON aggregation | unit | `cd apps/api && pnpm vitest run src/modules/dsgvo/export/data-export.service.spec.ts` | Wave 0 |
| DSGVO-04 | Field encryption/decryption roundtrip | unit | `cd apps/api && pnpm vitest run src/modules/dsgvo/encryption/encryption.service.spec.ts` | Wave 0 |
| DSGVO-05 | Retention policy check + cleanup | unit | `cd apps/api && pnpm vitest run src/modules/dsgvo/retention/retention.service.spec.ts` | Wave 0 |
| DSGVO-06 | DSFA/VVZ CRUD and export | unit | `cd apps/api && pnpm vitest run src/modules/dsgvo/dsfa/dsfa.service.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && pnpm test -- --run`
- **Per wave merge:** `cd apps/api && pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/modules/teacher/teacher.service.spec.ts` -- covers FOUND-02
- [ ] `src/modules/class/class.service.spec.ts` -- covers FOUND-03
- [ ] `src/modules/class/group-membership-rule.service.spec.ts` -- covers D-07 auto-derive
- [ ] `src/modules/subject/subject.service.spec.ts` -- covers FOUND-04
- [ ] `src/modules/subject/stundentafel-template.service.spec.ts` -- covers FOUND-05
- [ ] `src/modules/dsgvo/consent/consent.service.spec.ts` -- covers DSGVO-01
- [ ] `src/modules/dsgvo/deletion/data-deletion.service.spec.ts` -- covers DSGVO-02
- [ ] `src/modules/dsgvo/export/data-export.service.spec.ts` -- covers DSGVO-03
- [ ] `src/modules/dsgvo/encryption/encryption.service.spec.ts` -- covers DSGVO-04
- [ ] `src/modules/dsgvo/retention/retention.service.spec.ts` -- covers DSGVO-05
- [ ] `src/modules/dsgvo/dsfa/dsfa.service.spec.ts` -- covers DSGVO-06

## Sources

### Primary (HIGH confidence)
- Phase 1 codebase: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/school/`, `apps/api/src/modules/audit/`, `apps/api/src/modules/auth/casl/` -- established patterns
- [Prisma client extensions query component docs](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query) -- $extends API for custom encryption
- [NestJS queues documentation](https://docs.nestjs.com/techniques/queues) -- @nestjs/bullmq integration
- [BullMQ NestJS guide](https://docs.bullmq.io/guide/nestjs) -- Processor, WorkerHost patterns
- [Austrian OEPU Lehrverpflichtung/Werteinheiten](https://www.oepu.at/recht-von-a-bis-z/umrechnungstdwe) -- Conversion factors for all 9 Lehrverpflichtungsgruppen
- [DSGVO Art. 17 (gdpr-info.eu)](https://gdpr-info.eu/art-17-gdpr/) -- Right to erasure requirements
- [EDPB 2025 Coordinated Enforcement Action on Right to Erasure](https://www.edpb.europa.eu/our-work-tools/our-documents/other/coordinated-enforcement-action-implementation-right-erasure_en) -- Current enforcement guidance on anonymization
- npm registry (`npm view` on 2026-03-29): @nestjs/bullmq@11.0.4, bullmq@5.71.1, pdfkit@0.18.0, @nestjs/schedule@6.1.1, ioredis@5.10.1

### Secondary (MEDIUM confidence)
- [datenschutz-schule.info Verarbeitungsverzeichnis](https://datenschutz-schule.info/service-downloads/verzeichnis-von-verarbeitungstaetigkeiten/) -- School-specific VVZ template structure (7 core areas)
- [Bildungsportal Niedersachsen DSFA guidance](https://bildungsportal-niedersachsen.de/schulorganisation/datenschutz-an-schulen/dsgvo-an-schulen-und-studienseminaren/datenschutz-folgenabschaetzung) -- DSFA requirements for schools
- [prisma-field-encryption GitHub](https://github.com/47ng/prisma-field-encryption) -- Confirmed supports up to Prisma 6.13.0, AES-256-GCM approach
- [Austrian Lehrplan references (ris.bka.gv.at, paedagogik-paket.at)](https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007850) -- Curriculum structure (exact hour tables not extractable from PDF)

### Tertiary (LOW confidence)
- Stundentafel exact weekly hours per year level per subject -- compiled from multiple sources but not verified against single authoritative table. Should be reviewed by domain expert.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified via npm, Phase 1 patterns well-established
- Architecture: HIGH -- follows exact Phase 1 module patterns, schema design verified against decisions
- Encryption approach: MEDIUM -- custom extension approach is sound but `prisma-field-encryption` Prisma 7 compatibility unconfirmed (irrelevant if using custom)
- Austrian domain model: MEDIUM -- Werteinheiten factors verified from OEPU, Stundentafel templates approximate
- DSGVO compliance: HIGH -- Art. 17 anonymization approach aligns with 2025 EDPB guidance, consent/retention patterns well-documented
- Pitfalls: HIGH -- derived from Phase 1 experience and Prisma/BullMQ documentation

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain, 30 days)
