# Phase 16: Admin-Dashboard & Mobile-Härtung — Research

**Researched:** 2026-04-28
**Domain:** TanStack-Router role-aware redirect + NestJS read-only aggregation endpoint + shared mobile-card data-list + global touch-target lift
**Confidence:** HIGH (codebase-grounded; CONTEXT locks 22 of 22 decisions; existing patterns from Phase 10–15 carry forward)

## Summary

Phase 16 is **brownfield UI on top of v1.0 backend** with one small new backend endpoint (`GET /admin/dashboard/status`) and zero new Prisma models. The CONTEXT.md locks 22 decisions (D-01..D-22); this research treats them as constraints and answers the *implementation* questions the planner needs: which existing services to wire into a new `DashboardModule`, the exact mutation-hook fan-out for the `['dashboard-status']` invalidation, the existing `<table>`-vs-mobile-cards landscape that the new shared `<DataList>` will collapse, and the test boundaries that satisfy the "E2E-First, no UAT until Playwright-Coverage" user directive.

**Two non-obvious findings** that change the planner's task graph:

1. **Mobile-card coverage is a two-mode landscape, not zero-mode.** Phase 11/12 surfaces (`teachers`, `students`, `subjects`, `classes`) ALREADY ship a `MobileCards` companion component beside their `<table>` (split via `hidden md:block` / `md:hidden`). Phase 13 (`users`) ships `UserMobileCards`. Phase 14 (`solver-tuning`) and Phase 15 (`audit-log`, `dsgvo retention/dsfa/vvz/jobs/consents`) ship NO mobile alternative — the `<table>` renders raw on 375px. The planner's `<DataList>` migration order should therefore be: **first migrate the zero-mode surfaces (Phase 14/15) where there is no functional alternative on mobile today, then collapse the dual-component surfaces (Phase 11/12/13) where mobile already works but two component files are kept in sync manually.** This is the actual MOBILE-ADM-01 gap.

2. **The `index.tsx` `beforeLoad` cannot use `useAuth()`.** The existing pattern (`/_authenticated.tsx:10`) reads `keycloak.authenticated` and `keycloak.realmAccess?.roles` directly from the Keycloak instance — `useAuth()` is a React hook that cannot be called from a router lifecycle. The role-redirect must mirror this access pattern.

**Primary recommendation:** Implement the dashboard backend as a thin `DashboardModule` that imports the 5 source modules (`SchoolModule`, `TeacherModule`, `ClassModule`, `StudentModule`, `SubjectModule`) and additionally injects `PrismaService` directly for the 4 cross-module reads (`TimetableRun`, `RetentionPolicy`, `DsfaEntry`, `VvzEntry`, `AuditEntry`) — `AuditModule` is `@Global()` so its service is implicitly available. Hybrid live-update is `Promise.all` parallel queries (no caching), `<DataList>` is a pure component (no test needed beyond contract tests), and the touch-target lift is exactly 4 file edits (`button.tsx` + `input.tsx` + `select.tsx` + `textarea.tsx` — `select.tsx` was missed in CONTEXT specifics).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Login redirect (role-aware) | Frontend Server (TanStack Router `beforeLoad`) | — | `beforeLoad` runs before the empty `/` page paints — no flash. Reads `keycloak` instance directly (NOT `useAuth`). |
| Dashboard checklist data fetch | Browser (TanStack Query) | API (aggregation endpoint) | `staleTime: 10s`, `refetchInterval: 30s`, shared QueryKey for cross-mutation invalidation. |
| Setup-completeness aggregation | API / Backend (NestJS `DashboardController` + `DashboardService`) | Database (read-only `count()` + `findFirst()` queries on existing models) | Single endpoint per D-10 (avoid N+1). Aggregation is read-only and depends on existing services from 9 modules. |
| `<DataList>` desktop-vs-mobile switch | Browser (`useIsMobile()` hook + Tailwind responsive classes) | — | 640px breakpoint matches existing `useIsMobile`. Dual-render in DOM, Tailwind flips visibility. |
| Touch-target floor enforcement | Browser (Tailwind `min-h-11` on primitive layer) | — | Edits at `button.tsx` / `input.tsx` / `select.tsx` / `textarea.tsx` propagate transparently to all 100+ call-sites. |
| Sidebar Dashboard entry | Browser (static array in `AppSidebar.tsx` + `MobileSidebar.tsx`) | — | Same `roles: ['admin']` carry-forward pattern. |
| Cross-mutation cache invalidation | Browser (every existing `useMutation` `onSuccess` adds one line) | — | No backend orchestration — pure client cache coordination. |

## Standard Stack

### Core (already installed — verified via `apps/web/package.json` + `apps/api/package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | ^5.95.0 | Dashboard polling + invalidation | `refetchInterval` + `staleTime` + `invalidateQueries` deliver D-07/D-08/D-09 verbatim. `[VERIFIED: apps/web/package.json:36]` |
| `@tanstack/react-router` | ^1.168.0 | `beforeLoad` role redirect | `beforeLoad: () => { throw redirect(...) }` is the established codebase pattern (see `apps/web/src/routes/_authenticated.tsx:10`). `[VERIFIED: apps/web/package.json:37]` |
| `@nestjs/common` | ^11 | `DashboardModule` + controller/service decorators | Cross-module DI via `imports: [SchoolModule, ...]` is the codebase convention (see `app.module.ts`). `[VERIFIED: apps/api/package.json:21]` |
| `@prisma/client` | ^7.6.0 | Direct `count()` / `findFirst()` reads where service-layer wrapping is cheaper | Pure TypeScript engine since v7. `[VERIFIED: apps/api/package.json:32]` |
| `lucide-react` | ^0.469.0 | Category icons (`LayoutDashboard`, `Building2`, `Clock`, etc. per UI-SPEC § Component Inventory) | All icons listed in UI-SPEC are already imported in `AppSidebar.tsx` except `LayoutDashboard` and `Clock`. `[VERIFIED: apps/web/package.json:48]` |
| `sonner` | (transitively via shadcn) | `toast.error` invariant for any new mutations (none in Phase 16 surface itself; carry-forward only) | Established Phase 10.2-04 invariant. `[VERIFIED: apps/web/src/components/ui/sonner.tsx]` |
| `class-validator` | ^0.15.1 | DTO shape for `DashboardStatusDto` if validation is needed | Already used in every existing controller. `[VERIFIED: apps/api/package.json:30]` |

### Supporting (already in repo, no new deps)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | ^4.1.0 (web) / ^4 (api) | Unit + service tests | Existing test runner — no new install. `[VERIFIED: apps/web/package.json:78, apps/api/package.json:73]` |
| `@playwright/test` | ^1.59.1 | E2E specs incl. 375px viewport sweep | `mobile-375` and `mobile-chrome` projects already configured (`playwright.config.ts:34`). `[VERIFIED]` |

### Alternatives Considered

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Plain `Promise.all` over Prisma reads | In-memory or Redis cache layer for `/dashboard/status` | D-10 requires "single round-trip" but says nothing about caching. Adding a cache requires invalidation hooks on every mutation across 9 modules — exact same invalidation surface as the frontend QueryClient already implements via D-07. The frontend cache (`staleTime: 10_000` per D-09) IS the cache. Server-side cache would duplicate it and risk a double-invalidation race. **Recommendation: NO server cache. Plain `Promise.all` of ~10 reads. Each read is a single-row `findFirst` or unindexed `count` — total cost <30ms on a school-sized DB.** |
| Socket.IO `DashboardGateway` for live push | Polling + cross-mutation invalidation | D-11 explicit OUT-OF-SCOPE (carry-forward Phase 15 D-15 `kein Socket-Sidecar in v1.0`). |
| `useState` + `Route.useSearch()` for tab routing | Custom `useTab` hook | Phase 14 D-04 / Phase 15 D-26 carry-forward — Phase 16 dashboard has NO tabs (single-page checklist) so this is moot. |
| Server-side rendering (SSR) of dashboard | Client-side TanStack Query fetch | Project is SPA-only (`apps/web` is Vite + React, no Next.js). `[CITED: CLAUDE.md "The frontend is a SPA consuming an API"]` |

**Installation:** None. All dependencies already in `package.json` for both apps.

**Version verification:** Skipped — project is on a stable v1.1 milestone branch and CONTEXT.md locks "no new dependencies". No version bumps proposed by this phase.

## Architecture Patterns

### System Architecture Diagram

