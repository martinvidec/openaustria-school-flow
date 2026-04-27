---
phase: 15
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts
  - apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts
  - apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts
  - apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts
  - apps/api/src/modules/dsgvo/dsgvo.module.ts
autonomous: true
requirements_addressed:
  - DSGVO-ADM-05
  - DSGVO-ADM-06
tags: [phase-15, dsgvo, jobs, backend, admin-list, tenant-isolation]

must_haves:
  truths:
    - "Admin can call `GET /dsgvo/jobs?schoolId=…&status=…&jobType=…&page=…&limit=…` and receive ONLY DsgvoJob rows belonging to that schoolId"
    - "Calling the endpoint without `schoolId` returns 422 (DTO validation), NOT all rows across all schools (Pitfall 4)"
    - "Calling the endpoint as schulleitung / lehrer / eltern / schüler returns 403 — even if CASL grants `read:export` or `read:deletion`"
    - "Existing routes `GET /dsgvo/export/:id`, `GET /dsgvo/deletion/:id`, `GET /dsgvo/export/person/:personId` continue to work unchanged"
    - "`status` query parameter is constrained to the Prisma enum values `QUEUED|PROCESSING|COMPLETED|FAILED` — frontend (plan 15-08) maps these to the UI's pending/running/completed/failed badges"
    - "`jobType` query parameter is constrained to the Prisma enum values `DATA_EXPORT|DATA_DELETION|RETENTION_CLEANUP`"
    - "Each row in the response includes `person: { id, firstName, lastName, email } | null` so the JobsTab can render `Datenexport für Maria Müller` without a second roundtrip"
    - "Default ordering is `createdAt desc` (newest first) — admins look for in-flight + recent jobs"
  artifacts:
    - path: apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts
      provides: "QueryDsgvoJobsDto with required schoolId + optional status + jobType + page/limit"
      contains: "@IsUUID"
    - path: apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts
      provides: "DsgvoJobsService.findAllForAdmin(query, requestingUser) with tenant-scoped where + role-gated 403 + Person include"
      contains: "findAllForAdmin"
    - path: apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts
      provides: "GET /dsgvo/jobs route, @CheckPermissions + @CurrentUser, paginated response envelope"
      contains: "@Controller('dsgvo/jobs')"
    - path: apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts
      provides: "Vitest spec covering filter combinations, missing-schoolId 422, role 403, ordering, pagination meta"
      contains: "findAllForAdmin"
    - path: apps/api/src/modules/dsgvo/dsgvo.module.ts
      provides: "DsgvoJobsController + DsgvoJobsService registered alongside existing controllers/providers"
      contains: "DsgvoJobsController"
  key_links:
    - from: apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts
      to: apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts
      via: "this.jobsService.findAllForAdmin(query, user)"
      pattern: "findAllForAdmin\\(query, user\\)"
    - from: apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts (findAllForAdmin)
      to: prisma.dsgvoJob.findMany
      via: "where: { schoolId: query.schoolId, status?, jobType? }, include: { person: { select: ... } }"
      pattern: "schoolId:\\s*query.schoolId"
    - from: apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts (schoolId)
      to: class-validator
      via: "@IsUUID() (required, no @IsOptional)"
      pattern: "@IsUUID\\(\\)\\s+schoolId"
---

<objective>
Add a NEW `apps/api/src/modules/dsgvo/jobs/` module exposing a single tenant-scoped, role-gated admin route — `GET /dsgvo/jobs` — that returns the school's DsgvoJob rows joined with the owning Person. The Phase 15 JobsTab (plan 15-08) needs a school-WIDE list across all in-flight + completed + failed export/deletion jobs; today only per-id (`GET /dsgvo/export/:id`, `GET /dsgvo/deletion/:id`) and per-person (`GET /dsgvo/export/person/:personId`) routes exist.

