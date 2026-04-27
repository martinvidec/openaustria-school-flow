---
phase: 15
plan: 05
type: execute
wave: 2
depends_on: [15-03]
files_modified:
  - apps/web/src/routes/_authenticated/admin/dsgvo.tsx
  - apps/web/src/routes/_authenticated/admin/audit-log.tsx
  - apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
  - apps/web/src/components/layout/AppSidebar.tsx
  - apps/web/src/hooks/useConsents.ts
  - apps/web/src/hooks/useRetention.ts
  - apps/web/src/hooks/useDsfa.ts
  - apps/web/src/hooks/useVvz.ts
autonomous: true
requirements_addressed:
  - DSGVO-ADM-01
  - DSGVO-ADM-02
  - DSGVO-ADM-03
  - DSGVO-ADM-04
tags: [phase-15, frontend, foundation, routing, sidebar, hooks]

must_haves:
  truths:
    - "Two new admin-only sidebar entries exist under the `Zugriff & Berechtigungen` group: `DSGVO-Verwaltung` (icon ShieldCheck) and `Audit-Log` (icon ScrollText), in that order, both with `roles: ['admin']`"
    - "`/admin/dsgvo` renders a 4-tab shell `DsgvoTabs.tsx` with deep-link via `?tab=consents|retention|dsfa-vvz|jobs` (default `consents`); selecting a tab updates the URL via `navigate({ search })` so back/forward + copy-paste deep-links work"
    - "Sub-tab inside `dsfa-vvz` deep-links via `?tab=dsfa-vvz&sub=dsfa|vvz` (default `dsfa`)"
    - "`/admin/audit-log` renders a `PageShell` with the `Audit-Log` title and description (per UI-SPEC § Page titles); the actual filter/table comes in plan 15-09"
    - "Both routes enforce admin gate at the route component level (defense-in-depth alongside the sidebar `roles: ['admin']`) — non-admin direct URL hit shows a `nicht autorisiert` PageShell, mirroring `solver-tuning.tsx`"
    - "`useConsents`, `useRetention`, `useDsfa`, `useVvz` hooks each export: a list query (`useXxxList(filters)` or analogous), a create mutation (where applicable), an update mutation, a delete mutation; each mutation has explicit `onError → toast.error(...)` per the Phase 10.2-04 invariant (D-20)"
    - "Each hook's mutation calls `queryClient.invalidateQueries({ queryKey: [...] })` on success so list re-renders without manual refetch"
    - "No business logic lives in the hook files — they are thin TanStack Query wrappers around `apiFetch` with the typed DTOs"
  artifacts:
    - path: apps/web/src/routes/_authenticated/admin/dsgvo.tsx
      provides: "TanStack Router route with validateSearch Zod schema (tab + sub) + admin gate + DsgvoTabs render"
      contains: "createFileRoute('/_authenticated/admin/dsgvo')"
    - path: apps/web/src/routes/_authenticated/admin/audit-log.tsx
      provides: "TanStack Router route with validateSearch (placeholder for plan 15-09 — accepts startDate/endDate/action/resource/userId/category/page) + admin gate"
      contains: "createFileRoute('/_authenticated/admin/audit-log')"
    - path: apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
      provides: "Tabs/ToggleGroup shell + tab-state with URL sync via navigate({ search })"
      contains: "DsgvoTabs"
    - path: apps/web/src/components/layout/AppSidebar.tsx
      provides: "Two new admin entries appended to the Zugriff & Berechtigungen group"
      contains: "DSGVO-Verwaltung"
    - path: apps/web/src/hooks/useConsents.ts
      provides: "useConsentsAdmin(filters) query + grant/withdraw mutations (existing endpoints) + invalidation keys"
      contains: "useConsentsAdmin"
    - path: apps/web/src/hooks/useRetention.ts
      provides: "useRetentionPolicies query + create/update/delete mutations"
      contains: "useRetentionPolicies"
    - path: apps/web/src/hooks/useDsfa.ts
      provides: "useDsfaEntries query + create/update/delete mutations"
      contains: "useDsfaEntries"
    - path: apps/web/src/hooks/useVvz.ts
      provides: "useVvzEntries query + create/update/delete mutations"
      contains: "useVvzEntries"
  key_links:
    - from: apps/web/src/routes/_authenticated/admin/dsgvo.tsx
      to: apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
      via: "<DsgvoTabs schoolId={schoolId} initialTab={tab} initialSub={sub} />"
      pattern: "<DsgvoTabs"
    - from: apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx
      to: "@tanstack/react-router useNavigate"
      via: "navigate({ to: '/admin/dsgvo', search: { tab: next, ...(next === 'dsfa-vvz' ? { sub } : {}) } })"
      pattern: "navigate\\(\\{ to: '/admin/dsgvo'"
    - from: apps/web/src/hooks/useConsents.ts
      to: apps/api/src/modules/dsgvo/consent/consent.controller.ts
      via: "apiFetch('/api/v1/dsgvo/consent/admin?…') — depends on plan 15-03 shipping the route"
      pattern: "/api/v1/dsgvo/consent/admin"
---

<objective>
Stand up the routing + tab-shell + sidebar + 4 CRUD hooks that the rest of the Phase 15 frontend (plans 15-06/07/08/09) consumes. This plan ships ZERO user-visible CRUD UI for DSGVO entities — the tabs render placeholder panels that say "Wird in Plan 15-NN ausgeliefert" so the route can be merged independently and the downstream plans can wire each tab without rebasing on a moving target.

Purpose:
- D-01/D-02/D-03 + D-22 + D-26 from CONTEXT.md require: two admin-only sidebar entries, two new routes, a 4-tab shell with deep-linking via `?tab=` (default `consents`), nested sub-tab `?sub=` for DSFA/VVZ, and a route-level admin gate.
- The four CRUD hook files (`useConsents`, `useRetention`, `useDsfa`, `useVvz`) are foundation: every downstream tab plan imports a query and mutations from them. Building them in 15-05 (parallel-safe with 15-04 backend) avoids a serialization point where 15-06/07/08 each block on a different hook file landing.
- Pulling sidebar + routes + hooks into a single foundation plan matches the Phase 14 pattern (14-02 frontend plan owned the SolverTuningTabs shell + the four-tab placeholders, then 14-02 → 14-02b expanded into wiring).
- Depends on plan 15-03 (consent admin filter endpoint) so `useConsentsAdmin` can target the real endpoint rather than mocking it. Does NOT depend on 15-04 because the JobsTab hook ships in plan 15-08 alongside the polling hooks.

Output: 8 new/edited files. The merged plan boots `/admin/dsgvo` and `/admin/audit-log` for an admin user, both routes show their PageShell + admin gate, the DSGVO tabs deep-link via URL search-params, and downstream plans 15-06/07/08/09 import from the 4 hook files without further hook changes.
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
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md
@CLAUDE.md

<interfaces>
<!-- Authoritative current shape of touched files. Executor uses these directly — no codebase exploration needed. -->