```
                            ┌────────────────────────────────────┐
   Login                    │ Browser                            │
     │                      │                                    │
     ▼                      │  / (index.tsx)                     │
  Keycloak ───── token ────▶│  beforeLoad reads keycloak roles ──┼─────┐
                            │  if 'admin' → /admin (D-02)        │     │
                            │  else → /timetable                 │     │
                            │                                    │     │
                            │  /admin (NEW)                      │     │
                            │  ├─ <DashboardChecklist>           │     │
                            │  │    └─ useDashboardStatus() ──────┼──┐  │
                            │  │       (refetchInterval 30s,     │  │  │
                            │  │        staleTime 10s)           │  │  │
                            │  │                                 │  │  │
                            │  ├─ each row = <Link to={deeplink}>│  │  │
                            │  └─ chevron → Phase 10–15 surface  │  │  │
                            │                                    │  │  │
                            │  Phase 10–15 admin surfaces        │  │  │
                            │  ├─ <DataList> (NEW shared)        │  │  │
                            │  │    desktop: <table>             │  │  │
                            │  │    mobile (<sm): Card stack     │  │  │
                            │  │    via useIsMobile()            │  │  │
                            │  └─ existing useMutation hooks     │  │  │
                            │     onSuccess: invalidate          │  │  │
                            │       ['dashboard-status'] ────────┼──┘  │
                            │     + own keys                     │     │
                            └────────────────────────────────────┘     │
                                                                       │
                            ┌──────────────────────────────────────────┼──┐
                            │ NestJS API                               │  │
                            │                                          │  │
                            │  GET /admin/dashboard/status (NEW) ◀─────┘  │
                            │  └─ DashboardController                     │
                            │     └─ DashboardService.getStatus()         │
                            │        └─ Promise.all([                     │
                            │             SchoolService.findOne(),        │
                            │             prisma.timeGrid.findUnique(),   │
                            │             prisma.schoolDay.count(),       │
                            │             prisma.schoolYear.findFirst(),  │
                            │             prisma.subject.count(),         │
                            │             prisma.teacher.count(),         │
                            │             prisma.class.count(),           │
                            │             prisma.student.count() (+ classId IS NULL count),
                            │             prisma.timetableRun.count(),    │
                            │             prisma.retentionPolicy.count(), │
                            │             prisma.dsfaEntry.count(),       │
                            │             prisma.vvzEntry.count(),        │
                            │             prisma.auditEntry.count(),      │
                            │           ])                                │
                            │        └─ derive 3-state per category       │
                            │                                             │
                            │  Existing v1.0 modules (UNCHANGED)          │
                            │  - SchoolModule, TeacherModule, etc.        │
                            └─────────────────────────────────────────────┘
                                              │
                                              ▼
                                          PostgreSQL
```

### Recommended Project Structure

```
apps/api/src/modules/dashboard/                  ← NEW
├── dashboard.module.ts                          ← imports 5 feature modules + uses PrismaService for cross-module reads
├── dashboard.controller.ts                      ← @Get('admin/dashboard/status') + @CheckPermissions({ action: 'manage', subject: 'all' }) — admin only
├── dashboard.service.ts                         ← Promise.all aggregation, returns DashboardStatusDto
├── dashboard.service.spec.ts                    ← Vitest unit tests, table-driven per category
└── dto/
    ├── dashboard-status.dto.ts                  ← class-validator + Swagger decorators
    └── dashboard-status.dto.spec.ts             ← optional contract test

apps/web/src/components/admin/dashboard/          ← NEW
├── DashboardChecklist.tsx                       ← outer Card with divide-y rows
├── ChecklistItem.tsx                            ← row component (icon + title + secondary + badge + chevron)
├── ChecklistItem.test.tsx                       ← Vitest+RTL: state branches, deep-link href, mobile icon-only badge
└── __tests__/
    └── DashboardChecklist.test.tsx              ← integration: 10-state matrix renders correct badges

apps/web/src/components/shared/                  ← NEW (or extend existing)
├── DataList.tsx                                 ← desktop <table> + mobile cards via useIsMobile
└── DataList.test.tsx                            ← unit: rendering modes, empty state, loading slot

apps/web/src/hooks/                              ← edits
├── useIsMobile.ts                               ← NEW (extracted from __root.tsx:20-32)
└── useDashboardStatus.ts                        ← NEW (TanStack Query wrapper)

apps/web/src/routes/_authenticated/admin/        ← edits
└── index.tsx                                    ← NEW dashboard route

apps/web/src/routes/                             ← edit
└── index.tsx                                    ← role-aware beforeLoad

apps/web/src/components/layout/                  ← edits
├── AppSidebar.tsx                               ← insert Dashboard entry as first admin item
└── MobileSidebar.tsx                            ← same insertion + audit Phase 13–15 entries

apps/web/src/components/ui/                      ← global touch-target lift
├── button.tsx                                   ← responsive min-h-11 sm:min-h-{original}
├── input.tsx                                    ← responsive min-h-11 sm:min-h-10
├── select.tsx                                   ← responsive min-h-11 sm:min-h-10  ← NOT in CONTEXT specifics; verified in this research
└── textarea.tsx                                 ← (audit needed — see Common Pitfalls)

apps/web/e2e/                                    ← NEW specs
├── admin-dashboard.spec.ts                      ← desktop happy-path
├── admin-dashboard.mobile.spec.ts               ← 375px checklist render + tap-target
├── login-redirect.spec.ts                       ← role redirect (admin → /admin, lehrer → /timetable, …)
├── admin-mobile-sweep.mobile.spec.ts            ← 14-route sweep (audit gate per D-16)
└── helpers/                                     ← extend existing helpers if needed
```

### Pattern 1: NestJS Read-Only Aggregation Module

**What:** A NestJS module whose service depends on multiple feature modules to assemble a single read-only DTO.

**When to use:** Cross-cutting "single round-trip" endpoint per D-10. Avoid the trap of injecting all 9 services as constructor dependencies — most needed reads are simple `count()` calls that don't justify a service round-trip.

**Two viable approaches in this codebase:**

**Approach A — Inject existing services (full encapsulation):**

```typescript
// dashboard.module.ts
@Module({
  imports: [SchoolModule, TeacherModule, ClassModule, StudentModule, SubjectModule, TimetableModule, DsgvoModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

// dashboard.service.ts
@Injectable()
export class DashboardService {
  constructor(
    private school: SchoolService,
    private teacher: TeacherService,
    private prisma: PrismaService,
    // ...
  ) {}
}
```

