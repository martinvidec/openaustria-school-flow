# Phase 16: Admin-Dashboard & Mobile-Härtung — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 30+ (1 new backend module, 8 new frontend files, 4 primitive edits, 2 sidebar edits, 13 mutation-hook files, 4+ E2E specs, ~20 surfaces in scope for migration)
**Analogs found:** All — no greenfield gaps

## Summary

Phase 16 is brownfield UI on top of v1.0 with one new read-only NestJS module. Every new file has a strong existing analog in the codebase. The pattern map below pins each file to its closest analog with concrete excerpts (file path + line numbers + 5–10 line code blocks) so the planner can write `<read_first>` blocks and exact `<action>` strings without further codebase spelunking.

**Three load-bearing gotchas** the planner must encode verbatim into plans:

1. **`/index.tsx` `beforeLoad` MUST read `keycloak` directly — NOT `useAuth()`.** `useAuth` is a React hook (`apps/web/src/hooks/useAuth.ts:23` — `useMemo`); router lifecycle is not a render. Mirror `_authenticated.tsx:10-14` (`if (!keycloak.authenticated) await keycloak.login()`).
2. **`MobileSidebar.tsx` is a Phase-15 mobile gap, not just a Phase-16 insertion point.** Lines 38-151 are missing `DSGVO-Verwaltung` + `Audit-Log` (Phase 15 entries) AND will be missing `Dashboard` (Phase 16). All three must be added in the same edit.
3. **Touch-target lift covers FOUR primitives, not two.** CONTEXT D-17 names Input/Button only; verified `select.tsx:22` also has `h-10` and `textarea.tsx:12` has `min-h-[80px]`. Plan must lift all four to keep `mobile-375` 44px sweep green.

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `apps/api/src/modules/dashboard/dashboard.module.ts` | NestJS module (thin aggregator) | request-response (read-only) | `apps/api/src/modules/audit/audit.module.ts` (Global single-controller-single-service) + `apps/api/src/modules/school/school.module.ts` (multi-provider sibling) | exact (pattern: thin Module decorator) |
| `apps/api/src/modules/dashboard/dashboard.controller.ts` | NestJS controller (single GET, admin-only) | request-response | `apps/api/src/modules/audit/audit.controller.ts:14-42` (single-resource controller, `@CheckPermissions`) | exact |
| `apps/api/src/modules/dashboard/dashboard.service.ts` | NestJS service (parallel `Promise.all` + shape transform) | aggregation (read-only) | `apps/api/src/modules/audit/audit.service.ts:100-119` (`Promise.all([findMany, count])`) + `apps/api/src/modules/school/school.service.ts:85-94` (findUnique with shape transform) | role-match (no exact analog for 10-way Promise.all in code today; pattern composes audit's `Promise.all` shape with school's `findUnique` shape) |
| `apps/api/src/modules/dashboard/dto/dashboard-status.dto.ts` | DTO (response shape) | request-response | `apps/api/src/modules/audit/dto/query-audit.dto.ts:1-83` (class-validator decorators + `@ApiPropertyOptional`) | role-match (audit DTO is request-side; pattern still applies — class-validator + `@ApiProperty`) |
| `apps/api/src/modules/dashboard/dashboard.service.spec.ts` | Vitest unit test (table-driven 10-category status matrix) | unit | `apps/api/src/modules/dsgvo/retention/retention.service.spec.ts:215-305` (table-driven branches with `mockPrisma.auditEntry.count.mockResolvedValue`) | exact |
| `apps/api/src/app.module.ts` | App module — register DashboardModule | config edit | (self — `app.module.ts:36-71` already shows the pattern: append to `imports` array) | exact |
| `apps/web/src/routes/index.tsx` | TanStack-Router file route — login redirect | navigation | `apps/web/src/routes/_authenticated.tsx:9-16` (`beforeLoad` reading `keycloak.authenticated` + `await keycloak.login()`) | exact (the analog literally lives in the sibling layout route) |
| `apps/web/src/routes/_authenticated/admin/index.tsx` | TanStack-Router file route — Dashboard page | request-response | `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` (admin-only `_authenticated/admin/*` route + `validateSearch` + `useAuth().roles.includes('admin')` guard + PageShell) | exact |
| `apps/web/src/hooks/useIsMobile.ts` | React hook (mediaQuery wrapper) | event-driven | `apps/web/src/routes/__root.tsx:20-32` (the source — VERBATIM-MOVE) | exact (verbatim extract) |
| `apps/web/src/hooks/useDashboardStatus.ts` | TanStack Query hook (polling + invalidation) | polling | `apps/web/src/hooks/useImport.ts:127-141` (`useImportJob` — same `useQuery` + `enabled` + `refetchInterval` + `staleTime` shape) | exact |
| `apps/web/src/components/admin/dashboard/ChecklistItem.tsx` | React component (link-row with status badge + chevron) | render | `apps/web/src/components/admin/teacher/TeacherMobileCards.tsx:11-55` (`<RouterLink>` wrap + `<Card>` with badge + flex layout) — but flatter (no per-row Card; lives inside parent `<Card>` with `divide-y`) | role-match (closest single-row link-card; ChecklistItem is novel because Phase 16 invents the Linear-style flat checklist row — UI-SPEC § Component Inventory locks the anatomy) |
| `apps/web/src/components/admin/dashboard/DashboardChecklist.tsx` | React component (outer Card + 10 ChecklistItems) | render | `apps/web/src/components/admin/audit-log/AuditTable.tsx:56-` (single-Card list with `useQuery` driver + loading/empty states) | role-match |
| `apps/web/src/components/admin/dashboard/ChecklistItem.test.tsx` + `DashboardChecklist.test.tsx` | Vitest+RTL component tests | unit | (any existing `*.test.tsx` in `apps/web/src/components/admin/*/__tests__/`; pattern is RTL `render()` + `screen.getByRole`) | role-match |
| `apps/web/src/components/shared/DataList.tsx` | Shared component (desktop table + mobile cards via `hidden`/`md:hidden`) | render (dual-mode) | `apps/web/src/components/admin/teacher/TeacherListTable.tsx:19-114` (desktop wrapper `hidden md:block`) + `apps/web/src/components/admin/teacher/TeacherMobileCards.tsx:11-55` (mobile wrapper `md:hidden`) — Phase 16 collapses these into one component. **Breakpoint moves from `md` → `sm` per RESEARCH § Pattern 4 to align with `useIsMobile()` 640px.** | role-match (no single-component analog; collapses two existing components) |
| `apps/web/src/components/shared/DataList.test.tsx` | Vitest unit test | unit | (no direct analog; closest is RTL component test for any admin component) | role-match |
| `apps/web/src/components/ui/button.tsx` | shadcn primitive — touch-target lift | edit | (self — `apps/web/src/components/ui/button.tsx:22-27` — current `size` enum: `default h-10`, `sm h-9`, `lg h-11`, `icon h-10 w-10`) | exact (in-place edit) |
| `apps/web/src/components/ui/input.tsx` | shadcn primitive — touch-target lift | edit | (self — `apps/web/src/components/ui/input.tsx:12-13` — current `h-10 w-full`) | exact |
| `apps/web/src/components/ui/select.tsx` | shadcn primitive — touch-target lift | edit | (self — `apps/web/src/components/ui/select.tsx:22` — current `flex h-10 w-full`) | exact |
| `apps/web/src/components/ui/textarea.tsx` | shadcn primitive — touch-target lift | edit | (self — `apps/web/src/components/ui/textarea.tsx:12` — current `min-h-[80px]`; already meets 44px so audit may exempt — see Pattern §Touch-Target Lift below) | exact |
| `apps/web/src/components/layout/AppSidebar.tsx` | Layout — sidebar item insertion | edit | (self — `AppSidebar.tsx:49-189` — `navItems` array; `roles: ['admin']` pattern shown at line 64-67 for `Datenimport`, line 110 for `Solver-Tuning`, line 175-189 for DSGVO/Audit-Log) | exact |
| `apps/web/src/components/layout/MobileSidebar.tsx` | Layout — sidebar item insertion | edit | (self — `MobileSidebar.tsx:38-151` — same `navItems` shape; **MISSING DSGVO + Audit-Log** vs AppSidebar — Phase 16 must add THREE entries) | exact (with the gap-fill caveat) |
| `apps/web/src/hooks/useTeachers.ts` | Mutation-hook fan-out (`onSuccess` add line) | edit | (self — `useTeachers.ts:223-225, 248-251, 270-273, 299-301, 322-324`) | exact |
| `apps/web/src/hooks/useClasses.ts` | Mutation-hook fan-out | edit | (self — 5 useMutation sites; `onSuccess` shape verified on 209-210, 238-239, 258-260) | exact |
| `apps/web/src/hooks/useStudents.ts` | Mutation-hook fan-out (9 mutations) | edit | (self) | exact |
| `apps/web/src/hooks/useSubjects.ts` | Mutation-hook fan-out (4 mutations: create/update/delete + ?) | edit | (self — useSubjects.ts:140-235) | exact |
| `apps/web/src/hooks/useSchool.ts` | Mutation-hook fan-out (3 mutations) | edit | (self — useSchool.ts:38-) | exact |
| `apps/web/src/hooks/useTimeGrid.ts` | Mutation-hook fan-out (2 mutations) | edit | (self) | exact |
| `apps/web/src/hooks/useSchoolYears.ts` | Mutation-hook fan-out (9 mutations — incl. holidays/autonomous days) | edit | (self) | exact |
| `apps/web/src/hooks/useDsfa.ts` | Mutation-hook fan-out (4 mutations: create/update/delete) | edit | (self — useDsfa.ts:96-180) | exact |
| `apps/web/src/hooks/useVvz.ts` | Mutation-hook fan-out (4 mutations) | edit | (self) | exact |
| `apps/web/src/hooks/useRetention.ts` | Mutation-hook fan-out (4 mutations) | edit | (self) | exact |
| `apps/web/src/hooks/useConsents.ts` | Mutation-hook fan-out (3 mutations) | edit | (self) | exact |
| `apps/web/src/hooks/useDsgvoExportJob.ts` | Mutation-hook fan-out (2 mutations) | edit | (self) | exact |
| `apps/web/src/hooks/useDsgvoDeletionJob.ts` | Mutation-hook fan-out (2 mutations) | edit | (self) | exact |
| `apps/web/e2e/admin-dashboard.spec.ts` | Playwright E2E (desktop) | request-response | `apps/web/e2e/admin-solver-tuning-rbac.spec.ts:31-66` (admin login + assertions on a `_authenticated/admin/*` page; uses `loginAsRole(page, 'admin')`) | exact |
| `apps/web/e2e/admin-dashboard.mobile.spec.ts` | Playwright E2E (mobile-375) | request-response | `apps/web/e2e/admin-school-settings.mobile.spec.ts:1-69` (loginAsAdmin → page.goto admin route → 44px-floor sweep + viewport-specific assertions) | exact |
| `apps/web/e2e/login-redirect.spec.ts` | Playwright E2E (per-role redirect verification) | request-response | `apps/web/e2e/admin-solver-tuning-rbac.spec.ts:31-66` (`loginAsRole(page, 'schulleitung')` + URL/role assertions) | exact |
| `apps/web/e2e/admin-mobile-sweep.mobile.spec.ts` | Playwright E2E (16-route audit sweep) | request-response | `apps/web/e2e/admin-school-settings.mobile.spec.ts:37-59` (44px-floor sweep recipe — generalize via `for (route of ADMIN_ROUTES)`) | exact |
| `apps/web/playwright.config.ts` | Playwright config — verify `mobile-375` project | (verify only) | (self — `playwright.config.ts:33-61`; `mobile-375` + `mobile-chrome` already configured) | exact (no edit needed; verify-only step) |

