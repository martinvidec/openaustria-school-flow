---
phase: 14-solver-tuning
plan: 02
type: execute
wave: 2
depends_on: [14-01]
files_modified:
  - apps/web/src/routes/_authenticated/admin/solver-tuning.tsx
  - apps/web/src/routeTree.gen.ts
  - apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx
  - apps/web/src/components/admin/solver-tuning/LastRunScoreBadge.tsx
  - apps/web/src/components/admin/solver-tuning/DriftBanner.tsx
  - apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx
  - apps/web/src/components/admin/solver-tuning/ConstraintCatalogRow.tsx
  - apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx
  - apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx
  - apps/web/src/components/admin/solver-tuning/ClassRestrictionsTab.tsx
  - apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx
  - apps/web/src/components/admin/solver-tuning/AddEditClassRestrictionDialog.tsx
  - apps/web/src/components/admin/solver-tuning/SubjectPreferencesTab.tsx
  - apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx
  - apps/web/src/components/admin/solver-tuning/AddEditSubjectMorningPreferenceDialog.tsx
  - apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx
  - apps/web/src/components/admin/solver-tuning/AddEditSubjectPreferredSlotDialog.tsx
  - apps/web/src/components/admin/solver-tuning/SeverityBadge.tsx
  - apps/web/src/components/admin/solver-tuning/WochentagBadge.tsx
  - apps/web/src/components/admin/solver-tuning/MultiRowConflictBanner.tsx
  - apps/web/src/components/admin/solver/GeneratorPageWeightsCard.tsx
  - apps/web/src/routes/_authenticated/admin/solver.tsx
  - apps/web/src/lib/api/solver-tuning.ts
  - apps/web/src/lib/hooks/useConstraintCatalog.ts
  - apps/web/src/lib/hooks/useConstraintWeights.ts
  - apps/web/src/lib/hooks/useConstraintTemplates.ts
  - apps/web/src/lib/hooks/useLatestTimetableRun.ts
  - apps/web/src/components/layout/AppSidebar.tsx
  - apps/web/src/components/layout/MobileSidebar.tsx
autonomous: true
requirements: [SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05]
requirements_addressed: [SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05]
user_setup: []

must_haves:
  truths:
    - "Admin sees 'Solver-Tuning' entry in 'Solver & Operations' sidebar group (admin-only)"
    - "/admin/solver-tuning loads the 4-tab page: Constraints / Gewichtungen / Klassen-Sperrzeiten / Fach-Präferenzen"
    - "Tab 'Constraints' lists 15 entries with Hard-section (6) + Soft-section (9); Hard rows show Lock+tooltip; Soft rows have 'Gewichtung bearbeiten' deep-link to Tab 2 (SOLVER-01)"
    - "Tab 'Gewichtungen' renders **9 sliders** (one per SOFT entry in CONSTRAINT_CATALOG, including the new 'Subject preferred slot') with synced NumberInput, Reset-Icon, StickyMobileSaveBar (SOLVER-02)"
    - "Saving weights triggers PUT /constraint-weights, shows success toast, persists across reload (SOLVER-02)"
    - "DriftBanner shows in page header when constraint-weights `lastUpdatedAt > lastRun.completedAt` (consumes Plan 14-01 GET response shape `{ weights, lastUpdatedAt }` directly)"
    - "Tab 'Klassen-Sperrzeiten' lists NO_LESSONS_AFTER templates with Add/Edit/Delete dialogs and InfoBanner on duplicates (SOLVER-04)"
    - "Tab 'Fach-Präferenzen' nests two sub-tabs (Vormittags-Präferenzen / Bevorzugte Slots) with full CRUD (SOLVER-05)"
    - "Every mutation hook surfaces 4xx via destructive toast — no silent failures (Phase 10.2-04 invariant)"
    - "Generator-Page (/admin/solver) shows new GeneratorPageWeightsCard with deep-link 'Tuning öffnen' (D-06)"
    - "Mobile 375px: tab-bar horizontally scrolls, sub-tabs collapse to ToggleGroup, all interactive elements ≥ 44px touch target"
    - "Sidebar 'Solver-Tuning' entry is hidden for schulleitung; navigating directly to /admin/solver-tuning as schulleitung redirects or shows 403 (D-03 strict admin-only)"
    - "Row containers carry stable `data-severity` (catalog), `data-constraint-name` (weights), and `data-template-type` (restrictions/preferences) attributes for E2E selectors"
  artifacts:
    - path: "apps/web/src/routes/_authenticated/admin/solver-tuning.tsx"
      provides: "TanStack Router route entry"
      exports: ["Route"]
    - path: "apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx"
      provides: "4-tab container"
    - path: "apps/web/src/lib/hooks/useConstraintWeights.ts"
      provides: "useConstraintWeights query hook + useUpdateConstraintWeights mutation hook"
    - path: "apps/web/src/lib/hooks/useConstraintTemplates.ts"
      provides: "Query + create/update/delete/setActive mutation hooks per templateType"
    - path: "apps/web/src/components/admin/solver/GeneratorPageWeightsCard.tsx"
      provides: "Deep-link card on existing generator page"
  key_links:
    - from: "apps/web/src/components/layout/AppSidebar.tsx"
      to: "/admin/solver-tuning route"
      via: "sidebar entry with role: ['admin']"
      pattern: "solver-tuning"
    - from: "apps/web/src/lib/hooks/useConstraintWeights.ts"
      to: "GET/PUT /api/v1/schools/:schoolId/constraint-weights"
      via: "apiFetch call"
      pattern: "constraint-weights"
    - from: "apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx"
      to: "@schoolflow/shared CONSTRAINT_CATALOG"
      via: "static import (no network)"
      pattern: "from ['\"]@schoolflow/shared['\"]"
    - from: "apps/web/src/routes/_authenticated/admin/solver.tsx"
      to: "GeneratorPageWeightsCard"
      via: "JSX render at top of page"
      pattern: "GeneratorPageWeightsCard"
---

<objective>
Build the 4-tab `/admin/solver-tuning` admin page per UI-SPEC §Component Inventory and §Interaction Choreography. Wire it to the backend endpoints from Plan 14-01. Add the GeneratorPageWeightsCard deep-link to the existing `/admin/solver` page (D-06). Extend the sidebar with the new admin-only entry (D-03).

Purpose: Deliver SOLVER-01..05 user-facing surfaces; expose the backend gap-fixes from 14-01 to admin users.
Output: 1 new route + ~17 new components + 4 hook modules + sidebar extension + generator-page card.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/14-solver-tuning/14-CONTEXT.md
@.planning/phases/14-solver-tuning/14-RESEARCH.md
@.planning/phases/14-solver-tuning/14-UI-SPEC.md
@.planning/phases/14-solver-tuning/14-01-SUMMARY.md

<interfaces>
<!-- Backend API surface delivered by Plan 14-01 (consumed by this plan): -->

GET  /api/v1/schools/:schoolId/timetable/constraint-catalog
       → 200 ConstraintCatalogEntry[] (15 entries)