Tradeoff: encapsulates the source-of-truth (e.g. School's `findOne` already wraps the address normalisation), BUT every imported module's `OnModuleInit` runs (DsgvoModule registers a BullMQ cron job — see `dsgvo.module.ts:48-58`). Risk of duplicate cron registration if DashboardModule and another caller both import DsgvoModule. **Verified non-issue:** NestJS module imports are deduplicated by reference; the cron registers exactly once.

**Approach B — Inject PrismaService directly (lighter):**

```typescript
// dashboard.module.ts
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  // PrismaModule is already global (see app.module.ts) — no import needed
})
export class DashboardModule {}

// dashboard.service.ts
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStatus(schoolId: string): Promise<DashboardStatusDto> {
    const [school, timeGrid, schoolDays, activeYear, subjectCount, teacherCount,
           classCount, studentCount, studentsWithoutClass, latestRun, anyRun,
           retentionCount, dsfaCount, vvzCount, auditCount] = await Promise.all([
      this.prisma.school.findUnique({ where: { id: schoolId } }),
      this.prisma.timeGrid.findUnique({ where: { schoolId }, include: { periods: true } }),
      this.prisma.schoolDay.count({ where: { schoolId, isActive: true } }),
      this.prisma.schoolYear.findFirst({ where: { schoolId, isActive: true } }),
      this.prisma.subject.count({ where: { schoolId } }),
      this.prisma.teacher.count({ where: { schoolId, person: { isArchived: false } } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.student.count({ where: { schoolId, isArchived: false } }),
      this.prisma.student.count({ where: { schoolId, isArchived: false, classId: null } }),
      this.prisma.timetableRun.count({ where: { schoolId, status: 'COMPLETED' } }),
      this.prisma.timetableRun.count({ where: { schoolId } }),
      this.prisma.retentionPolicy.count({ where: { schoolId } }),
      this.prisma.dsfaEntry.count({ where: { schoolId } }),
      this.prisma.vvzEntry.count({ where: { schoolId } }),
      this.prisma.auditEntry.count(),
    ]);
    return this.buildStatus({ school, timeGrid, schoolDays, ... });
  }
}
```

Tradeoff: bypasses service-layer logic (e.g. tenant filtering rules implemented in `TeacherService.findAll`). Acceptable here because the dashboard is school-scoped via `schoolId` in the where-clause and only needs counts.

**Recommendation: Approach B.** All required reads are cheap counts/findFirst's — service injection adds DI surface area without semantic value. The one exception is `SchoolService.findOne` which normalises the JSON `address` field (`apps/api/src/modules/school/school.service.ts:85`) — for this single call, inject `SchoolService`.

**Source:** `[VERIFIED: apps/api/src/modules/school/school.service.ts:79-90, apps/api/src/modules/teacher/teacher.service.ts:103-113, apps/api/src/modules/audit/audit.service.ts:101-107]`

### Pattern 2: TanStack Query Polling + Cross-Mutation Invalidation

**What:** Single shared QueryKey + `refetchInterval` backup polling + every mutation explicitly invalidates the shared key.

**Source:** `apps/web/src/hooks/useImport.ts:127-141` is the reference template (D-08 reference).

```typescript
// apps/web/src/hooks/useDashboardStatus.ts (NEW)
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export const dashboardKeys = {
  status: ['dashboard-status'] as const,
};

export function useDashboardStatus(schoolId: string) {
  return useQuery({
    queryKey: dashboardKeys.status,
    queryFn: async (): Promise<DashboardStatusDto> => {
      const res = await apiFetch(`/api/v1/admin/dashboard/status?schoolId=${schoolId}`);
      if (!res.ok) throw new Error('Failed to load dashboard status');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
```

Cross-mutation invalidation pattern (carry-forward `apps/web/src/hooks/useTeachers.ts:223`):

```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: teacherKeys.all(schoolId) });
  qc.invalidateQueries({ queryKey: dashboardKeys.status });   // ← NEW LINE
  toast.success('...');
},
```

### Pattern 3: TanStack Router `beforeLoad` Role Redirect

**What:** Read Keycloak instance directly (NOT `useAuth()`) inside `beforeLoad` and `throw redirect()` based on role.

**Source:** `apps/web/src/routes/_authenticated.tsx:10` already does this for auth check.

```typescript
// apps/web/src/routes/index.tsx (REPLACE)
import { createFileRoute, redirect } from '@tanstack/react-router';
import { keycloak } from '@/lib/keycloak';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const roles = keycloak.realmAccess?.roles ?? [];
    if (roles.includes('admin')) {
      throw redirect({ to: '/admin' });
    }
    throw redirect({ to: '/timetable' });
  },
});
```

`[VERIFIED: apps/web/src/hooks/useAuth.ts:21-30 — useAuth reads keycloak.realmAccess?.roles via React useMemo; beforeLoad must skip useMemo and read keycloak directly]`

### Pattern 4: Shared `<DataList>` with Tailwind Dual-Render

**What:** Render BOTH desktop `<table>` and mobile cards in the DOM, use Tailwind `hidden sm:block` / `sm:hidden` to flip visibility — NO conditional rendering based on `useIsMobile()`.

**Why:** Conditional rendering on `isMobile` can race with hydration and causes flash-on-resize. Dual-render is the codebase convention (`teachers/TeacherListTable.tsx:21` uses `hidden md:block`; `teachers/TeacherMobileCards.tsx:13` uses `md:hidden`). `useIsMobile()` is then used only for non-layout decisions (e.g. icon-only badge in `<ChecklistItem>` at `<sm`).

**Note on breakpoint:** existing surfaces use `md` (768px) for the split. CONTEXT D-13 mandates `sm` (640px) for `<DataList>`. The migration plan must pick: either keep dual breakpoints (md for legacy mobile cards, sm for `<DataList>`), or migrate the legacy split to `sm`. **Recommendation: migrate to `sm`** — it matches `useIsMobile()` and the UI-SPEC § Spacing "responsive lift … `<sm` only (≤639px)". Ship-with-`md`-mismatch would create two breakpoint conventions.

### Anti-Patterns to Avoid

- **Building a server-side cache for `/dashboard/status`.** The frontend's `staleTime: 10_000` IS the cache. Adding Redis/in-memory invalidation requires hooks on every mutation across 9 modules — pure duplication.
- **Calling `useAuth()` from `beforeLoad`.** `useAuth` is a React hook; `beforeLoad` is not in a React render. Read `keycloak` directly.
- **Conditional render based on `useIsMobile()` for layout.** Dual-render via Tailwind is the codebase convention and avoids hydration races.
- **Adding `<DataList>` data-testid only on the wrapper.** UI-SPEC explicitly requires the testid on the `mobileCard(row)` outermost element AS WELL — Playwright selectors must work in both modes.
- **Per-form patches for the 44px floor.** D-17 mandates the lift at the primitive layer (`button.tsx`, `input.tsx`). Patching individual forms means new forms drift on day 1.
- **Reverting a "silent 4xx" pattern when migrating to `<DataList>`.** Phase 10.2-04 invariant: every mutation has `onError → toast.error`. Migrating the layout component MUST NOT change the mutation hook signatures.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3-state status enum + serialization | Custom JSON shape | `class-validator` `@IsEnum` on a TS string union literal `'done' \| 'partial' \| 'missing'` per category, return DTO as plain `class-transformer` decorated class | Codebase convention — every other DTO in `apps/api/src/modules/*/dto/*.dto.ts` does this. |
| Cross-tab live update across browser tabs | Custom BroadcastChannel sync | TanStack Query's `refetchOnWindowFocus` (default ON) + `refetchInterval: 30_000` per D-08 | Multi-tab admin = multi-device admin. Polling covers both. |
| Mobile breakpoint detection | Custom `useMediaQuery` hook | Existing `useIsMobile()` (640px) + Tailwind responsive classes for layout | `useIsMobile` already in `__root.tsx:20-32`. Phase 16 extracts it (D-13). |
| Dashboard status caching | Redis / in-memory cache layer | Trust frontend `staleTime: 10_000` (D-09). Recompute on every server hit | <30ms total cost. Adding cache requires invalidation on every mutation in 9 modules. |
| Sub-second mutation → dashboard refresh | Socket.IO `DashboardGateway` | TanStack Query `invalidateQueries({ queryKey: ['dashboard-status'] })` on every existing mutation `onSuccess` | D-11 explicit OUT-OF-SCOPE. Carry-forward Phase 15 D-15 ("kein Socket-Sidecar in v1.0"). |
| Per-row deep-link click handlers | Custom `onClick` on cells | Wrap entire row in `<Link to={deepLink}>` from `@tanstack/react-router` | Whole row becomes the touch target — satisfies 44px floor unconditionally. UI-SPEC § Component Inventory locks this. |
| Status-badge variant component | Custom `<StatusBadge>` | Reuse existing `<Badge>` primitive with `className` override per UI-SPEC § Color § "Status badge color map" | UI-SPEC says "do NOT introduce a new Badge variant". |

**Key insight:** Phase 16 is a thin coordination layer over established v1.0 patterns. Almost every "do I need to build X" answer is "no — there's already an X, use it." The exception is `<DataList>` and `<ChecklistItem>` — those are genuinely new because no shared component exists today (each Phase 11–15 surface ships its own table+mobile-cards pair).

## Runtime State Inventory

> Phase 16 is greenfield UI plus a new read-only endpoint — no rename, refactor, or migration of existing data. Section omitted intentionally per the "rename / refactor / migration phases only" trigger condition.

## Common Pitfalls

### Pitfall 1: `index.tsx` `beforeLoad` race with Keycloak token refresh

**What goes wrong:** The user lands on `/`, the redirect fires before the token has refreshed, `keycloak.realmAccess?.roles` is `undefined`, the user falls through to `/timetable` even though they're an admin.

**Why it happens:** TanStack Router's `beforeLoad` runs synchronously with `keycloak.authenticated` — the `_authenticated` layout-level guard wraps the deeper routes but `/` is NOT inside `_authenticated`. Token may not be hydrated yet.

**How to avoid:** Order the `beforeLoad` checks — first verify `keycloak.authenticated`; if not, let the `_authenticated`-style guard kick in (or call `keycloak.login()`); only then read roles. The `_authenticated.tsx` already does the `await keycloak.login()` pattern — mirror it in `index.tsx`.

```typescript
beforeLoad: async () => {
  if (!keycloak.authenticated) {
    await keycloak.login();    // returns after redirect; on return, token is hydrated
    return;                     // unreachable, but defensive
  }
  const roles = keycloak.realmAccess?.roles ?? [];
  throw redirect({ to: roles.includes('admin') ? '/admin' : '/timetable' });
},
```

**Warning signs:** Manual UAT of admin login flow ends on `/timetable`. E2E spec for "admin sees /admin" passes only when `--workers=1` (race window narrows on serial runs).

### Pitfall 2: 9-module DI cycle in `DashboardModule`

**What goes wrong:** Importing `TimetableModule` AND `DsgvoModule` in `DashboardModule` triggers their `OnModuleInit` hooks. `DsgvoModule.onModuleInit` registers a daily BullMQ cron job (`dsgvo.module.ts:52-58`). If the cron registration is not idempotent across imports, you get duplicate scheduled jobs.

**Why it happens:** NestJS module imports use reference equality for deduplication — a single `DsgvoModule` registered in two places is still ONE instance. **VERIFIED: this is not actually a bug in NestJS.** But importing `TimetableModule` brings in `SolveProcessor` (BullMQ worker), `TimetableEventsGateway` (WebSocket gateway), and `SolverClientService` (HTTP client to Java sidecar) — all overhead for a read-only count of `TimetableRun`.

**How to avoid:** Approach B from Pattern 1 — inject `PrismaService` directly for `prisma.timetableRun.count()`. Don't import `TimetableModule` into `DashboardModule`.

**Warning signs:** API startup logs show duplicate "Registered daily retention check cron job" messages. Application boot time increases.

### Pitfall 3: `<DataList>` migration breaks existing E2E selectors

**What goes wrong:** Existing E2E specs locate rows via `data-testid="teacher-row-${id}"` (`apps/web/src/components/admin/student/StudentListTable.tsx:80`). Migrating to `<DataList>` changes the wrapper structure — if the testid is on the `<tr>` only, mobile cards lose their selector.

**Why it happens:** `<DataList>` desktop renders `<tr data-testid={...}>`, mobile renders a `<Card>` wrapper around `mobileCard(row)`. UI-SPEC mandates the testid on BOTH the wrapper AND the user's `mobileCard` outermost element — easy to forget.

**How to avoid:** UI-SPEC § Component Inventory § `<DataList>` API mandates: "`mobileCard` MUST internally include the `data-testid` from `getRowTestId(row)` on its outermost element". `<DataList>` re-applies it on the wrapper as a backstop.

**Warning signs:** Phase 11/12/13 mobile E2E specs pass on desktop project but fail on `mobile-375` project after migration. Failing assertions: `expect(page.locator('[data-testid="teacher-row-..."]')).toBeVisible()`.

### Pitfall 4: `select.tsx` and `textarea.tsx` not lifted with `button.tsx` and `input.tsx`

**What goes wrong:** D-17 says "shadcn/ui Input-/Button-Defaults werden auf min-h-11 gehoben". UI-SPEC says the same. **But: `apps/web/src/components/ui/select.tsx:22` has `h-10` (40px) — same as input.** If only `input.tsx` is lifted, every `<Select>` in admin forms still has a 40px target.

**How to avoid:** Audit ALL primitive UI files for `h-10`/`h-9`:

```bash
grep -nE "h-(9|10)\b" apps/web/src/components/ui/*.tsx
```

Verified hits: `button.tsx:23,24,26`, `input.tsx:13`, `select.tsx:22`. **Likely candidates also: `textarea.tsx`, `radio-group.tsx`, `checkbox.tsx` (icon size), `toggle.tsx`.** Lift each that is interactive.

**Warning signs:** `admin-mobile-sweep.mobile.spec.ts` 44px-floor assertion fails on dropdown elements (Select trigger).

### Pitfall 5: Solver-category status query selects wrong outcome

**What goes wrong:** D-05/D-06 row 8 says Solver `done` requires "Config + ≥1 erfolgreicher Run". Naive query: `prisma.timetableRun.count({ where: { schoolId } }) > 0`. **But that counts QUEUED, FAILED, STOPPED runs as "successful".**

**How to avoid:** Two queries — `count({ where: { schoolId, status: 'COMPLETED' } })` for `erledigt` test, plus presence-of-any-run for `unvollständig`. Status enum: `SolveStatus = QUEUED | SOLVING | COMPLETED | FAILED | STOPPED` (`schema.prisma:690-696`). And: "Config" semantics — D-06 says "Solver-Config existiert" but Phase 14 introduced `ConstraintWeightOverride` and per-school templates; an empty-overrides school still has a "Config" via the default catalog. **Recommendation: define "Config exists" as `prisma.constraintWeightOverride.count({ where: { schoolId } }) > 0 OR prisma.constraintTemplate.count({ where: { schoolId } }) > 0`.** Discuss with user if this matches intent — flagged in Open Questions.

### Pitfall 6: Address-field heuristic matches "complete address" incorrectly

**What goes wrong:** D-06 row 1 says Schule `done` requires "name + schultyp + komplette address (street, postalCode, city)". Per Phase 10.1-03, `School.address` is `Json? @db.JsonB` (`apps/api/prisma/schema.prisma`). The structure is a free-form JSON — there is no Prisma schema enforcing the address sub-fields.

**How to avoid:** The DTO `AddressResponseDto` (Phase 10.1-03) defines the shape. Read it from `apps/api/src/modules/school/dto/`. Implement the "complete" heuristic in `dashboard.service.ts` as: `address && typeof address === 'object' && address.street && address.postalCode && address.city`. Add a unit test fixture with each missing-field permutation.

**Warning signs:** Schools with partial address (e.g. street + city, no postalCode) classified as `done` instead of `unvollständig`.

### Pitfall 7: 44px floor breaks compact desktop layouts

**What goes wrong:** Lifting `Button size="sm"` from `h-9` (36px) to `min-h-11` (44px) on desktop makes admin tables look oversized — breaks Phase 14 SubjectPreferencesTab dense slider rows, breaks audit-log filter bar density.

**How to avoid:** UI-SPEC mandates responsive lift: `min-h-11 sm:min-h-{original}` — only `<sm` gets the floor. Desktop unchanged. Verify via Playwright assertion: `getBoundingClientRect().height >= 44 on mobile-375 AND <= 40 on desktop`.

**Warning signs:** Phase 14 `admin-solver-tuning-preferences.spec.ts` regression on desktop project (slider row height change).

## Code Examples

### Example 1: NestJS `DashboardModule` (Approach B — direct Prisma + one service)

```typescript
// apps/api/src/modules/dashboard/dashboard.module.ts
// Source: pattern verified against apps/api/src/modules/school/school.module.ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SchoolModule } from '../school/school.module';   // for SchoolService address normalisation

@Module({
  imports: [SchoolModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

```typescript
// apps/api/src/modules/dashboard/dashboard.controller.ts
// Source: pattern verified against apps/api/src/modules/audit/audit.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { DashboardStatusDto } from './dto/dashboard-status.dto';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('status')
  @CheckPermissions({ action: 'manage', subject: 'all' })  // admin-only per CASL
  async getStatus(@Query('schoolId') schoolId: string): Promise<DashboardStatusDto> {
    return this.dashboard.getStatus(schoolId);
  }
}
```

```typescript
// apps/api/src/modules/dashboard/dto/dashboard-status.dto.ts
// Source: pattern verified against apps/api/src/modules/audit/dto/query-audit.dto.ts
export type CategoryStatus = 'done' | 'partial' | 'missing';
export type CategoryKey =
  | 'school' | 'timegrid' | 'schoolyear' | 'subjects' | 'teachers'
  | 'classes' | 'students' | 'solver' | 'dsgvo' | 'audit';

