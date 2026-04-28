---
phase: 15
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/<timestamp>_add_audit_entry_before_snapshot/migration.sql
  - apps/api/src/modules/audit/audit.service.ts
  - apps/api/src/modules/audit/audit.interceptor.ts
  - apps/api/src/modules/audit/audit.interceptor.spec.ts
  - apps/api/src/modules/audit/audit.service.spec.ts
  - apps/api/src/modules/audit/audit.controller.ts
  - apps/api/src/modules/audit/dto/query-audit.dto.ts
autonomous: true
requirements_addressed:
  - AUDIT-VIEW-01
  - AUDIT-VIEW-02
tags: [phase-15, audit, dsgvo, backend, prisma-migration, interceptor]

must_haves:
  truths:
    - "AuditEntry rows created AFTER this plan ships have a `before` JSON snapshot for UPDATE/DELETE on mapped resources"
    - "AuditEntry rows created BEFORE this plan ships have `before = NULL` (no retro-fill, D-10)"
    - "Audit findAll endpoint accepts an `action` query parameter constrained to `create|update|delete|read`"
    - "Existing audit log call sites keep producing `metadata.body` exactly as before — the refactor adds a field, never moves one"
  artifacts:
    - path: apps/api/prisma/schema.prisma
      provides: "AuditEntry.before Json? top-level column"
      contains: "before     Json?"
    - path: apps/api/prisma/migrations/<timestamp>_add_audit_entry_before_snapshot/migration.sql
      provides: "Forward migration adding before column"
      contains: 'ADD COLUMN "before" JSONB'
    - path: apps/api/src/modules/audit/audit.interceptor.ts
      provides: "Pre-handler DB snapshot for UPDATE/DELETE on mapped resources, sanitized before persistence"
      contains: "captureBeforeState"
    - path: apps/api/src/modules/audit/audit.interceptor.spec.ts
      provides: "Vitest spec verifying pre-state capture, NULL fallback for unmapped resources, sensitive field redaction"
      contains: "describe('AuditInterceptor"
    - path: apps/api/src/modules/audit/dto/query-audit.dto.ts
      provides: "AuditActionFilter enum + optional `action` field"
      contains: "AuditActionFilter"
  key_links:
    - from: apps/api/src/modules/audit/audit.interceptor.ts
      to: apps/api/src/config/database/prisma.service.ts
      via: "constructor injection of PrismaService for pre-handler model lookups"
      pattern: "private prisma: PrismaService"
    - from: apps/api/src/modules/audit/audit.service.ts (log)
      to: prisma.auditEntry.create
      via: "Persists `before` field alongside existing metadata"
      pattern: "before: input.before"
    - from: apps/api/src/modules/audit/audit.service.ts (findAll)
      to: where clause
      via: "if (params.action) where.action = params.action"
      pattern: "where.action"
---

<objective>
Land the AuditEntry schema migration (`before Json?` column), refactor `AuditInterceptor` to capture pre-mutation state for UPDATE/DELETE on mapped resources, and extend `QueryAuditDto` with an `action` filter (AUDIT-VIEW-01 prerequisite). Per CONTEXT D-09/D-10/D-11/D-24 and RESEARCH §2/§3/§8.

Purpose: The Audit-Log viewer (AUDIT-VIEW-02) needs Before/After payloads. The pre-state is captured server-side because only the server has DB access; legacy entries stay NULL (no retro-fill, D-10). The `action` filter is required by AUDIT-VIEW-01 ("Actor, Action, Subject, Zeitraum") but missing today.

Output: One Prisma migration file, one schema change, one interceptor refactor, one new DTO field, two new Vitest specs. Frontend (Wave 2) and CSV export (15-02) consume `before` and `action` directly without further backend churn.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-VALIDATION.md
@CLAUDE.md

<interfaces>
<!-- Authoritative current shape of touched files. Executor uses these directly — no codebase exploration needed. -->