From `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` (REFERENCE — the exact pattern to mirror for both new routes):
```typescript
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { SolverTuningTabs } from '@/components/admin/solver-tuning/SolverTuningTabs';
import { useSchoolContext } from '@/stores/school-context-store';
import { useAuth } from '@/hooks/useAuth';

const TabSearchSchema = z.object({
  tab: z.enum(['constraints', 'weights', 'restrictions', 'preferences']).optional(),
});

export const Route = createFileRoute('/_authenticated/admin/solver-tuning')({
  validateSearch: TabSearchSchema,
  component: SolverTuningPage,
});

function SolverTuningPage() {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const { user } = useAuth();
  const { tab } = Route.useSearch();
  const isAdmin = (user?.roles ?? []).includes('admin');
  if (!isAdmin) { return (<PageShell breadcrumbs={[…]}>nicht autorisiert</PageShell>); }
  return (<PageShell …><SolverTuningTabs schoolId={schoolId} initialTab={tab} /></PageShell>);
}
```

From `apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx` (TAB-STATE reference — but Phase 14 chose `useState` initialised from `Route.useSearch()` instead of writing back to URL — Phase 15 D-04+D-26 ADD URL writeback so deep-linking + back-button work):
```typescript
const [active, setActive] = useState<SolverTuningTabValue>(safeInitial);
// no navigate({ search }) writeback in Phase 14 — Phase 15 ADDS it
```

From `apps/web/src/components/layout/AppSidebar.tsx` (lines 159-172 — the END of the navItems array, where the new entries APPEND):
```typescript
  {
    label: 'Schüler:innen',
    href: '/admin/students',
    icon: UsersRound,
    roles: ['admin', 'schulleitung'],
    group: 'Personal & Fächer',
  },
  // Phase 13-02 USER-01: Zugriff & Berechtigungen group (admin only).
  {
    label: 'User',
    href: '/admin/users',
    icon: UserCircle,
    roles: ['admin'],
    group: 'Zugriff & Berechtigungen',
  },
  // <-- Phase 15 entries appended here
];
```

From `apps/web/src/hooks/useImport.ts` lines 127-141 (POLLING REFERENCE — used by plan 15-08, NOT this plan; included so foundation hooks share a key-builder convention):
```typescript
export const importKeys = {
  all: ['imports'] as const,
  schools: () => [...importKeys.all, 'schools'] as const,
  school: (schoolId: string) => [...importKeys.schools(), schoolId] as const,
  jobs: (schoolId: string) => [...importKeys.school(schoolId), 'jobs'] as const,
  job: (schoolId: string, jobId: string) => [...importKeys.jobs(schoolId), jobId] as const,
};
```