export class CategoryStatusDto {
  key!: CategoryKey;
  status!: CategoryStatus;
  /** Filled secondary copy line, e.g. "12 Lehrer:innen", "Aktives Schuljahr: 2026/2027". */
  secondary!: string;
}

export class DashboardStatusDto {
  schoolId!: string;
  generatedAt!: string;       // ISO-8601 — for UI "Stand: X Uhr" if needed; also for cache-debug
  categories!: CategoryStatusDto[];   // length=10, ORDER MATCHES CONTEXT D-06
}
```

### Example 2: TanStack Router `index.tsx` (role-aware redirect)

```typescript
// apps/web/src/routes/index.tsx (REPLACE)
// Source: pattern verified against apps/web/src/routes/_authenticated.tsx:10
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

### Example 3: TanStack Query Dashboard Hook

```typescript
// apps/web/src/hooks/useDashboardStatus.ts
// Source: template from apps/web/src/hooks/useImport.ts:127-141
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { DashboardStatusDto } from '@schoolflow/shared';   // or local re-declaration

export const dashboardKeys = {
  status: ['dashboard-status'] as const,
};

export function useDashboardStatus(schoolId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.status,
    queryFn: async (): Promise<DashboardStatusDto> => {
      const res = await apiFetch(
        `/api/v1/admin/dashboard/status?schoolId=${schoolId}`,
      );
      if (!res.ok) throw new Error('Failed to load dashboard status');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 10_000,        // D-09
    refetchInterval: 30_000,  // D-08
  });
}
```