Purpose:
- D-23 declared this the 5th backend gap of Phase 15. Without it the Jobs tab degrades to "type a job ID" UX.
- Pitfall 4 (RESEARCH §8 + MEMORY `useTeachers tenant leak`) requires `schoolId` REQUIRED at the DTO and the service to scope by it. `where: { schoolId: undefined }` would silently return ALL schools' DSGVO jobs to the calling admin — a cross-tenant data leak.
- `AuthenticatedUser` (`apps/api/src/modules/auth/types/authenticated-user.ts`) carries `id, email, username, roles[]` only — NO `schoolId`. The admin must therefore supply `schoolId` explicitly in the query (matches the existing `GET /dsgvo/consent/school/:schoolId` pattern).
- Role gate is service-level (`requestingUser.roles.includes('admin')` else `ForbiddenException`) — mirrors plan 15-03 and `audit.service.ts::findAll`. CASL grants `read:export`/`read:deletion` to non-admin roles for own-data flows; the school-wide list is admin-only.

Output: One new module directory `apps/api/src/modules/dsgvo/jobs/` (controller + service + DTO + Vitest spec), one edit to `dsgvo.module.ts` to register it. No schema changes, no migrations. Frontend (plan 15-08 hook + UI) consumes the endpoint without further backend churn.
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
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-03-consent-admin-filter-PLAN.md
@CLAUDE.md

<interfaces>
<!-- Authoritative current shape of touched files. Executor uses these directly — no codebase exploration needed. -->

From `apps/api/prisma/schema.prisma` lines 658-674 (DsgvoJob model — DO NOT MODIFY):
```prisma
model DsgvoJob {
  id           String         @id @default(uuid())
  schoolId     String         @map("school_id")
  school       School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  personId     String?        @map("person_id")
  jobType      DsgvoJobType   @map("job_type")
  status       DsgvoJobStatus @default(QUEUED)
  bullmqJobId  String?        @map("bullmq_job_id")
  resultData   Json?          @map("result_data")
  errorMessage String?        @map("error_message")
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")
  @@index([personId])
  @@index([status])
  @@map("dsgvo_jobs")
}

enum DsgvoJobType { DATA_EXPORT  DATA_DELETION  RETENTION_CLEANUP }
enum DsgvoJobStatus { QUEUED  PROCESSING  COMPLETED  FAILED }
```

From `apps/api/src/modules/dsgvo/dsgvo.module.ts` (CURRENT — to be EXTENDED):
```typescript
import { Module } from '@nestjs/common';
// ...existing imports for ConsentController/Service, RetentionController/Service,
//   DsfaController/Service, DataDeletionController/Service, DataExportController/Service,
//   PdfExportService, DeletionProcessor, ExportProcessor, RetentionProcessor

@Module({
  controllers: [
    ConsentController, RetentionController, DsfaController,
    DataDeletionController, DataExportController,
    // <-- DsgvoJobsController added here in Task 4
  ],
  providers: [
    ConsentService, RetentionService, DsfaService,
    DataDeletionService, DataExportService, PdfExportService,
    DeletionProcessor, ExportProcessor, RetentionProcessor,
    // <-- DsgvoJobsService added here in Task 4
  ],
  exports: [ConsentService, RetentionService, DsfaService, DataDeletionService, DataExportService],
})
export class DsgvoModule implements OnModuleInit { /* existing onModuleInit */ }
```

From `apps/api/src/modules/auth/types/authenticated-user.ts`:
```typescript
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  roles: string[];
}
```

From `apps/api/src/common/dto/pagination.dto.ts` (PaginationQueryDto base — DO NOT MODIFY):
```typescript
export class PaginationQueryDto {
  page: number = 1;     // @IsInt @Min(1)
  limit: number = 20;   // @IsInt @Min(1) @Max(500)
  get skip(): number { return (this.page - 1) * this.limit; }
}
```

`PrismaService` is injected globally via `@Global()` `PrismaModule` — no module imports needed beyond the Service provider list.