---

## Pattern Assignments

### `apps/api/src/modules/dashboard/dashboard.module.ts` (NestJS module — thin aggregator)

**Analog A:** `apps/api/src/modules/audit/audit.module.ts` (lines 1-12) — single-controller-single-service Module
**Analog B:** `apps/api/src/modules/school/school.module.ts` (lines 1-36) — multi-provider Module (closer DI shape)

**Imports + Module decorator pattern** (from `school.module.ts:1-36`):
```typescript
import { Module } from '@nestjs/common';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

@Module({
  controllers: [SchoolController],
  providers: [SchoolService],
  exports: [SchoolService],
})
export class SchoolModule {}
```

**For Phase 16 dashboard.module.ts** — pattern is `school.module.ts` minus exports (Dashboard does not export anything; it's a leaf consumer), plus `imports: [SchoolModule]` since RESEARCH Approach B requires `SchoolService.findOne` for address normalization (per `school.service.ts:85-94`).

**Gotcha (RESEARCH Pitfall #2):** Do NOT import `TimetableModule` or `DsgvoModule`. Importing TimetableModule pulls in `SolveProcessor` (BullMQ worker), `TimetableEventsGateway`, `SolverClientService` — heavy overhead for a count of `TimetableRun`. Use `PrismaService` directly (already global via `PrismaModule` per `app.module.ts:43`).

**App-module registration** — append to `imports` array in `apps/api/src/app.module.ts:37-71`. Current structure:
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    QueueModule,
    PrismaModule,
    AuthModule,
    AuditModule,
    // ... existing modules ...
    EffectivePermissionsModule,
  ],
  // ...
})
```

---

### `apps/api/src/modules/dashboard/dashboard.controller.ts` (single-GET admin controller)

**Analog:** `apps/api/src/modules/audit/audit.controller.ts:1-42`

**Imports pattern** (`audit.controller.ts:1-13`):
```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
```

**Class + admin-only `@CheckPermissions` pattern** (`audit.controller.ts:15-42`):
```typescript
@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @CheckPermissions({ action: 'read', subject: 'audit' })
  @ApiOperation({ summary: 'Query audit trail entries (role-scoped visibility)' })
  @ApiResponse({ status: 200, description: 'Paginated audit entries' })
  async findAll(
    @Query() query: QueryAuditDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditService.findAll({ /* ... */ });
  }
}
```

**For Phase 16 dashboard.controller.ts** — replace `@ApiTags('audit')` → `@ApiTags('admin-dashboard')`, `@Controller('audit')` → `@Controller('admin/dashboard')`, `@Get()` → `@Get('status')`. Use **admin-only** decorator: `@CheckPermissions({ action: 'manage', subject: 'all' })` (the CASL admin shorthand — see `apps/api/src/modules/auth/decorators/check-permissions.decorator.ts` for the `RequiredPermission` shape).

**Tenant-leak guard (CRITICAL — RESEARCH § Security):** `?schoolId=` MUST be validated against the admin's school context (not just `@IsUUID()`). The codebase has three confirmed tenant-leak resolutions in MEMORY (`useTeachers tenant_leak`, `subject_tenant_leak`); pattern: derive `schoolId` server-side from auth context OR add explicit cross-tenant 403 check. Plan owner: backend plan author.

---

### `apps/api/src/modules/dashboard/dashboard.service.ts` (parallel-read aggregator)

**Analog A:** `apps/api/src/modules/audit/audit.service.ts:100-108` (Promise.all of two reads)
**Analog B:** `apps/api/src/modules/school/school.service.ts:85-94` (`findUnique` + `include` shape transform)

**Promise.all pattern** (`audit.service.ts:100-108`):
```typescript
const [data, total] = await Promise.all([
  this.prisma.auditEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  }),
  this.prisma.auditEntry.count({ where }),
]);
```

**`findUnique` + 404 + transform shape** (`school.service.ts:85-94`):
```typescript
async findOne(id: string) {
  const school = await this.prisma.school.findUnique({
    where: { id },
    include: this.fullInclude(),
  });
  if (!school) {
    throw new NotFoundException('Die angeforderte Ressource wurde nicht gefunden.');
  }
  return school;
}
```

**For Phase 16 dashboard.service.ts** — compose: `Promise.all` of ~14 reads (per RESEARCH Code Example 1, includes split COMPLETED-vs-any TimetableRun count for D-05/D-06 row 8), then `buildStatus({...})` shape transform per RESEARCH Pattern 1 Approach B (lines 215-251 of RESEARCH).

**Schema models verified present** (`apps/api/prisma/schema.prisma`):
- `TimeGrid` (line 89), `Period` (99), `SchoolDay` (115), `SchoolYear` (127), `AuditEntry` (231), `RetentionPolicy` (607), `DsfaEntry` (621), `VvzEntry` (639), `TimetableRun` (720), `enum SolveStatus` (690-696: `QUEUED | SOLVING | COMPLETED | FAILED | STOPPED`).

**Existing `auditEntry.count` precedent** (`apps/api/src/modules/dsgvo/retention/retention.service.ts:240`): the count call is already used in production. Phase 16 adds 13 more siblings.

---

### `apps/api/src/modules/dashboard/dto/dashboard-status.dto.ts` (response DTO)

**Analog:** `apps/api/src/modules/audit/dto/query-audit.dto.ts:1-83`

**Imports + decorator pattern** (`query-audit.dto.ts:1-23`):
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional, IsString, IsInt, Min, Max, IsDateString, IsEnum,
} from 'class-validator';

enum AuditCategoryFilter { MUTATION = 'MUTATION', SENSITIVE_READ = 'SENSITIVE_READ' }

export class QueryAuditDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;
  // ...
}
```