From `apps/web/src/hooks/useClasses.ts` lines 1-12 (HOOK CONVENTION — apiFetch + sonner toast + invalidate — every Phase 15 hook follows this skeleton):
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add two admin-only sidebar entries (DSGVO-Verwaltung + Audit-Log)</name>
  <read_first>
    - apps/web/src/components/layout/AppSidebar.tsx (lines 1-180 — current shape)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Page titles + sidebar — exact German labels + icons)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-22)
  </read_first>
  <behavior>
    - Two new entries appended to the `navItems` array AFTER the existing `User` entry (the last item today, line 165-172)
    - Both entries: `roles: ['admin']`, `group: 'Zugriff & Berechtigungen'`
    - Order: `DSGVO-Verwaltung` FIRST, `Audit-Log` SECOND (per UI-SPEC ordering convention)
    - Icons imported from `lucide-react`: `ShieldCheck` for DSGVO, `ScrollText` for Audit-Log
    - Existing entries unchanged (no reordering, no group renaming, no icon swaps)
    - Schulleitung viewing the sidebar does NOT see either new entry (existing `hasAccess(userRoles, itemRoles)` predicate already handles this — verify in the test)
  </behavior>
  <action>
    Step 1: Edit `apps/web/src/components/layout/AppSidebar.tsx`:
    - Add `ShieldCheck, ScrollText,` to the lucide-react import block at the top of the file (alphabetic insertion: between `School,` and `SlidersHorizontal,` — verify the existing block).
    - Append after the existing `User` entry (line 165-172) but BEFORE the closing `];` of `navItems`:
    ```typescript
      // Phase 15 — DSGVO admin surfaces (D-22).
      {
        label: 'DSGVO-Verwaltung',
        href: '/admin/dsgvo',
        icon: ShieldCheck,
        roles: ['admin'],
        group: 'Zugriff & Berechtigungen',
      },
      {
        label: 'Audit-Log',
        href: '/admin/audit-log',
        icon: ScrollText,
        roles: ['admin'],
        group: 'Zugriff & Berechtigungen',
      },
    ```

    Step 2: Run typecheck:
    ```bash
    pnpm --filter @schoolflow/web typecheck
    ```

    DO NOT: Place the entries in a different group. DO NOT: Use `roles: 'all'` or any non-admin role. DO NOT: Reorder existing entries.
  </action>
  <verify>
    <automated>grep -q "DSGVO-Verwaltung" apps/web/src/components/layout/AppSidebar.tsx &amp;&amp; grep -q "Audit-Log" apps/web/src/components/layout/AppSidebar.tsx &amp;&amp; grep -q "ShieldCheck" apps/web/src/components/layout/AppSidebar.tsx &amp;&amp; grep -q "ScrollText" apps/web/src/components/layout/AppSidebar.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "label: 'DSGVO-Verwaltung'" apps/web/src/components/layout/AppSidebar.tsx` returns `1`
    - `grep -c "label: 'Audit-Log'" apps/web/src/components/layout/AppSidebar.tsx` returns `1`
    - `grep -c "href: '/admin/dsgvo'" apps/web/src/components/layout/AppSidebar.tsx` returns `1`
    - `grep -c "href: '/admin/audit-log'" apps/web/src/components/layout/AppSidebar.tsx` returns `1`
    - Both new entries are nested inside the existing `navItems` array (i.e. appear before `];` and after `Zugriff & Berechtigungen` group entries)
    - `grep -c "ShieldCheck\|ScrollText" apps/web/src/components/layout/AppSidebar.tsx` returns at least `4` (2 imports + 2 usages)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The two new admin-only sidebar entries are appended in the correct group; admin users see them, non-admin users do not, typecheck is clean.</done>
</task>

<task type="auto">
  <name>Task 2: Create DsgvoTabs.tsx shell with URL-synced tab + sub-tab state</name>
  <read_first>
    - apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx (PATTERN reference — copy the structure, ADD URL writeback)
    - apps/web/src/components/ui/tabs.tsx (shadcn Tabs primitive shape)
    - apps/web/src/components/ui/toggle-group.tsx (mobile fallback primitive shape)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Tab labels + § Interaction Contracts § Tab deep-linking — exact label strings, default tab, URL value mapping)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-02 + D-04 + D-26)
  </read_first>
  <behavior>
    - File `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` exists, exports `DsgvoTabs` component + `DsgvoTabValue` type
    - `DsgvoTabValue` = `'consents' | 'retention' | 'dsfa-vvz' | 'jobs'` (default `consents`)
    - `DsfaVvzSubValue` = `'dsfa' | 'vvz'` (default `dsfa`)
    - Component props: `{ schoolId: string; initialTab?: DsgvoTabValue; initialSub?: DsfaVvzSubValue }`
    - Renders `<Tabs>` (shadcn) above `md` breakpoint, `<ToggleGroup>` below — matches Phase 14 D-04 mobile carry-forward
    - Tab labels (German, exact): `Einwilligungen`, `Aufbewahrung`, `DSFA & VVZ`, `Jobs`
    - Inside `dsfa-vvz` panel: nested `<Tabs>` with sub-labels `DSFA` and `VVZ`
    - Tab change writes back to URL: `navigate({ to: '/admin/dsgvo', search: (prev) => ({ ...prev, tab: next, ...(next !== 'dsfa-vvz' ? { sub: undefined } : {}) }) })` — keeps `sub` only when on the dsfa-vvz tab
    - Sub-tab change: `navigate({ to: '/admin/dsgvo', search: (prev) => ({ ...prev, tab: 'dsfa-vvz', sub: nextSub }) })`
    - Each panel renders a placeholder text: `"Wird in Plan 15-NN ausgeliefert"` with the actual plan ID (consents → 15-06, retention → 15-06, dsfa-vvz → 15-07, jobs → 15-08) so the integration is visible at runtime
  </behavior>
  <action>
    Step 1: Create directory `apps/web/src/components/admin/dsgvo/`:
    ```bash
    mkdir -p apps/web/src/components/admin/dsgvo
    ```

    Step 2: Create `apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx`:
    ```typescript
    import { useCallback } from 'react';
    import { useNavigate } from '@tanstack/react-router';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

    /**
     * Phase 15-05 foundation: 4-tab shell for /admin/dsgvo.
     *
     * Owns:
     *  - Tab state (URL-synced via Route search-params per D-04 + D-26)
     *  - Sub-tab state for DSFA/VVZ
     *  - Mobile fallback (ToggleGroup below md)
     *
     * Each tab body is a placeholder. Wiring lands in:
     *  - Tab "Einwilligungen" / "Aufbewahrung" → plan 15-06
     *  - Tab "DSFA & VVZ" → plan 15-07
     *  - Tab "Jobs" → plan 15-08
     */

    export type DsgvoTabValue = 'consents' | 'retention' | 'dsfa-vvz' | 'jobs';
    export type DsfaVvzSubValue = 'dsfa' | 'vvz';

    interface Props {
      schoolId: string;
      initialTab?: DsgvoTabValue;
      initialSub?: DsfaVvzSubValue;
    }

    const DEFAULT_TAB: DsgvoTabValue = 'consents';
    const DEFAULT_SUB: DsfaVvzSubValue = 'dsfa';

    export function DsgvoTabs({ schoolId, initialTab, initialSub }: Props) {
      const navigate = useNavigate();
      const active: DsgvoTabValue = initialTab ?? DEFAULT_TAB;
      const sub: DsfaVvzSubValue = initialSub ?? DEFAULT_SUB;

      const setTab = useCallback(
        (next: DsgvoTabValue) => {
          if (next === active) return;
          navigate({
            to: '/admin/dsgvo',
            search: (prev) => ({
              ...prev,
              tab: next,
              ...(next !== 'dsfa-vvz' ? { sub: undefined } : {}),
            }),
          });
        },
        [active, navigate],
      );

      const setSub = useCallback(
        (next: DsfaVvzSubValue) => {
          if (next === sub) return;
          navigate({
            to: '/admin/dsgvo',
            search: (prev) => ({ ...prev, tab: 'dsfa-vvz', sub: next }),
          });
        },
        [sub, navigate],
      );

      return (
        <div className="space-y-6">
          {/* Mobile: ToggleGroup */}
          <div className="md:hidden">
            <ToggleGroup
              type="single"
              value={active}
              onValueChange={(v) => v && setTab(v as DsgvoTabValue)}
              className="w-full"
            >
              <ToggleGroupItem value="consents">Einwilligungen</ToggleGroupItem>
              <ToggleGroupItem value="retention">Aufbewahrung</ToggleGroupItem>
              <ToggleGroupItem value="dsfa-vvz">DSFA &amp; VVZ</ToggleGroupItem>
              <ToggleGroupItem value="jobs">Jobs</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Desktop: Tabs */}
          <Tabs
            value={active}
            onValueChange={(v) => setTab(v as DsgvoTabValue)}
            className="hidden md:block"
          >
            <TabsList>
              <TabsTrigger value="consents">Einwilligungen</TabsTrigger>
              <TabsTrigger value="retention">Aufbewahrung</TabsTrigger>
              <TabsTrigger value="dsfa-vvz">DSFA &amp; VVZ</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
            </TabsList>

            <TabsContent value="consents" className="pt-6">
              <PlaceholderPanel plan="15-06" title="Einwilligungen" schoolId={schoolId} />
            </TabsContent>
            <TabsContent value="retention" className="pt-6">
              <PlaceholderPanel plan="15-06" title="Aufbewahrung" schoolId={schoolId} />
            </TabsContent>
            <TabsContent value="dsfa-vvz" className="pt-6">
              <Tabs
                value={sub}
                onValueChange={(v) => setSub(v as DsfaVvzSubValue)}
              >
                <TabsList>
                  <TabsTrigger value="dsfa">DSFA</TabsTrigger>
                  <TabsTrigger value="vvz">VVZ</TabsTrigger>
                </TabsList>
                <TabsContent value="dsfa" className="pt-4">
                  <PlaceholderPanel plan="15-07" title="DSFA" schoolId={schoolId} />
                </TabsContent>
                <TabsContent value="vvz" className="pt-4">
                  <PlaceholderPanel plan="15-07" title="VVZ" schoolId={schoolId} />
                </TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="jobs" className="pt-6">
              <PlaceholderPanel plan="15-08" title="Jobs" schoolId={schoolId} />
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    function PlaceholderPanel({
      plan,
      title,
      schoolId,
    }: {
      plan: string;
      title: string;
      schoolId: string;
    }) {
      return (
        <div
          data-dsgvo-tab-placeholder={plan}
          className="rounded-md border border-dashed p-8 text-sm text-muted-foreground"
        >
          <p className="font-semibold text-foreground">{title}</p>
          <p>Wird in Plan {plan} ausgeliefert (schoolId: {schoolId.slice(0, 8)}…).</p>
        </div>
      );
    }
    ```

    Step 3: Run typecheck:
    ```bash
    pnpm --filter @schoolflow/web typecheck
    ```

    DO NOT: Use `useState` to mirror the URL — the URL is the single source of truth (D-04 + D-26 precision). DO NOT: Forget the mobile fallback ToggleGroup. DO NOT: Render real tab bodies — placeholders only. DO NOT: Use duplicate object keys or `as any` casts in the setSub body — the canonical form `({ ...prev, tab: 'dsfa-vvz', sub: next })` is what ships.
  </action>
  <verify>
    <automated>test -f apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; grep -q "DsgvoTabValue" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; grep -q "navigate" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; grep -q "Einwilligungen" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; grep -q "Aufbewahrung" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; grep -q "DSFA &amp; VVZ" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; grep -q "ToggleGroup" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` exits `0`
    - `grep -c "export type DsgvoTabValue" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` returns `1`
    - `grep -c "export type DsfaVvzSubValue" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` returns `1`
    - `grep -c "ToggleGroup" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` returns at least `2` (import + usage)
    - `grep -c "Tabs" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` returns at least `2`
    - All four tab labels present: `Einwilligungen`, `Aufbewahrung`, `DSFA & VVZ`, `Jobs`
    - `grep -q "data-dsgvo-tab-placeholder" apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx` exits `0` (E2E selector for plan 15-10 placeholder smoke test)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The DSGVO tabs shell renders four tab placeholders with URL deep-linking, supports the DSFA/VVZ sub-tab via `?sub=`, falls back to ToggleGroup on mobile, and downstream plans 15-06/07/08 can replace each `<PlaceholderPanel>` with the real tab body.</done>
</task>

<task type="auto">
  <name>Task 3: Create /admin/dsgvo route with admin gate + Zod search schema</name>
  <read_first>
    - apps/web/src/routes/_authenticated/admin/solver-tuning.tsx (full file — exact pattern)
    - apps/web/src/components/admin/dsgvo/DsgvoTabs.tsx (Task 2 output)
    - apps/web/src/components/admin/shared/PageShell.tsx (PageShell prop API)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Page titles — exact title + description copy)
  </read_first>
  <behavior>
    - `apps/web/src/routes/_authenticated/admin/dsgvo.tsx` exports a TanStack Router route at path `/_authenticated/admin/dsgvo`
    - `validateSearch` Zod schema accepts `tab` (one of `consents | retention | dsfa-vvz | jobs`, optional) and `sub` (one of `dsfa | vvz`, optional)
    - Route component calls `Route.useSearch()` to read both fields
    - Admin gate: `(user?.roles ?? []).includes('admin')` — non-admin users get a `<PageShell>` showing `nicht autorisiert für DSGVO-Verwaltung` (matches Phase 14 solver-tuning gate copy)
    - Admin path: renders `<PageShell>` with title `DSGVO-Verwaltung` and description `Einwilligungen, Aufbewahrung, DSFA/VVZ und Datenexport-Jobs zentral verwalten.` (UI-SPEC verbatim) wrapping `<DsgvoTabs schoolId={schoolId} initialTab={tab} initialSub={sub} />`
    - Build emits the route into the generated route tree (no manual route-tree.ts edit needed — TanStack Router file-based routing picks it up)
  </behavior>
  <action>
    Step 1: Create `apps/web/src/routes/_authenticated/admin/dsgvo.tsx`:
    ```typescript
    import { createFileRoute } from '@tanstack/react-router';
    import { z } from 'zod';
    import { PageShell } from '@/components/admin/shared/PageShell';
    import { DsgvoTabs } from '@/components/admin/dsgvo/DsgvoTabs';
    import { useSchoolContext } from '@/stores/school-context-store';
    import { useAuth } from '@/hooks/useAuth';

    const DsgvoSearchSchema = z.object({
      tab: z.enum(['consents', 'retention', 'dsfa-vvz', 'jobs']).optional(),
      sub: z.enum(['dsfa', 'vvz']).optional(),
    });

    export const Route = createFileRoute('/_authenticated/admin/dsgvo')({
      validateSearch: DsgvoSearchSchema,
      component: DsgvoPage,
    });

    function DsgvoPage() {
      const schoolId = useSchoolContext((s) => s.schoolId);
      const { user } = useAuth();
      const { tab, sub } = Route.useSearch();
      const isAdmin = (user?.roles ?? []).includes('admin');

      if (!isAdmin) {
        return (
          <PageShell
            breadcrumbs={[
              { label: 'Verwaltung', href: '/admin' },
              { label: 'DSGVO-Verwaltung' },
            ]}
            title="DSGVO-Verwaltung"
          >
            <p className="text-sm text-muted-foreground">
              Du bist für diese Seite nicht autorisiert.
            </p>
          </PageShell>
        );
      }

      return (
        <PageShell
          breadcrumbs={[
            { label: 'Verwaltung', href: '/admin' },
            { label: 'DSGVO-Verwaltung' },
          ]}
          title="DSGVO-Verwaltung"
          description="Einwilligungen, Aufbewahrung, DSFA/VVZ und Datenexport-Jobs zentral verwalten."
        >
          <DsgvoTabs schoolId={schoolId} initialTab={tab} initialSub={sub} />
        </PageShell>
      );
    }
    ```

    Step 2: Run typecheck + the routes generator (TanStack Router). The web app already has a `routes:generate` step in its build — verify `pnpm --filter @schoolflow/web build` regenerates the route tree to include the new file.

    DO NOT: Hard-code admin email checks. DO NOT: Skip the route-level gate (sidebar gate is not enough — direct URL hit must also be blocked). DO NOT: Add the route component to `routeTree.gen.ts` manually.
  </action>
  <verify>
    <automated>test -f apps/web/src/routes/_authenticated/admin/dsgvo.tsx &amp;&amp; grep -q "createFileRoute('/_authenticated/admin/dsgvo')" apps/web/src/routes/_authenticated/admin/dsgvo.tsx &amp;&amp; grep -q "validateSearch" apps/web/src/routes/_authenticated/admin/dsgvo.tsx &amp;&amp; grep -q "DsgvoTabs" apps/web/src/routes/_authenticated/admin/dsgvo.tsx &amp;&amp; grep -q "isAdmin" apps/web/src/routes/_authenticated/admin/dsgvo.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/routes/_authenticated/admin/dsgvo.tsx` exits `0`
    - `grep -q "createFileRoute('/_authenticated/admin/dsgvo')" apps/web/src/routes/_authenticated/admin/dsgvo.tsx` exits `0`
    - `grep -c "z.enum" apps/web/src/routes/_authenticated/admin/dsgvo.tsx` returns at least `2` (tab + sub)
    - `grep -q "isAdmin" apps/web/src/routes/_authenticated/admin/dsgvo.tsx` exits `0`
    - `grep -q "DSGVO-Verwaltung" apps/web/src/routes/_authenticated/admin/dsgvo.tsx` exits `0`
    - `grep -q "Einwilligungen, Aufbewahrung" apps/web/src/routes/_authenticated/admin/dsgvo.tsx` exits `0`
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
    - `pnpm --filter @schoolflow/web build` exits `0` (proves route-tree regeneration is clean)
  </acceptance_criteria>
  <done>An admin user can navigate to `/admin/dsgvo` and see the 4-tab shell; a non-admin sees the `nicht autorisiert` page; deep-linking via `?tab=jobs&sub=vvz` round-trips through the URL.</done>
</task>

<task type="auto">
  <name>Task 4: Create /admin/audit-log route stub with admin gate + Zod search schema</name>
  <read_first>
    - apps/web/src/routes/_authenticated/admin/dsgvo.tsx (Task 3 output — same shape, different content)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Page titles + § Tab deep-linking — search-param shape for audit-log)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-03)
  </read_first>
  <behavior>
    - `apps/web/src/routes/_authenticated/admin/audit-log.tsx` exports a TanStack Router route at path `/_authenticated/admin/audit-log`
    - `validateSearch` Zod schema accepts: `startDate?: string`, `endDate?: string`, `action?: enum`, `resource?: string`, `userId?: string`, `category?: enum`, `page?: number`. (These are placeholders that the actual filter toolbar in plan 15-09 will consume — defining the schema NOW lets the URL deep-link contract land in 15-05 so 15-09 can focus on UI.)
    - Admin gate identical to plan 15-03 / Task 3 above
    - Admin path renders `<PageShell>` with title `Audit-Log` and description `Sämtliche protokollierten Aktionen durchsuchen, einsehen und für DSGVO-Berichte exportieren.` (UI-SPEC verbatim) wrapping a `<div data-audit-log-placeholder="15-09">Wird in Plan 15-09 ausgeliefert</div>` placeholder
  </behavior>
  <action>
    Step 1: Create `apps/web/src/routes/_authenticated/admin/audit-log.tsx`:
    ```typescript
    import { createFileRoute } from '@tanstack/react-router';
    import { z } from 'zod';
    import { PageShell } from '@/components/admin/shared/PageShell';
    import { useAuth } from '@/hooks/useAuth';

    /**
     * Phase 15 — Audit-Log viewer route.
     *
     * Plan 15-05 (this plan) ships only the route shell + admin gate +
     * URL search-param contract. Filter toolbar + table + drawer + JsonTree
     * land in plan 15-09.
     */

    const AuditLogSearchSchema = z.object({
      // YYYY-MM-DD format — native <Input type="date"> emits this and plan 15-09 toolbar consumes it directly.
      // ISO datetime would require a transform before binding to the date input. Verified 2026-04-27.
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      action: z.enum(['create', 'update', 'delete', 'read']).optional(),
      resource: z.string().max(64).optional(),
      userId: z.string().uuid().optional(),
      category: z.enum(['MUTATION', 'SENSITIVE_READ']).optional(),
      page: z.coerce.number().int().min(1).optional(),
    });

    export const Route = createFileRoute('/_authenticated/admin/audit-log')({
      validateSearch: AuditLogSearchSchema,
      component: AuditLogPage,
    });

    function AuditLogPage() {
      const { user } = useAuth();
      const isAdmin = (user?.roles ?? []).includes('admin');

      if (!isAdmin) {
        return (
          <PageShell
            breadcrumbs={[
              { label: 'Verwaltung', href: '/admin' },
              { label: 'Audit-Log' },
            ]}
            title="Audit-Log"
          >
            <p className="text-sm text-muted-foreground">
              Du bist für diese Seite nicht autorisiert.
            </p>
          </PageShell>
        );
      }

      return (
        <PageShell
          breadcrumbs={[
            { label: 'Verwaltung', href: '/admin' },
            { label: 'Audit-Log' },
          ]}
          title="Audit-Log"
          description="Sämtliche protokollierten Aktionen durchsuchen, einsehen und für DSGVO-Berichte exportieren."
        >
          <div
            data-audit-log-placeholder="15-09"
            className="rounded-md border border-dashed p-8 text-sm text-muted-foreground"
          >
            <p className="font-semibold text-foreground">Audit-Log Viewer</p>
            <p>Wird in Plan 15-09 ausgeliefert (Filter-Toolbar, Tabelle, Detail-Drawer, JSON-Baum, CSV-Export-Button).</p>
          </div>
        </PageShell>
      );
    }
    ```

    Step 2: Run typecheck:
    ```bash
    pnpm --filter @schoolflow/web typecheck
    ```

    DO NOT: Implement the filter toolbar or table here — that is plan 15-09. DO NOT: Drop the `data-audit-log-placeholder` attribute (plan 15-09 will replace the div but plan 15-10/11 E2E uses the absence of this attribute as a "real surface mounted" signal).
  </action>
  <verify>
    <automated>test -f apps/web/src/routes/_authenticated/admin/audit-log.tsx &amp;&amp; grep -q "createFileRoute('/_authenticated/admin/audit-log')" apps/web/src/routes/_authenticated/admin/audit-log.tsx &amp;&amp; grep -q "AuditLogSearchSchema" apps/web/src/routes/_authenticated/admin/audit-log.tsx &amp;&amp; grep -q "isAdmin" apps/web/src/routes/_authenticated/admin/audit-log.tsx &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/routes/_authenticated/admin/audit-log.tsx` exits `0`
    - `grep -q "createFileRoute('/_authenticated/admin/audit-log')" apps/web/src/routes/_authenticated/admin/audit-log.tsx` exits `0`
    - `grep -c "z.enum" apps/web/src/routes/_authenticated/admin/audit-log.tsx` returns at least `2` (action + category)
    - `grep -q "isAdmin" apps/web/src/routes/_authenticated/admin/audit-log.tsx` exits `0`
    - `grep -q "data-audit-log-placeholder" apps/web/src/routes/_authenticated/admin/audit-log.tsx` exits `0`
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
    - `pnpm --filter @schoolflow/web build` exits `0`
  </acceptance_criteria>
  <done>The audit-log route boots with an admin gate and a placeholder body; plan 15-09 swaps the placeholder for the real viewer without touching the route shell.</done>