### Example 4: `useIsMobile()` extraction

```typescript
// apps/web/src/hooks/useIsMobile.ts (NEW — extracted from __root.tsx:20-32)
// Source: VERBATIM-MOVE from apps/web/src/routes/__root.tsx:20-32
import { useEffect, useState } from 'react';

/**
 * Detects mobile viewport via `matchMedia`. Default breakpoint 640px (Tailwind `sm`).
 * Re-rendering on breakpoint crossings is debounced by the browser's media-query
 * change events — no manual throttling needed.
 */
export function useIsMobile(breakpoint = 640): boolean {
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

### Example 5: Mobile sweep — Playwright recipe per route

```typescript
// apps/web/e2e/admin-mobile-sweep.mobile.spec.ts (NEW)
// Source: pattern verified against apps/web/e2e/admin-school-settings.mobile.spec.ts:37-59
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

const ADMIN_ROUTES = [
  '/admin',                          // NEW Phase 16 dashboard
  '/admin/school/settings',
  '/admin/subjects',
  '/admin/teachers',
  '/admin/classes',
  '/admin/students',
  '/admin/users',
  '/admin/solver',
  '/admin/solver-tuning',
  '/admin/dsgvo',
  '/admin/audit-log',
  '/admin/import',
  '/admin/resources',
  '/admin/substitutions',
  '/admin/timetable-edit',
  '/admin/timetable-history',
];

test.describe.configure({ mode: 'serial' });
test.describe('Phase 16 — Mobile sweep at 375px', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  for (const route of ADMIN_ROUTES) {
    test(`${route} — 44px floor + no horizontal overflow`, async ({ page }) => {
      await page.goto(route);
      // wait for content
      await page.waitForLoadState('networkidle');

      // 1. No horizontal overflow
      const docOverflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
      expect(docOverflow, `${route} has horizontal overflow`).toBeLessThanOrEqual(0);

      // 2. 44px touch-target floor on visible interactives
      const interactives = page.locator(
        'button:visible, input:visible, [role="switch"]:visible, [role="combobox"]:visible, [role="link"]:visible, a:visible',
      );
      const count = await interactives.count();
      const failures: Array<{ index: number; height: number; html: string }> = [];
      for (let i = 0; i < count; i++) {
        const box = await interactives.nth(i).boundingBox();
        if (!box) continue;
        if (box.height < 43.5) {
          const html = (await interactives.nth(i).evaluate((n) => (n as HTMLElement).outerHTML)).slice(0, 120);
          failures.push({ index: i, height: box.height, html });
        }
      }
      expect(failures, `${route}: ${failures.length} sub-44px elements`).toEqual([]);
    });
  }
});
```

This single spec produces the **gap report D-16 calls for**. Failures become Phase 16 fix-tasks. Pass = Mobile-Härtung satisfied for that route.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-surface `<table>` + `MobileCards` dual-component pair | Shared `<DataList>` with `mobileCard` render-prop | Phase 16 (this phase) | One component to maintain instead of N pairs. Old surfaces migrate sequentially. |
| Hardcoded login redirect to `/timetable` for all roles | Role-aware `beforeLoad` redirect | Phase 16 D-02 | Admin lands on `/admin`. All other roles unchanged. |
| Per-form `min-h-11` patches on individual buttons | Global lift in `button.tsx` + `input.tsx` + `select.tsx` (+ textarea audit) | Phase 16 D-17 | One edit fixes 100+ call-sites. Future forms inherit floor. |
| `useIsMobile` defined locally in `__root.tsx` | Extracted to `apps/web/src/hooks/useIsMobile.ts` | Phase 16 D-13 | Reusable across components without import-from-route smell. |
| No admin entry-point — admins land on `/timetable` like everyone | Admin Dashboard at `/admin` with Setup-Completeness-Checkliste | Phase 16 (ADMIN-01) | New onboarding pathway for admins. |
| No mobile coverage for Phase 13/14/15 surfaces | Mobile-card alternative + 44px floor + MobileSidebar verification | Phase 16 (MOBILE-ADM-01..03) | Admin can use the console on a phone. |

**Deprecated/outdated:**

- The `hidden md:block` / `md:hidden` breakpoint convention used by Phase 11/12/13 — **Phase 16 migrates to `sm` (640px)** for `<DataList>` consistency with `useIsMobile()`. Existing surfaces stay at `md` until they migrate (sequential, per CONTEXT D-15).
- The "manual UAT after each plan" feedback loop — **superseded by E2E-First** (`feedback_e2e_first_no_uat.md`, 2026-04-21). Phase 16 ships with Playwright coverage, not "please test in browser" asks.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Solver "Config exists" = `constraintWeightOverride` count > 0 OR `constraintTemplate` per-school count > 0 | Common Pitfalls #5 | Status reports "fehlt" for schools with default-only config. Mitigation: make explicit Open Question. |
| A2 | `select.tsx`, `textarea.tsx`, `radio-group.tsx` need lifting too | Common Pitfalls #4 | Ship Phase 16 with the floor-violation still present on dropdowns. Mitigation: 44px Playwright sweep catches it. |
| A3 | `audit.module.ts` is `@Global()` and therefore `AuditService` is implicitly available — but Phase 16 doesn't actually need it (the dashboard reads `AuditEntry` count directly via Prisma) | Pattern 1 | If we DO need a service-layer call (e.g. role-scoped count), DashboardService can inject `AuditService` without importing AuditModule because of `@Global()`. `[VERIFIED: apps/api/src/modules/audit/audit.module.ts:6 — @Global()]` |
| A4 | Cron registration in `DsgvoModule.onModuleInit` is idempotent across multiple imports because NestJS deduplicates module instances by reference | Common Pitfalls #2 | Duplicate cron jobs registered. Mitigation: Approach B (don't import DsgvoModule). |
| A5 | The "audit-log" deep-link from category 10 should point at `/admin/audit-log` (per UI-SPEC § Copywriting Contract row 10) — confirmed verbatim in UI-SPEC table | Code Examples | None — verified. |

## Open Questions (RESOLVED)

1. **What constitutes "Solver-Config existiert"?**
   - **RESOLVED 2026-04-28 (user via /gsd-plan-phase):** Union — `ConstraintTemplate.count ≥ 1` OR `ConstraintWeightOverride.count ≥ 1` per school counts as `unvollständig` (still needs ≥1 successful run for `erledigt`). Matches D-04 "Existenz reicht" — every active customization counts. Captured as **D-23** in CONTEXT.md.
   - Implementation: `(SELECT COUNT(*) FROM constraint_weight_override WHERE school_id = ?) + (SELECT COUNT(*) FROM constraint_template WHERE school_id = ?) > 0`.

2. **What's the exact "Wochentage konfiguriert" condition (D-06 row 2 partial-state)?**
   - **RESOLVED:** "configured" = `prisma.schoolDay.count({ where: { schoolId, isActive: true } }) >= 1`. Verified Phase 10.2-02 fix and seed.ts: `SchoolDay` rows are seeded inactive by default; admin must activate at least one weekday for the timegrid to be valid. Captured as **D-24** in CONTEXT.md.

3. **Should `MobileSidebar.tsx` admin-link audit (D-18) include the new Dashboard entry only, or also Phase 13/14/15 entries?**
   - **RESOLVED:** Add three entries: `Dashboard` (NEW, top), `DSGVO-Verwaltung`, `Audit-Log`. Verified missing in `MobileSidebar.tsx:38-151` vs present in `AppSidebar.tsx:175-189` (Phase 15 mobile gap). Plan 03 Task 1 closes the gap.

4. **Should the touch-target lift in `button.tsx` use `min-h-11` (44px floor) or `h-11` (locked 44px)?**
   - **RESOLVED:** `min-h-11 sm:min-h-{original}` — responsive floor that keeps desktop unchanged. Tailwind `cn()` merges via `tailwind-merge` so caller `className` still wins. Plan 04 implements.

5. **Does `<DataList>` need `serverSidePagination` support out-of-box for `audit-log` (Phase 15 surface)?**
   - **RESOLVED:** No. UI-SPEC § Component Inventory keeps pagination ABOVE `<DataList>` (audit-log already owns its cursor-based pagination via `AuditTable.tsx`). `<DataList>` stays a presentation primitive.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API + Web build | ✓ | 24 LTS (per CLAUDE.md) | — |
| pnpm | Package manager | ✓ | 10.x | — |
| PostgreSQL | API DB | ✓ (via docker compose) | 17 | — |
| Redis | BullMQ (untouched by Phase 16) | ✓ | 7 | — |
| Keycloak | Auth (untouched by Phase 16) | ✓ | 26.5 | — |
| Playwright | E2E sweep | ✓ | ^1.59.1 | — |
| Vitest | Unit tests | ✓ | ^4 | — |

**Missing dependencies with no fallback:** None. Phase 16 introduces no new tooling.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend unit/integration | Vitest 4 (configured in `apps/api/`) |
| Frontend unit/component | Vitest 4 + RTL (configured in `apps/web/`) |
| E2E | Playwright 1.59.1 — projects: `desktop` (1280×800), `mobile-375` (iPhone 13), `mobile-chrome` (Pixel 5) |
| Quick run command | `pnpm --filter @schoolflow/api test` (api unit) / `pnpm --filter @schoolflow/web test` (web unit) |
| Full suite command | `pnpm --filter @schoolflow/web test:e2e` (E2E full) / `pnpm -r test` (unit full) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | Admin sees Dashboard with 10-category Setup-Completeness-Checkliste | E2E happy-path + unit | `pnpm --filter @schoolflow/web test:e2e -- admin-dashboard.spec.ts` | ❌ Wave 0 (NEW spec) |
| ADMIN-01 | Backend `GET /admin/dashboard/status` returns DashboardStatusDto with 10 categories | api integration | `pnpm --filter @schoolflow/api test -- dashboard.service.spec` | ❌ Wave 0 (NEW spec) |
| ADMIN-01 | Each of 10 categories computes correct 3-state per D-06 row | api unit (table-driven) | `pnpm --filter @schoolflow/api test -- dashboard.service.spec` | ❌ Wave 0 |
| ADMIN-01 | Login redirect role-aware (admin → /admin, lehrer/schulleitung/eltern/schueler → /timetable) | E2E per role | `pnpm --filter @schoolflow/web test:e2e -- login-redirect.spec.ts` | ❌ Wave 0 (NEW spec) |
| ADMIN-02 | Each Checklist row is a `<Link to={deepLink}>` and click navigates correctly | E2E (per category navigation) | covered in `admin-dashboard.spec.ts` | ❌ Wave 0 |
| ADMIN-03 | Dashboard shows live state without manual reload after admin mutation | E2E | `admin-dashboard.spec.ts` (variant: createTeacher → assert `[data-checklist-status="missing"]` flips to `done` for category teachers, within 5s) | ❌ Wave 0 |
| ADMIN-03 | TanStack Query cross-mutation invalidation wired in every relevant `useMutation` | unit per hook | `pnpm --filter @schoolflow/web test -- useTeachers.test useClasses.test useStudents.test useSubjects.test useSchool.test useTimeGrid.test useSchoolYears.test useDsfa.test useVvz.test useRetention.test useDsgvoExportJob.test useDsgvoDeletionJob.test useConsents.test` | ❌ Wave 0 (mostly NEW or extend existing) |
| MOBILE-ADM-01 | Each admin CRUD table has mobile-card alternative at 375px | E2E `mobile-375` per route | `admin-mobile-sweep.mobile.spec.ts` (asserts no `<table>` visible at 375px on migrated routes; presence of `data-testid="…-mobile-card"` element) | ❌ Wave 0 (NEW spec) |
| MOBILE-ADM-01 | Migrated `<DataList>` uses `getRowTestId` so existing E2E selectors stay green | regression | run existing Phase 11/12/13 mobile specs after migration | ✓ existing |
| MOBILE-ADM-02 | All admin forms work at 375px with 44px touch-targets | E2E `mobile-375` floor sweep | `admin-mobile-sweep.mobile.spec.ts` (44px assertion per route) | ❌ Wave 0 (NEW spec) |
| MOBILE-ADM-02 | `button.tsx` / `input.tsx` / `select.tsx` floor lift verified | unit (DOM assertion via RTL) | `pnpm --filter @schoolflow/web test -- input.test button.test select.test` | ❌ Wave 0 |
| MOBILE-ADM-03 | Admin Dashboard + nav usable at 375px | E2E `mobile-375` | `admin-dashboard.mobile.spec.ts` | ❌ Wave 0 (NEW spec) |
| MOBILE-ADM-03 | MobileSidebar drawer opens + lists all admin entries (incl. new Dashboard, DSGVO, Audit-Log) | E2E | `admin-dashboard.mobile.spec.ts` (open drawer, assert all 10+ admin entries visible) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @schoolflow/api test -- dashboard.service` (api) AND `pnpm --filter @schoolflow/web test -- dashboard ChecklistItem DataList useDashboardStatus` (web unit) — runs in <10s.
- **Per wave merge:** `pnpm -r test` (full unit) + `pnpm --filter @schoolflow/web test:e2e -- admin-dashboard login-redirect admin-mobile-sweep` (target specs).
- **Phase gate:** Full E2E suite (`pnpm --filter @schoolflow/web test:e2e`) green on both `desktop` and `mobile-375` projects, no regressions in Phase 10–15 specs after `<DataList>` migration. UAT only after E2E green per `feedback_e2e_first_no_uat.md`.