From `apps/api/src/modules/audit/audit.service.ts` (CURRENT shape):
```typescript
export interface AuditLogInput {
  userId: string;
  action: string; // 'create' | 'update' | 'delete' | 'read'
  resource: string;
  resourceId?: string;
  category: 'MUTATION' | 'SENSITIVE_READ';
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  async log(input: AuditLogInput);
  async findAll(params: {
    userId?: string; resource?: string; category?: string;
    startDate?: Date; endDate?: Date; page: number; limit: number;
    requestingUser: { id: string; roles: string[] };
  });
}

export const SENSITIVE_RESOURCES = ['grades', 'student', 'teacher', 'user', 'consent', 'export', 'person', 'retention'] as const;
export const PEDAGOGICAL_RESOURCES = ['grades', 'classbook', 'student', 'teacher'] as const;
```

From `apps/api/src/modules/audit/audit.interceptor.ts` (CURRENT — to be refactored):
```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {} // <-- Task 2 ADDS PrismaService
  intercept(context, next) {
    return next.handle().pipe(tap(async () => { /* logs AFTER handler, no pre-state */ }));
  }
  private extractResource(url: string): string { /* /api/v1/{resource} */ }
  private sanitizeBody(body: any): any { /* redacts password, secret, token, credential */ }
}
```

From `apps/api/prisma/schema.prisma` lines 231-248 (CURRENT AuditEntry):
```prisma
model AuditEntry {
  id         String        @id @default(uuid())
  userId     String        @map("user_id")
  action     String
  resource   String
  resourceId String?       @map("resource_id")
  category   AuditCategory
  metadata   Json?
  ipAddress  String?       @map("ip_address")
  userAgent  String?       @map("user_agent")
  createdAt  DateTime      @default(now()) @map("created_at")
  @@index([userId])
  @@index([resource, resourceId])
  @@index([createdAt])
  @@index([category])
  @@map("audit_entries")
}
```