GET  /api/v1/schools/:schoolId/constraint-weights
       → 200 { weights: Record<string, number> }    // merged DB + defaults

PUT  /api/v1/schools/:schoolId/constraint-weights
       body: { weights: Record<string, number> }
       → 200 { weights }
       422 (RFC 9457): type 'schoolflow://errors/unknown-constraint-name' | 'schoolflow://errors/weight-out-of-range'

DELETE /api/v1/schools/:schoolId/constraint-weights/:constraintName
       → 204

POST/PUT/PATCH/DELETE /api/v1/schools/:schoolId/constraint-templates  (existing + new PATCH /:id/active)
       422 (RFC 9457): type 'schoolflow://errors/cross-reference-missing' | 'schoolflow://errors/period-out-of-range'

GET  /api/v1/schools/:schoolId/timetable/runs?limit=1&order=desc
       → 200 [TimetableRun] (existing endpoint from v1.0)

<!-- Shared package exports (from packages/shared, available after Plan 14-01): -->

import {
  CONSTRAINT_CATALOG,
  ConstraintCatalogEntry,
  constraintTemplateParamsSchema,
  createConstraintTemplateSchema,
  constraintWeightsSchema,
  bulkConstraintWeightsSchema,
  ConstraintTemplateParams,
  ConstraintWeightsMap,
  dayOfWeekEnum,
} from '@schoolflow/shared';

<!-- Established UI patterns (from Phase 10/11/12/13 — consume directly, do not redesign): -->

Reuse:
  - PageShell                      from '@/components/admin/shared/PageShell'
  - UnsavedChangesDialog           from '@/components/admin/shared/UnsavedChangesDialog'
  - StickyMobileSaveBar            from '@/components/admin/shared/StickyMobileSaveBar'
  - InfoBanner                     from '@/components/admin/shared/InfoBanner'
  - WarnDialog                     from '@/components/admin/shared/WarnDialog'
  - ClassAutocomplete (Phase 12)   from '@/components/admin/class/ClassAutocomplete'
  - SubjectAutocomplete (Phase 11) from '@/components/admin/subject/SubjectAutocomplete'
  - SubjectBadge (Phase 11)        from '@/components/admin/subject/SubjectBadge'
  - ClassBadge (Phase 12)          from '@/components/admin/class/ClassBadge'
  - apiFetch + extractProblemDetail from '@/lib/api'
  - toast (sonner)                 from '@/components/ui/sonner' (per Phase 10 precedent)

shadcn primitives (all already installed per CONTEXT.md §Reusable Assets):
  - tabs, slider, dialog, input, select, button, card, label,
    popover, command, badge, switch, tooltip, separator, sonner

TanStack Router file-based routing: dropping a file at
`apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` auto-generates
`routeTree.gen.ts`. Existing examples: `users.$userId.tsx`, `school.settings.tsx`.