### Wave 0 Gaps

- [ ] `apps/api/src/modules/dashboard/dashboard.module.ts` — module skeleton
- [ ] `apps/api/src/modules/dashboard/dashboard.controller.ts` + `dashboard.service.ts` + `dashboard.service.spec.ts` (table-driven 10-category test)
- [ ] `apps/api/src/modules/dashboard/dto/dashboard-status.dto.ts`
- [ ] `apps/api/src/app.module.ts` — register `DashboardModule`
- [ ] `apps/web/src/hooks/useDashboardStatus.ts` (+ `useDashboardStatus.test.ts` covering refetchInterval/staleTime config)
- [ ] `apps/web/src/hooks/useIsMobile.ts` (+ rendering-test smoke)
- [ ] `apps/web/src/components/admin/dashboard/ChecklistItem.tsx` + `.test.tsx`
- [ ] `apps/web/src/components/admin/dashboard/DashboardChecklist.tsx` + `.test.tsx`
- [ ] `apps/web/src/components/shared/DataList.tsx` + `.test.tsx`
- [ ] `apps/web/src/routes/_authenticated/admin/index.tsx` (NEW route)
- [ ] `apps/web/src/routes/index.tsx` (REPLACE — role-aware redirect)
- [ ] `apps/web/e2e/admin-dashboard.spec.ts` (desktop)
- [ ] `apps/web/e2e/admin-dashboard.mobile.spec.ts` (375px)
- [ ] `apps/web/e2e/login-redirect.spec.ts` (per role)
- [ ] `apps/web/e2e/admin-mobile-sweep.mobile.spec.ts` (16-route sweep — audit gate per D-16)
- [ ] Existing mutation hooks — extend `onSuccess` to invalidate `['dashboard-status']` in: `useTeachers`, `useClasses`, `useStudents`, `useSubjects`, `useSchool`, `useTimeGrid`, `useSchoolYears` (+ Holiday/AutonomousDay), `useDsfa`, `useVvz`, `useRetention`, `useConsents`, `useDsgvoExportJob`, `useDsgvoDeletionJob`. **Total: ~30 mutation hooks across 13 files.**

*(No framework install needed — Vitest + Playwright already configured.)*

## Security Domain