**For Phase 16 DTOs** — RESEARCH Code Example 1 lines 484-501 locks the shape: `CategoryStatus` union + `CategoryStatusDto` (key, status, secondary) + `DashboardStatusDto` (schoolId, generatedAt, categories[]). The query DTO needs only `?schoolId=` validated as `@IsUUID()`.

---

### `apps/api/src/modules/dashboard/dashboard.service.spec.ts` (Vitest table-driven test)

**Analog:** `apps/api/src/modules/dsgvo/retention/retention.service.spec.ts:215-305`

**Pattern (verified excerpt):**
```typescript
mockPrisma.auditEntry.count.mockResolvedValue(5);
// ... assert behavior ...
mockPrisma.auditEntry.count.mockResolvedValue(0);
// ... assert opposite behavior ...
```

**For Phase 16 spec** — table-driven: each of the 10 categories tested with done/partial/missing fixtures using `mockPrisma.<model>.count.mockResolvedValue(n)`. RESEARCH § Validation Architecture pinpoints this as a Wave 0 spec.

---

### `apps/web/src/routes/index.tsx` (login redirect — REPLACE)

**Analog:** `apps/web/src/routes/_authenticated.tsx:9-16`

**Current `index.tsx` (entire file — 7 lines):**
```typescript
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/timetable' });
  },
});
```