`@CheckPermissions` decorator + `@CurrentUser` decorator pattern (sibling: `apps/api/src/modules/audit/audit.controller.ts`):
```typescript
@Get()
@CheckPermissions({ action: 'read', subject: 'audit' })
async findAll(@Query() query: QueryAuditDto, @CurrentUser() user: AuthenticatedUser) { ... }
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create QueryDsgvoJobsDto with required schoolId + status/jobType filters</name>
  <read_first>
    - apps/api/src/modules/dsgvo/jobs/ (verify directory does not exist yet — `ls apps/api/src/modules/dsgvo/jobs/ 2>/dev/null` returns empty)
    - apps/api/src/common/dto/pagination.dto.ts (PaginationQueryDto base — extend it)
    - apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts (sibling DTO from plan 15-03 — copy structure)
    - apps/api/prisma/schema.prisma (lines 301-313 — DsgvoJobType + DsgvoJobStatus enums)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-23)
  </read_first>
  <behavior>
    - `QueryDsgvoJobsDto` exposes a REQUIRED `schoolId` field validated by `@IsUUID()` (NO `@IsOptional`)
    - Optional `status` field constrained to enum `QUEUED|PROCESSING|COMPLETED|FAILED`
    - Optional `jobType` field constrained to enum `DATA_EXPORT|DATA_DELETION|RETENTION_CLEANUP`
    - Inherits `page` and `limit` from `PaginationQueryDto`
    - 422 returned for `?schoolId=not-a-uuid` (UUID validation), `?status=foo` (enum mismatch), or missing `schoolId`
    - The DTO file lives at `apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts`
  </behavior>
  <action>
    Step 1: Create directory `apps/api/src/modules/dsgvo/jobs/dto/`:
    ```bash
    mkdir -p apps/api/src/modules/dsgvo/jobs/dto
    ```

    Step 2: Create `apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts`:
    ```typescript
    import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
    import { IsEnum, IsOptional, IsUUID } from 'class-validator';
    import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

    /**
     * Mirror of Prisma DsgvoJobStatus (apps/api/prisma/schema.prisma:307-313).
     * Frontend (plan 15-08) maps these to the UI badge variants:
     * QUEUED → pending, PROCESSING → running, COMPLETED → completed, FAILED → failed.
     */
    export enum DsgvoJobStatusFilter {
      QUEUED = 'QUEUED',
      PROCESSING = 'PROCESSING',
      COMPLETED = 'COMPLETED',
      FAILED = 'FAILED',
    }

    /**
     * Mirror of Prisma DsgvoJobType (apps/api/prisma/schema.prisma:301-305).
     */
    export enum DsgvoJobTypeFilter {
      DATA_EXPORT = 'DATA_EXPORT',
      DATA_DELETION = 'DATA_DELETION',
      RETENTION_CLEANUP = 'RETENTION_CLEANUP',
    }

    /**
     * Query DTO for the school-wide DSGVO jobs admin list (D-23).
     *
     * Pitfall 4: schoolId is REQUIRED — never `@IsOptional`. A missing schoolId
     * with `where: { schoolId: undefined }` would silently return all schools'
     * jobs to the calling admin (cross-tenant leak). Mirrors plan 15-03's
     * QueryConsentAdminDto pattern.
     */
    export class QueryDsgvoJobsDto extends PaginationQueryDto {
      @ApiProperty({ description: 'Tenant scope (required, mandatory)' })
      @IsUUID()
      schoolId!: string;

      @ApiPropertyOptional({ enum: DsgvoJobStatusFilter, description: 'Filter by Prisma DsgvoJobStatus' })
      @IsOptional()
      @IsEnum(DsgvoJobStatusFilter)
      status?: DsgvoJobStatusFilter;

      @ApiPropertyOptional({ enum: DsgvoJobTypeFilter, description: 'Filter by Prisma DsgvoJobType' })
      @IsOptional()
      @IsEnum(DsgvoJobTypeFilter)
      jobType?: DsgvoJobTypeFilter;
    }
    ```

    DO NOT: Mark `schoolId` as `@IsOptional`. DO NOT: Use a string for `status` — must be enum. DO NOT: Re-declare the enums anywhere else; export from this file only.
  </action>
  <verify>
    <automated>test -f apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts && grep -q "@IsUUID()" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts && grep -q "schoolId!" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts && grep -q "DsgvoJobStatusFilter" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts && grep -q "DsgvoJobTypeFilter" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts && pnpm --filter @schoolflow/api typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts` exits `0`
    - `grep -c "@IsUUID()" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts` returns at least `1`
    - `grep -c "schoolId!" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts` returns `1`
    - `grep -c "@IsOptional" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts` returns `2` (status + jobType only — NOT schoolId)
    - `grep -c "extends PaginationQueryDto" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts` returns `1`
    - `grep -E "DsgvoJobStatusFilter|DsgvoJobTypeFilter" apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts | wc -l` returns at least `4` (2 enum decls + 2 decorator usages)
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
  </acceptance_criteria>
  <done>The DTO file exists with mandatory `schoolId`, optional enum-constrained `status`/`jobType`, extends `PaginationQueryDto`, and `pnpm --filter @schoolflow/api typecheck` is clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement DsgvoJobsService.findAllForAdmin with tenant scope + role gate + Person include</name>
  <read_first>
    - apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts (Task 1 output)
    - apps/api/src/modules/audit/audit.service.ts (lines 56-108 — `findAll` role-scoping pattern to mirror)
    - apps/api/src/modules/dsgvo/consent/consent.service.ts (sibling Wave 1 plan 15-03 — `findAllForAdmin` pattern reference once Task 2 of 15-03 lands; for 15-04 we mirror the SAME structure)
    - apps/api/prisma/schema.prisma (lines 658-674 — DsgvoJob model + Person relation)
    - apps/api/src/config/database/prisma.service.ts (PrismaService injection pattern)
    - apps/api/src/modules/auth/types/authenticated-user.ts (AuthenticatedUser shape)
  </read_first>
  <behavior>
    - `DsgvoJobsService` is a NestJS injectable `@Injectable()` provider that takes `PrismaService` in its constructor
    - Public method signature: `findAllForAdmin(query: QueryDsgvoJobsDto, requestingUser: AuthenticatedUser): Promise<PaginatedResponseDto<DsgvoJobWithPerson>>`
    - Throws `ForbiddenException` BEFORE any DB read if `!requestingUser.roles.includes('admin')`
    - Throws `BadRequestException` BEFORE any DB read if `query.schoolId` is empty/falsy (defense-in-depth alongside DTO `@IsUUID()` — matches 15-03 Task 2)
    - Where clause is composed as `{ schoolId: query.schoolId, ...(query.status && { status: query.status }), ...(query.jobType && { jobType: query.jobType }) }`
    - The query MUST include `person: { select: { id: true, firstName: true, lastName: true, email: true } }` — but Person has `personId?` (nullable on DsgvoJob), so `RETENTION_CLEANUP` jobs (which have no person) MUST tolerate `person: null` in the response
    - Order: `orderBy: { createdAt: 'desc' }` (newest first)
    - Pagination: uses `query.skip` and `query.limit`; returns `{ data, meta: { page, limit, total, totalPages } }` matching `PaginatedResponseDto`
    - Returns the exact same envelope shape as plan 15-03's `findAllForAdmin` (consistency for the admin frontend)
  </behavior>
  <action>
    Step 1: Create `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts`:
    ```typescript
    import {
      Injectable,
      ForbiddenException,
      BadRequestException,
    } from '@nestjs/common';
    import { PrismaService } from '../../../config/database/prisma.service';
    import { AuthenticatedUser } from '../../auth/types/authenticated-user';
    import { QueryDsgvoJobsDto } from './dto/query-dsgvo-jobs.dto';

    @Injectable()
    export class DsgvoJobsService {
      constructor(private prisma: PrismaService) {}

      /**
       * School-wide list of DSGVO async jobs (D-23).
       *
       * Tenant scope: query.schoolId is REQUIRED (DTO @IsUUID + this defensive
       * runtime guard). Role gate: admin only (mirrors audit.service.ts::findAll
       * and consent.service.ts::findAllForAdmin from plan 15-03).
       */
      async findAllForAdmin(
        query: QueryDsgvoJobsDto,
        requestingUser: AuthenticatedUser,
      ) {
        // 1. Role gate (defense-in-depth alongside @CheckPermissions)
        if (!requestingUser.roles.includes('admin')) {
          throw new ForbiddenException(
            'DSGVO job list is admin-only. Per-id status remains available via /dsgvo/export/:id and /dsgvo/deletion/:id.',
          );
        }

        // 2. Tenant scope guard (Pitfall 4 — never trust where: { schoolId: undefined })
        if (!query.schoolId) {
          throw new BadRequestException('schoolId is required');
        }

        // 3. Compose where
        const where = {
          schoolId: query.schoolId,
          ...(query.status && { status: query.status }),
          ...(query.jobType && { jobType: query.jobType }),
        };

        // 4. Query + count in parallel
        const [data, total] = await Promise.all([
          this.prisma.dsgvoJob.findMany({
            where,
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: query.skip,
            take: query.limit,
          }),
          this.prisma.dsgvoJob.count({ where }),
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
    }
    ```

    DO NOT: Resolve `schoolId` from `requestingUser` — `AuthenticatedUser` does not carry it. DO NOT: Use raw SQL. DO NOT: Allow the `where` object to omit `schoolId` under any code path. DO NOT: Forget the `person` include — the JobsTab needs it.
  </action>
  <verify>
    <automated>test -f apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts && grep -q "findAllForAdmin" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts && grep -q "ForbiddenException" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts && grep -q "BadRequestException" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts && grep -q "schoolId: query.schoolId" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts && grep -q "person:" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts && pnpm --filter @schoolflow/api typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` exits `0`
    - `grep -c "findAllForAdmin" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` returns at least `1`
    - `grep -c "ForbiddenException" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` returns at least `2` (import + throw)
    - `grep -c "BadRequestException" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` returns at least `2` (import + throw)
    - `grep -q "schoolId: query.schoolId" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` exits `0`
    - `grep -q "createdAt: 'desc'" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` exits `0`
    - `grep -q "firstName: true" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` exits `0`
    - The service file has NO occurrence of `where: { schoolId: undefined }` or any `@IsOptional` reference
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
  </acceptance_criteria>
  <done>The service exposes `findAllForAdmin`, role-gates non-admin to 403, defends against missing schoolId with 400, scopes the Prisma query by schoolId, includes Person, orders newest-first, and returns the standard paginated envelope.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Add DsgvoJobsController route + tests + register in DsgvoModule</name>
  <read_first>
    - apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts (Task 2 output)
    - apps/api/src/modules/audit/audit.controller.ts (lines 1-50 — `@CurrentUser` + `@CheckPermissions` route reference)
    - apps/api/src/modules/dsgvo/dsgvo.module.ts (current shape — add controllers/providers entries)
    - apps/api/src/modules/auth/decorators/check-permissions.decorator.ts (verify CASL subject string convention)
    - apps/api/src/modules/auth/decorators/current-user.decorator.ts (verify export name)
  </read_first>
  <behavior>
    - Route `GET /dsgvo/jobs` exists, controller class is `DsgvoJobsController`, decorated with `@ApiTags('dsgvo/jobs')` + `@ApiBearerAuth()` + `@Controller('dsgvo/jobs')`
    - Single handler `findAllForAdmin(@Query() query: QueryDsgvoJobsDto, @CurrentUser() user: AuthenticatedUser)` forwards to `DsgvoJobsService.findAllForAdmin(query, user)`
    - Handler is decorated `@CheckPermissions({ action: 'read', subject: 'export' })` — same CASL grant the existing `data-export.controller.ts` uses (admin already holds it; CASL rejects unknown subjects)
    - `DsgvoJobsController` and `DsgvoJobsService` are added to `dsgvo.module.ts`'s `controllers` and `providers` arrays
    - The route appears in the OpenAPI spec when the API boots; `pnpm --filter @schoolflow/api start:dev` does not throw at startup
    - Existing `data-export.controller.ts` and `data-deletion.controller.ts` routes remain unchanged
  </behavior>
  <action>
    Step 1: Create `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts`:
    ```typescript
    import { Controller, Get, Query } from '@nestjs/common';
    import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
    import { DsgvoJobsService } from './dsgvo-jobs.service';
    import { QueryDsgvoJobsDto } from './dto/query-dsgvo-jobs.dto';
    import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';
    import { CurrentUser } from '../../auth/decorators/current-user.decorator';
    import { AuthenticatedUser } from '../../auth/types/authenticated-user';

    @ApiTags('dsgvo/jobs')
    @ApiBearerAuth()
    @Controller('dsgvo/jobs')
    export class DsgvoJobsController {
      constructor(private jobsService: DsgvoJobsService) {}

      @Get()
      @CheckPermissions({ action: 'read', subject: 'export' })
      @ApiOperation({ summary: 'School-wide list of DSGVO async jobs (admin only, D-23)' })
      @ApiResponse({ status: 200, description: 'Paginated DsgvoJob list' })
      @ApiResponse({ status: 403, description: 'Non-admin caller (service-level guard)' })
      @ApiResponse({ status: 422, description: 'Missing/invalid schoolId or enum mismatch' })
      async findAllForAdmin(
        @Query() query: QueryDsgvoJobsDto,
        @CurrentUser() user: AuthenticatedUser,
      ) {
        return this.jobsService.findAllForAdmin(query, user);
      }
    }
    ```

    Step 2: Edit `apps/api/src/modules/dsgvo/dsgvo.module.ts`:
    - Add the import line near the other DSGVO controller imports:
      ```typescript
      import { DsgvoJobsController } from './jobs/dsgvo-jobs.controller';
      import { DsgvoJobsService } from './jobs/dsgvo-jobs.service';
      ```
    - Append `DsgvoJobsController` to the `controllers: [...]` array
    - Append `DsgvoJobsService` to the `providers: [...]` array
    - Do NOT add it to `exports: [...]` (no other module needs to inject it)

    Step 3: Create `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts`:
    ```typescript
    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { ForbiddenException, BadRequestException } from '@nestjs/common';
    import { DsgvoJobsService } from './dsgvo-jobs.service';
    import {
      DsgvoJobStatusFilter,
      DsgvoJobTypeFilter,
      QueryDsgvoJobsDto,
    } from './dto/query-dsgvo-jobs.dto';
    import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

    function buildQuery(overrides: Partial<QueryDsgvoJobsDto> = {}): QueryDsgvoJobsDto {
      const q = new QueryDsgvoJobsDto();
      q.schoolId = overrides.schoolId ?? '00000000-0000-0000-0000-000000000001';
      q.page = overrides.page ?? 1;
      q.limit = overrides.limit ?? 20;
      if (overrides.status !== undefined) q.status = overrides.status;
      if (overrides.jobType !== undefined) q.jobType = overrides.jobType;
      return q;
    }

    const adminUser = (): AuthenticatedUser => ({
      id: 'u-admin',
      email: 'admin@school.test',
      username: 'admin',
      roles: ['admin'],
    });

    describe('DsgvoJobsService.findAllForAdmin', () => {
      let prisma: any;
      let svc: DsgvoJobsService;

      beforeEach(() => {
        prisma = {
          dsgvoJob: {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
          },
        };
        svc = new DsgvoJobsService(prisma);
      });

      it('throws ForbiddenException for schulleitung/lehrer/eltern/schueler', async () => {
        for (const role of ['schulleitung', 'lehrer', 'eltern', 'schueler']) {
          const user: AuthenticatedUser = { ...adminUser(), roles: [role] };
          await expect(svc.findAllForAdmin(buildQuery(), user)).rejects.toThrow(ForbiddenException);
        }
        expect(prisma.dsgvoJob.findMany).not.toHaveBeenCalled();
      });

      it('throws BadRequestException when schoolId is empty', async () => {
        const q = buildQuery({ schoolId: '' as any });
        await expect(svc.findAllForAdmin(q, adminUser())).rejects.toThrow(BadRequestException);
        expect(prisma.dsgvoJob.findMany).not.toHaveBeenCalled();
      });

      it('scopes findMany by schoolId only when no other filter is given', async () => {
        await svc.findAllForAdmin(buildQuery(), adminUser());
        const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
        expect(args.where).toEqual({ schoolId: '00000000-0000-0000-0000-000000000001' });
        expect(args.where).not.toHaveProperty('status');
        expect(args.where).not.toHaveProperty('jobType');
      });

      it('adds status filter when provided', async () => {
        await svc.findAllForAdmin(
          buildQuery({ status: DsgvoJobStatusFilter.PROCESSING }),
          adminUser(),
        );
        const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
        expect(args.where.status).toBe('PROCESSING');
      });

      it('adds jobType filter when provided', async () => {
        await svc.findAllForAdmin(
          buildQuery({ jobType: DsgvoJobTypeFilter.DATA_DELETION }),
          adminUser(),
        );
        const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
        expect(args.where.jobType).toBe('DATA_DELETION');
      });

      it('orders by createdAt desc', async () => {
        await svc.findAllForAdmin(buildQuery(), adminUser());
        const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
        expect(args.orderBy).toEqual({ createdAt: 'desc' });
      });

      it('includes Person select for admin display', async () => {
        await svc.findAllForAdmin(buildQuery(), adminUser());
        const args = prisma.dsgvoJob.findMany.mock.calls[0][0];
        expect(args.include.person.select).toEqual({
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        });
      });

      it('returns paginated envelope { data, meta } with correct totalPages', async () => {
        prisma.dsgvoJob.findMany.mockResolvedValue([{ id: 'j1' }, { id: 'j2' }]);
        prisma.dsgvoJob.count.mockResolvedValue(45);
        const result = await svc.findAllForAdmin(buildQuery({ page: 2, limit: 10 }), adminUser());
        expect(result.data).toHaveLength(2);
        expect(result.meta).toEqual({ page: 2, limit: 10, total: 45, totalPages: 5 });
      });
    });
    ```

    Step 4: Run the spec:
    ```bash
    pnpm --filter @schoolflow/api test -- dsgvo-jobs.service --reporter=basic
    ```
    All 8 cases must pass.

    Step 5: Run typecheck + boot dry-run:
    ```bash
    pnpm --filter @schoolflow/api typecheck
    pnpm --filter @schoolflow/api build
    ```
    Both must exit 0. The build step exercises NestJS module wiring at compile time.

    DO NOT: Add a per-controller role-decorator (the codebase does not use `@Roles` — service-level role check is the convention). DO NOT: Forget to register both Controller AND Service in `dsgvo.module.ts`. DO NOT: Add `DsgvoJobsService` to `exports: [...]`.
  </action>
  <verify>
    <automated>test -f apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts && test -f apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts && grep -q "DsgvoJobsController" apps/api/src/modules/dsgvo/dsgvo.module.ts && grep -q "DsgvoJobsService" apps/api/src/modules/dsgvo/dsgvo.module.ts && pnpm --filter @schoolflow/api test -- dsgvo-jobs.service --reporter=basic 2>&amp;1 | tail -5 | grep -q "passed" && pnpm --filter @schoolflow/api build 2>&amp;1 | tail -3 | grep -qv "error"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts` exits `0`
    - `test -f apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts` exits `0`
    - `grep -q "@Controller('dsgvo/jobs')" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts` exits `0`
    - `grep -q "@CheckPermissions({ action: 'read', subject: 'export' })" apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts` exits `0`
    - `grep -q "DsgvoJobsController" apps/api/src/modules/dsgvo/dsgvo.module.ts` exits `0` (import + controllers list — at least 2 occurrences)
    - `grep -c "DsgvoJobsController" apps/api/src/modules/dsgvo/dsgvo.module.ts` returns at least `2`
    - `grep -c "DsgvoJobsService" apps/api/src/modules/dsgvo/dsgvo.module.ts` returns at least `2`
    - `pnpm --filter @schoolflow/api test -- dsgvo-jobs.service` exits `0` with all 8 test cases passing
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
    - `pnpm --filter @schoolflow/api build` exits `0` (proves NestJS module wiring is valid)
  </acceptance_criteria>
  <done>The new module is registered, the route boots, the spec passes 8/8, and `pnpm --filter @schoolflow/api build` succeeds.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client (admin) → `GET /dsgvo/jobs` | Admin client supplies `schoolId`, optional `status`, optional `jobType` query params — must be validated server-side |