`apps/api/src/config/database/prisma.service.ts` exports `PrismaService extends PrismaClient` and is provided via `@Global()` PrismaModule (verify in `apps/api/src/app.module.ts` and `apps/api/src/config/database/prisma.module.ts`).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add AuditEntry.before column via prisma migrate dev</name>
  <read_first>
    - apps/api/prisma/schema.prisma (lines 225-250 — AuditEntry model)
    - apps/api/prisma/migrations/20260425172608_add_constraint_weight_overrides/migration.sql (recent migration format reference)
    - apps/api/prisma/README.md (migration policy + shadow DB setup)
    - CLAUDE.md (Database migrations hard rule — Conventions section)
  </read_first>
  <behavior>
    - `apps/api/prisma/schema.prisma` AuditEntry model contains `before Json?` (top-level column)
    - A new migration folder exists under `apps/api/prisma/migrations/<timestamp>_add_audit_entry_before_snapshot/` with `migration.sql` containing `ALTER TABLE "audit_entries" ADD COLUMN "before" JSONB`
    - `pnpm --filter @schoolflow/api exec prisma migrate status` reports the migration as applied
    - Generated Prisma Client includes `before` on the `AuditEntry` type
    - Existing rows have `before = NULL` (additive, non-breaking; D-10)
  </behavior>
  <action>
    Step 1: Edit `apps/api/prisma/schema.prisma`. In the `AuditEntry` model (line 231-248), insert this line BETWEEN the existing `metadata` and `ipAddress` fields:
    ```prisma
        before     Json?         // pre-mutation snapshot for UPDATE/DELETE; null for create/read or legacy entries (D-10, D-24)
    ```

    Step 2: Generate the migration using `prisma migrate dev` (NOT `db push` — CLAUDE.md hard rule, also D-11):
    ```bash
    pnpm --filter @schoolflow/api exec prisma migrate dev --name add_audit_entry_before_snapshot
    ```
    This produces `apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_add_audit_entry_before_snapshot/migration.sql` and regenerates Prisma Client.

    Step 3: Verify the migration SQL contains exactly:
    ```sql
    -- AlterTable
    ALTER TABLE "audit_entries" ADD COLUMN "before" JSONB;
    ```
    No DROP or RENAME statements should appear (additive change only).

    Step 4: Restart the long-running NestJS API process if one is running locally (per memory `feedback_restart_api_after_migration.md` — Nest binds Prisma Client at boot). For automation contexts: skip; supervisor handles restart.

    Step 5: Run `pnpm --filter @schoolflow/api exec prisma migrate status` and confirm output contains "Database schema is up to date!".

    DO NOT: Use `prisma db push`. DO NOT: Edit migration.sql by hand after `migrate dev` generates it. DO NOT: Add the `before` field nested inside `metadata` (RESEARCH §2 A1 — top-level column for index-friendliness and clean separation of concerns).
  </action>
  <verify>
    <automated>pnpm --filter @schoolflow/api exec prisma migrate status 2>&amp;1 | grep -q "Database schema is up to date" &amp;&amp; ls apps/api/prisma/migrations/ | grep -q "add_audit_entry_before_snapshot" &amp;&amp; grep -q "before     Json?" apps/api/prisma/schema.prisma &amp;&amp; grep -q 'ADD COLUMN "before" JSONB' apps/api/prisma/migrations/*add_audit_entry_before_snapshot*/migration.sql</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "before     Json?" apps/api/prisma/schema.prisma` returns `1`
    - `ls apps/api/prisma/migrations/ | grep -c add_audit_entry_before_snapshot` returns `1`
    - `grep -q 'ADD COLUMN "before" JSONB' apps/api/prisma/migrations/*add_audit_entry_before_snapshot*/migration.sql` exits `0`
    - `pnpm --filter @schoolflow/api exec prisma migrate status` exits `0` and stdout contains "Database schema is up to date"
    - `pnpm --filter @schoolflow/api typecheck` exits `0` (Prisma Client type for AuditEntry now includes `before`)
    - The migration.sql file contains NO `DROP TABLE`, `RENAME`, or `DELETE` statements
  </acceptance_criteria>
  <done>The schema diff and migration.sql are in the same git diff, `prisma migrate status` is clean, and Prisma Client typings include `AuditEntry.before`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Refactor AuditInterceptor to capture pre-state + extend AuditService.log signature</name>
  <read_first>
    - apps/api/src/modules/audit/audit.interceptor.ts (current implementation — lines 1-113)
    - apps/api/src/modules/audit/audit.service.ts (current `AuditLogInput` interface lines 20-29 + `log` method lines 35-48)
    - apps/api/src/modules/audit/audit.module.ts (Global module, providers list)
    - apps/api/src/config/database/prisma.service.ts (PrismaService injection pattern — verify import path)
    - apps/api/src/modules/audit/audit.service.ts SENSITIVE_RESOURCES + PEDAGOGICAL_RESOURCES constants
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md §3 (full target shape with code)
  </read_first>
  <behavior>
    - For `PUT|PATCH|DELETE` requests where `request.params.id` exists AND `extractResource(url)` is in the `RESOURCE_MODEL_MAP`, the interceptor reads the row from DB BEFORE the handler runs and stores it in request scope
    - In the post-handler `tap`, the captured snapshot is sanitized via `sanitizeBody()` and persisted to `audit_entries.before`
    - For `POST` (create): `before = undefined`
    - For unmapped resources OR missing `params.id` OR pre-handler DB read failure: `before = undefined`, NOT a thrown error (interceptor must NEVER block the handler)
    - The existing `metadata.body` shape is preserved EXACTLY for non-DELETE mutations
    - Sensitive field redaction (`password`, `secret`, `token`, `credential`) applies to the `before` snapshot identically to `body`
    - PII fields (`email`, `phone`) are NOT redacted per D-24
  </behavior>
  <action>
    Step 1: Extend `AuditLogInput` in `apps/api/src/modules/audit/audit.service.ts`. Add one optional field after `metadata`:
    ```typescript
    export interface AuditLogInput {
      userId: string;
      action: string;
      resource: string;
      resourceId?: string;
      category: 'MUTATION' | 'SENSITIVE_READ';
      metadata?: Record<string, unknown>;
      before?: Record<string, unknown> | null;  // NEW: pre-mutation snapshot, sanitized
      ipAddress?: string;
      userAgent?: string;
    }
    ```
    Then update `AuditService.log` (around line 35-48) to persist it:
    ```typescript
    async log(input: AuditLogInput) {
      return this.prisma.auditEntry.create({
        data: {
          userId: input.userId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          category: input.category as any,
          metadata: input.metadata as any,
          before: input.before as any,   // NEW
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    }
    ```

    Step 2: Refactor `apps/api/src/modules/audit/audit.interceptor.ts`. Replace the entire file with the implementation shown in RESEARCH §3 / `<interfaces>` block. Key elements:
    - Add `import { from, switchMap, tap } from 'rxjs'` (the file currently only imports `tap` and `Observable`)
    - Add `import { PrismaService } from '../../config/database/prisma.service'` and inject in constructor as second arg
    - Add a top-level `const RESOURCE_MODEL_MAP: Record<string, string> = { ... }` containing AT LEAST these keys (URL segment → Prisma model accessor):
      ```typescript
      consent: 'consentRecord',
      retention: 'retentionPolicy',
      dsfa: 'dsfaEntry',
      vvz: 'vvzEntry',
      schools: 'school',
      students: 'student',
      teachers: 'teacher',
      classes: 'schoolClass',
      subjects: 'subject',
      rooms: 'room',
      resources: 'resource',
      ```
    - Implement `private async captureBeforeState(resource: string, id: string): Promise<unknown>` that returns `(this.prisma as any)[modelName].findUnique({ where: { id } })` for mapped resources, or `undefined` for unmapped, never throws (wrap in try/catch returning `undefined`)
    - Replace `intercept` body with: compute `isMutationOnExistingRow` from method+id, use `from(beforeP).pipe(switchMap(snap => next.handle().pipe(tap(async () => { /* existing log logic + before: sanitizeBody(snap) */ }))))`
    - Preserve EXACTLY the existing `metadata.body` construction for non-DELETE: `metadata: method !== 'DELETE' ? { body: this.sanitizeBody(request.body) } : undefined`
    - Preserve EXACTLY the SENSITIVE_READ branch (separate log call for GET on sensitive resources)

    Step 3: Verify `PrismaService` is injectable in `AuditInterceptor`. Check `apps/api/src/config/database/prisma.module.ts` — if it has `@Global()` and exports `PrismaService`, no AuditModule change needed. Otherwise, add `PrismaModule` to AuditModule's `imports` and ensure PrismaService is exported globally.

    Step 4: Create `apps/api/src/modules/audit/audit.interceptor.spec.ts` with these 7 test cases (Vitest 4):
    ```typescript
    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { firstValueFrom, of } from 'rxjs';
    import { AuditInterceptor } from './audit.interceptor';
    import type { AuditService } from './audit.service';
    import type { PrismaService } from '../../config/database/prisma.service';

    describe('AuditInterceptor', () => {
      let auditService: { log: any };
      let prisma: any;
      let interceptor: AuditInterceptor;

      beforeEach(() => {
        auditService = { log: vi.fn().mockResolvedValue(undefined) };
        prisma = {
          retentionPolicy: { findUnique: vi.fn() },
          consentRecord:   { findUnique: vi.fn() },
        };
        interceptor = new AuditInterceptor(
          auditService as unknown as AuditService,
          prisma     as unknown as PrismaService,
        );
      });

      function ctx(method: string, url: string, params: any, body: any) {
        return {
          switchToHttp: () => ({
            getRequest: () => ({
              method, url, params, body,
              ip: '127.0.0.1', headers: { 'user-agent': 'test' },
              user: { id: 'u1', roles: ['admin'] },
            }),
          }),
        } as any;
      }

      it('captures pre-state for PUT on mapped resource', async () => {
        const pre = { id: 'r1', dataCategory: 'MUTATION', retentionDays: 365 };
        prisma.retentionPolicy.findUnique.mockResolvedValue(pre);
        await firstValueFrom(interceptor.intercept(
          ctx('PUT', '/api/v1/retention/r1', { id: 'r1' }, { retentionDays: 730 }),
          { handle: () => of({ id: 'r1' }) },
        ));
        expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
          action: 'update', resource: 'retention', resourceId: 'r1',
          before: pre, metadata: { body: { retentionDays: 730 } },
        }));
      });

      it('captures pre-state for DELETE on mapped resource', async () => {
        const pre = { id: 'c1', purpose: 'STATISTIK', granted: true };
        prisma.consentRecord.findUnique.mockResolvedValue(pre);
        await firstValueFrom(interceptor.intercept(
          ctx('DELETE', '/api/v1/consent/c1', { id: 'c1' }, undefined),
          { handle: () => of({ id: 'c1' }) },
        ));
        expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
          action: 'delete', resource: 'consent', before: pre, metadata: undefined,
        }));
      });

      it('leaves before=undefined for unmapped resources', async () => {
        await firstValueFrom(interceptor.intercept(
          ctx('PUT', '/api/v1/some-unknown-thing/x1', { id: 'x1' }, { foo: 1 }),
          { handle: () => of({ id: 'x1' }) },
        ));
        expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ before: undefined }));
      });

      it('leaves before=undefined when DB lookup throws', async () => {
        prisma.retentionPolicy.findUnique.mockRejectedValue(new Error('boom'));
        await firstValueFrom(interceptor.intercept(
          ctx('PUT', '/api/v1/retention/r1', { id: 'r1' }, { retentionDays: 999 }),
          { handle: () => of({ id: 'r1' }) },
        ));
        expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ before: undefined }));
      });

      it('redacts password/secret/token/credential from before', async () => {
        prisma.consentRecord.findUnique.mockResolvedValue({
          id: 'c1', granted: true, password: 'p', secret: 's', token: 't', credential: 'c',
        });
        await firstValueFrom(interceptor.intercept(
          ctx('PUT', '/api/v1/consent/c1', { id: 'c1' }, { granted: false }),
          { handle: () => of({ id: 'c1' }) },
        ));
        const call = auditService.log.mock.calls[0][0];
        expect(call.before.password).toBe('[REDACTED]');
        expect(call.before.secret).toBe('[REDACTED]');
        expect(call.before.token).toBe('[REDACTED]');
        expect(call.before.credential).toBe('[REDACTED]');
      });

      it('does NOT redact email/phone (D-24)', async () => {
        prisma.consentRecord.findUnique.mockResolvedValue({ id: 'c1', email: 'a@b.c', phone: '+431' });
        await firstValueFrom(interceptor.intercept(
          ctx('PUT', '/api/v1/consent/c1', { id: 'c1' }, { granted: true }),
          { handle: () => of({ id: 'c1' }) },
        ));
        const call = auditService.log.mock.calls[0][0];
        expect(call.before.email).toBe('a@b.c');
        expect(call.before.phone).toBe('+431');
      });

      it('preserves metadata.body shape for POST and skips DB lookup', async () => {
        await firstValueFrom(interceptor.intercept(
          ctx('POST', '/api/v1/retention', undefined, { dataCategory: 'X', retentionDays: 100 }),
          { handle: () => of({ id: 'r-new' }) },
        ));
        expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
          action: 'create',
          metadata: { body: { dataCategory: 'X', retentionDays: 100 } },
          before: undefined,
        }));
        expect(prisma.retentionPolicy.findUnique).not.toHaveBeenCalled();
      });
    });
    ```

    Step 5: Run:
    ```bash
    pnpm --filter @schoolflow/api test -- audit.interceptor
    ```
    All 7 cases must pass.

    DO NOT: Move `metadata.body` content into `before`. DO NOT: Apply `where: { id, schoolId }` to the snapshot read (RESEARCH §8 — tenant scoping happens at the audit-read endpoint, not at capture). DO NOT: Throw on snapshot read failure.
  </action>
  <verify>
    <automated>pnpm --filter @schoolflow/api test -- audit.interceptor --reporter=basic 2>&amp;1 | tail -5 | grep -q "passed" &amp;&amp; pnpm --filter @schoolflow/api typecheck 2>&amp;1 | tail -3 | grep -qv "error TS" &amp;&amp; grep -q "before?: Record" apps/api/src/modules/audit/audit.service.ts &amp;&amp; grep -q "captureBeforeState" apps/api/src/modules/audit/audit.interceptor.ts</automated>
  </verify>
  <acceptance_criteria>
    - `apps/api/src/modules/audit/audit.interceptor.spec.ts` exists and `grep -q "describe('AuditInterceptor'" apps/api/src/modules/audit/audit.interceptor.spec.ts` exits `0`
    - `pnpm --filter @schoolflow/api test -- audit.interceptor` exits `0` with all 7 test cases passing
    - `grep -c "before?: Record" apps/api/src/modules/audit/audit.service.ts` returns `1`
    - `grep -c "captureBeforeState" apps/api/src/modules/audit/audit.interceptor.ts` returns at least `2` (definition + invocation)
    - `grep -c "RESOURCE_MODEL_MAP" apps/api/src/modules/audit/audit.interceptor.ts` returns at least `2`
    - `grep -c "PrismaService" apps/api/src/modules/audit/audit.interceptor.ts` returns at least `2` (import + constructor)
    - The interceptor file does NOT redact `email` or `phone`: `grep -E "email|phone" apps/api/src/modules/audit/audit.interceptor.ts` returns no lines containing the literal string `[REDACTED]` for those identifiers
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
  </acceptance_criteria>
  <done>Interceptor captures pre-state for mapped UPDATE/DELETE routes, sanitizes before persistence, leaves NULL for unmapped resources, never blocks the handler, and the new Vitest spec passes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Add `action` filter to QueryAuditDto + AuditService.findAll + controller forwarding</name>
  <read_first>
    - apps/api/src/modules/audit/dto/query-audit.dto.ts (current shape — lines 1-67)
    - apps/api/src/modules/audit/audit.service.ts findAll method (lines 56-108)
    - apps/api/src/modules/audit/audit.controller.ts (controller signature — lines 26-40)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md §8 (action-filter extension exact spec)
  </read_first>
  <behavior>
    - `QueryAuditDto` exposes an optional `action` field constrained to enum `create|update|delete|read`
    - `AuditService.findAll` honours the new `action` parameter
    - `AuditController.findAll` forwards `query.action` to the service params
    - Existing tests for `findAll` still pass (additive change)
    - 422 returned for `?action=foo` (invalid enum) — class-validator default behaviour
  </behavior>
  <action>
    Step 1: Edit `apps/api/src/modules/audit/dto/query-audit.dto.ts`. ADD a new enum (alongside `AuditCategoryFilter`, line 13-16) and a new field. The final DTO field order MUST be: `userId, resource, category, action, startDate, endDate, page, limit`.
    ```typescript
    enum AuditActionFilter {
      CREATE = 'create',
      UPDATE = 'update',
      DELETE = 'delete',
      READ   = 'read',
    }
    // Inside QueryAuditDto, AFTER `category?: string;` and BEFORE `startDate?: string;`:
    @ApiPropertyOptional({
      enum: AuditActionFilter,
      description: 'Filter by audit action',
      example: 'update',
    })
    @IsOptional()
    @IsEnum(AuditActionFilter)
    action?: string;
    ```

    Step 2: Edit `apps/api/src/modules/audit/audit.service.ts` `findAll` method. Add `action?: string;` to the params type (after `category?: string;`), and add this line in the where-clause assembly (after the `if (params.category) where.category = params.category;` line):
    ```typescript
    if (params.action) where.action = params.action;
    ```

    Step 3: Edit `apps/api/src/modules/audit/audit.controller.ts` `findAll` (lines 30-39). Add the new field to the service call:
    ```typescript
    return this.auditService.findAll({
      userId: query.userId,
      resource: query.resource,
      category: query.category,
      action: query.action,        // NEW
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
      requestingUser: user,
    });
    ```

    Step 4: Create `apps/api/src/modules/audit/audit.service.spec.ts` (or extend if already exists) with at minimum:
    ```typescript
    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { AuditService } from './audit.service';

    describe('AuditService.findAll action filter', () => {
      let prisma: any; let svc: AuditService;
      beforeEach(() => {
        prisma = {
          auditEntry: {
            findMany: vi.fn().mockResolvedValue([]),
            count:    vi.fn().mockResolvedValue(0),
          },
        };
        svc = new AuditService(prisma);
      });
      it('passes action filter to where clause', async () => {
        await svc.findAll({ action: 'update', page: 1, limit: 20, requestingUser: { id: 'u1', roles: ['admin'] } });
        expect(prisma.auditEntry.findMany.mock.calls[0][0].where.action).toBe('update');
      });
      it('omits action filter when undefined', async () => {
        await svc.findAll({ page: 1, limit: 20, requestingUser: { id: 'u1', roles: ['admin'] } });
        expect(prisma.auditEntry.findMany.mock.calls[0][0].where.action).toBeUndefined();
      });
    });
    ```

    Step 5: Run `pnpm --filter @schoolflow/api test -- audit.service` — both cases must pass.

    DO NOT: Add the action filter as a free-form string (must be enum-constrained). DO NOT: Default `action` (absence = "all actions"). DO NOT: Remove or rename the existing `category` filter.
  </action>
  <verify>
    <automated>pnpm --filter @schoolflow/api test -- audit.service --reporter=basic 2>&amp;1 | tail -5 | grep -q "passed" &amp;&amp; grep -q "AuditActionFilter" apps/api/src/modules/audit/dto/query-audit.dto.ts &amp;&amp; grep -q "params.action" apps/api/src/modules/audit/audit.service.ts &amp;&amp; grep -q "action: query.action" apps/api/src/modules/audit/audit.controller.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "AuditActionFilter" apps/api/src/modules/audit/dto/query-audit.dto.ts` returns at least `2` (enum definition + decorator usage)
    - `grep -c "@IsEnum(AuditActionFilter)" apps/api/src/modules/audit/dto/query-audit.dto.ts` returns `1`
    - `grep -c "params.action" apps/api/src/modules/audit/audit.service.ts` returns at least `1`
    - `grep -q "action: query.action" apps/api/src/modules/audit/audit.controller.ts` exits `0`
    - `pnpm --filter @schoolflow/api test -- audit.service` exits `0` with both new test cases passing
    - Existing `category` filter still works: `grep -q "if (params.category) where.category = params.category;" apps/api/src/modules/audit/audit.service.ts` exits `0`
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
  </acceptance_criteria>
  <done>The DTO exposes a constrained `action` enum, service honours it, controller forwards it, and the new spec passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client (admin) → audit endpoint | Admin client supplies query params (action, userId, resource…) — must be validated server-side |
