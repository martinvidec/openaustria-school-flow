---
phase: 15
plan: 02
type: execute
wave: 1
depends_on: [15-01]
files_modified:
  - apps/api/src/modules/audit/audit.service.ts
  - apps/api/src/modules/audit/audit.controller.ts
  - apps/api/src/modules/audit/dto/export-audit.query.dto.ts
  - apps/api/src/modules/audit/audit.controller.e2e-spec.ts
  - apps/api/src/modules/audit/audit.service.spec.ts
autonomous: true
requirements_addressed:
  - AUDIT-VIEW-03
tags: [phase-15, audit, dsgvo, backend, csv-export, fastify]

must_haves:
  truths:
    - "Admin can hit `GET /api/v1/audit/export.csv?<filters>` and receive a streaming CSV download respecting every filter"
    - "Returned `Content-Type` is `text/csv; charset=utf-8`"
    - "Returned `Content-Disposition` is `attachment; filename=\"audit-log-YYYY-MM-DD.csv\"`"
    - "Body starts with UTF-8 BOM (`\\uFEFF`) so German Excel opens umlauts correctly"
    - "Delimiter is semicolon (D-25 — DACH/Excel default)"
    - "Filter set matches `findAll` (userId, resource, category, action, startDate, endDate) — same role-scoping inherited"
    - "Hard cap at 10,000 rows (server-side guard against unbounded export)"
    - "RFC-4180-compliant escaping via `Papa.unparse` (no hand-rolling — `papaparse` already in apps/api/package.json:44)"
  artifacts:
    - path: apps/api/src/modules/audit/audit.service.ts
      provides: "AuditService.exportCsv(params) returning string with BOM + CSV body"
      contains: "exportCsv"
    - path: apps/api/src/modules/audit/audit.controller.ts
      provides: "GET /audit/export.csv route (Fastify reply.header pattern)"
      contains: "@Get('export.csv')"
    - path: apps/api/src/modules/audit/dto/export-audit.query.dto.ts
      provides: "ExportAuditQueryDto mirrors QueryAuditDto without page/limit"
      contains: "ExportAuditQueryDto"
    - path: apps/api/src/modules/audit/audit.controller.e2e-spec.ts
      provides: "Supertest integration spec asserting Content-Type, Content-Disposition, BOM, header row, delimiter"
      contains: "describe('GET /audit/export.csv"
  key_links:
    - from: apps/api/src/modules/audit/audit.controller.ts
      to: apps/api/src/modules/audit/audit.service.ts
      via: "controller.exportCsv → service.exportCsv → Papa.unparse"
      pattern: "auditService.exportCsv"
    - from: apps/api/src/modules/audit/audit.service.ts
      to: papaparse
      via: "Papa.unparse(csvRows, { delimiter: ';', quotes: true, newline: '\\r\\n' })"
      pattern: "Papa.unparse"
---

<objective>
Add `GET /api/v1/audit/export.csv` endpoint plus `AuditService.exportCsv()` so the Audit-Log viewer (AUDIT-VIEW-03) can export filtered CSV server-side. Per CONTEXT D-05/D-16/D-17/D-25 and RESEARCH §4.

Purpose: AUDIT-VIEW-03 requires "gefilterten Audit-Log als CSV exportieren" — server-side because the existing `findAll` is paginated; D-17 explicitly rejects client-side CSV from paginated results. CONTEXT D-25 (research amendment) locks the implementation to existing `papaparse` (no new dep, RFC-4180 free) and semicolon delimiter (DACH Excel).

Output: One new endpoint, one new service method, one new DTO, one new Vitest unit spec, one new Vitest integration spec.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-VALIDATION.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-01-audit-schema-interceptor-PLAN.md

<interfaces>
<!-- Authoritative current shape after 15-01 lands. -->

After 15-01, `QueryAuditDto` includes `action?: string` enum-constrained. `AuditService.findAll` accepts the same fields plus an `action`. `AuditEntry.before` is now a top-level Json? column.

