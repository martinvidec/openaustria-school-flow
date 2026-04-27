---
phase: 15
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts
  - apps/api/src/modules/dsgvo/consent/consent.service.ts
  - apps/api/src/modules/dsgvo/consent/consent.controller.ts
  - apps/api/src/modules/dsgvo/consent/consent.service.spec.ts
autonomous: true
requirements_addressed:
  - DSGVO-ADM-01
tags: [phase-15, dsgvo, consent, backend, admin-filter, tenant-isolation]

must_haves:
  truths:
    - "Admin can call GET /dsgvo/consent/admin?schoolId=…&purpose=…&status=…&personSearch=…&page=…&limit=… and receive ONLY consent records belonging to that schoolId"
    - "Calling the same endpoint without `schoolId` returns 422 (DTO validation), NOT all rows across all schools (Pitfall 4)"
    - "Calling the endpoint as schulleitung / lehrer / eltern / schüler returns 403, even if the user has CASL `read:consent`"
    - "Existing routes `POST /dsgvo/consent`, `POST /dsgvo/consent/withdraw`, `GET /dsgvo/consent/person/:personId`, `GET /dsgvo/consent/school/:schoolId` continue to work unchanged"
    - "`status=granted` returns rows where `granted=true AND withdrawnAt IS NULL`; `status=withdrawn` returns rows where `withdrawnAt IS NOT NULL`; `status=expired` returns rows where `granted=false AND withdrawnAt IS NULL` (re-grant in-flight or never granted)"
    - "`personSearch` matches `person.firstName` OR `person.lastName` OR `person.email` case-insensitively (Postgres `mode: 'insensitive'`)"
  artifacts:
    - path: apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts
      provides: "QueryConsentAdminDto with required schoolId + optional purpose/status/personSearch + pagination"
      contains: "@IsUUID"
    - path: apps/api/src/modules/dsgvo/consent/consent.service.ts
      provides: "findAllForAdmin(query, requestingUser) with tenant-scoped where + role-gated 403"
      contains: "findAllForAdmin"
    - path: apps/api/src/modules/dsgvo/consent/consent.controller.ts
      provides: "GET /dsgvo/consent/admin route forwarding query+user"
      contains: "'admin'"
    - path: apps/api/src/modules/dsgvo/consent/consent.service.spec.ts
      provides: "Vitest spec covering filter combinations, missing-schoolId 422 expectation, role 403 paths, person search"
      contains: "findAllForAdmin"
  key_links:
    - from: apps/api/src/modules/dsgvo/consent/consent.controller.ts
      to: apps/api/src/modules/dsgvo/consent/consent.service.ts
      via: "this.consentService.findAllForAdmin(query, user)"
      pattern: "findAllForAdmin\\(query, user\\)"
    - from: apps/api/src/modules/dsgvo/consent/consent.service.ts (findAllForAdmin)
      to: prisma.consentRecord.findMany
      via: "where: { person: { schoolId }, purpose?, granted?, withdrawnAt?, person: { OR: [...] } }"
      pattern: "person:\\s*\\{\\s*schoolId"
    - from: apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts (schoolId)
      to: PermissionsGuard / class-validator
      via: "@IsUUID() (required, no @IsOptional)"
      pattern: "@IsUUID\\(\\)\\s+schoolId!"
---

<objective>
Add a tenant-scoped, role-gated admin filter endpoint to the existing consent module so the upcoming Phase 15 ConsentsTab (plan 15-06) can call `GET /dsgvo/consent/admin` and filter by `purpose`, `status` (granted / withdrawn / expired), `personSearch` (firstName / lastName / email substring), and pagination — without ever leaking cross-tenant rows or surfacing the route to non-admin roles.

Purpose:
- D-08 declared `findBySchool` insufficient for DSGVO-ADM-01 (no purpose/status/person-search filters). The existing `GET /dsgvo/consent/school/:schoolId` is `pagination`-only.
- Pitfall 4 (RESEARCH §8 + MEMORY `useTeachers tenant leak` / `subject tenant leak` / `useClasses silent omission`) requires the new DTO to mark `schoolId` as REQUIRED and the service to scope by it. `where: { schoolId: undefined }` would silently return ALL schools' consents to the calling admin.
- The existing CASL grant `{ action: 'read', subject: 'consent' }` is held by `admin`, `lehrer` (limited), and `eltern` (own-student). DSGVO-ADM-01 surfaces ALL school consents; this is admin-only. Therefore the new route checks `requestingUser.roles.includes('admin')` server-side and throws `ForbiddenException` otherwise — mirroring `audit.service.ts::findAll` role-scoped visibility.

Output: One new DTO file, one new service method (`ConsentService.findAllForAdmin`), one new controller route (`GET /dsgvo/consent/admin`), and an extended `consent.service.spec.ts` Vitest suite covering all filter combinations + tenant + role gates. No schema changes, no migrations. Frontend (plans 15-05 hook, 15-06 UI) consumes the endpoint without further backend churn.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-VALIDATION.md
@CLAUDE.md

<interfaces>
<!-- Authoritative current shape of touched files. Executor uses these directly — no codebase exploration needed. -->