**Pattern to copy from `_authenticated.tsx:9-16`** (the load-bearing await-login race fix):
```typescript
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    if (!keycloak.authenticated) {
      await keycloak.login();
    }
  },
  component: AuthenticatedLayout,
});
```

**For Phase 16 index.tsx — D-02 + Pitfall #1 fix** (RESEARCH Code Example 2, lines 506-521):
```typescript
import { createFileRoute, redirect } from '@tanstack/react-router';
import { keycloak } from '@/lib/keycloak';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (!keycloak.authenticated) {
      await keycloak.login();
      return;
    }
    const roles = keycloak.realmAccess?.roles ?? [];
    throw redirect({ to: roles.includes('admin') ? '/admin' : '/timetable' });
  },
});
```

**GOTCHA — DO NOT use `useAuth()` here.** `useAuth.ts:23` is a `useMemo` hook; `beforeLoad` is not a React render context. Reading `keycloak.realmAccess?.roles` directly is the codebase convention (mirrored from `_authenticated.tsx:11`).

---

### `apps/web/src/routes/_authenticated/admin/index.tsx` (Dashboard route — NEW)

**Analog:** `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx:1-84`

**Imports + Route + admin-gate** (`solver-tuning.tsx:1-51`):
```typescript
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useSchoolContext } from '@/stores/school-context-store';
import { useAuth } from '@/hooks/useAuth';

const TabSearchSchema = z.object({ tab: z.enum([/* ... */]).optional() });

export const Route = createFileRoute('/_authenticated/admin/solver-tuning')({
  validateSearch: TabSearchSchema,
  component: SolverTuningPage,
});

function SolverTuningPage() {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const { user } = useAuth();
  const isAdmin = (user?.roles ?? []).includes('admin');

  if (!isAdmin) {
    return (
      <PageShell breadcrumbs={[{ label: 'Admin' }, { label: 'Solver-Tuning' }]} title="Aktion nicht erlaubt">
        <p className="text-sm text-muted-foreground">
          Diese Funktion ist nur für Administratoren verfügbar.
        </p>
      </PageShell>
    );
  }
  // ... happy path render ...
}
```

**For Phase 16 `/_authenticated/admin/index.tsx`** — same shape, no `validateSearch` (UI-SPEC says no tabs), guard text `Diese Funktion ist nur für Administratoren verfügbar.`, body renders `<DashboardChecklist schoolId={schoolId} />`.

**PageShell prop pattern** (`PageShell.tsx:17-45`):
```typescript
<PageShell
  breadcrumbs={[{ label: 'Verwaltung' }]}   // single segment per UI-SPEC § Copywriting
  title="Dashboard"
  subtitle="Setup-Übersicht: prüfe, was für deine Schule schon eingerichtet ist und wo noch Schritte offen sind."
>
  {/* ... */}
</PageShell>
```