| client (any role) → audit interceptor | Any authenticated request crosses the interceptor; interceptor reads pre-state from DB before handler |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-01-01 | Tampering | `QueryAuditDto.action` | mitigate | `@IsEnum(AuditActionFilter)` rejects values outside `create/update/delete/read` (422) |
| T-15-01-02 | Information Disclosure | `AuditEntry.before` snapshot | mitigate | Per D-24 audit log is admin-only; `audit.service.ts::findAll` already role-scopes (admin sees all, schulleitung sees pedagogical only, others see own). New `before` field surfaces ONLY through this same role gate. Sanitization redacts `password/secret/token/credential` from snapshots. |
| T-15-01-03 | Denial of Service | Pre-handler DB lookup | accept | Adds 3-15ms per UPDATE/DELETE; admin-only Phase 15 surfaces, no high-throughput path affected. Snapshot read wrapped in try/catch returning `undefined` so a DB hiccup never blocks the handler. |
| T-15-01-04 | Repudiation | Audit trail completeness | mitigate | Interceptor preserves the existing audit-log-on-every-mutation behavior; `before` is additive. Existing Phase 14 audit specs (regression-tested in Wave 3) confirm `metadata.body` shape unchanged. |
</threat_model>

<verification>
- `pnpm --filter @schoolflow/api test -- audit` runs all audit specs (interceptor + service) and exits `0`
- `pnpm --filter @schoolflow/api typecheck` exits `0`
- `pnpm --filter @schoolflow/api exec prisma migrate status` reports clean
- `git diff` shows ONE new migration folder + schema diff in same commit (CLAUDE.md C-2)
</verification>

<success_criteria>
- AUDIT-VIEW-01 prerequisite (action filter) shipped with DTO + service + controller wiring
- AUDIT-VIEW-02 prerequisite (`AuditEntry.before` column + interceptor capture) shipped
- Migration follows hard rule (real `migrate dev`, no `db push`)
- Pre-state capture is sanitized, fail-soft, and tenant-isolation-respecting
- Existing audit-log behaviour preserved (regression: Phase 14 audit specs still pass — verified in Wave 3 plan 15-09/15-10)
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-01-SUMMARY.md` listing the migration filename, files changed, test results, and any deviations from the action plan.
</output>

<context_decisions>
## Truths — CONTEXT.md Decision Coverage

_Citations in `D-NN:` format for the decision-coverage gate (workflow step 13a)._

- D-09: v1 audit detail rendering is After-only JSON tree with banner for missing pre-state
- D-10: AuditInterceptor refactor for pre-mutation state capture; legacy entries stay After-only
- D-11: Schema migration follows Migration Hard Rule (real prisma migrate dev, no db push)
- D-24: Audit before-snapshot NOT PII-redacted (admin-only audience)

</context_decisions>