From `apps/api/src/modules/dsgvo/consent/consent.controller.ts` (CURRENT — to be EXTENDED, not replaced):
```typescript
@ApiTags('dsgvo-consent')
@ApiBearerAuth()
@Controller('dsgvo/consent')
export class ConsentController {
  constructor(private consentService: ConsentService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'consent' })
  async grant(@Body() dto: CreateConsentDto) { /* … */ }

  @Post('withdraw')
  @CheckPermissions({ action: 'update', subject: 'consent' })
  async withdraw(@Body() dto: WithdrawConsentDto) { /* … */ }

  @Get('person/:personId')
  @CheckPermissions({ action: 'read', subject: 'consent' })
  async findByPerson(@Param('personId') personId: string) { /* … */ }

  @Get('school/:schoolId')
  @CheckPermissions({ action: 'read', subject: 'consent' })
  async findBySchool(@Param('schoolId') schoolId: string, @Query() pagination: PaginationQueryDto) { /* … */ }

  // NEW route in this plan goes BELOW findBySchool — DO NOT modify the four above.
}
```

From `apps/api/src/modules/dsgvo/consent/consent.service.ts` (CURRENT shape — `findAllForAdmin` is the NEW method this plan adds):
```typescript
@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}
  async grant(dto: CreateConsentDto) { /* … */ }
  async withdraw(dto: WithdrawConsentDto) { /* … */ }
  async findByPerson(personId: string) { /* findMany where { personId }, ordered by purpose */ }
  async findBySchool(schoolId: string, pagination: PaginationQueryDto) {
    const where = { person: { schoolId } };
    const [data, total] = await Promise.all([
      this.prisma.consentRecord.findMany({
        where,
        include: { person: { select: { firstName: true, lastName: true } } },
        skip: pagination.skip, take: pagination.limit,
        orderBy: { createdAt: 'desc' as const },
      }),
      this.prisma.consentRecord.count({ where }),
    ]);
    return { data, meta: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) } };
  }
  async hasConsent(personId: string, purpose: string): Promise<boolean> { /* … */ }
}
```

From `apps/api/src/modules/audit/audit.service.ts` (role-scoping pattern to MIRROR — `findAll` lines 56-108):
```typescript
async findAll(params: { …; requestingUser: { id: string; roles: string[] } }) {
  const where: any = {};
  if (params.requestingUser.roles.includes('admin')) {
    // Admin sees everything (no extra scope)
  } else if (params.requestingUser.roles.includes('schulleitung')) {
    where.resource = { in: [...PEDAGOGICAL_RESOURCES] };
  } else {
    where.userId = params.requestingUser.id;
  }
  // …additional filters…
}
```
**Adaptation for consent admin filter:** the role gate is BINARY (admin = full access for the supplied schoolId, anyone else = `ForbiddenException`). DSGVO-ADM-01 has no schulleitung-degraded view; the chunked-mode brief states "schulleitung gets 403; lehrer/eltern/schüler get 403". So the service simply throws if `!requestingUser.roles.includes('admin')`.

From `apps/api/prisma/schema.prisma` (line 587-602 — ConsentRecord) and (line 291-299 — ProcessingPurpose enum):
```prisma
model ConsentRecord {
  id          String            @id @default(uuid())
  personId    String            @map("person_id")
  person      Person            @relation(fields: [personId], references: [id], onDelete: Cascade)
  purpose     ProcessingPurpose
  granted     Boolean           @default(false)
  version     Int               @default(1)
  grantedAt   DateTime?         @map("granted_at")
  withdrawnAt DateTime?         @map("withdrawn_at")
  legalBasis  String?           @map("legal_basis")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")
  @@unique([personId, purpose])
  @@map("consent_records")
}

enum ProcessingPurpose {
  STUNDENPLANERSTELLUNG
  KOMMUNIKATION
  NOTENVERARBEITUNG
  FOTOFREIGABE
  KONTAKTDATEN_WEITERGABE
  LERNPLATTFORM
  STATISTIK
}
```

`Person.schoolId` is non-null FK to `School` (`schema.prisma:316-340`). Joining via `person: { schoolId }` is the verified tenant-scope approach already in use by `findBySchool`.

From `apps/api/src/modules/dsgvo/consent/dto/create-consent.dto.ts` (REUSABLE constants — DO NOT redefine):
```typescript
export const PROCESSING_PURPOSES = [
  'STUNDENPLANERSTELLUNG', 'KOMMUNIKATION', 'NOTENVERARBEITUNG', 'FOTOFREIGABE',
  'KONTAKTDATEN_WEITERGABE', 'LERNPLATTFORM', 'STATISTIK',
] as const;
export type ProcessingPurposeValue = (typeof PROCESSING_PURPOSES)[number];
```
The new admin DTO IMPORTS these — it does not re-declare the enum.

From `apps/api/src/modules/auth/types/authenticated-user.ts`:
```typescript
export interface AuthenticatedUser {
  id: string; email: string; username: string; roles: string[];
}
```

From `apps/api/src/modules/auth/decorators/current-user.decorator.ts`:
```typescript
export const CurrentUser = createParamDecorator((data, ctx) => { /* returns request.user */ });
```

From `apps/api/src/common/dto/pagination.dto.ts`:
- `PaginationQueryDto` has `page: number = 1`, `limit: number = 20` (max 500), and getter `skip`. The new admin DTO EXTENDS this class so executor reuses the validated paging fields.