| auth layer → controller | `@CheckPermissions` enforces CASL `read:export`; service adds defense-in-depth role check |
| service → Prisma | `where` clause must always carry `schoolId` (Pitfall 4 family — see MEMORY `useTeachers tenant leak`, `subject tenant leak`, `useClasses silent omission`) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-04-01 | Tampering | `QueryDsgvoJobsDto.schoolId` | mitigate | `@IsUUID()` rejects non-UUID input (422) AND service throws `BadRequestException` if string is empty (defense-in-depth) |
| T-15-04-02 | Tampering | `QueryDsgvoJobsDto.status / jobType` | mitigate | `@IsEnum(...)` rejects values outside the Prisma enum mirrors (422); enum re-declared in DTO so DTO is the source of truth and never drifts |
| T-15-04-03 | Information Disclosure | Cross-tenant DsgvoJob leak via `where: { schoolId: undefined }` | mitigate | Pitfall 4 dual-layer guard: DTO marks `schoolId` REQUIRED (no `@IsOptional`) AND service throws `BadRequestException` on falsy `schoolId` BEFORE composing `where`. No code path constructs a `where` without `schoolId`. |
| T-15-04-04 | Information Disclosure | Non-admin sees school-wide jobs | mitigate | Service throws `ForbiddenException` if `!requestingUser.roles.includes('admin')`. CASL grant `read:export` is held by admin only — non-admin roles get a different per-id route via `data-export.controller.ts` for own-data flows. |
| T-15-04-05 | Elevation of Privilege | CASL bypass via direct controller call | mitigate | Two layers: `@CheckPermissions({ action: 'read', subject: 'export' })` decorator + service-level role check. Bypassing one still trips the other. |
| T-15-04-06 | Repudiation | Read-only list | accept | List endpoint reads only — no audit log entry needed (matches existing `audit.controller.ts findAll` and `data-export.controller.ts getExportsByPerson` precedent). The underlying `AuditInterceptor` from plan 15-01 still records sensitive-read entries for the underlying `DsgvoJob` rows when the service returns them. |
| T-15-04-07 | Denial of Service | Unbounded result set | mitigate | `PaginationQueryDto` caps `limit ≤ 500`; default is 20. Admin-only access reduces abuse surface. Indexes already exist on `(personId)` and `(status)` (schema lines 671-672). |