---

### `apps/web/src/hooks/useIsMobile.ts` (NEW — verbatim extract)

**Analog:** `apps/web/src/routes/__root.tsx:20-32` (literal source — Phase 16 D-13 says "extrahieren" — copy verbatim, then update `__root.tsx` to import the extracted hook).

**Verbatim source** (`__root.tsx:20-32`):
```typescript
function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
```

**Plan action:** copy verbatim into `apps/web/src/hooks/useIsMobile.ts` with `export` keyword + JSDoc; replace local definition in `__root.tsx:20-32` with `import { useIsMobile } from '@/hooks/useIsMobile';` (line 18 of `__root.tsx` already imports react hooks — extend imports rather than add a fresh one).

---

### `apps/web/src/hooks/useDashboardStatus.ts` (NEW — TanStack Query polling)

**Analog:** `apps/web/src/hooks/useImport.ts:127-141` (verified verbatim in RESEARCH § Pattern 2 reference).

**Verbatim template** (`useImport.ts:127-141`):
```typescript
export function useImportJob(schoolId: string, importJobId: string | null) {
  return useQuery({
    queryKey: importKeys.job(schoolId, importJobId ?? ''),
    queryFn: async (): Promise<ImportJobDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/import/${importJobId}`,
      );
      if (!res.ok) throw new Error('Failed to load import job');
      return res.json();
    },
    enabled: !!schoolId && !!importJobId,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}
```

**For Phase 16 useDashboardStatus.ts** (RESEARCH Code Example 3 lines 526-551):
```typescript
export const dashboardKeys = { status: ['dashboard-status'] as const };

export function useDashboardStatus(schoolId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.status,
    queryFn: async (): Promise<DashboardStatusDto> => {
      const res = await apiFetch(`/api/v1/admin/dashboard/status?schoolId=${schoolId}`);
      if (!res.ok) throw new Error('Failed to load dashboard status');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 10_000,        // D-09
    refetchInterval: 30_000,  // D-08
  });
}
```

`apiFetch` lives at `apps/web/src/lib/api.ts` — already used by every existing hook (e.g. `useTeachers.ts:181`).

---

### `apps/web/src/components/admin/dashboard/ChecklistItem.tsx` (NEW)

**Analog (closest single-row link card):** `apps/web/src/components/admin/teacher/TeacherMobileCards.tsx:11-55`

**Pattern excerpt:**
```typescript
<RouterLink
  key={t.id}
  to="/admin/teachers/$teacherId"
  params={{ teacherId: t.id }}
  search={{ tab: 'stammdaten' }}
>
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{t.person.lastName}, {t.person.firstName}</div>
          {t.person.email && <div className="text-xs text-muted-foreground">{t.person.email}</div>}
        </div>
        {t.person.keycloakUserId
          ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Keycloak verknüpft" />
          : <XCircle className="h-4 w-4 text-muted-foreground" aria-label="Keycloak nicht verknüpft" />}
      </div>
    </CardContent>
  </Card>