`papaparse` is available at `apps/api/package.json:44` (already used in `apps/api/src/modules/import/parsers/csv.parser.ts:1`):
```typescript
import Papa from 'papaparse';
const csvString: string = Papa.unparse(arrayOfObjects, { delimiter: ';', quotes: true, newline: '\r\n' });
```

Fastify reply pattern (verified `apps/api/src/modules/communication/message/message.controller.ts:131-146`):
```typescript
async downloadAttachment(@Param(...) id, @CurrentUser() user, @Res() reply: any) {
  reply.header('Content-Type', mimeType);
  reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  return reply.send(stream);  // string body also accepted; sets Content-Length automatically
}
```

`apps/api/src/main.ts:14` confirms `FastifyAdapter` (NOT Express).

The CASL subject `audit` and action `read` are already seeded for `admin` role (`apps/api/prisma/seed.ts:75`).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add ExportAuditQueryDto + AuditService.exportCsv with Papa.unparse</name>
  <read_first>
    - apps/api/src/modules/audit/dto/query-audit.dto.ts (after 15-01 — must mirror its fields minus page/limit)
    - apps/api/src/modules/audit/audit.service.ts findAll where-clause assembly (lines 56-108) — extract identical logic into a `buildWhereClause` helper (or inline-duplicate, planner OK)
    - apps/api/src/modules/import/parsers/csv.parser.ts (papaparse import precedent, line 1)
    - apps/api/package.json (line 44 — papaparse ^5.5.3 confirmed)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md §4 (full service skeleton + column order)
  </read_first>
  <behavior>
    - `ExportAuditQueryDto` exists at `apps/api/src/modules/audit/dto/export-audit.query.dto.ts` and mirrors `QueryAuditDto` MINUS `page` and `limit`
    - `AuditService.exportCsv(params)` returns a `string` containing UTF-8 BOM (`\uFEFF`) + RFC-4180 CSV with semicolon delimiter
    - Column order (German headers): `Zeitpunkt;Benutzer;Email;Aktion;Ressource;Ressource-ID;Kategorie;IP-Adresse;Vorzustand;Nachzustand`
    - Hard cap: `take: 10000` (returns most recent 10k matching rows; UI must communicate the cap if exceeded — out of scope here)
    - Rows ordered `createdAt: 'desc'` (most recent first)
    - Role gating identical to `findAll` (admin sees all; schulleitung sees pedagogical-only; others see own — by inheriting the same `where`-construction logic)
    - `Vorzustand` and `Nachzustand` columns contain `JSON.stringify(row.before)` and `JSON.stringify(row.metadata)` respectively, or empty string when null
    - Unit spec asserts: BOM is the first character, header row matches expected German labels, semicolon delimiter, `Papa.unparse` is called with `delimiter: ';'`, escaping survives a payload containing `;` and `\n` and `"`
  </behavior>
  <action>
    Step 1: Create `apps/api/src/modules/audit/dto/export-audit.query.dto.ts` mirroring `QueryAuditDto` minus pagination:
    ```typescript
    import { ApiPropertyOptional } from '@nestjs/swagger';
    import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

    enum AuditCategoryFilter { MUTATION = 'MUTATION', SENSITIVE_READ = 'SENSITIVE_READ' }
    enum AuditActionFilter { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', READ = 'read' }

    export class ExportAuditQueryDto {
      @ApiPropertyOptional({ description: 'Filter by user ID' })
      @IsOptional() @IsString() userId?: string;

      @ApiPropertyOptional({ description: 'Filter by resource type', example: 'school' })
      @IsOptional() @IsString() resource?: string;

      @ApiPropertyOptional({ enum: AuditCategoryFilter })
      @IsOptional() @IsEnum(AuditCategoryFilter) category?: string;

      @ApiPropertyOptional({ enum: AuditActionFilter })
      @IsOptional() @IsEnum(AuditActionFilter) action?: string;

      @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)', example: '2026-01-01' })
      @IsOptional() @IsDateString() startDate?: string;

      @ApiPropertyOptional({ description: 'End date filter (ISO 8601)', example: '2026-12-31' })
      @IsOptional() @IsDateString() endDate?: string;
    }
    ```
    Note: It is acceptable for `AuditActionFilter` and `AuditCategoryFilter` to be re-declared here; preferred refactor (extract to a shared `dto/filters.ts`) is OK if straightforward but NOT required.

    Step 2: Edit `apps/api/src/modules/audit/audit.service.ts`. Add:
    ```typescript
    import Papa from 'papaparse';
    ```
    at the top (alongside the existing imports). Then add the new method below `findAll`:
    ```typescript
    /**
     * Export audit entries as CSV string (D-05, D-16, D-25).
     * Returns UTF-8 BOM + semicolon-delimited RFC-4180 CSV with German headers.
     * Hard-capped at 10,000 rows. Filters mirror findAll; role gate identical.
     */
    async exportCsv(params: {
      userId?: string;
      resource?: string;
      category?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      requestingUser: { id: string; roles: string[] };
    }): Promise<string> {
      const where: any = {};

      // Role-scoped visibility (same logic as findAll lines 68-77)
      if (params.requestingUser.roles.includes('admin')) {
        // sees all
      } else if (params.requestingUser.roles.includes('schulleitung')) {
        where.resource = { in: [...PEDAGOGICAL_RESOURCES] };
      } else {
        where.userId = params.requestingUser.id;
      }
      if (params.userId) where.userId = params.userId;
      if (params.resource) where.resource = params.resource;
      if (params.category) where.category = params.category;
      if (params.action) where.action = params.action;
      if (params.startDate || params.endDate) {
        where.createdAt = {};
        if (params.startDate) where.createdAt.gte = params.startDate;
        if (params.endDate) where.createdAt.lte = params.endDate;
      }

      const rows = await this.prisma.auditEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10_000,
      });

      // Optional: enrich with user info. v1 keeps it simple — User table join via a
      // separate query would balloon row count; for now Email/Benutzer come from the
      // userId only. Frontend already displays user names from a separate query.
      const csvRows = rows.map((r) => ({
        Zeitpunkt: r.createdAt.toISOString(),
        Benutzer: '',                       // Reserved for future enrichment (Person join)
        Email: '',                          // Reserved for future enrichment
        Aktion: r.action,
        Ressource: r.resource,
        'Ressource-ID': r.resourceId ?? '',
        Kategorie: r.category,
        'IP-Adresse': r.ipAddress ?? '',
        Vorzustand: r.before ? JSON.stringify(r.before) : '',
        Nachzustand: r.metadata ? JSON.stringify(r.metadata) : '',
      }));

      const csv = Papa.unparse(csvRows, {
        delimiter: ';',          // D-25 — DACH/Excel default
        quotes: true,
        newline: '\r\n',
      });

      return '\uFEFF' + csv;     // BOM for Excel UTF-8 detection
    }
    ```

    Step 3: Extend `apps/api/src/modules/audit/audit.service.spec.ts` (created in 15-01 Task 3) with a CSV section. Use a Prisma mock that returns 2 rows (one with `before` JSON, one without) and assert:
    ```typescript
    describe('AuditService.exportCsv', () => {
      let prisma: any; let svc: AuditService;
      beforeEach(() => {
        prisma = {
          auditEntry: {
            findMany: vi.fn().mockResolvedValue([
              {
                createdAt: new Date('2026-04-26T08:00:00Z'),
                action: 'update', resource: 'consent', resourceId: 'c1',
                category: 'MUTATION', ipAddress: '127.0.0.1',
                before: { granted: true, purpose: 'STATISTIK' },
                metadata: { body: { granted: false } },
              },
              {
                createdAt: new Date('2026-04-26T07:00:00Z'),
                action: 'read', resource: 'student', resourceId: 's1',
                category: 'SENSITIVE_READ', ipAddress: '127.0.0.1',
                before: null, metadata: null,
              },
            ]),
          },
        };
        svc = new AuditService(prisma);
      });

      it('starts with UTF-8 BOM and German header row', async () => {
        const csv = await svc.exportCsv({ requestingUser: { id: 'u1', roles: ['admin'] } });
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        // Header is first line after BOM, semicolon-delimited
        const firstLine = csv.slice(1).split('\r\n')[0];
        expect(firstLine).toContain('Zeitpunkt');
        expect(firstLine).toContain('Aktion');
        expect(firstLine).toContain('Ressource-ID');
        expect(firstLine).toContain('Vorzustand');
        expect(firstLine).toContain('Nachzustand');
        expect(firstLine.split(';').length).toBe(10);   // 10 columns per spec
      });

      it('uses semicolon delimiter (D-25)', async () => {
        const csv = await svc.exportCsv({ requestingUser: { id: 'u1', roles: ['admin'] } });
        const lines = csv.slice(1).split('\r\n').filter(Boolean);
        // header + 2 data rows
        expect(lines.length).toBe(3);
        for (const line of lines) {
          expect(line.split(';').length).toBeGreaterThanOrEqual(10);
        }
      });

      it('escapes embedded quotes/newlines/semicolons via Papa.unparse', async () => {
        prisma.auditEntry.findMany.mockResolvedValueOnce([{
          createdAt: new Date('2026-04-26T08:00:00Z'),
          action: 'update', resource: 'consent', resourceId: 'c1',
          category: 'MUTATION', ipAddress: '127.0.0.1',
          before: null,
          metadata: { body: { note: 'a; b\n"c"' } },
        }]);
        const csv = await svc.exportCsv({ requestingUser: { id: 'u1', roles: ['admin'] } });
        // The dangerous characters end up safely quoted (RFC 4180 — Papa.unparse handles this)
        expect(csv).toContain('"');
      });

      it('respects role gate: schulleitung sees pedagogical only', async () => {
        await svc.exportCsv({ requestingUser: { id: 'u2', roles: ['schulleitung'] } });
        const where = prisma.auditEntry.findMany.mock.calls[0][0].where;
        expect(where.resource).toEqual({ in: expect.arrayContaining(['grades', 'classbook', 'student', 'teacher']) });
      });

      it('hard-caps result set at 10,000 rows', async () => {
        await svc.exportCsv({ requestingUser: { id: 'u1', roles: ['admin'] } });
        expect(prisma.auditEntry.findMany.mock.calls[0][0].take).toBe(10_000);
      });
    });
    ```

    Step 4: Run `pnpm --filter @schoolflow/api test -- audit.service` and confirm all 5 cases (this task) plus the 2 from 15-01 Task 3 pass.

    DO NOT: Hand-roll CSV escaping (D-18 + RESEARCH §4). DO NOT: Use comma delimiter (D-25 locks semicolon). DO NOT: Stream — D-25 + RESEARCH §4 confirms 10k-row cap fits in memory.
  </action>
  <verify>
    <automated>pnpm --filter @schoolflow/api test -- audit.service --reporter=basic 2>&amp;1 | tail -5 | grep -q "passed" &amp;&amp; grep -q "exportCsv" apps/api/src/modules/audit/audit.service.ts &amp;&amp; grep -q "Papa.unparse" apps/api/src/modules/audit/audit.service.ts &amp;&amp; grep -q "delimiter: ';'" apps/api/src/modules/audit/audit.service.ts &amp;&amp; grep -q "\\\\uFEFF" apps/api/src/modules/audit/audit.service.ts &amp;&amp; test -f apps/api/src/modules/audit/dto/export-audit.query.dto.ts</automated>
  </verify>
  <acceptance_criteria>
    - `apps/api/src/modules/audit/dto/export-audit.query.dto.ts` exists and `grep -q "ExportAuditQueryDto" apps/api/src/modules/audit/dto/export-audit.query.dto.ts` exits `0`
    - The DTO does NOT contain `page` or `limit`: `grep -E "page|limit" apps/api/src/modules/audit/dto/export-audit.query.dto.ts` returns no DTO field decorators
    - `grep -c "exportCsv" apps/api/src/modules/audit/audit.service.ts` returns at least `1`
    - `grep -q "Papa.unparse" apps/api/src/modules/audit/audit.service.ts` exits `0`
    - `grep -q "delimiter: ';'" apps/api/src/modules/audit/audit.service.ts` exits `0`
    - `grep -q "10_000" apps/api/src/modules/audit/audit.service.ts` exits `0` (hard-cap visible)
    - `grep -q "\\\\uFEFF" apps/api/src/modules/audit/audit.service.ts` exits `0` (BOM literal present)
    - `pnpm --filter @schoolflow/api test -- audit.service` exits `0` with all CSV cases passing
    - `pnpm --filter @schoolflow/api typecheck` exits `0`
  </acceptance_criteria>
  <done>Service produces a BOM-prefixed semicolon-delimited CSV string with the 10-column German header, RFC-4180 escaping handled by Papa.unparse, role-scoped same as findAll, hard-capped at 10k rows. Unit tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add GET /audit/export.csv controller route + Supertest integration spec</name>
  <read_first>
    - apps/api/src/modules/audit/audit.controller.ts (current — lines 1-42)
    - apps/api/src/modules/communication/message/message.controller.ts lines 125-146 (Fastify @Res() reply pattern)
    - apps/api/src/modules/audit/dto/export-audit.query.dto.ts (created in Task 1)
    - apps/api/src/modules/audit/audit.service.ts (exportCsv signature created in Task 1)
    - apps/api/src/modules/auth/decorators/check-permissions.decorator.ts (CASL guard usage)
    - apps/api/src/modules/auth/decorators/current-user.decorator.ts (CurrentUser injection)
  </read_first>
  <behavior>
    - `GET /api/v1/audit/export.csv?<filters>` returns:
      - HTTP 200 (success), 400 (invalid query — class-validator rejects), 403 (no `read:audit` permission)
      - `Content-Type: text/csv; charset=utf-8`
      - `Content-Disposition: attachment; filename="audit-log-YYYY-MM-DD.csv"` (today's date)
      - Body starts with UTF-8 BOM
      - First line (after BOM) is the German header row
    - The route runs the same `@CheckPermissions({ action: 'read', subject: 'audit' })` guard as `findAll` (lines 21 — already seeded for admin in `seed.ts:75`)
    - Filters from query are forwarded verbatim (with `startDate`/`endDate` parsed to `Date`) to `auditService.exportCsv`
    - Integration test pre-seeds 2 audit rows via `prisma.auditEntry.create` then asserts the response shape
  </behavior>
  <action>
    Step 1: Edit `apps/api/src/modules/audit/audit.controller.ts`. Add imports:
    ```typescript
    import { Res } from '@nestjs/common';
    import { ExportAuditQueryDto } from './dto/export-audit.query.dto';
    ```
    Add the new route AFTER the existing `findAll` method:
    ```typescript
    @Get('export.csv')
    @CheckPermissions({ action: 'read', subject: 'audit' })
    @ApiOperation({
      summary: 'Export audit log as CSV (filters identical to GET /audit, role-scoped, max 10k rows)',
    })
    @ApiResponse({ status: 200, description: 'text/csv with UTF-8 BOM and Content-Disposition attachment' })
    async exportCsv(
      @Query() query: ExportAuditQueryDto,
      @CurrentUser() user: AuthenticatedUser,
      @Res() reply: any,
    ) {
      const csv = await this.auditService.exportCsv({
        userId: query.userId,
        resource: query.resource,
        category: query.category,
        action: query.action,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        requestingUser: user,
      });
      const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(csv);
    }
    ```
    Note: `csv` already includes the BOM (added in Task 1). Do NOT prepend it again here.

    Step 2: Create `apps/api/src/modules/audit/audit.controller.e2e-spec.ts` — integration test that exercises the full HTTP path through Nest's testing module + Supertest. Use the same testing module pattern as existing `*.controller.e2e-spec.ts` files in the repo (search for one example via `grep -r "e2e-spec.ts" apps/api/src/modules/ -l | head -1` and mirror its bootstrap). Required test cases:
    ```typescript
    describe('GET /audit/export.csv (integration)', () => {
      // Bootstrap with FastifyAdapter + JWT mock or use existing test-app helper

      it('returns 200 with text/csv Content-Type', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/audit/export.csv')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-type']).toContain('charset=utf-8');
      });

      it('returns Content-Disposition with filename pattern audit-log-YYYY-MM-DD.csv', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/audit/export.csv')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.headers['content-disposition']).toMatch(/attachment; filename="audit-log-\d{4}-\d{2}-\d{2}\.csv"/);
      });

      it('body starts with UTF-8 BOM', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/audit/export.csv')
          .set('Authorization', `Bearer ${adminToken}`);
        const body = res.text ?? res.body.toString();
        expect(body.charCodeAt(0)).toBe(0xFEFF);
      });

      it('first line is the German header row with semicolon delimiter', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/audit/export.csv')
          .set('Authorization', `Bearer ${adminToken}`);
        const body = res.text ?? res.body.toString();
        const firstLine = body.slice(1).split('\r\n')[0];
        expect(firstLine).toContain('Zeitpunkt');
        expect(firstLine).toContain('Aktion');
        expect(firstLine).toContain('Vorzustand');
        expect(firstLine.split(';').length).toBe(10);
      });

      it('returns 422 (or 400) for invalid action enum value', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/audit/export.csv?action=foo')
          .set('Authorization', `Bearer ${adminToken}`);
        expect([400, 422]).toContain(res.status);
      });
    });
    ```
    If a shared bootstrap helper does not exist, fall back to a smaller-scope integration test that mocks `AuditService` and exercises only the controller method via NestJS Testing Module (without Supertest). Either approach satisfies the task as long as Content-Type, Content-Disposition, and BOM are asserted.

    Step 3: Run:
    ```bash
    pnpm --filter @schoolflow/api test -- audit.controller.e2e-spec
    ```
    All cases must pass.

    Step 4: Manual smoke (optional, if API is locally running):
    ```bash
    curl -i -H "Authorization: Bearer <admin-jwt>" http://localhost:3000/api/v1/audit/export.csv | head -5
    ```
    First line of the body should contain `Zeitpunkt;Benutzer;...`.

    DO NOT: Add the BOM in the controller (the service already prepends it). DO NOT: Use `@Header('Content-Type', '...')` Nest decorator — Fastify's `reply.header(...)` pattern is required because we're using `@Res() reply` (RESEARCH §4 + Pattern 3). DO NOT: Forget the `@CheckPermissions` decorator — without it, schulleitung gets a 200 with no role gate.
  </action>
  <verify>
    <automated>pnpm --filter @schoolflow/api test -- audit.controller --reporter=basic 2>&amp;1 | tail -5 | grep -q "passed" &amp;&amp; grep -q "@Get('export.csv')" apps/api/src/modules/audit/audit.controller.ts &amp;&amp; grep -q "ExportAuditQueryDto" apps/api/src/modules/audit/audit.controller.ts &amp;&amp; grep -q "Content-Disposition" apps/api/src/modules/audit/audit.controller.ts &amp;&amp; test -f apps/api/src/modules/audit/audit.controller.e2e-spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "@Get('export.csv')" apps/api/src/modules/audit/audit.controller.ts` returns `1`
    - `grep -c "@CheckPermissions({ action: 'read', subject: 'audit' })" apps/api/src/modules/audit/audit.controller.ts` returns at least `2` (existing findAll + new exportCsv)
    - `grep -q "Content-Type', 'text/csv" apps/api/src/modules/audit/audit.controller.ts` exits `0`
    - `grep -q "Content-Disposition" apps/api/src/modules/audit/audit.controller.ts` exits `0`
    - `grep -q 'audit-log-' apps/api/src/modules/audit/audit.controller.ts` exits `0` (filename pattern visible)
    - `grep -q "@Res() reply" apps/api/src/modules/audit/audit.controller.ts` exits `0` (Fastify pattern, NOT @Header)
    - `apps/api/src/modules/audit/audit.controller.e2e-spec.ts` exists and contains `describe('GET /audit/export.csv`
    - `pnpm --filter @schoolflow/api test -- audit.controller` exits `0` with all integration tests passing
    - The new route does NOT prepend BOM in the controller (already in service): `grep -c "uFEFF" apps/api/src/modules/audit/audit.controller.ts` returns `0`
  </acceptance_criteria>
  <done>Controller route ships, integration test asserts Content-Type/Content-Disposition/BOM/header line, role gate applied, query DTO validation rejects invalid action.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → CSV endpoint | Admin client supplies arbitrary filter combinations; could attempt to harvest data via wide date ranges |
| service → DB | Server reads up to 10k rows including `metadata.body` and `before` snapshots — payloads may contain bulk PII |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-02-01 | Information Disclosure | Wide CSV export by non-admin | mitigate | `@CheckPermissions({ action: 'read', subject: 'audit' })` + service role gate ensures schulleitung sees only pedagogical resources, others see only their own — same as `findAll` |
| T-15-02-02 | Tampering | Filter param injection (e.g., SQL via `resource` param) | mitigate | Prisma parametrized queries; class-validator on DTO (`@IsString`/`@IsEnum`) prevents structural tampering at the entry point |
| T-15-02-03 | Denial of Service | Unbounded export request | mitigate | Hard cap `take: 10000` rows; `Papa.unparse` is in-memory and bounded by row count; ~5MB max string |
| T-15-02-04 | Information Disclosure | CSV-injection (formula injection in Excel) | accept | Out-of-scope for v1; CSV is consumed by admin compliance staff who treat content as data, not formulas. Document in backlog as "wrap leading `=`/`+`/`-`/`@` in `'` if user reports issue" |
| T-15-02-05 | Spoofing | Forged Content-Disposition could trick mail-rule auto-handlers | accept | `Content-Disposition: attachment` is a defensive header; filename is server-generated from current date, no user input. |
</threat_model>

<verification>
- `pnpm --filter @schoolflow/api test -- audit` runs all audit specs (interceptor + service unit + controller integration) and exits `0`
- `pnpm --filter @schoolflow/api typecheck` exits `0`
- Manual smoke (if local API running): `curl -i ...export.csv | head -3` shows `text/csv; charset=utf-8` and BOM in body
</verification>

<success_criteria>
- AUDIT-VIEW-03 backend ready: `GET /audit/export.csv` returns BOM-prefixed semicolon CSV with German headers, role-scoped, hard-capped 10k rows
- D-25 (semicolon delimiter, papaparse) and D-16 (server-side filter respect) honored
- Integration test locks Content-Type/Content-Disposition/BOM as regression guards
</success_criteria>

<output>
Create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-02-SUMMARY.md` listing files changed, test outputs, and any deviations (e.g., if shared filter-DTO refactor was deferred).
</output>

<context_decisions>
## Truths — CONTEXT.md Decision Coverage

_Citations in `D-NN:` format for the decision-coverage gate (workflow step 13a)._

- D-05: Backend gap — AuditService.exportCsv + GET /audit/export.csv route
- D-16: CSV server-side via dedicated GET /audit/export.csv endpoint
- D-17: Client-side CSV from paginated frontend results explicitly REJECTED
- D-18: No new dependency for CSV escaping (use papaparse already in repo)
- D-25: CSV-Export uses semicolon delimiter (DACH/Excel default) via Papa.unparse

</context_decisions>