`security_enforcement` is implicitly enabled (no explicit `false` in config). Phase 16 adds one new endpoint and one new sidebar entry — both admin-only. Other surfaces unchanged.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes (carry-forward) | Keycloak JWT verified by `JwtAuthGuard` (global APP_GUARD) — `apps/api/src/modules/auth/guards/jwt-auth.guard.ts:7`. New endpoint inherits global guard. |
| V3 Session Management | yes (carry-forward) | Keycloak session — no new sessions created in Phase 16. |
| V4 Access Control | yes (NEW endpoint) | `@CheckPermissions({ action: 'manage', subject: 'all' })` on `DashboardController.getStatus` — admin-only. Plus per-route admin gate in TanStack Router (`/admin/index.tsx` shadows the same isAdmin check that `solver-tuning.tsx` uses). |
| V5 Input Validation | yes (NEW endpoint) | `class-validator` on `?schoolId` query — `@IsUUID()` (carry-forward Phase 1 pattern). Existing `ValidationPipe` global per `app.module.ts`. |
| V6 Cryptography | no | No crypto in Phase 16. Tokens flow via existing Keycloak. |
| V7 Error Handling & Logging | yes (carry-forward) | RFC-9457 problem+json via existing `ProblemDetailFilter`. AuditInterceptor captures every mutation (sensitive read of dashboard status is NOT a SENSITIVE_READ — it's aggregated counts only, no PII). |
| V8 Data Protection | yes (DSGVO domain) | Dashboard returns counts only — no PII. AuditEntry count is opaque. No DSGVO consent needed for aggregated read. |
| V9 Communications | yes (carry-forward) | HTTPS enforced via existing reverse proxy. |
| V11 Business Logic | yes | Status heuristic per D-06 must match exactly — discrepancy could mislead admin into thinking setup is complete when it isn't. Unit tests pin every state transition. |
| V13 API & Web Service | yes (NEW endpoint) | OpenAPI/Swagger annotations (`@ApiTags('admin-dashboard')` etc.) — carry-forward Phase 14/15 pattern. |
| V14 Configuration | no | No new config keys. |

### Known Threat Patterns for `NestJS + Prisma + TanStack`

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant `?schoolId=` parameter manipulation (admin queries another school's status) | Information Disclosure | Validate that `schoolId` matches the admin's school context. Codebase has tenant-leak history (see MEMORY: `useTeachers tenant_leak`, `subject_tenant_leak`). Use `where: { schoolId, ... }` consistently — already what dashboard.service does. ALSO: server-side, derive `schoolId` from auth context if a single-school admin is the model. **Recommendation: add Wave 0 spec — admin from school A queries `?schoolId=B` → 403 (or 404).** |
| Frontend `/admin` route accessible by direct URL navigation despite role | Elevation of Privilege | TanStack Router `beforeLoad` admin gate on the `_authenticated/admin/index.tsx` route. Same pattern as `solver-tuning.tsx:35-51`. |
| Polling burst on tab focus + many tabs causing API DoS | Denial of Service | `staleTime: 10_000` deduplicates within window; `refetchInterval: 30_000` is per-tab so worst case 4-tab admin = 1 request / 7.5s. Acceptable. |
| Stale `[dashboard-status]` cache shows wrong setup state across log-in/log-out | Spoofing / Tampering | TanStack Query `clearQueries` on logout — verify in existing `logout()` handler (or carry-forward auto-clear via `keycloak.logout` reload). |
| `<DataList>` rendering arbitrary HTML in `mobileCard` slot allowing XSS | Tampering | The slot accepts `ReactNode` — React escapes by default. Risk only if a user passes `dangerouslySetInnerHTML` — none of the migrated surfaces do. |

## Project Constraints (from CLAUDE.md)

Extracted directives that bind this phase:

1. **Database migrations hard rule:** No `prisma db push`. If Phase 16 ever introduces a new Prisma model (D-22 envisages a possible cached dashboard-status table), it MUST ship as `prisma migrate dev --name <descriptive>` with the migration folder committed. **Phase 16 plan as drafted has no schema change — verify in plan-check.**
2. **Pattern guardrail:** All Phase 16 work must go through GSD workflow (this RESEARCH document is part of `/gsd:execute-phase` flow).
3. **Stack constraints (Recommended Stack):**
   - TanStack Query for server state — Phase 16 uses it (D-08, D-09).
   - shadcn/ui + Radix — Phase 16 uses existing primitives only (UI-SPEC § Registry Safety).
   - NestJS modular — Phase 16 adds `DashboardModule`.
   - PostgreSQL + Prisma 7 — Phase 16 reads only.
   - No SSR — Phase 16 is SPA-only client routing.
4. **DSGVO from Day 1:** Dashboard returns aggregated counts only — no PII. No new DSGVO surface. Carry-forward consent flows.
5. **Mobile parity from Day 1:** This phase IS the milestone-closing mobile parity sweep.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Neue Route `apps/web/src/routes/_authenticated/admin/index.tsx` als Admin-Dashboard. Sidebar bekommt einen neuen admin-only Eintrag „Dashboard" als oberste Position der admin-Gruppe.

**D-02:** `apps/web/src/routes/index.tsx` wird role-aware: `beforeLoad` prüft Auth-Rolle und redirected `admin` nach `/admin`, alle anderen Rollen wie bisher nach `/timetable`. Keine Breaking-Change für non-admin-User.

**D-03:** 3-State-Heuristik pro Kategorie (`erledigt` / `unvollständig` / `fehlt`).

**D-04:** Permissive Schwellwerte für count-basierte Kategorien: Existenz reicht (`count ≥ 1`). Ausnahme: Solver (D-05).

**D-05:** Solver-Kategorie strikt: `erledigt` erst wenn ≥1 Solver-Konfiguration existiert UND ≥1 erfolgreich generierter Stundenplan vorliegt.

**D-06:** Status-Regeln pro Kategorie wie in CONTEXT.md Tabelle (Reihenfolge = Setup-Reihenfolge im Dashboard, 10 Kategorien).

**D-07:** Hybrid-Pattern: gemeinsamer QueryKey `['dashboard-status']`. Sub-Surface-Mutations rufen `queryClient.invalidateQueries({ queryKey: ['dashboard-status'] })` auf.

**D-08:** `refetchInterval: 30_000` als Backup.

**D-09:** `staleTime: 10_000` für die Dashboard-Query.

**D-10:** Backend liefert genau einen aggregierten Endpoint `GET /admin/dashboard/status`.

**D-11:** Socket.IO-Broadcast OUT-OF-SCOPE für Phase 16.

**D-12:** Geteiltes `<DataList>`-Component mit `columns`-Schema und `mobileCard`-Render-Prop.

**D-13:** `useIsMobile()` Hook nach `apps/web/src/hooks/useIsMobile.ts` extrahieren, 640px-Default behalten.

**D-14:** `data-*` E2E-Selektoren standardisiert in DataList-Component.

**D-15:** Migration aller bestehenden Admin-Tabellen sequentiell auf `<DataList>`.

**D-16:** Audit-First-Ansatz: Playwright-Mobile-Viewport-Sweep (375px) als initialer Audit-Schritt.

**D-17:** Globale Touch-Target-Härtung: shadcn/ui Input-/Button-Defaults auf `min-h-11` (44px) heben.

**D-18:** `MobileSidebar.tsx` verifizieren bei 375px + fehlende Admin-Links ergänzen.

**D-19:** TanStack Query Mutation-onError → `toast.error` (Phase 10.2-04 invariant carry-forward).

**D-20:** Sidebar-Eintrag admin-only via `roles: ['admin']`.

**D-21:** Tab-Routing falls benötigt: `useState` + `Route.useSearch()`-Pattern.

**D-22:** Migrations-Hard-Rule: keine `prisma db push`. Falls neue Backend-Models nötig → echte `prisma migrate dev`.

### Claude's Discretion

- Konkretes Card-Style-Design der Dashboard-Einträge (Linear-style Card vs shadcn-Card vs custom)
- Status-Badge-Farben (Vorschlag: erledigt=green, unvollständig=amber, fehlt=red — wird im UI-Phase finalisiert) — **NOTE: bereits in UI-SPEC fixiert.**
- Lucide-Icon pro Kategorie (z.B. `School`, `Calendar`, `Users`, `BookOpen`, ...) — **NOTE: bereits in UI-SPEC fixiert.**
- DataList-Sort-Implementation (client-side für kleine Listen, server-side für audit-log/students)
- Empty-State-Design pro Surface
- DataList-Pagination-Strategy (cursor vs offset — abhängig vom existing endpoint)
- Welcher Tab im Dashboard initial selected ist (falls überhaupt Tabs benötigt werden — vermutlich nicht, ist eine Single-Page)
- Aggregations-Implementierung im Backend `dashboard.service.ts` (parallel queries via `Promise.all` vs sequential — Performance-Detail) — **Recommendation in this research: `Promise.all`.**

### Deferred Ideas (OUT OF SCOPE)

- **Dashboard-Notification-Center** (z.B. „3 neue Audit-Einträge seit letztem Login")
- **Quick-Actions-Buttons im Dashboard** (z.B. „Neuen Lehrer anlegen" direkt vom Dashboard)
- **Customizable Dashboard** (Reihenfolge anpassen / Kategorien ausblenden)
- **Multi-School-Aggregation**
- **Dashboard-Widgets für Schulleitung-Rolle**
- **Strikte Mindest-Counts pro Kategorie**
- **Socket.IO Live-Push für Dashboard**

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | Admin sieht Dashboard mit Setup-Completeness-Checkliste für Schulstammdaten, Zeitraster, Schuljahr, Fächer, Lehrer, Klassen, Schüler und Solver-Konfiguration | Pattern 1 (DashboardModule), Code Example 1 (DashboardService aggregating 10 categories), D-06 status-rule table verified against schema; DTO shape locked in Code Example 1 |
| ADMIN-02 | Admin navigiert vom Dashboard aus direkt zu jeder offenen Setup-Aufgabe (Deep-Link) | UI-SPEC § Component Inventory § ChecklistItem locks `to` prop and per-category deep-links incl. `?tab=` search params; whole row is `<Link>` per UI-SPEC |
| ADMIN-03 | Dashboard zeigt Live-Zustand pro Eintrag, aktualisiert sich ohne Reload nach jeder Admin-Aktion | Pattern 2 (cross-mutation invalidation) + D-08/D-09 polling backup; full mutation-hook fan-out list in Wave 0 Gaps |
| MOBILE-ADM-01 | Alle Admin-CRUD-Tabellen haben mobile-taugliche Karten-/Listen-Alternative bei 375px | Pattern 4 (`<DataList>` dual-render) + Migration order recommendation in Summary (zero-mode surfaces first); E2E sweep covers verification |
| MOBILE-ADM-02 | Alle Admin-Formulare funktionieren bei 375px mit 44px-Touch-Targets | D-17 global lift on primitive layer (`button.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx` audit per Pitfall 4); Code Example 5 enforces via Playwright sweep |
| MOBILE-ADM-03 | Admin-Dashboard und Navigation funktionieren bei 375px | D-18 MobileSidebar audit (Open Question 3 surfaces specific gaps: missing DSGVO + Audit-Log entries); E2E covers nav drawer flow |

## Sources

### Primary (HIGH confidence — codebase reads)

- `apps/web/src/routes/index.tsx` — current redirect (all-roles → /timetable)
- `apps/web/src/routes/_authenticated.tsx` — `beforeLoad` keycloak pattern
- `apps/web/src/routes/__root.tsx:20-32` — `useIsMobile` source
- `apps/web/src/components/layout/AppSidebar.tsx` — Phase 15 carry-forward sidebar (DSGVO + Audit-Log entries)
- `apps/web/src/components/layout/MobileSidebar.tsx` — Phase 14 frozen state (missing DSGVO + Audit-Log + Phase 16 dashboard)
- `apps/web/src/components/ui/{button,input,select,textarea}.tsx` — primitive heights for D-17 audit
- `apps/web/src/components/admin/{teacher,student,class,subject}/*MobileCards.tsx` + `*Table.tsx` — existing dual-component pattern
- `apps/web/src/components/admin/{audit-log,dsgvo,solver-tuning}/*.tsx` — surfaces with NO mobile alternative today
- `apps/web/src/hooks/{useTeachers,useClasses,useStudents,useSubjects,useSchool,useTimeGrid,useSchoolYears,useDsfa,useVvz,useRetention,useConsents,useDsgvoExportJob,useDsgvoDeletionJob}.ts` — mutation hook fan-out
- `apps/web/src/hooks/useImport.ts:127-141` — polling reference template
- `apps/web/e2e/admin-school-settings.mobile.spec.ts` — 44px-floor sweep template
- `apps/api/src/app.module.ts` — module registration pattern
- `apps/api/src/modules/{school,teacher,class,student,subject,audit,dsgvo}/*.module.ts` + `*.service.ts` — exports + Prisma read patterns
- `apps/api/prisma/schema.prisma` — model shapes for status heuristics (TimeGrid, Period, SchoolDay, SchoolYear, TimetableRun + SolveStatus, RetentionPolicy, DsfaEntry, VvzEntry, AuditEntry)
- `apps/api/src/modules/auth/decorators/check-permissions.decorator.ts` + guards — admin-only enforcement
- `apps/web/playwright.config.ts` — `mobile-375` + `mobile-chrome` projects already configured
- `.planning/phases/14-solver-tuning/14-CONTEXT.md`, `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md` — carry-forward decisions

### Primary (HIGH confidence — project artifacts)

- `.planning/phases/16-admin-dashboard-mobile-h-rtung/16-CONTEXT.md` — D-01..D-22 locked
- `.planning/phases/16-admin-dashboard-mobile-h-rtung/16-UI-SPEC.md` — design contract, color/typography/spacing tokens, copy verbatim
- `.planning/REQUIREMENTS.md` — ADMIN-01/02/03 + MOBILE-ADM-01/02/03 acceptance criteria
- `.planning/ROADMAP.md` (lines 331-351) — Phase 16 success criteria
- `CLAUDE.md` — stack pin, migration hard rule, GSD workflow
- `apps/api/prisma/README.md` — migration policy
- `feedback_e2e_first_no_uat.md` (memory) — E2E-First constraint binding this phase

### Secondary (MEDIUM confidence — verified by inspection but not via official docs)

- TanStack Router `beforeLoad` async behavior — verified by `_authenticated.tsx:10` doing `await keycloak.login()`
- NestJS module-deduplication-by-reference — verified by absence of duplicate cron logs in current `DsgvoModule` boot

### Tertiary (LOW confidence — flagged in Open Questions, need user confirmation)

- Solver "Config exists" definition (Open Question 1)
- Wochentage default state for partial-state evaluation (Open Question 2)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against `package.json` for both apps; no new deps proposed.
- Architecture (DashboardModule, beforeLoad redirect, DataList): HIGH — every pattern verified against an existing codebase reference.
- Pitfalls: HIGH (#1 race), HIGH (#2 DI), HIGH (#3 testid), HIGH (#4 select.tsx audit verified), MEDIUM (#5 Solver semantics — gated by Open Question 1), MEDIUM (#6 Address heuristic), HIGH (#7 desktop regression).
- Validation Architecture: HIGH — Playwright + Vitest already configured; existing `mobile-375` project + 44px-floor template directly reusable.
- Security: HIGH — admin-only gating via existing `@CheckPermissions` decorator pattern; DSGVO review confirms aggregated-counts is non-PII.

**Research date:** 2026-04-28
**Valid until:** 2026-05-12 (14 days — codebase Phase 15 freshly merged; carry-forward patterns are stable)

## RESEARCH COMPLETE

**Phase:** 16 — Admin-Dashboard & Mobile-Härtung
**Confidence:** HIGH

### Key Findings
- Dashboard backend is a thin `DashboardModule` injecting `PrismaService` directly + `SchoolService` for address normalization — no new schema, ~10 parallel `Promise.all` reads.
- `index.tsx` `beforeLoad` MUST read `keycloak` instance directly (NOT `useAuth()`) and mirror the `_authenticated.tsx:10` await-login pattern to avoid token-refresh races.
- Mobile-card landscape today is two-tier: Phase 11/12/13 ship dual `Table+MobileCards` components (migrate by collapse), Phase 14/15 ship NO mobile alternative (migrate by addition). Migration order: zero-mode surfaces first.
- Touch-target lift (D-17) needs 4 file edits — `button.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx` (CONTEXT specifics missed `select.tsx`'s `h-10`).
- Cross-mutation invalidation surface is ~30 mutation hooks across 13 files; each needs ONE line `qc.invalidateQueries({ queryKey: ['dashboard-status'] })` added to `onSuccess`.
- `MobileSidebar.tsx` is missing Phase 15 entries (DSGVO + Audit-Log) — Open Question 3 confirms this is a hidden Phase 15 mobile gap that surfaces during Phase 16 D-18 audit.

### File Created
`.planning/phases/16-admin-dashboard-mobile-h-rtung/16-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All deps already in package.json; no version changes proposed. |
| Architecture | HIGH | Every pattern verified against an existing codebase reference (school.module.ts, _authenticated.tsx, useImport.ts, AppSidebar.tsx). |
| Pitfalls | HIGH | All 7 pitfalls verified against either schema, codebase grep, or framework convention. |
| Validation Architecture | HIGH | Playwright projects + Vitest setups already exist; specs to add are NEW files but follow established templates. |

### Open Questions
1. Solver "Config exists" semantic (constraint_template + constraint_weight_override union? overlap?)
2. Wochentage default-active-state for partial-state status evaluation
3. Should D-18 MobileSidebar audit explicitly include adding the missing Phase 15 entries (DSGVO + Audit-Log) — verified missing in this research; planner to budget the task.

### Ready for Planning
Research complete. Planner can now create PLAN.md files for Phase 16. The plan should be 5–7 plans (rough sketch): (P1) DashboardModule backend + DTO + tests, (P2) Frontend foundation — `useIsMobile` extract + `useDashboardStatus` + `<DataList>` + `<ChecklistItem>` + sidebar additions + role-aware redirect, (P3) Touch-target lift on 4 primitive files + global mobile sweep audit gate, (P4) `<DataList>` migration wave A — Phase 14/15 zero-mode surfaces, (P5) `<DataList>` migration wave B — Phase 11/12/13 collapse dual-component, (P6) Mutation-hook invalidation fan-out (~30 sites), (P7) E2E coverage closure (admin-dashboard, login-redirect, mobile sweep) + UAT screenshots gate.