</task>

<task type="auto">
  <name>Task 5: Create useConsents.ts hook (admin filter query + grant/withdraw mutations)</name>
  <read_first>
    - apps/web/src/hooks/useClasses.ts (HOOK CONVENTION reference — apiFetch + sonner toast + invalidation)
    - apps/web/src/hooks/useImport.ts lines 127-141 (key-builder convention)
    - apps/api/src/modules/dsgvo/consent/consent.controller.ts (current routes — POST /, POST /withdraw, GET /person/:personId, GET /school/:schoolId)
    - apps/api/src/modules/dsgvo/consent/dto/create-consent.dto.ts (CreateConsentDto + ProcessingPurpose enum — frontend mirrors this)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-03-consent-admin-filter-PLAN.md (NEW route GET /dsgvo/consent/admin shipped by plan 15-03)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-08 + D-20)
  </read_first>
  <behavior>
    - File `apps/web/src/hooks/useConsents.ts` exists, exports:
      - `consentKeys` query-key builder
      - `useConsentsAdmin(filters: { schoolId, purpose?, status?, personSearch?, page?, limit? })` — `useQuery` against `GET /api/v1/dsgvo/consent/admin?…` (the endpoint shipped by plan 15-03), `enabled: !!schoolId`
      - `useGrantConsent()` — `useMutation` POST `/api/v1/dsgvo/consent` with `onError → toast.error`, `onSuccess → toast.success + invalidateQueries`
      - `useWithdrawConsent()` — `useMutation` POST `/api/v1/dsgvo/consent/withdraw` with the same invariants
    - DTO types defined inline (`ConsentRecordDto`, `ConsentAdminQueryDto`, `GrantConsentDto`, `WithdrawConsentDto`) — match the backend shapes
    - Toast messages German: `Einwilligung erteilt`, `Einwilligung widerrufen`, `Aktion fehlgeschlagen. Bitte erneut versuchen.` (matches UI-SPEC § Error states)
    - No business logic in hook — thin TanStack Query wrappers only
  </behavior>
  <action>
    Step 1: Create `apps/web/src/hooks/useConsents.ts`:
    ```typescript
    import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
    import { toast } from 'sonner';
    import { apiFetch } from '@/lib/api';

    export type ConsentStatus = 'granted' | 'withdrawn' | 'expired';
    /**
     * Mirrors backend Prisma `ProcessingPurpose` enum
     * (apps/api/prisma/schema.prisma:291-299) and
     * `PROCESSING_PURPOSES` const in
     * apps/api/src/modules/dsgvo/consent/dto/create-consent.dto.ts:4-12.
     * Verified by plan-checker 2026-04-27 — DO NOT add NEWSLETTER/KLASSENFOTO/etc.
     * (those were a fictional draft set; real values are German-cased and
     * tied to the school-context use cases STUNDENPLAN/NOTEN/FOTOFREIGABE/etc.)
     */
    export type ProcessingPurpose =
      | 'STUNDENPLANERSTELLUNG'
      | 'KOMMUNIKATION'
      | 'NOTENVERARBEITUNG'
      | 'FOTOFREIGABE'
      | 'KONTAKTDATEN_WEITERGABE'
      | 'LERNPLATTFORM'
      | 'STATISTIK';

    export interface PersonSummaryDto {
      id: string;
      firstName: string;
      lastName: string;
      email?: string | null;
    }

    export interface ConsentRecordDto {
      id: string;
      personId: string;
      purpose: ProcessingPurpose;
      granted: boolean;
      grantedAt?: string | null;
      withdrawnAt?: string | null;
      person?: PersonSummaryDto;
    }

    export interface ConsentAdminQuery {
      schoolId: string;
      purpose?: ProcessingPurpose;
      status?: ConsentStatus;
      personSearch?: string;
      page?: number;
      limit?: number;
    }

    export interface PaginatedConsents {
      data: ConsentRecordDto[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }

    export interface GrantConsentInput {
      personId: string;
      purpose: ProcessingPurpose;
    }

    export interface WithdrawConsentInput {
      personId: string;
      purpose: ProcessingPurpose;
    }

    export const consentKeys = {
      all: ['consents'] as const,
      admin: (q: ConsentAdminQuery) => [...consentKeys.all, 'admin', q] as const,
    };

    function buildQueryString(q: ConsentAdminQuery): string {
      const params = new URLSearchParams();
      params.set('schoolId', q.schoolId);
      if (q.purpose) params.set('purpose', q.purpose);
      if (q.status) params.set('status', q.status);
      if (q.personSearch) params.set('personSearch', q.personSearch);
      if (q.page) params.set('page', String(q.page));
      if (q.limit) params.set('limit', String(q.limit));
      return params.toString();
    }

    export function useConsentsAdmin(filters: ConsentAdminQuery) {
      return useQuery({
        queryKey: consentKeys.admin(filters),
        queryFn: async (): Promise<PaginatedConsents> => {
          const qs = buildQueryString(filters);
          const res = await apiFetch(`/api/v1/dsgvo/consent/admin?${qs}`);
          if (!res.ok) throw new Error('Failed to load consents');
          return res.json();
        },
        enabled: !!filters.schoolId,
        staleTime: 5_000,
      });
    }

    export function useGrantConsent() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (input: GrantConsentInput): Promise<ConsentRecordDto> => {
          const res = await apiFetch(`/api/v1/dsgvo/consent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message ?? 'Einwilligung konnte nicht erteilt werden');
          }
          return res.json();
        },
        onSuccess: () => {
          toast.success('Einwilligung erteilt');
          qc.invalidateQueries({ queryKey: consentKeys.all });
        },
        onError: (e: Error) => {
          toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.');
        },
      });
    }

    export function useWithdrawConsent() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (input: WithdrawConsentInput): Promise<ConsentRecordDto> => {
          const res = await apiFetch(`/api/v1/dsgvo/consent/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message ?? 'Einwilligung konnte nicht widerrufen werden');
          }
          return res.json();
        },
        onSuccess: () => {
          toast.success('Einwilligung widerrufen');
          qc.invalidateQueries({ queryKey: consentKeys.all });
        },
        onError: (e: Error) => {
          toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.');
        },
      });
    }
    ```

    DO NOT: Add `useFindByPerson` or `useFindBySchool` — those existing endpoints stay reachable via `apiFetch` directly when needed (no admin tab consumes them). DO NOT: Bake retry logic into the hook (TanStack Query default is fine).
  </action>
  <verify>
    <automated>test -f apps/web/src/hooks/useConsents.ts &amp;&amp; grep -q "useConsentsAdmin" apps/web/src/hooks/useConsents.ts &amp;&amp; grep -q "useGrantConsent" apps/web/src/hooks/useConsents.ts &amp;&amp; grep -q "useWithdrawConsent" apps/web/src/hooks/useConsents.ts &amp;&amp; grep -q "/api/v1/dsgvo/consent/admin" apps/web/src/hooks/useConsents.ts &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/src/hooks/useConsents.ts` exits `0`
    - All three hook exports present: `useConsentsAdmin`, `useGrantConsent`, `useWithdrawConsent`
    - `grep -c "/api/v1/dsgvo/consent/admin" apps/web/src/hooks/useConsents.ts` returns at least `1`
    - `grep -c "toast.error" apps/web/src/hooks/useConsents.ts` returns at least `2` (one per mutation `onError`)
    - `grep -c "invalidateQueries" apps/web/src/hooks/useConsents.ts` returns at least `2`
    - `grep -q "consentKeys" apps/web/src/hooks/useConsents.ts` exits `0`
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
  </acceptance_criteria>
  <done>The consent hook is wired to the admin filter endpoint shipped in plan 15-03, with mutations honouring the silent-4xx invariant; plan 15-06 imports `useConsentsAdmin` + `useWithdrawConsent` for the ConsentsTab.</done>
</task>

<task type="auto">
  <name>Task 6: Create useRetention.ts, useDsfa.ts, useVvz.ts hooks (full CRUD)</name>
  <read_first>
    - apps/web/src/hooks/useConsents.ts (Task 5 output — sibling pattern)
    - apps/api/src/modules/dsgvo/retention/retention.controller.ts (current routes — POST/GET/PUT/DELETE — PUT not PATCH, plan-checker corrected 2026-04-27)
    - apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts (current routes — DSFA + VVZ co-located here per D-27)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-06 + D-27 + D-20)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md (§ Empty states + § Error states + § Destructive confirmations — toast copy)
  </read_first>
  <behavior>
    - Three new hook files, each exporting:
      - A list query (`useRetentionPolicies(schoolId)`, `useDsfaEntries(schoolId)`, `useVvzEntries(schoolId)`) returning either a paginated envelope or a flat array, matching the backend shape (verify via the controller files)
      - A create mutation (`useCreateXxx`)
      - An update mutation (`useUpdateXxx`)
      - A delete mutation (`useDeleteXxx`) — body-less DELETE per memory `apifetch_bodyless_delete` (no body, no Content-Type)
    - Each mutation has `onError → toast.error(err.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.')`
    - Each mutation has `onSuccess → toast.success(<verb-specific copy>) + qc.invalidateQueries({ queryKey: ...All })`
    - Toast copy: create → `<Entity> angelegt`, update → `<Entity> aktualisiert`, delete → `<Entity> gelöscht` (e.g. `Aufbewahrungsrichtlinie angelegt`)
    - DTO types match the backend (PaginationQueryDto-aware)
    - Hooks DO NOT compose the routes against the wrong base (use `/api/v1/dsgvo/retention`, `/api/v1/dsgvo/dsfa`, `/api/v1/dsgvo/vvz` — verify the actual route paths in the controller files)
  </behavior>
  <action>
    Step 1: Read each controller file to confirm route paths + DTO shapes:
    ```bash
    grep -E "@(Get|Post|Patch|Delete)" apps/api/src/modules/dsgvo/retention/retention.controller.ts
    grep -E "@(Get|Post|Patch|Delete)" apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts
    ```
    Note any divergence from the assumed paths above. If `vvz` routes live at `/api/v1/dsgvo/dsfa/vvz/...` instead of `/api/v1/dsgvo/vvz/...`, follow the actual path. The hook layer should match the live API.

    Step 2: Create `apps/web/src/hooks/useRetention.ts`:
    ```typescript
    import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
    import { toast } from 'sonner';
    import { apiFetch } from '@/lib/api';

    export interface RetentionPolicyDto {
      id: string;
      schoolId: string;
      dataCategory: string;
      retentionDays: number;
      legalBasis?: string | null;
    }

    export interface CreateRetentionPolicyInput {
      schoolId: string;
      dataCategory: string;
      retentionDays: number;
      legalBasis?: string;
    }

    export interface UpdateRetentionPolicyInput {
      id: string;
      retentionDays?: number;
      legalBasis?: string;
    }

    export const retentionKeys = {
      all: ['retention'] as const,
      list: (schoolId: string) => [...retentionKeys.all, schoolId] as const,
    };

    export function useRetentionPolicies(schoolId: string) {
      return useQuery({
        queryKey: retentionKeys.list(schoolId),
        queryFn: async (): Promise<RetentionPolicyDto[]> => {
          const res = await apiFetch(`/api/v1/dsgvo/retention?schoolId=${encodeURIComponent(schoolId)}`);
          if (!res.ok) throw new Error('Failed to load retention policies');
          const json = await res.json();
          return Array.isArray(json) ? json : (json.data ?? []);
        },
        enabled: !!schoolId,
        staleTime: 30_000,
      });
    }

    export function useCreateRetentionPolicy() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (input: CreateRetentionPolicyInput): Promise<RetentionPolicyDto> => {
          const res = await apiFetch(`/api/v1/dsgvo/retention`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message ?? 'Aufbewahrungsrichtlinie konnte nicht angelegt werden');
          }
          return res.json();
        },
        onSuccess: () => {
          toast.success('Aufbewahrungsrichtlinie angelegt');
          qc.invalidateQueries({ queryKey: retentionKeys.all });
        },
        onError: (e: Error) => toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
      });
    }

    export function useUpdateRetentionPolicy() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ id, ...patch }: UpdateRetentionPolicyInput): Promise<RetentionPolicyDto> => {
          // Backend uses PUT (verified at apps/api/src/modules/dsgvo/retention/retention.controller.ts line 30).
          // PATCH would return 405 Method Not Allowed.
          // Body shape per backend: only `{ retentionDays }` is read via @Body('retentionDays').
          const res = await apiFetch(`/api/v1/dsgvo/retention/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ retentionDays: patch.retentionDays }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message ?? 'Aufbewahrungsrichtlinie konnte nicht aktualisiert werden');
          }
          return res.json();
        },
        onSuccess: () => {
          toast.success('Aufbewahrungsrichtlinie aktualisiert');
          qc.invalidateQueries({ queryKey: retentionKeys.all });
        },
        onError: (e: Error) => toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
      });
    }

    export function useDeleteRetentionPolicy() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (id: string): Promise<void> => {
          const res = await apiFetch(`/api/v1/dsgvo/retention/${id}`, { method: 'DELETE' });
          if (!res.ok && res.status !== 204) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message ?? 'Aufbewahrungsrichtlinie konnte nicht gelöscht werden');
          }
        },
        onSuccess: () => {
          toast.success('Aufbewahrungsrichtlinie gelöscht');
          qc.invalidateQueries({ queryKey: retentionKeys.all });
        },
        onError: (e: Error) => toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
      });
    }
    ```

    Step 3: Create `apps/web/src/hooks/useDsfa.ts` mirroring the same shape (entity name: `DSFA-Eintrag` for toast copy; routes at `POST /api/v1/dsgvo/dsfa/dsfa`, `GET /api/v1/dsgvo/dsfa/dsfa/school/:schoolId`, `PUT /api/v1/dsgvo/dsfa/dsfa/:id`, `DELETE /api/v1/dsgvo/dsfa/dsfa/:id` — verified at `apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts`):
    - `DsfaEntryDto`, `CreateDsfaInput`, `UpdateDsfaInput`
    - `dsfaKeys`, `useDsfaEntries(schoolId)`, `useCreateDsfa`, `useUpdateDsfa`, `useDeleteDsfa`
    - Update mutation uses **PUT** not PATCH (mirror useUpdateRetentionPolicy correction above; backend uses `@Put('dsfa/:id')`)
    - Toast copy: `DSFA angelegt`, `DSFA aktualisiert`, `DSFA gelöscht`

    Step 4: Create `apps/web/src/hooks/useVvz.ts` mirroring the same shape (entity name: `VVZ-Eintrag` for toast copy; VVZ is co-located under DsfaController per D-27 — actual routes: `POST /api/v1/dsgvo/dsfa/vvz`, `GET /api/v1/dsgvo/dsfa/vvz/school/:schoolId`, `PUT /api/v1/dsgvo/dsfa/vvz/:id`, `DELETE /api/v1/dsgvo/dsfa/vvz/:id`):
    - `VvzEntryDto`, `CreateVvzInput`, `UpdateVvzInput`
    - `vvzKeys`, `useVvzEntries(schoolId)`, `useCreateVvz`, `useUpdateVvz`, `useDeleteVvz`
    - Update mutation uses **PUT** not PATCH (backend `@Put('vvz/:id')`)
    - Toast copy: `VVZ-Eintrag angelegt`, `VVZ-Eintrag aktualisiert`, `VVZ-Eintrag gelöscht`

    Step 5: If a controller route is at a different path than assumed, adjust the hook URLs accordingly — the URL must match the live API at execution time, not the plan's assumption.

    Step 6: Run `pnpm --filter @schoolflow/web typecheck`.

    DO NOT: Add a `Content-Type` header on body-less DELETE (per memory `apifetch_bodyless_delete`). DO NOT: Hard-code IDs. DO NOT: Use `mutateAsync` patterns inside hooks (callers can if they want).
  </action>
  <verify>
    <automated>test -f apps/web/src/hooks/useRetention.ts &amp;&amp; test -f apps/web/src/hooks/useDsfa.ts &amp;&amp; test -f apps/web/src/hooks/useVvz.ts &amp;&amp; grep -q "useCreateRetentionPolicy" apps/web/src/hooks/useRetention.ts &amp;&amp; grep -q "useCreateDsfa" apps/web/src/hooks/useDsfa.ts &amp;&amp; grep -q "useCreateVvz" apps/web/src/hooks/useVvz.ts &amp;&amp; pnpm --filter @schoolflow/web typecheck 2>&amp;1 | tail -3 | grep -qv "error TS"</automated>
  </verify>
  <acceptance_criteria>
    - All three files exist: `useRetention.ts`, `useDsfa.ts`, `useVvz.ts`
    - Each file exports a list query + create + update + delete mutation (12 hooks total across the 3 files)
    - `grep -c "toast.error" apps/web/src/hooks/useRetention.ts` returns at least `3` (one per mutation onError)
    - `grep -c "toast.error" apps/web/src/hooks/useDsfa.ts` returns at least `3`
    - `grep -c "toast.error" apps/web/src/hooks/useVvz.ts` returns at least `3`
    - `grep -c "invalidateQueries" apps/web/src/hooks/useRetention.ts` returns at least `3`
    - DELETE calls do NOT have a Content-Type header: `grep -B2 "method: 'DELETE'" apps/web/src/hooks/useRetention.ts | grep -q "Content-Type" && exit 1 || true` (must NOT match)
    - `pnpm --filter @schoolflow/web typecheck` exits `0`
    - `pnpm --filter @schoolflow/web build` exits `0`
  </acceptance_criteria>
  <done>The four CRUD hook files (consent + retention + dsfa + vvz) are in place; downstream plans 15-06 and 15-07 can import them and focus on UI without further hook work.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → `/admin/dsgvo` and `/admin/audit-log` | Direct URL access by any authenticated user; route components must enforce admin gate (defense-in-depth alongside the sidebar `roles: ['admin']`) |
| browser → consent/retention/dsfa/vvz endpoints | Mutations require backend role checks (already present); frontend hooks surface 4xx via toast.error |
| URL → Zod validateSearch | Untrusted URL input must be parsed; invalid input falls back to defaults rather than crashing the route |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-05-01 | Information Disclosure | Sidebar entries leaking to non-admin roles | mitigate | `roles: ['admin']` on both new entries; `hasAccess(userRoles, itemRoles)` predicate already filters them out for non-admin users (verify in plan 15-10 RBAC E2E) |
| T-15-05-02 | Information Disclosure | Direct URL hit (`/admin/dsgvo`, `/admin/audit-log`) by non-admin | mitigate | Route component checks `(user?.roles ?? []).includes('admin')` and renders `nicht autorisiert` PageShell — mirrors `solver-tuning.tsx` |
| T-15-05-03 | Tampering | URL search-param manipulation | mitigate | Zod `validateSearch` rejects unknown enum values; route falls back to defaults silently rather than crashing |
| T-15-05-04 | Information Disclosure | Cross-tenant data leak via `useConsentsAdmin({ schoolId: undefined })` | mitigate | `enabled: !!filters.schoolId` ensures the request fires only when schoolId is present; backend (plan 15-03) ALSO rejects empty schoolId via DTO + service guard (Pitfall 4 dual-layer) |
| T-15-05-05 | Repudiation | Mutation outcomes invisible to the user | mitigate | Every mutation has explicit `toast.success` on completion + `toast.error` on failure (Phase 10.2-04 silent-4xx invariant — D-20) |
| T-15-05-06 | Information Disclosure | Body-less DELETE causing 415 errors and silent rollback | accept | Per memory `apifetch_bodyless_delete`, DELETE without body must omit Content-Type; the hooks honour this — verified in acceptance criteria via grep |

</threat_model>

<verification>
- `pnpm --filter @schoolflow/web typecheck` exits `0`
- `pnpm --filter @schoolflow/web build` exits `0` — proves both routes wire into the generated route tree
- Manual smoke test (admin user): navigate to `/admin/dsgvo`, click each tab, observe URL deep-link round-trip; navigate to `/admin/audit-log`, observe placeholder; navigate as schulleitung user, confirm "nicht autorisiert" PageShell on both routes
- `git diff --stat` shows exactly 8 changed files: 1 sidebar edit + 2 routes + 1 tabs shell + 4 hook files
</verification>

<success_criteria>
- DSGVO admin route shell + 4-tab structure with URL deep-linking shipped
- Audit-Log route shell with admin gate shipped
- Two admin-only sidebar entries appended in the correct group
- Four CRUD hook files (consent admin filter + retention CRUD + dsfa CRUD + vvz CRUD) covering DSGVO-ADM-01..04 data-layer needs
- All mutations honour the Phase 10.2-04 silent-4xx invariant (toast.error on failure)
- Body-less DELETE requests omit Content-Type per memory `apifetch_bodyless_delete`
- Plans 15-06, 15-07, 15-08, 15-09 can begin in parallel without further foundation churn
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-05-SUMMARY.md` listing:
- The 8 files added/edited
- The typecheck + build outcomes
- Any divergences from assumed backend route paths (especially for VVZ if co-located under DSFA)
- Confirmation that admin / non-admin smoke tests on both routes succeed
- Which Phase 15 plans pick up from here (15-06 ConsentsTab + RetentionTab, 15-07 DSFA/VVZ tabs, 15-08 JobsTab + Art-17 dialogs, 15-09 audit-log viewer)
</output>

<context_decisions>
## Truths — CONTEXT.md Decision Coverage

_Citations in `D-NN:` format for the decision-coverage gate (workflow step 13a)._

- D-01: Two separate admin routes /admin/dsgvo + /admin/audit-log with admin-only sidebar entries
- D-02: /admin/dsgvo is a 4-tab page following PageShell + Tabs pattern
- D-03: /admin/audit-log is single-page list with filter toolbar + detail drawer
- D-04: Tab deep-linking via URL search-param
- D-06: DSFA + VVZ CRUD endpoints already complete
- D-08: Consent module needs admin-filter findAll extension
- D-20: Mutation hooks have onError -> toast.error (silent-4xx invariant)
- D-21: Table rows carry data-* attributes for E2E selectors
- D-22: Sidebar entries are admin-only (roles: ['admin'])
- D-26: D-04 precision — Phase 14 uses useState + Route.useSearch (no useTab hook)
- D-27: D-06 precision — VVZ CRUD lives in dsfa.controller.ts (no separate vvz.controller.ts)

</context_decisions>