</threat_model>

<verification>
- `pnpm --filter @schoolflow/api test -- dsgvo-jobs` exits `0` with 8/8 service spec cases passing
- `pnpm --filter @schoolflow/api typecheck` exits `0`
- `pnpm --filter @schoolflow/api build` exits `0` — verifies NestJS module wiring at compile time
- `git diff --stat` shows exactly 5 changed files: 4 new under `apps/api/src/modules/dsgvo/jobs/` + 1 edit to `apps/api/src/modules/dsgvo/dsgvo.module.ts`
- The route `GET /dsgvo/jobs` returns 403 for non-admin (manual: hit it with a `lehrer` token), 422 for missing `schoolId` (manual: omit query param), and a paginated `{ data, meta }` envelope for admin
</verification>

<success_criteria>
- DSGVO-ADM-05 backend list shipped (D-23) — admin can list all in-flight + recent export jobs across the school
- DSGVO-ADM-06 backend list shipped (D-23) — same endpoint surfaces deletion jobs (filterable via `jobType=DATA_DELETION`)
- Tenant scope enforced at DTO + service layers (no `where: { schoolId: undefined }` code path)
- Role gate enforced at service layer (defense-in-depth alongside CASL)
- Existing per-id endpoints (`GET /dsgvo/export/:id`, `GET /dsgvo/deletion/:id`, `GET /dsgvo/export/person/:personId`) remain untouched
- Frontend (plan 15-08) consumes the new endpoint via `useDsgvoJobs(filters)` without further backend churn
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-04-SUMMARY.md` listing:
- The 5 files added/edited
- The Vitest spec result (8 cases passed)
- The typecheck + build outcomes
- Any deviations from the action plan (if PrismaService injection path differs, or if `@CheckPermissions` subject string had to be adjusted)
- Which Phase 15 frontend plan picks this up next (15-08 — JobsTab + polling hooks)
</output>

<context_decisions>
## Truths — CONTEXT.md Decision Coverage

_Citations in `D-NN:` format for the decision-coverage gate (workflow step 13a)._

- D-23: GET /dsgvo/jobs school-wide list endpoint added (5th backend gap)
- D-07: BullMQ Job-Status-Read-Endpoints (GET /dsgvo/export/:id, /dsgvo/deletion/:id) already exist — no gap-fix needed

</context_decisions>