From `apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` (CURRENT — the spec this plan EXTENDS):
- Uses `Test.createTestingModule` with `mockPrisma = { consentRecord: { findUnique, findMany, create, update, count } }`.
- Existing describes: `grant`, `withdraw`, `hasConsent`, `findByPerson`, `findBySchool`. The new describe `findAllForAdmin` is appended at the bottom of the file, INSIDE the same outer `describe('ConsentService', …)`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create QueryConsentAdminDto with required schoolId + optional purpose/status/personSearch</name>
  <read_first>
    - apps/api/src/modules/dsgvo/consent/dto/create-consent.dto.ts (PROCESSING_PURPOSES const lines 4-12 + ProcessingPurposeValue type line 14 — REUSE these, DO NOT redefine)
    - apps/api/src/common/dto/pagination.dto.ts (PaginationQueryDto class — the new DTO `extends PaginationQueryDto`)
    - apps/api/src/modules/audit/dto/query-audit.dto.ts (close analog: optional enum + IsOptional + IsEnum decorator pattern)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md §8 "Pitfall 4 / Tenant scope drift" — DTO marks schoolId required via @IsUUID() with NO @IsOptional
  </read_first>
  <behavior>
    - `QueryConsentAdminDto` is exported from a NEW file `apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts`
    - `schoolId` is REQUIRED (`@IsUUID()` only — NO `@IsOptional`). Missing → ValidationPipe returns 422
    - Invalid UUID for `schoolId` → 422
    - `purpose?` is optional, constrained by `@IsEnum(PROCESSING_PURPOSES)` — invalid value → 422
    - `status?` is optional, constrained by enum literal `'granted' | 'withdrawn' | 'expired'` — invalid value → 422
    - `personSearch?` is optional, `@IsString()`, max length 200 to prevent expensive `LIKE %…%` on 4 KB strings
    - The DTO `extends PaginationQueryDto` so `page` + `limit` validation comes for free (defaults 1 / 20)
    - `forbidNonWhitelisted: true` on the global ValidationPipe rejects unknown query params (existing behaviour) — DTO does NOT need to opt in
  </behavior>
  <action>
    Step 1: Create `apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` with EXACTLY this content:
    ```typescript
    import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
    import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
    import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';
    import { PROCESSING_PURPOSES, ProcessingPurposeValue } from './create-consent.dto';

    /**
     * Status filter values for the admin consent list view (DSGVO-ADM-01).
     * - granted   → granted=true AND withdrawnAt IS NULL
     * - withdrawn → withdrawnAt IS NOT NULL
     * - expired   → granted=false AND withdrawnAt IS NULL (re-grant in-flight or never granted)
     */
    export const CONSENT_STATUS_FILTERS = ['granted', 'withdrawn', 'expired'] as const;
    export type ConsentStatusFilter = (typeof CONSENT_STATUS_FILTERS)[number];

    export class QueryConsentAdminDto extends PaginationQueryDto {
      @ApiProperty({
        description:
          'School scope (REQUIRED — Pitfall 4 / RESEARCH §8 tenant isolation; missing schoolId would silently return all schools)',
        format: 'uuid',
      })
      @IsUUID()
      schoolId!: string;

      @ApiPropertyOptional({
        description: 'Filter by processing purpose (DSGVO Zweckbindung)',
        enum: PROCESSING_PURPOSES,
      })
      @IsOptional()
      @IsEnum(PROCESSING_PURPOSES, {
        message: `Unknown processing purpose. Valid: ${PROCESSING_PURPOSES.join(', ')}`,
      })
      purpose?: ProcessingPurposeValue;

      @ApiPropertyOptional({
        description:
          'Filter by consent status. granted = currently active; withdrawn = withdrawnAt set; expired = granted=false AND no withdrawal timestamp',
        enum: CONSENT_STATUS_FILTERS,
      })
      @IsOptional()
      @IsEnum(CONSENT_STATUS_FILTERS)
      status?: ConsentStatusFilter;

      @ApiPropertyOptional({
        description: 'Substring search across person.firstName / lastName / email (case-insensitive)',
        maxLength: 200,
      })
      @IsOptional()
      @IsString()
      @MaxLength(200)
      personSearch?: string;
    }
    ```

    Step 2: Verify the relative import path. The DTO file lives at `apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts`; `pagination.dto.ts` lives at `apps/api/src/common/dto/pagination.dto.ts`. From the new file, the path is `../../../../common/dto/pagination.dto` (four `..` to escape `dto/`, `consent/`, `dsgvo/`, `modules/`). DO NOT use `@/common/...` or any TS path alias — the existing `create-consent.dto.ts` uses relative imports and the TS config in `apps/api` does not set the `@/` alias for runtime.

    Step 3: Run the typecheck to confirm imports resolve:
    ```bash
    pnpm --filter @schoolflow/api typecheck
    ```
    No `error TS` lines must appear.

    DO NOT: Add `@IsOptional()` to `schoolId`. DO NOT: Re-declare the `PROCESSING_PURPOSES` const inside this file (import it from `create-consent.dto.ts`). DO NOT: Add a `userId` filter — the requirement is `personSearch` (firstName/lastName/email substring), not user-ID exact-match.
  </action>
  <verify>
    <automated>test -f apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts &amp;&amp; grep -q "@IsUUID()" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts &amp;&amp; grep -v '^#' apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts | grep -c "@IsOptional()" | grep -q "^3$" &amp;&amp; ! grep -B1 "schoolId!" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts | grep -q "@IsOptional" &amp;&amp; pnpm --filter @schoolflow/api typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` exits `0`
    - `grep -c "@IsUUID()" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` returns `1`
    - `grep -B1 "schoolId!:" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` does NOT show `@IsOptional` on the line above (regression guard against Pitfall 4)
    - `grep -c "@IsOptional()" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` returns `3` (purpose, status, personSearch)
    - `grep -c "extends PaginationQueryDto" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` returns `1`
    - `grep -c "CONSENT_STATUS_FILTERS" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` returns at least `2` (export + decorator usage)
    - `grep -c "PROCESSING_PURPOSES" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` returns at least `2` (import + decorator usage) AND there is NO line declaring `const PROCESSING_PURPOSES` in this file: `grep -c "^export const PROCESSING_PURPOSES" apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` returns `0`
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
  </acceptance_criteria>
  <done>The DTO file exists with required `schoolId` (no `@IsOptional`), three optional filters constrained by enums / string length, and extends `PaginationQueryDto`. Typecheck passes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add ConsentService.findAllForAdmin (role gate + tenant scope + filter compose) and wire controller route</name>
  <read_first>
    - apps/api/src/modules/dsgvo/consent/consent.service.ts (CURRENT — `findBySchool` lines 85-110 is the closest existing pattern)
    - apps/api/src/modules/dsgvo/consent/consent.controller.ts (CURRENT 4 routes — append, do NOT modify)
    - apps/api/src/modules/audit/audit.service.ts lines 56-108 (role-scoped findAll — pattern reference for `requestingUser.roles.includes('admin')`)
    - apps/api/src/modules/auth/decorators/current-user.decorator.ts + apps/api/src/modules/auth/types/authenticated-user.ts (`@CurrentUser() user: AuthenticatedUser` shape)
    - apps/api/src/modules/audit/audit.controller.ts (CURRENT — verbatim pattern for `@Query() query: SomeDto, @CurrentUser() user: AuthenticatedUser` controller signature)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md §8 (memory-flagged regression family + required scoping table) and §1 (D-08 verification)
  </read_first>
  <behavior>
    - `ConsentService.findAllForAdmin(query, requestingUser)` exists with signature `(query: { schoolId: string; purpose?: string; status?: 'granted'|'withdrawn'|'expired'; personSearch?: string; page: number; limit: number; skip: number }, requestingUser: { id: string; roles: string[] }) => Promise<{ data: …[]; meta: { page; limit; total; totalPages } }>`
    - Throws `ForbiddenException('Zugriff verweigert. Admin-Rolle erforderlich.')` when `!requestingUser.roles.includes('admin')`
    - Throws `BadRequestException('schoolId ist erforderlich')` when `!query.schoolId` (defensive belt-and-braces alongside DTO `@IsUUID()` — Pitfall 4 dual-layer guard from RESEARCH §8)
    - Returns `{ data, meta }` shape identical to `findBySchool` (frontend hook plan 15-05 expects same envelope)
    - Where clause composes EXACTLY:
      ```ts
      where = {
        person: { schoolId: query.schoolId },
        ...(query.purpose ? { purpose: query.purpose as any } : {}),
        ...(status conditions for granted/withdrawn/expired),
        ...(query.personSearch ? { person: { schoolId, OR: [{firstName: contains}, {lastName: contains}, {email: contains}] } } : {}),
      }
      ```
      The `personSearch` branch MUST keep the `schoolId` constraint inside the merged `person` filter — Prisma silently overwrites duplicate top-level keys, so a naive spread loses tenant isolation.
    - Status mapping (D-08 + chunked-mode brief):
      - `granted`: `{ granted: true, withdrawnAt: null }`
      - `withdrawn`: `{ withdrawnAt: { not: null } }`
      - `expired`: `{ granted: false, withdrawnAt: null }`
    - `include: { person: { select: { id: true, firstName: true, lastName: true, email: true } } }` — frontend ConsentsTab needs the person identity for display (plan 15-06)
    - `orderBy: { createdAt: 'desc' as const }` — newest first
    - `skip: query.skip`, `take: query.limit` — uses the getter from `PaginationQueryDto`
    - Existing `grant`, `withdraw`, `findByPerson`, `findBySchool`, `hasConsent` are UNCHANGED
    - Controller route `GET /dsgvo/consent/admin` is added BELOW `findBySchool`, uses `@CheckPermissions({ action: 'read', subject: 'consent' })` AND injects `@CurrentUser() user: AuthenticatedUser` — the role-gate runs in the SERVICE (mirrors audit pattern), NOT via `@Roles('admin')` (no controller in the codebase uses `@Roles` today; applying it would be a one-off pattern)
  </behavior>
  <action>
    Step 1: Edit `apps/api/src/modules/dsgvo/consent/consent.service.ts`. ADD at the top with the existing imports:
    ```typescript
    import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
    ```
    (You are ADDING `BadRequestException` and `ForbiddenException` — keep `ConflictException`, `Injectable`, `NotFoundException`.)

    Step 2: APPEND (do NOT replace) the new method to `ConsentService`, just before the closing `}` of the class. Insert AFTER `hasConsent` (current last method, line 112-123):
    ```typescript
      /**
       * Admin-only filtered list of consent records for a school (DSGVO-ADM-01).
       *
       * Tenant isolation: REQUIRED `schoolId`, scoped via `person.schoolId` join. The
       * `personSearch` branch keeps the schoolId constraint INSIDE the merged person
       * filter so Prisma cannot drop it via top-level key overwrite (RESEARCH §8 +
       * MEMORY useTeachers / subject / useClasses regression family).
       *
       * Role gate: throws ForbiddenException unless the requesting user has the 'admin'
       * role. Mirrors AuditService.findAll role-scoped visibility (audit.service.ts:56-108).
       */
      async findAllForAdmin(
        query: {
          schoolId: string;
          purpose?: string;
          status?: 'granted' | 'withdrawn' | 'expired';
          personSearch?: string;
          page: number;
          limit: number;
          skip: number;
        },
        requestingUser: { id: string; roles: string[] },
      ) {
        // 1. Role gate — admin only (DSGVO-ADM-01 chunked-mode brief)
        if (!requestingUser.roles.includes('admin')) {
          throw new ForbiddenException('Zugriff verweigert. Admin-Rolle erforderlich.');
        }

        // 2. Defensive tenant guard — DTO `@IsUUID()` should already block this, but the
        //    MEMORY regression family (useTeachers / subject / useClasses) shows that
        //    `where: { schoolId: undefined }` silently returns all rows. Belt-and-braces.
        if (!query.schoolId) {
          throw new BadRequestException('schoolId ist erforderlich');
        }

        // 3. Compose the where clause. The `person` filter is built once so the
        //    personSearch branch can MERGE into it without losing the schoolId scope.
        const personFilter: any = { schoolId: query.schoolId };
        if (query.personSearch) {
          personFilter.OR = [
            { firstName: { contains: query.personSearch, mode: 'insensitive' } },
            { lastName:  { contains: query.personSearch, mode: 'insensitive' } },
            { email:     { contains: query.personSearch, mode: 'insensitive' } },
          ];
        }

        const where: any = { person: personFilter };
        if (query.purpose) {
          where.purpose = query.purpose as any;
        }
        if (query.status === 'granted') {
          where.granted = true;
          where.withdrawnAt = null;
        } else if (query.status === 'withdrawn') {
          where.withdrawnAt = { not: null };
        } else if (query.status === 'expired') {
          where.granted = false;
          where.withdrawnAt = null;
        }

        const [data, total] = await Promise.all([
          this.prisma.consentRecord.findMany({
            where,
            include: {
              person: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            skip: query.skip,
            take: query.limit,
            orderBy: { createdAt: 'desc' as const },
          }),
          this.prisma.consentRecord.count({ where }),
        ]);

        return {
          data,
          meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
          },
        };
      }
    ```

    Step 3: Edit `apps/api/src/modules/dsgvo/consent/consent.controller.ts`. ADD the new imports at the top — keep existing imports intact:
    ```typescript
    import { CurrentUser } from '../../auth/decorators/current-user.decorator';
    import { AuthenticatedUser } from '../../auth/types/authenticated-user';
    import { QueryConsentAdminDto } from './dto/query-consent-admin.dto';
    ```
    Then APPEND the new route AFTER `findBySchool` (the current last route ending around line 50) and BEFORE the closing `}` of the controller class:
    ```typescript
      @Get('admin')
      @CheckPermissions({ action: 'read', subject: 'consent' })
      @ApiOperation({
        summary: 'Admin filter list of consent records (DSGVO-ADM-01)',
        description:
          'Returns paginated consent records for the supplied schoolId, filtered by purpose / status / personSearch. Admin role required (service-level 403 for non-admin).',
      })
      @ApiResponse({ status: 200, description: 'Paginated consent records with person identity included' })
      @ApiResponse({ status: 403, description: 'Caller is not admin' })
      @ApiResponse({ status: 422, description: 'schoolId missing or invalid' })
      async findAllForAdmin(
        @Query() query: QueryConsentAdminDto,
        @CurrentUser() user: AuthenticatedUser,
      ) {
        return this.consentService.findAllForAdmin(
          {
            schoolId: query.schoolId,
            purpose: query.purpose,
            status: query.status,
            personSearch: query.personSearch,
            page: query.page,
            limit: query.limit,
            skip: query.skip,
          },
          user,
        );
      }
    ```

    Step 4: Verify the route ordering. NestJS Fastify resolves `:schoolId` BEFORE static segments unless static is registered first. Place `@Get('admin')` ABOVE `@Get('school/:schoolId')` in the controller body — otherwise `/admin` is captured as `:schoolId` and 422s with `Validation failed (uuid is expected)`. Concretely: the controller's method order from top to bottom MUST become `grant, withdraw, findByPerson, findAllForAdmin (NEW), findBySchool`. Move `findBySchool` to the bottom OR put `findAllForAdmin` between `findByPerson` and `findBySchool`. Verified: existing order has `findByPerson` (`:personId` — already path-segment-prefixed) then `findBySchool` (`school/:schoolId`). The new `admin` static segment must precede `school/:schoolId` to avoid regex collision on `/admin` — Fastify is strict about declaration order.

    Step 5: Run the existing audit + consent specs to confirm no regression:
    ```bash
    pnpm --filter @schoolflow/api test -- consent.service
    pnpm --filter @schoolflow/api typecheck
    ```
    Existing `findBySchool`, `grant`, `withdraw`, `hasConsent`, `findByPerson` describes must still pass (Task 3 will ADD the `findAllForAdmin` describe). Typecheck must exit 0.

    DO NOT: Add `@Roles('admin')` to the controller route — no other controller in the codebase uses that decorator path; the role gate lives in the service (mirrors `audit.service.ts::findAll`). DO NOT: Replace the existing `findBySchool` route — it is referenced elsewhere and must stay. DO NOT: Use `where: { person: { schoolId: query.schoolId, OR: [...] } }` AND ALSO `where: { person: { OR: [...] } }` separately — Prisma overwrites the first `person` key with the second (the exact root cause of the MEMORY tenant-leak family). Build `personFilter` ONCE.
  </action>
  <verify>
    <automated>grep -q "findAllForAdmin" apps/api/src/modules/dsgvo/consent/consent.service.ts &amp;&amp; grep -q "ForbiddenException" apps/api/src/modules/dsgvo/consent/consent.service.ts &amp;&amp; grep -q "BadRequestException" apps/api/src/modules/dsgvo/consent/consent.service.ts &amp;&amp; grep -q "@Get('admin')" apps/api/src/modules/dsgvo/consent/consent.controller.ts &amp;&amp; grep -q "QueryConsentAdminDto" apps/api/src/modules/dsgvo/consent/consent.controller.ts &amp;&amp; awk '/@Get\('"'"'admin'"'"'\)/{a=NR} /@Get\('"'"'school\/:schoolId'"'"'\)/{b=NR} END{exit (a&amp;&amp;b&amp;&amp;a&lt;b)?0:1}' apps/api/src/modules/dsgvo/consent/consent.controller.ts &amp;&amp; pnpm --filter @schoolflow/api test -- consent.service --reporter=basic 2>&amp;1 | tail -5 | grep -q "passed" &amp;&amp; pnpm --filter @schoolflow/api typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "findAllForAdmin" apps/api/src/modules/dsgvo/consent/consent.service.ts` returns at least `2` (definition + jsdoc / usage)
    - `grep -c "ForbiddenException" apps/api/src/modules/dsgvo/consent/consent.service.ts` returns at least `2` (import + throw)
    - `grep -c "BadRequestException" apps/api/src/modules/dsgvo/consent/consent.service.ts` returns at least `2` (import + throw)
    - `grep -c "person: personFilter" apps/api/src/modules/dsgvo/consent/consent.service.ts` returns `1` (the single composed filter — regression guard against split `person` keys)
    - `grep -c "@Get('admin')" apps/api/src/modules/dsgvo/consent/consent.controller.ts` returns `1`
    - Route declaration order: line number of `@Get('admin')` is LESS THAN line number of `@Get('school/:schoolId')` — verified by the `awk` snippet in `<verify>`
    - Existing routes preserved: `grep -c "@Post()" apps/api/src/modules/dsgvo/consent/consent.controller.ts` returns `1`, `grep -c "@Post('withdraw')" apps/api/src/modules/dsgvo/consent/consent.controller.ts` returns `1`, `grep -c "@Get('person/:personId')" apps/api/src/modules/dsgvo/consent/consent.controller.ts` returns `1`, `grep -c "@Get('school/:schoolId')" apps/api/src/modules/dsgvo/consent/consent.controller.ts` returns `1`
    - `pnpm --filter @schoolflow/api test -- consent.service` exits `0` — existing 8 cases (grant ×3, withdraw ×2, hasConsent ×3, findByPerson ×1, findBySchool ×1) still pass after the additive change
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
    - The service file does NOT use `@Roles` decorator anywhere: `grep -c "@Roles(" apps/api/src/modules/dsgvo/consent/consent.controller.ts` returns `0` (role gate lives in service, mirroring audit pattern)
  </acceptance_criteria>
  <done>`ConsentService.findAllForAdmin` exists with role gate + tenant scope + composed filter where-clause; `GET /dsgvo/consent/admin` is registered ABOVE `school/:schoolId`; all existing consent.service.spec.ts cases still pass; typecheck is clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Extend consent.service.spec.ts with findAllForAdmin coverage (filters, tenant, role 403, person search)</name>
  <read_first>
    - apps/api/src/modules/dsgvo/consent/consent.service.spec.ts (CURRENT — 190 lines, structure to extend)
    - apps/api/src/modules/audit/audit.service.spec.ts (if it exists — pattern for mocked Prisma + role param)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-VALIDATION.md (line 44 — DSGVO-ADM-01 maps to "extend existing `consent.service.spec.ts`")
  </read_first>
  <behavior>
    - The new `describe('findAllForAdmin', …)` block lives INSIDE the existing top-level `describe('ConsentService', …)` in `consent.service.spec.ts`
    - Test cases (8 minimum):
      1. `returns paginated rows scoped to schoolId via person.schoolId join`
      2. `applies purpose filter when provided`
      3. `status=granted maps to where { granted: true, withdrawnAt: null }`
      4. `status=withdrawn maps to where { withdrawnAt: { not: null } }`
      5. `status=expired maps to where { granted: false, withdrawnAt: null }`
      6. `personSearch composes OR over firstName/lastName/email AND keeps schoolId scope`
      7. `throws ForbiddenException when caller is not admin (schulleitung, lehrer, eltern, schueler)` — single it.each with 4 role variants
      8. `throws BadRequestException when schoolId is empty string` (DTO would catch undefined; this guards the runtime fallthrough)
    - All 8 new cases pass. Existing 8 cases keep passing.
  </behavior>
  <action>
    Step 1: Edit `apps/api/src/modules/dsgvo/consent/consent.service.spec.ts`. ADD an import line at the top:
    ```typescript
    import { BadRequestException, ForbiddenException } from '@nestjs/common';
    ```
    (Already imports `ConflictException, NotFoundException` — extend that list.)

    Step 2: APPEND a new `describe` block INSIDE the outer `describe('ConsentService', …)`, just before the final closing `})`. Place it AFTER the existing `findBySchool` describe (around line 188-189):
    ```typescript
      describe('findAllForAdmin', () => {
        const adminUser = { id: 'admin-1', roles: ['admin'] };
        const baseQuery = {
          schoolId: 'school-1',
          page: 1,
          limit: 20,
          skip: 0,
        };

        beforeEach(() => {
          mockPrisma.consentRecord.findMany.mockResolvedValue([]);
          mockPrisma.consentRecord.count.mockResolvedValue(0);
        });

        it('scopes rows by schoolId via person.schoolId join (Pitfall 4 / RESEARCH §8)', async () => {
          await service.findAllForAdmin(baseQuery, adminUser);
          const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
          expect(args.where.person).toEqual({ schoolId: 'school-1' });
          expect(args.skip).toBe(0);
          expect(args.take).toBe(20);
          expect(args.orderBy).toEqual({ createdAt: 'desc' });
          expect(args.include.person.select).toMatchObject({
            id: true, firstName: true, lastName: true, email: true,
          });
        });

        it('applies purpose filter when provided', async () => {
          await service.findAllForAdmin({ ...baseQuery, purpose: 'KOMMUNIKATION' }, adminUser);
          const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
          expect(args.where.purpose).toBe('KOMMUNIKATION');
        });

        it('maps status=granted to { granted: true, withdrawnAt: null }', async () => {
          await service.findAllForAdmin({ ...baseQuery, status: 'granted' }, adminUser);
          const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
          expect(args.where.granted).toBe(true);
          expect(args.where.withdrawnAt).toBeNull();
        });

        it('maps status=withdrawn to { withdrawnAt: { not: null } }', async () => {
          await service.findAllForAdmin({ ...baseQuery, status: 'withdrawn' }, adminUser);
          const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
          expect(args.where.withdrawnAt).toEqual({ not: null });
        });

        it('maps status=expired to { granted: false, withdrawnAt: null }', async () => {
          await service.findAllForAdmin({ ...baseQuery, status: 'expired' }, adminUser);
          const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
          expect(args.where.granted).toBe(false);
          expect(args.where.withdrawnAt).toBeNull();
        });

        it('personSearch composes OR over firstName/lastName/email AND keeps schoolId scope', async () => {
          await service.findAllForAdmin({ ...baseQuery, personSearch: 'maria' }, adminUser);
          const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
          // schoolId scope MUST survive the merge (regression guard against split `person` keys)
          expect(args.where.person.schoolId).toBe('school-1');
          expect(args.where.person.OR).toEqual([
            { firstName: { contains: 'maria', mode: 'insensitive' } },
            { lastName:  { contains: 'maria', mode: 'insensitive' } },
            { email:     { contains: 'maria', mode: 'insensitive' } },
          ]);
        });

        it.each([
          ['schulleitung'],
          ['lehrer'],
          ['eltern'],
          ['schueler'],
        ])('throws ForbiddenException for non-admin role: %s', async (role) => {
          await expect(
            service.findAllForAdmin(baseQuery, { id: 'u-1', roles: [role] }),
          ).rejects.toThrow(ForbiddenException);
          // Database must NOT be queried at all when the role gate fails
          expect(mockPrisma.consentRecord.findMany).not.toHaveBeenCalled();
          expect(mockPrisma.consentRecord.count).not.toHaveBeenCalled();
        });

        it('throws BadRequestException when schoolId is empty string (defensive guard)', async () => {
          await expect(
            service.findAllForAdmin({ ...baseQuery, schoolId: '' }, adminUser),
          ).rejects.toThrow(BadRequestException);
          expect(mockPrisma.consentRecord.findMany).not.toHaveBeenCalled();
        });

        it('returns paginated meta envelope { page, limit, total, totalPages }', async () => {
          mockPrisma.consentRecord.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
          mockPrisma.consentRecord.count.mockResolvedValue(45);
          const result = await service.findAllForAdmin(
            { ...baseQuery, page: 2, limit: 20, skip: 20 },
            adminUser,
          );
          expect(result.data).toHaveLength(2);
          expect(result.meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
        });
      });
    ```

    Step 3: Run:
    ```bash
    pnpm --filter @schoolflow/api test -- consent.service --reporter=basic
    ```
    All cases (existing 8 + new 12 — 9 cases total but role-paramaterised it.each counts as 4 — total ≥ 16 invocations) must pass.

    Step 4: Run the full api unit suite to confirm no cross-spec regression:
    ```bash
    pnpm --filter @schoolflow/api test --reporter=basic
    ```
    Must exit 0.

    DO NOT: Mock the role gate by injecting a fake `requestingUser.roles = ['admin']` for tests that should throw — pass the actual role variant. DO NOT: Use `expect(args.where.personId).toBe(...)` — there is no `personId` filter; only `person.schoolId` and `person.OR`. DO NOT: Add `await page.request.post(…)` — this is a unit spec, not E2E (E2E lives in plan 15-10).
  </action>
  <verify>
    <automated>grep -q "describe('findAllForAdmin'" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts &amp;&amp; grep -q "throws ForbiddenException for non-admin role" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts &amp;&amp; grep -q "throws BadRequestException when schoolId is empty string" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts &amp;&amp; grep -q "personSearch composes OR" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts &amp;&amp; pnpm --filter @schoolflow/api test -- consent.service --reporter=basic 2>&amp;1 | tail -8 | grep -q "passed"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "describe('findAllForAdmin'" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` returns `1`
    - `grep -c "it.each" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` returns at least `1` (parameterised role-403 cases)
    - `grep -c "ForbiddenException" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` returns at least `2` (import + assertion)
    - `grep -c "BadRequestException" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` returns at least `2`
    - `grep -c "person.schoolId" apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` returns at least `1` (regression assert that personSearch keeps schoolId)
    - `pnpm --filter @schoolflow/api test -- consent.service --reporter=basic` exits `0` and the summary line shows ≥ 16 tests passed (existing 8 + new ≥ 8 invocations)
    - `pnpm --filter @schoolflow/api test --reporter=basic` exits `0` (no cross-spec regression)
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
  </acceptance_criteria>
  <done>The spec file contains the `findAllForAdmin` describe block with all 8+ cases passing; existing 8 cases unchanged and still green; full api unit suite passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Frontend admin client → `GET /dsgvo/consent/admin` | Untrusted query params (`schoolId`, `purpose`, `status`, `personSearch`) cross from browser to NestJS — must be validated server-side and tenant-scoped |
| Authenticated non-admin user → consent admin endpoint | A user with `read:consent` CASL permission but without `admin` role MUST be rejected — service-level role check is the boundary |
| Service layer → Prisma `consentRecord.findMany` | The composed `where` clause MUST keep `person.schoolId` constraint regardless of `personSearch` presence (Prisma silently overwrites duplicate keys) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-03-01 | Tampering | `QueryConsentAdminDto.schoolId` (Pitfall 4) | mitigate | `@IsUUID()` (no `@IsOptional`) on the DTO field returns 422 for missing/invalid input. Defensive `if (!query.schoolId) throw BadRequestException` in service catches the runtime fallthrough. Both layers covered by Task 1 + Task 3 specs. |
| T-15-03-02 | Information Disclosure | Cross-tenant consent leak via `where: { schoolId: undefined }` (MEMORY useTeachers / subject / useClasses regression family, 3 prior incidents) | mitigate | Tenant scope enforced via `person: { schoolId: query.schoolId }` join. The `personSearch` branch composes a single `personFilter` object so the schoolId key is never split across two `where.person` declarations. Vitest case `personSearch composes OR …AND keeps schoolId scope` is the regression guard. |
| T-15-03-03 | Elevation of Privilege | Non-admin role with `read:consent` CASL grant accessing the admin endpoint | mitigate | Service-layer `if (!requestingUser.roles.includes('admin')) throw ForbiddenException`. CASL grant exists on `lehrer` (limited) and `eltern` (own-student per `seed.ts:167, 235`) but the service-level role check supersedes. Vitest case `throws ForbiddenException for non-admin role: schulleitung/lehrer/eltern/schueler` is the regression guard (4 invocations via it.each). |
| T-15-03-04 | Information Disclosure | `personSearch` reflected in audit log via existing AuditInterceptor | accept | The interceptor already redacts `password/secret/token/credential` from `request.body`; query params are part of `request.query` and the existing interceptor records `metadata.body` which is request-body-only for non-DELETE. Even if `personSearch` were logged, the audit log is admin-only (D-24, mirrored via `audit.service.findAll` role gate). No additional redaction needed. |
| T-15-03-05 | Denial of Service | Unbounded `personSearch` substring matching `LIKE %…%` on Person table | mitigate | DTO `@MaxLength(200)` caps the substring at 200 chars. Person.firstName/lastName/email columns are non-indexed prefix-LIKE today, but the `person.schoolId` constraint keeps the table scan bounded by school size (≤ a few thousand rows for a single school). Acceptable for admin-only Phase 15 surface. |
| T-15-03-06 | Repudiation | Admin actions on consent admin endpoint not audited | accept | The existing `AuditInterceptor` automatically records `read:consent` against this endpoint per the `SENSITIVE_RESOURCES` list (`audit.service.ts:6` includes `'consent'`). New endpoint inherits this behaviour without additional wiring — Phase 14 audit specs cover the regression. |
</threat_model>

<verification>
- `pnpm --filter @schoolflow/api test -- consent.service` exits `0` with all 16+ test invocations passing (existing 8 + new ≥ 8)
- `pnpm --filter @schoolflow/api test --reporter=basic` exits `0` (no cross-spec regression — particularly Phase 14 audit specs that depend on `metadata.body` shape)
- `pnpm --filter @schoolflow/api typecheck` exits `0`
- `git diff` shows ONLY the 4 files in `files_modified`: 1 new DTO file, 1 service edit, 1 controller edit, 1 spec edit. No schema changes, no migrations, no module changes.
- Manual route-order check: `grep -n "@Get(" apps/api/src/modules/dsgvo/consent/consent.controller.ts` shows `@Get('admin')` ABOVE `@Get('school/:schoolId')` (Fastify static-before-param requirement)
</verification>

<success_criteria>
- DSGVO-ADM-01 backend half shipped: `GET /dsgvo/consent/admin?schoolId=…` returns paginated, tenant-scoped, role-gated results
- D-08 closed: ConsentService now exposes purpose / status / personSearch filters that DSGVO-ADM-01 requires
- Pitfall 4 / MEMORY regression family does NOT recur: tenant isolation enforced at DTO (compile-time) AND service (runtime) layers; verified by Vitest `personSearch composes OR …AND keeps schoolId scope` case
- Role gate verified for all 4 non-admin roles (schulleitung, lehrer, eltern, schueler) via `it.each`
- Existing 4 consent routes (`POST /`, `POST /withdraw`, `GET /person/:personId`, `GET /school/:schoolId`) unchanged and still green
- Frontend plans 15-05 (hook `useConsents`) and 15-06 (ConsentsTab UI) can consume `GET /dsgvo/consent/admin?schoolId=…&purpose=…&status=…&personSearch=…&page=…&limit=…` without further backend churn
- E2E plan 15-10 (`admin-dsgvo-consents.spec.ts`) inherits a stable contract from this plan
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-03-SUMMARY.md` listing:
- Files changed (4: 1 new DTO, 1 service edit, 1 controller edit, 1 spec extension) with line-count deltas
- New endpoint contract: `GET /dsgvo/consent/admin?schoolId&purpose?&status?&personSearch?&page?&limit?` (paged response shape)
- Vitest output (cases passed: existing 8 + new ≥ 8)
- Tenant-scope regression guards installed (DTO `@IsUUID()` + service `if (!schoolId) throw`)
- Role gate behaviour (admin = full access, all others = 403)
- Any deviations from the action plan (e.g. if `@Roles('admin')` was preferred over service-level check, justify with reference to existing patterns)
- Followup hand-off note for plans 15-05 (hook) and 15-06 (UI): expected `data`/`meta` envelope shape + filter param names matching the DTO field names so URL search params can be passed through 1:1
</output>

<context_decisions>
## Truths — CONTEXT.md Decision Coverage

_Citations in `D-NN:` format for the decision-coverage gate (workflow step 13a)._

- D-08: Consent module needs admin-filter findAll extension
- D-24: Audit before-snapshot NOT PII-redacted (admin-only audience)

</context_decisions>