</RouterLink>
```

**For Phase 16 ChecklistItem.tsx** — UI-SPEC § Component Inventory § ChecklistItem (lines 270-307) is the spec; key differences vs Teacher analog:
- Outer is **a flat row inside a parent `<Card>` with `divide-y`** (NOT a per-row Card) — UI-SPEC line 274 "the checklist IS the card".
- `data-checklist-item={category-key}` + `data-checklist-status={status}` attributes per UI-SPEC line 304-306.
- Status badge uses existing `<Badge>` with className override (UI-SPEC § Color § Status badge color map locks `bg-success/15 text-success border-success/30` etc.).
- Trailing chevron `ArrowRight` (UI-SPEC § Copywriting line 225); `text-primary` on hover/focus, `text-muted-foreground` idle (UI-SPEC § Color § Accent reserved-for #2).

**Status badge variant import note:** existing `<Badge>` is at `apps/web/src/components/ui/badge.tsx` — UI-SPEC line 150 says do NOT introduce a new variant; pass color classes via `className`.

---

### `apps/web/src/components/admin/dashboard/DashboardChecklist.tsx` (NEW)

**Analog:** `apps/web/src/components/admin/audit-log/AuditTable.tsx:1-80` (single-Card list with `useQuery` driver + filtersActive empty state)

**Excerpt for query-driven list shape:**
```typescript
export function AuditTable({ filters }: Props) {
  const navigate = useNavigate();
  const query = useAuditEntries(filters);
  const [drawerEntry, setDrawerEntry] = useState<AuditEntryDto | null>(null);

  const page = filters.page ?? 1;
  const totalPages = query.data?.meta.totalPages ?? 1;
  // ...
}
```

**For Phase 16 DashboardChecklist.tsx** — calls `useDashboardStatus(schoolId)`, renders one outer `<Card>` with `divide-y divide-border`, maps over `data.categories` to render 10 `<ChecklistItem>`, plus loading skeleton (UI-SPEC § Interaction § Loading state line 432: 10-row skeleton `<div class="h-14 px-4 animate-pulse">`) and error state (UI-SPEC § Empty states "Setup-Status nicht verfügbar" InfoBanner).

---

### `apps/web/src/components/shared/DataList.tsx` (NEW — Phase-16 invention)

**Analog A (desktop table):** `apps/web/src/components/admin/teacher/TeacherListTable.tsx:19-114`
**Analog B (mobile cards):** `apps/web/src/components/admin/teacher/TeacherMobileCards.tsx:11-55`

**Desktop table outer wrapper pattern** (`TeacherListTable.tsx:20-22`):
```typescript
return (
  <div className="hidden md:block overflow-x-auto">
    <table className="w-full border-collapse text-sm">
```

**Mobile cards outer wrapper pattern** (`TeacherMobileCards.tsx:12-14`):
```typescript
return (
  <div className="md:hidden space-y-2">
    {teachers.map((t) => { /* ... */ })}
```

**For Phase 16 DataList.tsx** — UI-SPEC § Component Inventory § `<DataList>` API (lines 312-349) locks the props interface. Two important diffs from analogs:
1. **Breakpoint moves from `md` (768px) → `sm` (640px)** to align with `useIsMobile()` per RESEARCH § Pattern 4 last paragraph. Use `hidden sm:block` / `sm:hidden`.
2. **Each row tagged with `data-testid`** from `getRowTestId(row)` on BOTH `<tr>` and the `mobileCard(row)` outermost element (UI-SPEC § Component Inventory § `<DataList>` API last paragraph, RESEARCH Pitfall #3).

Desktop header style (UI-SPEC § Typography "Scoped existing-primitive exceptions" line 110): `text-xs uppercase tracking-wide text-muted-foreground`.

---

### Touch-Target Lift — `button.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`

**Analogs:** the files themselves (in-place edit; no analog elsewhere).

**Current state — `button.tsx:22-27`:**
```typescript
size: {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
},
```

**Current state — `input.tsx:13`:**
```typescript
"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ..."
```

**Current state — `select.tsx:22` (verified — RESEARCH Pitfall #4):**
```typescript
"flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ..."
```

**Current state — `textarea.tsx:12`:**
```typescript
"flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ..."
```

**Lift pattern (UI-SPEC § Spacing "Touch-target floors" lines 67-76):**

| Primitive | Replace | With |
|-----------|---------|------|
| Button `default` | `h-10 px-4 py-2` | `h-10 px-4 py-2 min-h-11 sm:min-h-10` |
| Button `sm` | `h-9 rounded-md px-3` | `h-9 rounded-md px-3 min-h-11 sm:min-h-9` |
| Button `lg` | `h-11 rounded-md px-8` | unchanged (already 44px) |
| Button `icon` | `h-10 w-10` | `h-10 w-10 min-h-11 min-w-11 sm:min-h-10 sm:min-w-10` |
| Input | `h-10 ...` | `h-10 ... min-h-11 sm:min-h-10` |
| Select trigger | `h-10 ...` | `h-10 ... min-h-11 sm:min-h-10` |
| Textarea | `min-h-[80px] ...` | unchanged (already > 44px) — but verify in audit |

**RESEARCH Open Question #4** (line 687): keep `h-{n}` declared AND prepend `min-h-11 sm:min-h-{n}`. Tailwind merges via `cn()` — `apps/web/src/lib/utils.ts` exports `cn` already used in every primitive.

---

### Sidebar entries — `AppSidebar.tsx` + `MobileSidebar.tsx`

**Analog A (insertion target):** `apps/web/src/components/layout/AppSidebar.tsx:49-189` (`navItems` array)
**Analog B (mobile-side parity):** `apps/web/src/components/layout/MobileSidebar.tsx:38-151`

**Existing admin-only entry shape** (`AppSidebar.tsx:62-67`):
```typescript
{
  label: 'Datenimport',
  href: '/admin/import',
  icon: Upload,
  roles: ['admin'],
},
```

**Existing `roles: ['admin']` strict-admin sidebar entries** (verified):
- `AppSidebar.tsx:62-67` Datenimport
- `AppSidebar.tsx:106-111` Solver-Tuning (carry-forward Phase 14)
- `AppSidebar.tsx:175-189` DSGVO-Verwaltung + Audit-Log (carry-forward Phase 15)

**For Phase 16** — insert AS THE FIRST admin item per UI-SPEC § Sidebar position (lines 175-181):
```typescript
{
  label: 'Dashboard',
  href: '/admin',
  icon: LayoutDashboard,   // NEW import from lucide-react — must add to import block
  roles: ['admin'],
},
```

**MobileSidebar GAP — RESEARCH Open Question #3 (verified):**
`MobileSidebar.tsx:38-151` is missing the Phase 15 entries that `AppSidebar.tsx:175-189` has. Phase 16 must add THREE entries to MobileSidebar in one edit:
1. `Dashboard` (NEW — top of admin items)
2. `DSGVO-Verwaltung` (Phase 15 carry-forward gap)
3. `Audit-Log` (Phase 15 carry-forward gap)

`AppSidebar.tsx` adds only ONE entry (`Dashboard`).

**Active-route highlight pattern** (`AppSidebar.tsx:240-247`):
```typescript
className={cn(
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
  'hover:bg-accent hover:text-accent-foreground',
  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
  sidebarCollapsed && 'justify-center px-2',
)}
```

UI-SPEC § Sidebar (lines 405-407) confirms: "Active-route highlight uses the existing `bg-primary/10 text-primary` pattern at `AppSidebar.tsx:244`." — already in place; no edit needed.

---

### Mutation-hook fan-out — 13 files, ~57 mutation sites

**Analog:** `apps/web/src/hooks/useTeachers.ts:223-225` (verified)

**Existing pattern:**
```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: teacherKeys.all(schoolId) });
  toast.success('Lehrperson angelegt.');
},
```

**Edit pattern (RESEARCH § Pattern 2 close):**
```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: teacherKeys.all(schoolId) });
  qc.invalidateQueries({ queryKey: dashboardKeys.status });   // ← NEW LINE
  toast.success('Lehrperson angelegt.');
},
```

`dashboardKeys.status` is `['dashboard-status'] as const` exported from `apps/web/src/hooks/useDashboardStatus.ts` (the new hook).

**Per-file mutation count (verified by grep):**

| Hook file | useMutation count | Mutations to extend (each `onSuccess`) |
|-----------|--------------------|----------------------------------------|
| `useTeachers.ts` | 6 | useCreateTeacher, useUpdateTeacher, useDeleteTeacher, useLinkKeycloak, useUnlinkKeycloak, +1 |
| `useClasses.ts` | 5 | create, update, delete, +2 |
| `useStudents.ts` | 9 | create, update, delete, archive, restore, move, parent-link, parent-unlink, +1 |
| `useSubjects.ts` | 4 | create, update, delete, +1 |
| `useSchool.ts` | 3 | create, update, +1 |
| `useTimeGrid.ts` | 2 | update, +1 |
| `useSchoolYears.ts` | 9 | year-CRUD + holidays + autonomous days |
| `useDsfa.ts` | 4 | create, update, delete, +1 |
| `useVvz.ts` | 4 | create, update, delete, +1 |
| `useRetention.ts` | 4 | create, update, delete, +1 |
| `useConsents.ts` | 3 | create, update, +1 |
| `useDsgvoExportJob.ts` | 2 | start, cancel |
| `useDsgvoDeletionJob.ts` | 2 | start, cancel |
| **Total** | **57** | — |

(RESEARCH Wave 0 said "~30" — actual is 57; planner should plan for the higher count.)

**Plan owner suggestion:** one Plan dedicated to mutation-hook fan-out, executed via per-file Edit calls. Each file is mechanically identical: import `dashboardKeys` from `@/hooks/useDashboardStatus`, add `qc.invalidateQueries({ queryKey: dashboardKeys.status });` to every `onSuccess`. Unit-test for at least one hook per file confirms the line was added (RESEARCH § Validation Architecture line 735).

---

### E2E Specs — `admin-dashboard.spec.ts`, `*.mobile.spec.ts`, `login-redirect.spec.ts`, `admin-mobile-sweep.mobile.spec.ts`

**Analog A (admin login + RBAC pattern):** `apps/web/e2e/admin-solver-tuning-rbac.spec.ts:31-66`

**Excerpt:**
```typescript
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';