Existing route to modify: `apps/web/src/routes/_authenticated/admin/solver.tsx`
(Generator-Page) — append `<GeneratorPageWeightsCard />` near top of body.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Sidebar wiring + route shell + TanStack Query hooks + API client</name>
  <files>
    apps/web/src/lib/api/solver-tuning.ts,
    apps/web/src/lib/hooks/useConstraintCatalog.ts,
    apps/web/src/lib/hooks/useConstraintWeights.ts,
    apps/web/src/lib/hooks/useConstraintTemplates.ts,
    apps/web/src/lib/hooks/useLatestTimetableRun.ts,
    apps/web/src/routes/_authenticated/admin/solver-tuning.tsx,
    apps/web/src/routeTree.gen.ts,
    apps/web/src/components/layout/AppSidebar.tsx,
    apps/web/src/components/layout/MobileSidebar.tsx
  </files>
  <read_first>
    apps/web/src/components/layout/AppSidebar.tsx,
    apps/web/src/components/layout/MobileSidebar.tsx,
    apps/web/src/routes/_authenticated/admin/users.$userId.tsx,
    apps/web/src/routes/_authenticated/admin/solver.tsx,
    apps/web/src/lib/api.ts,
    apps/web/src/lib/hooks/useUsers.ts,
    apps/web/src/lib/hooks/useTeachers.ts,
    apps/web/src/components/admin/shared/PageShell.tsx,
    apps/web/src/stores/school-context-store.ts,
    .planning/phases/14-solver-tuning/14-UI-SPEC.md
  </read_first>
  <action>
    Sub-task A — API client (apps/web/src/lib/api/solver-tuning.ts):

    1. Create the API client. It MUST use the existing `apiFetch` helper (don't roll your own). Confirm path of `apiFetch` by reading `apps/web/src/lib/api.ts` first. Example shape:
       ```typescript
       import { apiFetch } from '@/lib/api';
       import type {
         ConstraintCatalogEntry,
         ConstraintWeightsMap,
         ConstraintTemplateParams,
       } from '@schoolflow/shared';

       export type ConstraintTemplate = {
         id: string;
         schoolId: string;
         templateType: 'NO_LESSONS_AFTER' | 'SUBJECT_MORNING' | 'SUBJECT_PREFERRED_SLOT' | 'BLOCK_TIMESLOT';
         params: Record<string, unknown>;
         isActive: boolean;
         createdAt: string;
       };

       export const solverTuningApi = {
         async getConstraintCatalog(schoolId: string): Promise<ConstraintCatalogEntry[]> {
           return apiFetch(`/schools/${schoolId}/timetable/constraint-catalog`);
         },
         async getConstraintWeights(schoolId: string): Promise<{ weights: ConstraintWeightsMap; lastUpdatedAt: string | null }> {
           // Plan 14-01 GET response shape — DriftBanner needs lastUpdatedAt.
           return apiFetch(`/schools/${schoolId}/constraint-weights`);
         },
         async putConstraintWeights(schoolId: string, weights: ConstraintWeightsMap): Promise<{ weights: ConstraintWeightsMap; lastUpdatedAt: string | null }> {
           // Plan 14-01 PUT response shape — same as GET.
           return apiFetch(`/schools/${schoolId}/constraint-weights`, {
             method: 'PUT',
             body: JSON.stringify({ weights }),
           });
         },
         async resetConstraintWeight(schoolId: string, constraintName: string) {
           return apiFetch(`/schools/${schoolId}/constraint-weights/${encodeURIComponent(constraintName)}`, {
             method: 'DELETE',
           });
         },
         async listTemplates(schoolId: string, templateType?: string): Promise<ConstraintTemplate[]> {
           const all = await apiFetch<ConstraintTemplate[]>(`/schools/${schoolId}/constraint-templates`);
           return templateType ? all.filter((t) => t.templateType === templateType) : all;
         },
         async createTemplate(schoolId: string, params: ConstraintTemplateParams, isActive = true) {
           return apiFetch(`/schools/${schoolId}/constraint-templates`, {
             method: 'POST',
             body: JSON.stringify({ templateType: params.templateType, params, isActive }),
           });
         },
         async updateTemplate(schoolId: string, id: string, params: ConstraintTemplateParams) {
           return apiFetch(`/schools/${schoolId}/constraint-templates/${id}`, {
             method: 'PUT',
             body: JSON.stringify({ params }),
           });
         },
         async setTemplateActive(schoolId: string, id: string, isActive: boolean) {
           return apiFetch(`/schools/${schoolId}/constraint-templates/${id}/active`, {
             method: 'PATCH',
             body: JSON.stringify({ isActive }),
           });
         },
         async deleteTemplate(schoolId: string, id: string) {
           return apiFetch(`/schools/${schoolId}/constraint-templates/${id}`, { method: 'DELETE' });
         },
         async getLatestRun(schoolId: string) {
           return apiFetch(`/schools/${schoolId}/timetable/runs?limit=1&order=desc`);
         },
       };
       ```
       (If `apiFetch` does not auto-set `Content-Type: application/json`, add it to each mutation call. Mirror the convention from existing `useUsers.ts` / `useTeachers.ts`.)

    Sub-task B — TanStack Query hooks (apps/web/src/lib/hooks/):

    2. `useConstraintCatalog.ts`:
       ```typescript
       import { useQuery } from '@tanstack/react-query';
       import { solverTuningApi } from '@/lib/api/solver-tuning';

       export function useConstraintCatalog(schoolId: string) {
         return useQuery({
           queryKey: ['constraint-catalog', schoolId],
           queryFn: () => solverTuningApi.getConstraintCatalog(schoolId),
           staleTime: Infinity,  // static data, never refetch
         });
       }
       ```

    3. `useConstraintWeights.ts`:
       ```typescript
       import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
       import { toast } from 'sonner';
       import { solverTuningApi } from '@/lib/api/solver-tuning';
       import { extractProblemDetail } from '@/lib/api';
       import type { ConstraintWeightsMap } from '@schoolflow/shared';

       export function useConstraintWeights(schoolId: string) {
         return useQuery({
           queryKey: ['constraint-weights', schoolId],
           queryFn: () => solverTuningApi.getConstraintWeights(schoolId),
           enabled: !!schoolId,
         });
       }

       export function useUpdateConstraintWeights(schoolId: string) {
         const qc = useQueryClient();
         return useMutation({
           mutationFn: (weights: ConstraintWeightsMap) =>
             solverTuningApi.putConstraintWeights(schoolId, weights),
           onSuccess: () => {
             toast.success('Gewichtungen gespeichert.');
             qc.invalidateQueries({ queryKey: ['constraint-weights', schoolId] });
           },
           onError: (err) => {
             const detail = extractProblemDetail(err);
             toast.error(detail.title ?? 'Speichern nicht möglich', { description: detail.detail });
           },
         });
       }

       export function useResetConstraintWeight(schoolId: string) {
         const qc = useQueryClient();
         return useMutation({
           mutationFn: (constraintName: string) =>
             solverTuningApi.resetConstraintWeight(schoolId, constraintName),
           onSuccess: () => {
             qc.invalidateQueries({ queryKey: ['constraint-weights', schoolId] });
           },
           onError: (err) => {
             const detail = extractProblemDetail(err);
             toast.error(detail.title ?? 'Zurücksetzen nicht möglich', { description: detail.detail });
           },
         });
       }
       ```

    4. `useConstraintTemplates.ts` — write 5 hooks following the same pattern: `useConstraintTemplates(schoolId, templateType)`, `useCreateConstraintTemplate(schoolId)`, `useUpdateConstraintTemplate(schoolId)`, `useDeleteConstraintTemplate(schoolId)`, `useSetTemplateActive(schoolId)`. Each mutation MUST have explicit `onError` calling `toast.error(...)` with `extractProblemDetail`. Cache invalidation: invalidate `['constraint-templates', schoolId, templateType]` ONLY for the affected templateType.

    5. `useLatestTimetableRun.ts` — query hook for header LastRunScoreBadge:
       ```typescript
       export function useLatestTimetableRun(schoolId: string) {
         return useQuery({
           queryKey: ['timetable-runs', schoolId, 'latest'],
           queryFn: () => solverTuningApi.getLatestRun(schoolId),
           enabled: !!schoolId,
         });
       }
       ```

    Sub-task C — Sidebar entry (apps/web/src/components/layout/AppSidebar.tsx + MobileSidebar.tsx):

    6. Read both files to identify the existing "Solver & Operations" group (Phase 9.x). Locate the entry "Stundenplan-Generator" (route `/admin/solver`) and add a NEW entry directly after:
       ```tsx
       {
         label: 'Solver-Tuning',
         icon: SlidersHorizontal,  // from 'lucide-react'
         to: '/admin/solver-tuning',
         roles: ['admin'],         // strict per D-03
       }
       ```
       (The exact data shape depends on the sidebar's existing config — match it exactly. If both sidebars share a config object, edit only the source.)

    7. Verify role-gating: schulleitung must NOT see this entry. Read the existing role-gating implementation; the pattern from Phase 13 USER-Mgmt (`roles: ['admin']`) is the precedent.

    Sub-task D — Route shell (apps/web/src/routes/_authenticated/admin/solver-tuning.tsx):

    8. Create the route file mirroring `users.$userId.tsx` structure:
       ```tsx
       import { createFileRoute } from '@tanstack/react-router';
       import { PageShell } from '@/components/admin/shared/PageShell';
       import { SolverTuningTabs } from '@/components/admin/solver-tuning/SolverTuningTabs';
       import { LastRunScoreBadge } from '@/components/admin/solver-tuning/LastRunScoreBadge';
       import { DriftBanner } from '@/components/admin/solver-tuning/DriftBanner';
       import { useSchoolContextStore } from '@/stores/school-context-store';

       export const Route = createFileRoute('/_authenticated/admin/solver-tuning')({
         component: SolverTuningPage,
         validateSearch: (search): { tab?: string } => ({
           tab: typeof search.tab === 'string' ? search.tab : undefined,
         }),
       });

       function SolverTuningPage() {
         const schoolId = useSchoolContextStore((s) => s.schoolId);
         const { tab } = Route.useSearch();
         if (!schoolId) return null;
         return (
           <PageShell
             title="Solver-Tuning"
             subtitle="Constraint-Konfiguration und Gewichtungen pro Schule"
             actions={<LastRunScoreBadge schoolId={schoolId} />}
           >
             <DriftBanner schoolId={schoolId} />
             <SolverTuningTabs schoolId={schoolId} initialTab={tab} />
           </PageShell>
         );
       }
       ```

    9. Run the dev server briefly OR run `pnpm --filter @schoolflow/web exec tsr generate` (TanStack Router CLI) to regenerate `routeTree.gen.ts`. Verify the new route is in the generated file. If the project uses Vite plugin auto-generation, restart Vite per `feedback_restart_vite.md`.

    Sub-task E — Stub the placeholder Tab components so the page loads:

    10. Create `apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx` as a STUB that renders an empty `<Tabs>` with 4 `<TabsTrigger>` and 4 empty `<TabsContent>` placeholders showing `<div>TODO Task 2</div>`, `<div>TODO Task 3</div>`, etc. Tab labels per UI-SPEC §Inline micro-copy: `Constraints`, `Gewichtungen`, `Klassen-Sperrzeiten`, `Fach-Präferenzen`. Tab values: `constraints`, `weights`, `restrictions`, `preferences`. Use shadcn `Tabs` primitive.

    11. Create `LastRunScoreBadge.tsx` and `DriftBanner.tsx` as minimal STUBS that render nothing yet (or return null). They will be filled in Task 5.

    Sub-task F — Acceptance verification:

    12. Run `pnpm --filter @schoolflow/web exec tsc --noEmit` and ensure no type errors.
    13. Manually verify in dev (document in summary): admin login → sidebar shows "Solver-Tuning" → click → page loads with PageShell + 4 tab triggers; schulleitung login → sidebar does NOT show entry.
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/web exec tsc --noEmit &amp;&amp;
      test -f apps/web/src/routes/_authenticated/admin/solver-tuning.tsx &amp;&amp;
      test -f apps/web/src/lib/api/solver-tuning.ts &amp;&amp;
      test -f apps/web/src/lib/hooks/useConstraintCatalog.ts &amp;&amp;
      test -f apps/web/src/lib/hooks/useConstraintWeights.ts &amp;&amp;
      test -f apps/web/src/lib/hooks/useConstraintTemplates.ts &amp;&amp;
      grep -q "solver-tuning" apps/web/src/components/layout/AppSidebar.tsx &amp;&amp;
      grep -q "solver-tuning" apps/web/src/routeTree.gen.ts &amp;&amp;
      grep -q "roles.*admin" apps/web/src/components/layout/AppSidebar.tsx
    </automated>
  </verify>
  <acceptance_criteria>
    - `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` exists; exports `Route`
    - `apps/web/src/routeTree.gen.ts` contains substring `solver-tuning` (auto-regenerated)
    - `apps/web/src/components/layout/AppSidebar.tsx` contains substring `solver-tuning` AND substring `SlidersHorizontal`
    - `apps/web/src/components/layout/MobileSidebar.tsx` contains the new entry (or imports the same shared sidebar config)
    - Sidebar entry has `roles: ['admin']` (no schulleitung) — verifiable via grep on the entry definition
    - Hook files exist and export the correct hook names listed in this task
    - Every mutation hook has `onError` calling `toast.error` (verifiable by grep `onError.*toast.error` count ≥ 5 in `useConstraintWeights.ts` + `useConstraintTemplates.ts`)
    - `pnpm --filter @schoolflow/web exec tsc --noEmit` exits 0
    - Live smoke check (document in summary): navigating to `/admin/solver-tuning` as admin shows PageShell with title `Solver-Tuning` and 4 tab triggers visible
  </acceptance_criteria>
  <done>Route exists, sidebar wired, hooks ready, tab shell renders. Tasks 2-3 implement tab content.</done>
</task>

<task type="auto">
  <name>Task 2: Constraints catalog tab + Weights tab + Generator-Page deep-link card</name>
  <files>
    apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx,
    apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx,
    apps/web/src/components/admin/solver-tuning/ConstraintCatalogRow.tsx,
    apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx,
    apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx,
    apps/web/src/components/admin/solver-tuning/SeverityBadge.tsx,
    apps/web/src/components/admin/solver/GeneratorPageWeightsCard.tsx,
    apps/web/src/routes/_authenticated/admin/solver.tsx
  </files>
  <read_first>
    apps/web/src/routes/_authenticated/admin/solver.tsx,
    apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx,
    apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx,
    apps/web/src/components/admin/shared/InfoBanner.tsx,
    apps/web/src/components/ui/slider.tsx,
    apps/web/src/components/ui/badge.tsx,
    apps/web/src/components/ui/tooltip.tsx,
    apps/web/src/components/ui/separator.tsx,
    .planning/phases/14-solver-tuning/14-UI-SPEC.md
  </read_first>
  <action>
    Sub-task A — SeverityBadge (apps/web/src/components/admin/solver-tuning/SeverityBadge.tsx):

    1. Per UI-SPEC §Severity-signal pairings:
       ```tsx
       import { ShieldAlert, Sliders } from 'lucide-react';
       import { Badge } from '@/components/ui/badge';
       import type { ConstraintSeverity } from '@schoolflow/shared';

       export function SeverityBadge({ severity }: { severity: ConstraintSeverity }) {
         if (severity === 'HARD') {
           return (
             <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/40 gap-1" aria-label="Hard-Constraint, immer aktiv">
               <ShieldAlert className="h-4 w-4" /> HARD
             </Badge>
           );
         }
         return (
           <Badge variant="secondary" className="gap-1" aria-label="Soft-Constraint, gewichtbar">
             <Sliders className="h-4 w-4" /> SOFT
           </Badge>
         );
       }
       ```

    Sub-task B — ConstraintCatalogTab + ConstraintCatalogRow (Tab 1, SOLVER-01):

    2. `ConstraintCatalogRow.tsx` renders one row per UI-SPEC §Tab "Constraints" §Per-surface layout rules. Desktop grid `grid-cols-[2fr_auto_3fr_auto]`; mobile stacked Card. Hard rows: `Lock` icon + Tooltip ("Hard-Constraints sind im Solver immer aktiv und können nicht deaktiviert werden."). Soft rows: button "Gewichtung bearbeiten" with `ArrowRight` icon that calls a `onEditWeight(name)` prop.

       **CRITICAL — E2E selectors (Plan 14-03 dependency):** The row container element MUST render `data-severity="HARD"` or `data-severity="SOFT"` (matches the entry's severity verbatim). Example: `<div data-severity={entry.severity} ...>`. The Soft row's edit button MUST have `aria-label="Gewichtung bearbeiten"` (used by E2E getByRole). Acceptance: `grep -q "data-severity" apps/web/src/components/admin/solver-tuning/ConstraintCatalogRow.tsx`.

    3. `ConstraintCatalogTab.tsx`:
       - Imports `CONSTRAINT_CATALOG` from `@schoolflow/shared` (static, no network).
       - Splits into Hard (6) + Soft (9) sections using `Separator` between.
       - Section headers: `Hard-Constraints (6)` + `Soft-Constraints (9)` per UI-SPEC.
       - Receives `onNavigateToWeight(name: string) => void` prop from parent (SolverTuningTabs).
       - Uses `useConstraintCatalog(schoolId)` ONLY to verify the backend agrees (read-only sanity check); display always uses the static shared CONSTRAINT_CATALOG to avoid unnecessary network calls.

    Sub-task C — ConstraintWeightsTab + ConstraintWeightSliderRow (Tab 2, SOLVER-02 + SOLVER-03):

    4. `ConstraintWeightSliderRow.tsx` per UI-SPEC §Tab "Gewichtungen" §Per-surface layout rules:
       - Props: `{ entry: ConstraintCatalogEntry; defaultWeight: number; currentWeight: number; persistedWeight: number; onChange: (n: number) => void; onReset: () => void; }`
       - **CRITICAL — E2E selector (Plan 14-03 dependency):** The row container element MUST render `data-constraint-name={entry.name}` (matches the Java constraint name verbatim, e.g. `"No same subject doubling"`). Example: `<div data-constraint-name={entry.name} ...>`. Acceptance: `grep -q "data-constraint-name" apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx`.
       - Desktop grid `grid-cols-[2fr_3fr_auto_auto_auto]`: Label+Java-name | shadcn Slider (0..100, step 1) | NumberInput w-16 tabular-nums | "Default: {n}" | Reset-Icon-Button (RotateCcw, aria `Auf Default zurücksetzen`).
       - Mobile: stacks vertically with 44px tap zones.
       - Custom-state thumb halo: `ring-2 ring-primary ring-offset-2` when `currentWeight !== defaultWeight`.
       - Dirty-state: card background tints `bg-warning/5` when `currentWeight !== persistedWeight`.
       - Bidirectional sync: Slider `onValueChange` updates local state which updates NumberInput via prop; NumberInput `onChange` parses + clamps + propagates.
       - Tooltip on label/Info-icon shows `entry.description`.
       - Reset-Icon active only when `currentWeight !== defaultWeight`. Click sets local value to `defaultWeight` (does NOT save — global Save still required).

    5. `ConstraintWeightsTab.tsx`:
       - Imports `CONSTRAINT_CATALOG` (use only the 9 SOFT entries: filter `entry.severity === 'SOFT'`) and `DEFAULT_CONSTRAINT_WEIGHTS` (Plan 14-01 already exports both from `@schoolflow/shared` — verify via `grep -q "export const DEFAULT_CONSTRAINT_WEIGHTS" packages/shared/src/validation/constraint-weight.ts`; do NOT re-add the export here).
       - Calls `useConstraintWeights(schoolId)` for persisted state; `useUpdateConstraintWeights(schoolId)` for save.
       - Local state: `Record<string, number>` initialized from query result.
       - Computes `dirty = JSON.stringify(local) !== JSON.stringify(persisted)`.
       - **Renders 9 `<ConstraintWeightSliderRow>`** (one per SOFT catalog entry; loop iterates the filtered SOFT subset of `CONSTRAINT_CATALOG`, which is exactly 9 entries per Plan 14-01 lock).
       - Renders bottom controls: `Verwerfen` (ghost, resets local to persisted) + `Änderungen speichern` (primary, fires mutation with local map).
       - On mobile (`<640px`): `<StickyMobileSaveBar>` shows the same buttons when `dirty` is true.
       - Footer: amber `<InfoBanner>` with text per UI-SPEC §Solver-Sync hint: `Geänderte Gewichtungen wirken beim nächsten Solve-Run. Verifikation manuell über die Run-History.` + deep-link `→ History öffnen` to `/admin/timetable-history`.
       - Communicates dirty state up to `SolverTuningTabs` (via prop callback `onDirtyChange(boolean) => void`) so parent can intercept tab-switch.
       - Save button disabled if any value invalid (e.g. NumberInput showing -5).
       - Validation: use `constraintWeightsSchema.safeParse(local)` from `@schoolflow/shared` before fire mutation. Inline NumberInput error if `>100` or `<0`.

    Sub-task D — Wire SolverTuningTabs to host the two real tabs:

    6. Modify the Task 1 stub `SolverTuningTabs.tsx`:
       - State: `activeTab` (controlled via search-param `?tab=`) and `weightsDirty` (received from `<ConstraintWeightsTab onDirtyChange={...} />`).
       - When `activeTab` changes WITH `weightsDirty === true` AND user navigates AWAY from `weights`: open `<UnsavedChangesDialog>` per UI-SPEC §Pro-Tab dirty-state. Confirm `Verwerfen und wechseln` → reset weights tab + change tab. Cancel → stay.
       - On Tab 1 catalog "Gewichtung bearbeiten" deep-link: switch to Tab 2 + scroll the matching row into view + 1s `ring-primary` flash + focus its NumberInput. Pass the constraintName via state (`pendingFocusName`).
       - Mobile: tabs row `overflow-x-auto`, `scroll-snap-type: x mandatory` (per UI-SPEC §Mobile horizontal-scroll Tab-Bar).

    Sub-task E — GeneratorPageWeightsCard + extend solver.tsx (D-06):

    7. Create `apps/web/src/components/admin/solver/GeneratorPageWeightsCard.tsx`:
       - Receives `schoolId: string`.
       - Uses `useConstraintWeights(schoolId)` (shared cache key with Tab 2 — auto-shared per UI-SPEC §Cache invalidation).
       - Renders a `<Card>` with `border-primary/20` per UI-SPEC §Generator-Page Read-only Card.
       - `<CardTitle>Aktuelle Schul-Gewichtungen</CardTitle>` + 9 key-value rows: `{germanDisplayName}: {weight}` (default values use `text-muted-foreground`).
       - Footer button: `Tuning öffnen` (ghost-primary, `<Link to="/admin/solver-tuning" search={{ tab: 'weights' }}>` from TanStack Router).
       - Mobile: 2-column grid + full-width deep-link.

    8. Modify `apps/web/src/routes/_authenticated/admin/solver.tsx`:
       - Import `<GeneratorPageWeightsCard />`.
       - Render at the top of the page body (above the existing Generate button card).
       - Get `schoolId` from `useSchoolContextStore`.

    Sub-task F — Smoke verification:

    9. Run `pnpm --filter @schoolflow/web exec tsc --noEmit`.
    10. Manually verify (document in summary): /admin/solver-tuning Tab "Constraints" shows 15 rows with section headers; clicking "Gewichtung bearbeiten" on a Soft-row jumps to Tab 2; Tab 2 shows 9 sliders; dragging a slider triggers dirty state; clicking Save fires PUT and shows green toast; `/admin/solver` shows the new GeneratorPageWeightsCard at top.
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/web exec tsc --noEmit &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/SeverityBadge.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver/GeneratorPageWeightsCard.tsx &amp;&amp;
      grep -q "GeneratorPageWeightsCard" apps/web/src/routes/_authenticated/admin/solver.tsx &amp;&amp;
      grep -q "CONSTRAINT_CATALOG" apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx &amp;&amp;
      grep -q "useUpdateConstraintWeights" apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx &amp;&amp;
      grep -q "StickyMobileSaveBar" apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx &amp;&amp;
      grep -q "UnsavedChangesDialog" apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx &amp;&amp;
      grep -q "data-severity" apps/web/src/components/admin/solver-tuning/ConstraintCatalogRow.tsx &amp;&amp;
      grep -q "data-constraint-name" apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx &amp;&amp;
      grep -q "Hard-Constraints (6)" apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx &amp;&amp;
      grep -q "Soft-Constraints (9)" apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx
    </automated>
  </verify>
  <acceptance_criteria>
    - All 7 component files in `<files>` exist (Tab 1, Tab 2, GeneratorPageWeightsCard)
    - `ConstraintCatalogTab.tsx` imports `CONSTRAINT_CATALOG` from `@schoolflow/shared` (no network call for catalog data)
    - `ConstraintCatalogTab.tsx` renders Hard-section header `Hard-Constraints (6)` AND Soft-section header `Soft-Constraints (9)` (verifiable in source — `grep -q "Soft-Constraints (9)"` exits 0)
    - **`ConstraintCatalogRow.tsx` renders `data-severity="HARD"` or `data-severity="SOFT"` on each row container** (verifiable: `grep -q "data-severity" apps/web/src/components/admin/solver-tuning/ConstraintCatalogRow.tsx` exits 0) — required by E2E-SOLVER-01.
    - **`ConstraintWeightSliderRow.tsx` renders `data-constraint-name={entry.name}` on each row container** (verifiable: `grep -q "data-constraint-name" apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx` exits 0) — required by E2E-SOLVER-02/03/10/11.
    - `ConstraintWeightsTab.tsx` uses `useUpdateConstraintWeights` hook
    - `ConstraintWeightsTab.tsx` renders `StickyMobileSaveBar`
    - `ConstraintWeightsTab.tsx` renders **9** `<ConstraintWeightSliderRow>` instances (one per filtered SOFT entry from CONSTRAINT_CATALOG; visual inspection or count `<ConstraintWeightSliderRow` JSX occurrences in the rendered loop)
    - `SolverTuningTabs.tsx` references `UnsavedChangesDialog` (dirty-state interception wired)
    - `apps/web/src/routes/_authenticated/admin/solver.tsx` imports + renders `GeneratorPageWeightsCard`
    - `pnpm --filter @schoolflow/web exec tsc --noEmit` exits 0
    - Live smoke check (document in summary): Tab "Constraints" shows 15 rows; deep-link from Soft row to Tab 2 works; Tab 2 renders 9 sliders (the 9th is "Bevorzugter Slot pro Fach"); saving weights shows green toast; /admin/solver shows new card with deep-link.
  </acceptance_criteria>
  <done>Tab 1 + Tab 2 functional; deep-link from Generator-Page works; SOLVER-01/02/03 user-facing surface complete.</done>
</task>

<task type="auto">
  <name>Task 3: Klassen-Sperrzeiten tab + Fach-Präferenzen tab (with sub-tabs) + helpers</name>
  <files>
    apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx,
    apps/web/src/components/admin/solver-tuning/ClassRestrictionsTab.tsx,
    apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx,
    apps/web/src/components/admin/solver-tuning/AddEditClassRestrictionDialog.tsx,
    apps/web/src/components/admin/solver-tuning/SubjectPreferencesTab.tsx,
    apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx,
    apps/web/src/components/admin/solver-tuning/AddEditSubjectMorningPreferenceDialog.tsx,
    apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx,
    apps/web/src/components/admin/solver-tuning/AddEditSubjectPreferredSlotDialog.tsx,
    apps/web/src/components/admin/solver-tuning/WochentagBadge.tsx,
    apps/web/src/components/admin/solver-tuning/MultiRowConflictBanner.tsx,
    apps/web/src/components/admin/solver-tuning/LastRunScoreBadge.tsx,
    apps/web/src/components/admin/solver-tuning/DriftBanner.tsx
  </files>
  <read_first>
    apps/web/src/components/admin/class/ClassAutocomplete.tsx,
    apps/web/src/components/admin/subject/SubjectAutocomplete.tsx,
    apps/web/src/components/admin/subject/SubjectBadge.tsx,
    apps/web/src/components/admin/class/ClassBadge.tsx,
    apps/web/src/components/admin/shared/WarnDialog.tsx,
    apps/web/src/components/admin/shared/InfoBanner.tsx,
    apps/web/src/components/ui/dialog.tsx,
    apps/web/src/components/ui/switch.tsx,
    apps/web/src/components/ui/select.tsx,
    apps/web/src/components/ui/dropdown-menu.tsx,
    .planning/phases/14-solver-tuning/14-UI-SPEC.md
  </read_first>
  <action>
    Sub-task A — Atomic shared bits:

    1. `WochentagBadge.tsx` — 2-letter MO/DI/MI/DO/FR badge. Receives `dayOfWeek: 'MONDAY' | ... | 'FRIDAY'`; maps to `MO`/`DI`/`MI`/`DO`/`FR` per UI-SPEC §Inline micro-copy. Uses shadcn `Badge variant="outline"`.

    2. `MultiRowConflictBanner.tsx` — receives a list of conflict groups + a render function for the message. Renders one amber `<InfoBanner variant="warning">` per group (max 3 visible, rest summarized). Per UI-SPEC §Multi-Row InfoBanner copy table.

    Sub-task B — Tab 3 "Klassen-Sperrzeiten" (SOLVER-04):

    3. `ClassRestrictionsTable.tsx`:
       - Receives `templates: ConstraintTemplate[]` + callbacks `{ onEdit, onDelete, onToggleActive }`.
       - Desktop: `<Table>` with columns Klasse | Sperrt ab Periode | Aktiv | Aktionen per UI-SPEC §Inline micro-copy.
       - **CRITICAL — E2E selector (Plan 14-03 dependency):** Each row container element MUST render `data-template-type="NO_LESSONS_AFTER"`. Example: `<TableRow data-template-type="NO_LESSONS_AFTER" ...>`. Acceptance: `grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx`.
       - "Sperrt ab Periode" cell format: `Bis Periode {maxPeriod} erlaubt`.
       - "Klasse" cell uses `ClassBadge` (Phase 12 reuse).
       - "Aktiv" toggle: shadcn `<Switch>` calling `onToggleActive(template.id, !checked)`. Optimistic update + `useSetTemplateActive` hook (silent on success per UI-SPEC §Restriction CRUD §7).
       - "Aktionen" column: `<Pencil>` (Edit) + `<Trash2>` (Delete) icon buttons, `min-h-11 min-w-11` on mobile. Edit button MUST have `aria-label="Eintrag bearbeiten"`; Delete button MUST have `aria-label="Eintrag löschen"` (E2E selectors).
       - Mobile: stacks rows into `<Card>` with label-value pairs; row actions become `<DropdownMenu>` opened via `…` overflow icon (UI-SPEC §Mobile Restriction/Preference Table).

    4. `AddEditClassRestrictionDialog.tsx`:
       - Mode: `create` | `edit`. Edit pre-fills.
       - Form fields per UI-SPEC §Inline micro-copy:
         - `ClassAutocomplete` labelled `Klasse`, placeholder `Klassen-Name (min. 2 Zeichen) …`, debounce 300ms, min 2 chars (Phase 11/12 conventions).
         - `<Input type="number">` labelled `Sperrt ab Periode`, helper `Klasse darf bis einschließlich Periode {maxPeriod} unterrichtet werden. Maximum: {school.maxPeriodNumber}.`.
         - `<Switch>` labelled `Aktiv`, default checked.
       - Validate via `constraintTemplateParamsSchema` (NO_LESSONS_AFTER variant) using RHF + zod resolver — convention from Phase 11 TeacherForm + Phase 12 ClassForm.
       - Submit fires `useCreateConstraintTemplate` or `useUpdateConstraintTemplate`. Mutation hooks already attach `onError` toast.
       - Footer: `Abbrechen` (ghost) + `Anlegen`/`Speichern` (primary).
       - Cross-reference 422 errors surface via the mutation hook's `onError` toast (already wired in Task 1).

    5. `ClassRestrictionsTab.tsx`:
       - Calls `useConstraintTemplates(schoolId, 'NO_LESSONS_AFTER')`.
       - Computes conflict groups: group active rows by `params.classId`; if any group ≥2 → pass to `MultiRowConflictBanner` with copy `Mehrfache Einträge für Klasse {className} vorhanden — Solver verwendet die strengste Sperrzeit (Periode {minMaxPeriod}).`.
       - Renders header CTA `+ Sperrzeit hinzufügen` (right-aligned desktop; full-width mobile per UI-SPEC §Mobile).
       - Empty state per UI-SPEC §Empty states table (icon `CalendarOff`, heading `Keine Sperrzeiten gesetzt`, body, CTA `Sperrzeit anlegen`).
       - Owns dialog state for create/edit (controlled `open` boolean + `editingId | null`).
       - Owns delete confirmation: opens `<WarnDialog>` per UI-SPEC §Destructive confirmations (title `Sperrzeit löschen?`, body, primary `Löschen` destructive).

    Sub-task C — Tab 4 "Fach-Präferenzen" (SOLVER-05):

    6. `SubjectMorningPreferenceTable.tsx` — same pattern as ClassRestrictionsTable but columns: Fach (`SubjectBadge`) | Spätestens bis Periode | Aktiv | Aktionen. Cell format `Bis Periode {latestPeriod}`. **CRITICAL — E2E selector:** Each row container MUST render `data-template-type="SUBJECT_MORNING"`. Acceptance: `grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx`.

    7. `AddEditSubjectMorningPreferenceDialog.tsx` — same pattern as restriction dialog but with `SubjectAutocomplete` + latestPeriod NumberInput. Uses `constraintTemplateParamsSchema` SUBJECT_MORNING variant.

    8. `SubjectPreferredSlotTable.tsx` — columns: Fach | Wochentag (`WochentagBadge`) | Periode | Aktiv | Aktionen. **CRITICAL — E2E selector:** Each row container MUST render `data-template-type="SUBJECT_PREFERRED_SLOT"`. Acceptance: `grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx`.

    9. `AddEditSubjectPreferredSlotDialog.tsx` — fields: SubjectAutocomplete + dayOfWeek `<Select>` (5 options Montag-Freitag per UI-SPEC) + period NumberInput + isActive Switch. Uses `constraintTemplateParamsSchema` SUBJECT_PREFERRED_SLOT variant.

    10. `SubjectPreferencesTab.tsx`:
        - Internal `<Tabs>` (shadcn nested) with values `morning` / `preferred-slot`. Triggers labeled `Vormittags-Präferenzen` + `Bevorzugte Slots`.
        - Mobile (`<640px`): replace nested Tabs with `<ToggleGroup type="single">` (vertical, full-width).
        - Sub-Tab a: render `MultiRowConflictBanner` (group by `params.subjectId` for SUBJECT_MORNING, min `latestPeriod`) + Add CTA + `SubjectMorningPreferenceTable` + Add/Edit/Delete dialog wiring + WarnDialog (title `Vormittags-Präferenz löschen?`).
        - Sub-Tab b: same for SUBJECT_PREFERRED_SLOT (group by `(subjectId, dayOfWeek, period)` triple — ≥2 identical → cumulative-evaluation copy per UI-SPEC) + WarnDialog (title `Bevorzugten Slot löschen?`).

    Sub-task D — Hook tabs into SolverTuningTabs:

    11. Replace the Task 1 stubs in `SolverTuningTabs.tsx` for Tab 3 + Tab 4 contents:
        - Tab 3: `<ClassRestrictionsTab schoolId={schoolId} />`
        - Tab 4: `<SubjectPreferencesTab schoolId={schoolId} />`
        - Tabs 3+4 do NOT participate in dirty-state (atomic CRUD). Only Tab 2 does.

    Sub-task E — LastRunScoreBadge + DriftBanner (header components from Task 1 stubs):

    12. `LastRunScoreBadge.tsx`:
        - Uses `useLatestTimetableRun(schoolId)`.
        - Renders per UI-SPEC §Tuning-Page header copy:
          - No prior run: muted badge `Noch kein Solve-Run`.
          - hardScore === 0: green CircleCheck + `Letzter Solve-Run vor {relativeTime} — Hard=0 · Soft={softScore}` + deep-link `→ History öffnen`.
          - hardScore < 0: amber TriangleAlert + same template with hardScore.
        - Use `formatDistanceToNow` from `date-fns` with German locale.
        - Includes a separate ghost button `Generator starten` linking to `/admin/solver`.

    13. `DriftBanner.tsx`:
        - Uses `useLatestTimetableRun(schoolId)` AND `useConstraintWeights(schoolId)`.
        - **Plan 14-01 already returns `{ weights, lastUpdatedAt }` from `GET /constraint-weights`** (see 14-01 Task 2 acceptance). Consume `lastUpdatedAt` directly from the query result — NO conditional fallback, NO additional backend extension needed.
        - The `useConstraintWeights` query result type from Plan 14-01 is `{ weights: Record<string, number>; lastUpdatedAt: string | null }`. The `useConstraintWeights` hook in `apps/web/src/lib/hooks/useConstraintWeights.ts` (Task 1 step 3) MUST type its `useQuery<...>` accordingly so this component receives `lastUpdatedAt` without `any` casts.
        - Computes drift: `lastUpdatedAt !== null && lastRun !== null && new Date(lastUpdatedAt) > new Date(lastRun.completedAt)`.
        - If true: render amber `<InfoBanner variant="warning">` with copy `Aktuelle Gewichtungen wurden nach dem letzten Solve-Run geändert. Starten Sie eine neue Generierung, um den Effekt zu prüfen.` + deep-link `Generator starten` to `/admin/solver`.
        - If false: render nothing.

    Sub-task F — Smoke verification:

    14. Run `pnpm --filter @schoolflow/web exec tsc --noEmit`.
    15. Manually verify (document in summary): Tab 3 add a Sperrzeit → row appears + toast; edit → row updated; toggle isActive → silent; delete → confirm dialog → row gone. Tab 4 sub-tab "Vormittags-Präferenzen" full CRUD; sub-tab "Bevorzugte Slots" full CRUD. Add 2 rows for same class on Tab 3 → InfoBanner appears with strictest copy.
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/web exec tsc --noEmit &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/ClassRestrictionsTab.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/AddEditClassRestrictionDialog.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/SubjectPreferencesTab.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/MultiRowConflictBanner.tsx &amp;&amp;
      test -f apps/web/src/components/admin/solver-tuning/WochentagBadge.tsx &amp;&amp;
      grep -q "ClassAutocomplete" apps/web/src/components/admin/solver-tuning/AddEditClassRestrictionDialog.tsx &amp;&amp;
      grep -q "SubjectAutocomplete" apps/web/src/components/admin/solver-tuning/AddEditSubjectMorningPreferenceDialog.tsx &amp;&amp;
      grep -q "WarnDialog" apps/web/src/components/admin/solver-tuning/ClassRestrictionsTab.tsx &amp;&amp;
      grep -q "Bevorzugten Slot löschen" apps/web/src/components/admin/solver-tuning/SubjectPreferencesTab.tsx &amp;&amp;
      grep -q "ToggleGroup\|toggle-group" apps/web/src/components/admin/solver-tuning/SubjectPreferencesTab.tsx &amp;&amp;
      grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx &amp;&amp;
      grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx &amp;&amp;
      grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx &amp;&amp;
      grep -q "lastUpdatedAt" apps/web/src/components/admin/solver-tuning/DriftBanner.tsx
    </automated>
  </verify>
  <acceptance_criteria>
    - All 11 component files exist with the listed responsibilities
    - `AddEditClassRestrictionDialog.tsx` uses `ClassAutocomplete` (Phase 12 reuse) — verifiable via grep
    - `AddEditSubjectMorningPreferenceDialog.tsx` AND `AddEditSubjectPreferredSlotDialog.tsx` both use `SubjectAutocomplete` (Phase 11 reuse) — verifiable via grep
    - `ClassRestrictionsTab.tsx` references `WarnDialog` (delete confirmation) — verifiable via grep
    - `SubjectPreferencesTab.tsx` contains string `Bevorzugten Slot löschen` (UI-SPEC verbatim copy) AND uses `ToggleGroup` for mobile sub-tab fallback
    - All Add/Edit dialogs use Zod schemas from `@schoolflow/shared` (`constraintTemplateParamsSchema` discriminated union variants) — verifiable via grep `from ['\"]@schoolflow/shared['\"]`
    - **`ClassRestrictionsTable.tsx` renders `data-template-type="NO_LESSONS_AFTER"` on each row** (verifiable: `grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx` exits 0) — required by E2E-SOLVER-04/06.
    - **`SubjectMorningPreferenceTable.tsx` renders `data-template-type="SUBJECT_MORNING"` on each row** (verifiable: `grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx` exits 0) — required by E2E-SOLVER-09.
    - **`SubjectPreferredSlotTable.tsx` renders `data-template-type="SUBJECT_PREFERRED_SLOT"` on each row** (verifiable: `grep -q "data-template-type" apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx` exits 0) — required by E2E-SOLVER-09.
    - `LastRunScoreBadge.tsx` uses `useLatestTimetableRun` and `formatDistanceToNow`
    - **`DriftBanner.tsx` consumes `lastUpdatedAt` directly from `useConstraintWeights` query result** (Plan 14-01 GET /constraint-weights returns `{ weights, lastUpdatedAt }`). Verifiable: `grep -q "lastUpdatedAt" apps/web/src/components/admin/solver-tuning/DriftBanner.tsx` exits 0. NO conditional fallback path; the type is `string | null` per Plan 14-01.
    - `useConstraintWeights` hook return type is `{ weights: Record<string, number>; lastUpdatedAt: string | null }` (verifiable: visual inspection of `apps/web/src/lib/hooks/useConstraintWeights.ts` typed `useQuery` generic)
    - `pnpm --filter @schoolflow/web exec tsc --noEmit` exits 0
    - Live smoke check (document in summary): Tab 3 + Tab 4 all CRUD flows work end-to-end against the Plan 14-01 backend; conflict banner appears with 2+ rows for same class/subject; mobile 375px viewport renders sub-tabs as ToggleGroup; saving a weight on Tab 2 then returning to the page header makes DriftBanner visible (assuming the saved time is later than the most recent solve run)
  </acceptance_criteria>
  <done>SOLVER-04 + SOLVER-05 user-facing surfaces complete; all 4 tabs functional; mobile parity verified.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → API | Admin UI submits weights + constraint templates to backend; route gating + CASL-Guard handle auth |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-14-08 | Spoofing | Schulleitung tries to access /admin/solver-tuning route directly | mitigate | Sidebar entry hidden via `roles: ['admin']`; route component reads `useUserContext` and redirects/shows 403 if non-admin (Task 1 step 6-7). Backend CASL-guard rejects any mutation regardless. |
| T-14-09 | Tampering | UI bypasses Zod and sends weight=200 | mitigate | Backend whitelist + bounds check (Plan 14-01 Task 2). Frontend Zod is UX, not security. UI tested via E2E-SOLVER-03 (Plan 14-03). |
| T-14-10 | Information Disclosure | Cross-school query leak via wrong schoolId from query cache | mitigate | All hook query keys include `schoolId`; cache scoping per Phase 13 pattern. School context store is single-tenant (one schoolId per session). |
| T-14-11 | DoS via UI | Rapid-fire Save clicks during PUT in flight | accept | TanStack Query mutation deduplication + Save button disabled during `isPending`. No real DoS risk for an admin-only single-tenant tool. |
| T-14-12 | Repudiation | "I didn't change that weight" | mitigate | `updatedBy` recorded server-side (Plan 14-01); audit log entries surfaced in Phase 15 audit-viewer. |

</threat_model>

<verification>
1. `pnpm --filter @schoolflow/web exec tsc --noEmit` exits 0
2. `pnpm --filter @schoolflow/web build` exits 0 (Vite production build)
3. Live smoke checklist (document in summary):
   - Sidebar: admin sees "Solver-Tuning" entry; schulleitung does not
   - Tab "Constraints": 15 rows visible; Hard rows have Lock + tooltip; Soft row deep-link works
   - Tab "Gewichtungen": 8 sliders render with default values; drag triggers dirty state; Reset icon active when ≠ default; Save fires PUT and shows green toast; reload preserves saved values
   - Tab "Klassen-Sperrzeiten": Add → row appears + green toast; Edit → row updated; Toggle Switch silent; Delete → WarnDialog → row removed; 2+ rows same class → InfoBanner
   - Tab "Fach-Präferenzen": both sub-tabs CRUD; sub-tab switch works; mobile renders as ToggleGroup
   - Generator-Page (/admin/solver) shows new card at top with deep-link
4. Mobile viewport (375px): all interactive elements ≥ 44px tap zones; tab-bar horizontally scrollable
</verification>

<success_criteria>
- All 5 SOLVER-XX requirements have a working UI surface
- All Phase 10.2-04 silent-4xx-invariante checks pass (every mutation hook has explicit onError)
- TypeScript compiles cleanly across web app
- Plan 14-03 (E2E) can target stable selectors and route paths defined in this plan
</success_criteria>

<output>
After completion, create `.planning/phases/14-solver-tuning/14-02-SUMMARY.md` with:
- Confirmed sidebar role-gating (admin-only verified)
- List of all hook query keys used (for E2E test reference)
- Live smoke checklist results
- Final number of sliders rendered (8 vs 9 — depends on Plan 14-01 Task 5 fallback decision)
- Any backend extensions required for DriftBanner (e.g., GET /constraint-weights returning `lastUpdatedAt`)
</output>