test.describe('Phase 14 — Solver-Tuning RBAC', () => {
  test('E2E-SOLVER-RBAC-01: schulleitung cannot see entry or access route', async ({ page }) => {
    await loginAsRole(page, 'schulleitung');
    await page.goto('/admin');
    await expect(page.getByRole('link', { name: /Solver-Tuning/i })).toHaveCount(0);
    await page.goto('/admin/solver-tuning');
    await expect(page.getByRole('tab', { name: 'Gewichtungen' })).toHaveCount(0);
    // ...
  });
});
```

**Analog B (mobile-375 + 44px-floor sweep):** `apps/web/e2e/admin-school-settings.mobile.spec.ts:37-59`

**Excerpt (load-bearing verbatim recipe):**
```typescript
test('MOBILE-ADM-02: 44px touch-target floor on all visible interactive elements', async ({
  page,
}) => {
  await page.goto('/admin/school/settings?tab=timegrid');
  const interactives = page.locator(
    'button:visible, input:visible, [role="switch"]:visible, [role="combobox"]:visible',
  );
  const count = await interactives.count();
  const failures: Array<{ index: number; width: number; height: number; html: string }> = [];
  for (let i = 0; i < count; i++) {
    const el = interactives.nth(i);
    const box = await el.boundingBox();
    if (!box) continue;
    if (box.width < 43.5 || box.height < 43.5) {
      const html = (await el.evaluate((node) => (node as HTMLElement).outerHTML)).slice(0, 140);
      failures.push({ index: i, width: box.width, height: box.height, html });
    }
  }
  expect(failures, `Touch-target floor violations:\n${JSON.stringify(failures, null, 2)}`).toEqual([]);
});
```

**Login helper** (`apps/web/e2e/helpers/login.ts:70-100`):
```typescript
export async function loginAsRole(page: Page, role: Role): Promise<void> {
  const { user, pass } = CREDENTIALS[role];
  await page.goto('/');
  await page.waitForURL(/realms\/schoolflow\/protocol\/openid-connect\/auth/, { timeout: 15_000 }).catch(() => {});
  // ... fills KC form, clicks submit ...
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForSelector('nav, [role="navigation"]', { timeout: 30_000 }).catch(() => {});
}
export async function loginAsAdmin(page: Page): Promise<void> { return loginAsRole(page, 'admin'); }
```

`Role = 'admin' | 'schulleitung' | 'lehrer' | 'eltern' | 'schueler'` (login.ts:23). All five seed users are available.

**For Phase 16 specs:**

- `admin-dashboard.spec.ts` (desktop) — `loginAsAdmin(page)` + `page.goto('/admin')` + assert 10 `[data-checklist-item]` rows visible + click one → URL changes to deep-link.
- `admin-dashboard.mobile.spec.ts` — same but `mobile-375` project (filename `.mobile.spec.ts` routes to `mobile-375` + `mobile-chrome` per `playwright.config.ts:47`); assert badge collapses to icon-only at `<sm`.
- `login-redirect.spec.ts` — for each of `admin/schulleitung/lehrer/eltern/schueler`: `loginAsRole(page, role)` + assert `await expect(page).toHaveURL(role === 'admin' ? '/admin' : '/timetable')`.
- `admin-mobile-sweep.mobile.spec.ts` — RESEARCH Code Example 5 (lines 583-639) is the verbatim recipe. Iterate over 16-route ADMIN_ROUTES array, run 44px-floor + horizontal-overflow assertions per route.

**Playwright config — verify-only step** (`playwright.config.ts:33-61`):
```typescript
projects: [
  { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testMatch: /.*\.spec\.ts$/, testIgnore: /(.*\.mobile\.spec\.ts|.*-mobile\.spec\.ts)$/ },
  { name: 'mobile-375', use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } }, testMatch: /(.*\.mobile\.spec\.ts|.*-mobile\.spec\.ts)$/ },
  { name: 'mobile-chrome', use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } }, testMatch: /(.*\.mobile\.spec\.ts|.*-mobile\.spec\.ts)$/ },
],
```

**No edit needed to playwright.config.ts** — `mobile-375` (iPhone 13 viewport 375×812) and `mobile-chrome` (Pixel 5 emulation) are both already configured. RESEARCH § Environment Availability confirms.

---

## Shared Patterns

### `@CheckPermissions` admin-only enforcement (cross-cutting)

**Source:** `apps/api/src/modules/auth/decorators/check-permissions.decorator.ts`
```typescript
import { SetMetadata } from '@nestjs/common';
export interface RequiredPermission { action: string; subject: string; }
export const CHECK_PERMISSIONS_KEY = 'check_permissions';
export const CheckPermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(CHECK_PERMISSIONS_KEY, permissions);
```

**Apply to:** new `DashboardController.getStatus` — `@CheckPermissions({ action: 'manage', subject: 'all' })` (CASL admin shorthand).
**Verified usage:** `audit.controller.ts:22` uses `@CheckPermissions({ action: 'read', subject: 'audit' })`.
**Global guard:** `apps/api/src/app.module.ts:73-76` registers `JwtAuthGuard` as `APP_GUARD` — every endpoint inherits auth + permission check by default.

### Toast invariant — `onError → toast.error` (carry-forward Phase 10.2-04)

**Source:** `apps/web/src/hooks/useTeachers.ts:227-233`
```typescript
onError: (err: TeacherApiError | Error) => {
  const detail = err instanceof TeacherApiError
    ? err.problem.detail ?? err.problem.title
    : err.message;
  toast.error(detail ?? 'Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.');
},
```

**Apply to:** every existing mutation when extending `onSuccess` for dashboard invalidation. Phase 16 has no new mutations of its own (Dashboard is read-only), so this is regression-prevention only — RESEARCH Anti-Pattern "Reverting a 'silent 4xx' pattern when migrating to `<DataList>`" warns against accidentally simplifying `onError` during the mutation-hook edit pass.

### TanStack Router `_authenticated` auth gate (cross-cutting)

**Source:** `apps/web/src/routes/_authenticated.tsx:9-16`
**Apply to:** all `/admin/*` routes implicitly inherit it via the `_authenticated` directory. Phase 16's new `/admin/index.tsx` lives under `_authenticated` and inherits the keycloak.login() guard for free.

### `data-testid` E2E selector discipline (carry-forward Phase 14/15 D-21)

**Source:** `apps/web/src/components/admin/audit-log/AuditTable.tsx` (lines 18-21 of file header comment): "Each row carries `data-audit-id={id}` + `data-audit-action={action}`".

**Apply to:**
- `<ChecklistItem>` outer link: `data-checklist-item={category-key}` + `data-checklist-status={status}` (UI-SPEC § Component Inventory line 304).
- `<DataList>` row + mobile card: `data-testid={getRowTestId(row)}` on BOTH (RESEARCH Pitfall #3).

### Tailwind `cn()` merge utility (cross-cutting)

**Source:** `apps/web/src/lib/utils.ts` (exports `cn`).
**Apply to:** every primitive/component that combines class strings — used in `button.tsx:47`, `input.tsx:14`, every layout component. The touch-target lift relies on `cn()` to merge `min-h-11 sm:min-h-{n}` with caller-passed `className` cleanly.

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| (none) | — | Every new file in Phase 16 has a strong analog in the codebase. The two genuinely-novel pieces (`<DataList>` and `<ChecklistItem>`) compose existing analogs (TeacherListTable + TeacherMobileCards for DataList; TeacherMobileCards row + UI-SPEC anatomy for ChecklistItem) rather than inventing from scratch. |

---

## Metadata

**Analog search scope:**
- `apps/api/src/modules/audit/`, `school/`, `dsgvo/`, `teacher/` (NestJS analogs)
- `apps/web/src/routes/`, `routes/_authenticated/admin/`, `hooks/`, `components/admin/`, `components/ui/`, `components/layout/` (frontend analogs)
- `apps/web/e2e/` (~70 spec files surveyed; 4 selected as direct analogs)
- `apps/api/prisma/schema.prisma` (model presence verification for D-06 status rules)
- `apps/web/playwright.config.ts` (mobile project verification)

**Files scanned:** ~40
**Files read in full or in load-bearing excerpt:** 18
**Pattern extraction date:** 2026-04-28
**Valid until:** 2026-05-12 (matches RESEARCH validity window)
