---
phase: 10-schulstammdaten-zeitraster
plan: 03b
type: execute
wave: 4
depends_on: [01a, 01b, 02, 03a]
files_modified:
  - apps/web/src/hooks/useSchool.ts
  - apps/web/src/hooks/useTimeGrid.ts
  - apps/web/src/hooks/useSchoolYears.ts
  - apps/web/src/hooks/useActiveTimetableRun.ts
  - apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx
  - apps/web/src/components/admin/school-settings/__tests__/SchoolDetailsTab.spec.tsx
autonomous: true
requirements:
  - SCHOOL-01
  - SCHOOL-04
must_haves:
  truths:
    - "useSchool / useFirstSchool / useCreateSchool / useUpdateSchool exported with TanStack Query + specific invalidation"
    - "useTimeGrid / useUpdateTimeGrid + TimeGridConflictError class exported"
    - "useSchoolYears / useCreateSchoolYear / useUpdateSchoolYear / useActivateSchoolYear / useDeleteSchoolYear + SchoolYearOrphanError class exported"
    - "useActiveTimetableRun exported (powers OptionsTab status line)"
    - "Stammdaten tab shows empty-flow inline-create when no school exists; on POST success, schoolId enters useSchoolContext store and tabs 2-4 enable without reload"
    - "Stammdaten tab edit mode renders Schulname, Schultyp (7 options), Address (Strasse/PLZ/Ort) using RHF + zodResolver(SchoolDetailsSchema)"
    - "On successful save, form.reset(serverResponse) is called so isDirty returns to false (Dirty-Reset Discipline)"
  artifacts:
    - path: "apps/web/src/hooks/useSchool.ts"
      exports: ["useSchool", "useFirstSchool", "useUpdateSchool", "useCreateSchool", "schoolKeys"]
    - path: "apps/web/src/hooks/useTimeGrid.ts"
      exports: ["useTimeGrid", "useUpdateTimeGrid", "TimeGridConflictError", "timeGridKeys"]
    - path: "apps/web/src/hooks/useSchoolYears.ts"
      exports: ["useSchoolYears", "useCreateSchoolYear", "useUpdateSchoolYear", "useActivateSchoolYear", "useDeleteSchoolYear", "SchoolYearOrphanError", "schoolYearKeys"]
    - path: "apps/web/src/hooks/useActiveTimetableRun.ts"
      exports: ["useActiveTimetableRun", "ActiveRunDto"]
    - path: "apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx"
      provides: "Full Stammdaten tab — empty-flow + edit + 7 Schultyp options"
  key_links:
    - from: "SchoolDetailsTab onSuccess (create)"
      to: "useSchoolContext setContext"
      via: "store mutation enables tabs 2-4"
      pattern: "setContext\\(\\{ schoolId: created\\.id"
    - from: "useSchool hooks"
      to: "/api/v1/schools/:id"
      via: "apiFetch + TanStack Query"
      pattern: "apiFetch\\(`/api/v1/schools/"
---

<objective>
Wave 3 frontend foundation (split B): TanStack Query hooks bundle (useSchool, useTimeGrid, useSchoolYears, useActiveTimetableRun) + Stammdaten tab implementation (SCHOOL-01, D-03 empty-flow). Replaces the SchoolDetailsTab placeholder created in Plan 03a.

Purpose: The hook bundles are imported by Plan 03b's SchoolDetailsTab, by Plan 04's TimeGridTab, and by Plan 05's SchoolYearsTab/OptionsTab. Without them, no UI can read or write data. The Stammdaten tab is the empty-flow pattern-setter (D-03 inline-create) that future tabs replicate; it also gates tabs 2-4 by setting schoolId in the Zustand store after a successful create.

Output: 4 TanStack Query hook bundles in apps/web/src/hooks/ with query-key factories + read + mutation hooks + 409 error subclasses (TimeGridConflictError, SchoolYearOrphanError); SchoolDetailsTab.tsx fully replacing the placeholder with the empty-flow + edit-mode form per UI-SPEC §3.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/10-schulstammdaten-zeitraster/10-CONTEXT.md
@.planning/phases/10-schulstammdaten-zeitraster/10-RESEARCH.md
@.planning/phases/10-schulstammdaten-zeitraster/10-PATTERNS.md
@.planning/phases/10-schulstammdaten-zeitraster/10-VALIDATION.md
@.planning/phases/10-schulstammdaten-zeitraster/10-UI-SPEC.md
@.planning/phases/10-schulstammdaten-zeitraster/10-03a-SUMMARY.md
@apps/web/src/hooks/useResources.ts
@apps/web/src/hooks/useTimetable.ts
@apps/web/src/lib/api.ts
@apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx
@apps/web/src/stores/school-context-store.ts

<interfaces>
<!-- All available imports after Plans 01a/01b/02/03a land. -->

From @schoolflow/shared (Plan 01b):
```typescript
import {
  SchoolDetailsSchema, SchoolDetailsInput, SCHOOL_TYPES, SchoolType,
  TimeGridSchema, TimeGridInput, PeriodSchema, PeriodInput,
  SchoolYearSchema, SchoolYearInput,
  type SchoolDto, type TimeGridDto, type SchoolYearDto, type PeriodDto,
} from '@schoolflow/shared';
```

From apps/web/src/lib/api.ts:
```typescript
export function apiFetch(path: string, init?: RequestInit): Promise<Response>;
```

From apps/web/src/hooks/useResources.ts (canonical hook bundle pattern to mirror):
```typescript
export const resourceKeys = { all: (schoolId: string) => ['resources', schoolId] as const };
export function useResources(schoolId: string | undefined) { return useQuery({...}); }
export function useUpdateResource(schoolId: string) { /* mutation w/ specific invalidation */ }
```

From apps/web/src/stores/school-context-store.ts (after Plan 03a extension):
```typescript
interface SchoolContextState {
  schoolId: string | null;
  personType: 'TEACHER' | 'STUDENT' | 'PARENT' | null;
  activeSchoolYearId: string | null;
  abWeekEnabled: boolean;
  setContext: (data: { schoolId?: string | null; personType?: ...; activeSchoolYearId?: string | null; abWeekEnabled?: boolean }) => void;
}
```

From apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx (Plan 03a):
```typescript
export function StickyMobileSaveBar(props: { isDirty: boolean; isSaving: boolean; onSave: () => void; label?: string }): JSX.Element;
```

Backend endpoints (from Plan 02):
- GET    /api/v1/schools                                    (list — for resolving schoolId; existing)
- POST   /api/v1/schools                                    (create new school)
- GET    /api/v1/schools/:id                                (detail)
- PUT    /api/v1/schools/:id                                (update — accepts abWeekEnabled)
- GET    /api/v1/schools/:schoolId/school-years             (list)
- POST   /api/v1/schools/:schoolId/school-years             (create)
- PATCH  /api/v1/schools/:schoolId/school-years/:yearId     (update)
- POST   /api/v1/schools/:schoolId/school-years/:yearId/activate
- DELETE /api/v1/schools/:schoolId/school-years/:yearId
- PUT    /api/v1/schools/:schoolId/time-grid?force=true|false  (returns 409 + {impactedRunsCount} on guard)

Active TimetableRun lookup:
- The timetable controller exposes `GET /schools/:schoolId/timetable/runs` (returns max 3 runs, newest first).
- Active-run filter: schema confirms `TimetableRun.isActive: boolean` (line 692). Use `?status=ACTIVE&limit=1` if backend supports query filter; otherwise fetch the list and pick `.find(r => r.isActive)` client-side. Verify the actual endpoint via `grep -n "@Get\\('runs'\\)" apps/api/src/modules/timetable/timetable.controller.ts`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: TanStack Query hooks bundle + SchoolDetailsTab implementation (SCHOOL-01, D-03 empty-flow)</name>
  <files>apps/web/src/hooks/useSchool.ts, apps/web/src/hooks/useTimeGrid.ts, apps/web/src/hooks/useSchoolYears.ts, apps/web/src/hooks/useActiveTimetableRun.ts, apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx, apps/web/src/components/admin/school-settings/__tests__/SchoolDetailsTab.spec.tsx</files>
  <read_first>
    - apps/web/src/hooks/useResources.ts (canonical hook bundle pattern: queryKeys factory + useQuery + 3 useMutation funcs; specific invalidation on success)
    - apps/web/src/hooks/useTimetable.ts (hierarchical query-keys lines 11-22)
    - apps/web/src/lib/api.ts (apiFetch signature)
    - apps/web/src/routes/_authenticated/admin/resources.tsx (form layout precedent — replace useState with RHF; lines 215-303)
    - apps/web/src/components/ui/input.tsx, label.tsx, button.tsx, select.tsx, card.tsx (shadcn primitives — confirm import paths)
    - apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx (Plan 03a — import path)
    - .planning/phases/10-schulstammdaten-zeitraster/10-PATTERNS.md "useSchool/useTimeGrid/useSchoolYears" sections + "*Tab.tsx" + "Form scaffolding" sections
    - .planning/phases/10-schulstammdaten-zeitraster/10-RESEARCH.md §3.1 (RHF+Zod canonical), §3.2-3.3 (dirty + blocker), §8 Pitfalls (Dirty-Reset Discipline; Zustand empty-flow timing; specific invalidation; FormData Content-Type; 409 handling)
    - .planning/phases/10-schulstammdaten-zeitraster/10-UI-SPEC.md §3 (Stammdaten tab spec verbatim — fields, copy, empty-state, save), §2.3-2.7 (form layout, save button, dirty), §13.4 (error copy)
  </read_first>
  <behavior>
    - Test 1 (SchoolDetailsTab.spec): with no school in DB (mocked useSchool returns {data:null}), renders empty-state hero with copy "Noch keine Schule angelegt" + inline-create form with Save button labeled "Schule anlegen".
    - Test 2 (SchoolDetailsTab.spec): with a school loaded (mocked useSchool returns {data: SchoolDto}), form renders pre-filled with name, schoolType, address.street/zip/city; Save button labeled "Speichern" and disabled until isDirty.
    - Test 3 (SchoolDetailsTab.spec): submitting empty name triggers RHF validation error "Name erforderlich" displayed via aria-describedby below the input; PLZ "abc" triggers "PLZ muss 4 oder 5 Ziffern haben".
    - Test 4 (SchoolDetailsTab.spec): on successful create (mock POST returns SchoolDto), useSchoolContext.setContext is called with {schoolId: created.id}; toast.success fires with "Schule angelegt..."; form.reset is called with the server response.
    - Test 5 (SchoolDetailsTab.spec): on successful update, form.reset(serverResponse) called -> isDirty back to false (verified by Save button becoming disabled).
  </behavior>
  <action>
    Step A — Create apps/web/src/hooks/useSchool.ts mirroring useResources.ts structure. Required exports (per UI-SPEC §14.2 query-key discipline):
    ```typescript
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
    import { apiFetch } from '@/lib/api';
    import { toast } from 'sonner';
    import type { SchoolDto, SchoolDetailsInput } from '@schoolflow/shared';

    export const schoolKeys = {
      one: (schoolId: string) => ['school', schoolId] as const,
      list: () => ['schools'] as const,
    };

    export function useSchool(schoolId: string | undefined) {
      return useQuery({
        queryKey: schoolKeys.one(schoolId ?? ''),
        queryFn: async (): Promise<SchoolDto | null> => {
          if (!schoolId) return null;
          const res = await apiFetch(`/api/v1/schools/${schoolId}`);
          if (res.status === 404) return null;
          if (!res.ok) throw new Error('Schule konnte nicht geladen werden');
          return res.json();
        },
        enabled: schoolId !== undefined,
      });
    }

    // Returns the FIRST school for the authenticated admin (helper for empty-flow detection).
    export function useFirstSchool() {
      return useQuery({
        queryKey: schoolKeys.list(),
        queryFn: async (): Promise<SchoolDto | null> => {
          const res = await apiFetch('/api/v1/schools');
          if (!res.ok) throw new Error('Schulen konnten nicht geladen werden');
          const arr: SchoolDto[] = await res.json();
          return arr[0] ?? null;
        },
      });
    }

    export function useCreateSchool() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (dto: SchoolDetailsInput &amp; { abWeekEnabled?: boolean }): Promise<SchoolDto> => {
          const res = await apiFetch('/api/v1/schools', { method: 'POST', body: JSON.stringify(dto) });
          if (!res.ok) throw new Error('Schule konnte nicht angelegt werden');
          return res.json();
        },
        onSuccess: (server) => {
          qc.invalidateQueries({ queryKey: schoolKeys.list() });
          qc.setQueryData(schoolKeys.one(server.id), server);
          toast.success('Schule angelegt. Sie koennen jetzt Zeitraster und Schuljahr pflegen.');
        },
        onError: (e: Error) => toast.error(e.message),
      });
    }

    export function useUpdateSchool(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (dto: Partial<SchoolDetailsInput> &amp; { abWeekEnabled?: boolean }): Promise<SchoolDto> => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}`, { method: 'PUT', body: JSON.stringify(dto) });
          if (!res.ok) throw new Error('Aenderungen konnten nicht gespeichert werden');
          return res.json();
        },
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: schoolKeys.one(schoolId) });
          toast.success('Aenderungen gespeichert.');
        },
        onError: (e: Error) => toast.error(e.message),
      });
    }
    ```

    Step B — Create apps/web/src/hooks/useTimeGrid.ts:
    ```typescript
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
    import { apiFetch } from '@/lib/api';
    import { toast } from 'sonner';
    import type { TimeGridDto, TimeGridInput } from '@schoolflow/shared';

    export const timeGridKeys = {
      one: (schoolId: string) => ['time-grid', schoolId] as const,
    };

    export function useTimeGrid(schoolId: string | undefined) {
      return useQuery({
        queryKey: timeGridKeys.one(schoolId ?? ''),
        queryFn: async (): Promise<TimeGridDto | null> => {
          if (!schoolId) return null;
          const res = await apiFetch(`/api/v1/schools/${schoolId}/time-grid`);
          if (res.status === 404) return null;
          if (!res.ok) throw new Error('Zeitraster konnte nicht geladen werden');
          return res.json();
        },
        enabled: !!schoolId,
      });
    }

    export class TimeGridConflictError extends Error {
      constructor(public impactedRunsCount: number) {
        super(`${impactedRunsCount} aktiver Stundenplan verwendet dieses Zeitraster.`);
        this.name = 'TimeGridConflictError';
      }
    }

    export function useUpdateTimeGrid(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ dto, force }: { dto: TimeGridInput; force?: boolean }): Promise<TimeGridDto> => {
          const url = `/api/v1/schools/${schoolId}/time-grid${force ? '?force=true' : ''}`;
          const res = await apiFetch(url, { method: 'PUT', body: JSON.stringify(dto) });
          if (res.status === 409) {
            const body = await res.json();
            throw new TimeGridConflictError(body.impactedRunsCount ?? 0);
          }
          if (!res.ok) throw new Error('Zeitraster konnte nicht gespeichert werden');
          return res.json();
        },
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: timeGridKeys.one(schoolId) });
          toast.success('Aenderungen gespeichert.');
        },
        onError: (e: Error) => {
          if (!(e instanceof TimeGridConflictError)) toast.error(e.message);
          // Conflict is handled by Plan 04 dialog — no toast.
        },
      });
    }
    ```

    Step C — Create apps/web/src/hooks/useSchoolYears.ts (also includes useHolidays + useAutonomousDays for Plan 05's nested sub-UI — backend endpoints from Plan 02 Task 3 are now available):
    ```typescript
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
    import { apiFetch } from '@/lib/api';
    import { toast } from 'sonner';
    import type { SchoolYearDto, SchoolYearInput } from '@schoolflow/shared';

    export const schoolYearKeys = {
      all: (schoolId: string) => ['school-years', schoolId] as const,
      one: (schoolId: string, yearId: string) => ['school-years', schoolId, yearId] as const,
    };

    export function useSchoolYears(schoolId: string | undefined) {
      return useQuery({
        queryKey: schoolYearKeys.all(schoolId ?? ''),
        queryFn: async (): Promise<SchoolYearDto[]> => {
          if (!schoolId) return [];
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years`);
          if (!res.ok) throw new Error('Schuljahre konnten nicht geladen werden');
          return res.json();
        },
        enabled: !!schoolId,
      });
    }

    export function useCreateSchoolYear(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (dto: SchoolYearInput): Promise<SchoolYearDto> => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years`, { method: 'POST', body: JSON.stringify(dto) });
          if (!res.ok) throw new Error('Schuljahr konnte nicht angelegt werden');
          return res.json();
        },
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) });
          toast.success('Schuljahr angelegt.');
        },
        onError: (e: Error) => toast.error(e.message),
      });
    }

    export function useUpdateSchoolYear(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ yearId, dto }: { yearId: string; dto: Partial<SchoolYearInput> }): Promise<SchoolYearDto> => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years/${yearId}`, { method: 'PATCH', body: JSON.stringify(dto) });
          if (!res.ok) throw new Error('Schuljahr konnte nicht aktualisiert werden');
          return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
        onError: (e: Error) => toast.error(e.message),
      });
    }

    export function useActivateSchoolYear(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (yearId: string) => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years/${yearId}/activate`, { method: 'POST' });
          if (!res.ok) throw new Error('Schuljahr konnte nicht aktiviert werden');
          return res.json();
        },
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) });
          qc.invalidateQueries({ queryKey: ['school', schoolId] });  // banner state
          qc.invalidateQueries({ queryKey: ['timetable-run:active', schoolId] });
          toast.success('Aktives Schuljahr gewechselt.');
        },
        onError: (e: Error) => toast.error(e.message),
      });
    }

    export class SchoolYearOrphanError extends Error {
      constructor(public referenceCount: number) {
        super(`Schuljahr wird noch von ${referenceCount} Eintraegen verwendet und kann nicht geloescht werden.`);
        this.name = 'SchoolYearOrphanError';
      }
    }

    export function useDeleteSchoolYear(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (yearId: string) => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years/${yearId}`, { method: 'DELETE' });
          if (res.status === 409) {
            const body = await res.json();
            throw new SchoolYearOrphanError(body.referenceCount ?? 0);
          }
          if (!res.ok) throw new Error('Schuljahr konnte nicht geloescht werden');
        },
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) });
          toast.success('Schuljahr geloescht.');
        },
        onError: (e: Error) => {
          if (e instanceof SchoolYearOrphanError) {
            toast.error(`Schuljahr kann nicht geloescht werden — wird noch von ${e.referenceCount} Eintraegen verwendet.`);
          } else {
            toast.error(e.message);
          }
        },
      });
    }

    // Holiday + AutonomousDay nested CRUD (D-08 sub-UI; backend endpoints from Plan 02 Task 3)
    export interface HolidayInput { name: string; startDate: string; endDate: string; }
    export interface AutonomousDayInput { date: string; reason?: string; }

    export function useCreateHoliday(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ yearId, dto }: { yearId: string; dto: HolidayInput }) => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years/${yearId}/holidays`, { method: 'POST', body: JSON.stringify(dto) });
          if (!res.ok) throw new Error('Ferieneintrag konnte nicht angelegt werden');
          return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
        onError: (e: Error) => toast.error(e.message),
      });
    }

    export function useDeleteHoliday(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ yearId, holidayId }: { yearId: string; holidayId: string }) => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years/${yearId}/holidays/${holidayId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Ferieneintrag konnte nicht geloescht werden');
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
        onError: (e: Error) => toast.error(e.message),
      });
    }

    export function useCreateAutonomousDay(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ yearId, dto }: { yearId: string; dto: AutonomousDayInput }) => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years/${yearId}/autonomous-days`, { method: 'POST', body: JSON.stringify(dto) });
          if (!res.ok) throw new Error('Schulautonomer Tag konnte nicht angelegt werden');
          return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
        onError: (e: Error) => toast.error(e.message),
      });
    }

    export function useDeleteAutonomousDay(schoolId: string) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ yearId, dayId }: { yearId: string; dayId: string }) => {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years/${yearId}/autonomous-days/${dayId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Schulautonomer Tag konnte nicht geloescht werden');
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
        onError: (e: Error) => toast.error(e.message),
      });
    }
    ```

    Step D — Create apps/web/src/hooks/useActiveTimetableRun.ts (used by Plan 05 OptionsTab to show the current-run A/B status):
    ```typescript
    import { useQuery } from '@tanstack/react-query';
    import { apiFetch } from '@/lib/api';

    export interface ActiveRunDto { id: string; abWeekEnabled: boolean; status: string; }

    export function useActiveTimetableRun(schoolId: string | undefined) {
      return useQuery({
        queryKey: ['timetable-run:active', schoolId ?? ''],
        queryFn: async (): Promise<ActiveRunDto | null> => {
          if (!schoolId) return null;
          const res = await apiFetch(`/api/v1/schools/${schoolId}/timetable/runs`);
          if (!res.ok) return null;
          const arr: any[] = await res.json();
          // schema confirms TimetableRun.isActive: boolean (line 692). Filter client-side.
          const active = arr.find((r) => r.isActive === true) ?? null;
          if (!active) return null;
          return { id: active.id, abWeekEnabled: !!active.abWeekEnabled, status: String(active.status) };
        },
        enabled: !!schoolId,
      });
    }
    ```
    NOTE: If the runs endpoint returns a different shape (e.g. wraps in `{runs: [...]}`), the executor must adjust the unwrap. The shape MUST result in `{id, abWeekEnabled, status}` for downstream consumers.

    Step E — Implement apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx (REPLACE the placeholder created in Plan 03a). Full per UI-SPEC §3 verbatim:
    ```tsx
    import { useEffect } from 'react';
    import { useForm } from 'react-hook-form';
    import { zodResolver } from '@hookform/resolvers/zod';
    import { SchoolDetailsSchema, type SchoolDetailsInput, SCHOOL_TYPES } from '@schoolflow/shared';
    import { useSchoolContext } from '@/stores/school-context-store';
    import { useFirstSchool, useSchool, useCreateSchool, useUpdateSchool } from '@/hooks/useSchool';
    import { Card } from '@/components/ui/card';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Button } from '@/components/ui/button';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { StickyMobileSaveBar } from '@/components/admin/shared/StickyMobileSaveBar';
    import { Building2, Loader2 } from 'lucide-react';

    const SCHOOL_TYPE_LABELS: Record<typeof SCHOOL_TYPES[number], string> = {
      VS: 'Volksschule',
      NMS: 'Neue Mittelschule',
      AHS: 'Allgemeinbildende hoehere Schule',
      BHS: 'Berufsbildende hoehere Schule',
      BMS: 'Berufsbildende mittlere Schule',
      PTS: 'Polytechnische Schule',
      ASO: 'Allgemeine Sonderschule',
    };

    interface Props { onDirtyChange?: (d: boolean) => void; }

    export function SchoolDetailsTab({ onDirtyChange }: Props) {
      const schoolId = useSchoolContext((s) => s.schoolId);
      const setContext = useSchoolContext((s) => s.setContext);
      const firstSchoolQuery = useFirstSchool();
      const schoolQuery = useSchool(schoolId ?? undefined);

      // Hydrate Zustand from first school if no schoolId yet (initial bootstrap)
      useEffect(() => {
        if (!schoolId &amp;&amp; firstSchoolQuery.data) {
          setContext({ schoolId: firstSchoolQuery.data.id });
        }
      }, [schoolId, firstSchoolQuery.data, setContext]);

      const isEmpty = !schoolId &amp;&amp; firstSchoolQuery.isFetched &amp;&amp; !firstSchoolQuery.data;
      const school = schoolQuery.data ?? null;

      const form = useForm<SchoolDetailsInput>({
        resolver: zodResolver(SchoolDetailsSchema),
        defaultValues: {
          name: school?.name ?? '',
          schoolType: (school?.schoolType ?? 'AHS') as any,
          address: { street: school?.address?.street ?? '', zip: school?.address?.zip ?? '', city: school?.address?.city ?? '' },
        },
      });
      const { register, handleSubmit, formState: { errors, isDirty, isSubmitting }, reset, setValue, watch } = form;
      useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
      useEffect(() => {
        if (school) reset({ name: school.name, schoolType: school.schoolType as any, address: school.address });
      }, [school, reset]);

      const createMut = useCreateSchool();
      const updateMut = useUpdateSchool(schoolId ?? '');
      const isSaving = createMut.isPending || updateMut.isPending;

      const onSubmit = handleSubmit(async (values) => {
        if (isEmpty) {
          const created = await createMut.mutateAsync(values);
          setContext({ schoolId: created.id, abWeekEnabled: created.abWeekEnabled ?? false });
          reset({ name: created.name, schoolType: created.schoolType as any, address: created.address });
        } else if (schoolId) {
          const updated = await updateMut.mutateAsync(values);
          reset({ name: updated.name, schoolType: updated.schoolType as any, address: updated.address });
        }
      });

      const schoolType = watch('schoolType');

      return (
        <Card className="border-none shadow-none md:border md:shadow-sm p-6 md:p-8">
          {isEmpty &amp;&amp; (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden />
              <h2 className="text-lg font-semibold mb-2">Noch keine Schule angelegt</h2>
              <p className="text-sm text-muted-foreground">
                Legen Sie zuerst die Stammdaten Ihrer Schule an. Anschliessend koennen Sie Zeitraster, Schuljahre und Optionen konfigurieren.
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold">Stammdaten</h2>
            <p className="text-sm text-muted-foreground">Name, Schultyp und Adresse der Schule.</p>

            <div className="space-y-1.5">
              <Label htmlFor="name">Schulname *</Label>
              <Input id="name" {...register('name')} placeholder="z. B. BG/BRG Wien Gymnasium Rahlgasse" className="h-11 md:h-10" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-msg' : undefined} disabled={isSaving} />
              {errors.name &amp;&amp; <p id="name-msg" className="text-xs text-destructive mt-1.5">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schoolType">Schultyp *</Label>
              <Select value={schoolType} onValueChange={(v) => setValue('schoolType', v as any, { shouldDirty: true })} disabled={isSaving}>
                <SelectTrigger id="schoolType" className="h-11 md:h-10"><SelectValue placeholder="Schultyp auswaehlen" /></SelectTrigger>
                <SelectContent>
                  {SCHOOL_TYPES.map((t) => (<SelectItem key={t} value={t}>{SCHOOL_TYPE_LABELS[t]}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.schoolType &amp;&amp; <p className="text-xs text-destructive mt-1.5">{errors.schoolType.message}</p>}
            </div>

            <p className="text-sm font-medium mt-4 text-muted-foreground">Adresse</p>
            <div className="space-y-1.5">
              <Label htmlFor="street">Strasse *</Label>
              <Input id="street" {...register('address.street')} className="h-11 md:h-10" aria-invalid={!!errors.address?.street} disabled={isSaving} />
              {errors.address?.street &amp;&amp; <p className="text-xs text-destructive mt-1.5">{errors.address.street.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-1.5">
                <Label htmlFor="zip">PLZ *</Label>
                <Input id="zip" {...register('address.zip')} placeholder="1010" className="h-11 md:h-10" aria-invalid={!!errors.address?.zip} disabled={isSaving} />
                {errors.address?.zip &amp;&amp; <p className="text-xs text-destructive mt-1.5">{errors.address.zip.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="city">Ort *</Label>
                <Input id="city" {...register('address.city')} className="h-11 md:h-10" aria-invalid={!!errors.address?.city} disabled={isSaving} />
                {errors.address?.city &amp;&amp; <p className="text-xs text-destructive mt-1.5">{errors.address.city.message}</p>}
              </div>
            </div>

            {/* Desktop save button */}
            <div className="hidden md:flex justify-end mt-6">
              <Button type="submit" disabled={!isDirty || isSaving} className="min-w-[8rem]">
                {isSaving &amp;&amp; <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEmpty ? 'Schule anlegen' : 'Speichern'}
              </Button>
            </div>
          </form>

          {/* Mobile sticky save bar */}
          <StickyMobileSaveBar isDirty={isDirty} isSaving={isSaving} onSave={() => onSubmit()} label={isEmpty ? 'Schule anlegen' : 'Speichern'} />
        </Card>
      );
    }
    ```

    Step F — Write apps/web/src/components/admin/school-settings/__tests__/SchoolDetailsTab.spec.tsx covering all 5 behaviors. Mock useFirstSchool, useSchool, useCreateSchool, useUpdateSchool, useSchoolContext (via Zustand mock or vi.mock); use @testing-library/react + userEvent.
  </action>
  <verify>
    <automated>cd /Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/apps/web &amp;&amp; pnpm exec vitest run src/components/admin/school-settings/__tests__/SchoolDetailsTab.spec.tsx &amp;&amp; pnpm exec tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -F "schoolKeys" apps/web/src/hooks/useSchool.ts` returns at least 2 matches (export + usage).
    - `grep -F "useCreateSchool" apps/web/src/hooks/useSchool.ts` returns at least 1 export match.
    - `grep -F "useUpdateSchool" apps/web/src/hooks/useSchool.ts` returns at least 1 export match.
    - `grep -F "TimeGridConflictError" apps/web/src/hooks/useTimeGrid.ts` returns at least 2 matches (class + export).
    - `grep -F "useActivateSchoolYear" apps/web/src/hooks/useSchoolYears.ts` returns at least 1 match.
    - `grep -F "SchoolYearOrphanError" apps/web/src/hooks/useSchoolYears.ts` returns at least 1 match.
    - `grep -F "useCreateHoliday" apps/web/src/hooks/useSchoolYears.ts` returns at least 1 match.
    - `grep -F "useDeleteHoliday" apps/web/src/hooks/useSchoolYears.ts` returns at least 1 match.
    - `grep -F "useCreateAutonomousDay" apps/web/src/hooks/useSchoolYears.ts` returns at least 1 match.
    - `grep -F "useDeleteAutonomousDay" apps/web/src/hooks/useSchoolYears.ts` returns at least 1 match.
    - `grep -F "Noch keine Schule angelegt" apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx` returns 1 match.
    - `grep -F "Schule anlegen" apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx` returns at least 1 match.
    - `grep -F "Volksschule" apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx` returns 1 match (verifies German Schultyp labels present).
    - `grep -F "zodResolver(SchoolDetailsSchema)" apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx` returns 1 match.
    - `grep -F "setContext({ schoolId: created.id" apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx` returns 1 match (Zustand empty-flow timing per RESEARCH §8 pitfall).
    - `grep -F "reset(" apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx` returns at least 2 matches (Dirty-Reset Discipline per RESEARCH §8).
    - `grep -F "h-11 md:h-10" apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx` returns at least 4 matches (44px mobile touch target per UI-SPEC §10.5).
    - `cd apps/web &amp;&amp; pnpm exec tsc --noEmit` exits 0.
    - `cd apps/web &amp;&amp; pnpm exec vitest run src/components/admin/school-settings/__tests__/SchoolDetailsTab.spec.tsx` exits 0 with all 5 behaviors passing.
  </acceptance_criteria>
  <done>
    All 4 hook bundles created with TanStack Query + specific-key invalidation + 409 error subclasses + Holiday/AutonomousDay nested CRUD hooks; SchoolDetailsTab fully implements UI-SPEC §3 (empty-flow inline-create + edit mode + RHF/Zod + mobile save bar + 44px targets); on successful create, useSchoolContext.setContext fires BEFORE the next render so tabs 2-4 enable; form.reset called on success so isDirty returns false; Vitest + tsc green.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → API | Authenticated admin POSTs school create / PUTs updates |
| Client form input → Zod schema | First validation gate (defense-in-depth with API class-validator) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-10-03b-01 | Information Disclosure | useFirstSchool reveals school existence to any authenticated user | accept | Endpoint is GET /schools — already permissions-gated server-side; admins/schulleitung roles have read access by design |
| T-10-03b-02 | Spoofing | Form input could spoof another school's data via direct PUT | mitigate | Update mutation always uses schoolId from useSchoolContext (which the user can only set via successful create or by being a member of an existing school via Zustand bootstrap from useFirstSchool); backend permission guard catches mismatches |
| T-10-03b-03 | Tampering | Zod client-side validation can be bypassed by direct API call | accept | Defense-in-depth: API still runs class-validator on every request (Phase 1 D-15 per CONTEXT.md); client Zod is UX layer only |
| T-10-03b-04 | Denial of Service | useFirstSchool refetches on every mount | accept | TanStack Query default staleTime caching prevents over-fetching; single school bootstrap query |
| T-10-03b-05 | Repudiation | Successful save has no client-side audit trail | accept | All mutations flow through API which has AuditInterceptor (Phase 1 D-05); no additional client logging required |
</threat_model>

<verification>
1. With no school in DB: Stammdaten tab shows empty-state hero + form with "Schule anlegen" button; tabs 2-4 are visibly disabled.
2. After successful POST: schoolId enters Zustand → tabs 2-4 enable instantly; toast shows German message.
3. Edit existing school: form pre-fills; save button disabled until field changes; success toast + form.reset returns isDirty to false.
4. tsc --noEmit and vitest run both exit 0.
</verification>

<success_criteria>
- [ ] 4 TanStack Query hook bundles (useSchool, useTimeGrid, useSchoolYears, useActiveTimetableRun) export query-key factories + read + mutation hooks; specific-key invalidation
- [ ] useSchoolYears bundle additionally exports useCreateHoliday, useDeleteHoliday, useCreateAutonomousDay, useDeleteAutonomousDay (D-08 nested sub-UI)
- [ ] SchoolDetailsTab implements UI-SPEC §3 verbatim (empty-flow + edit mode + 7 Schultyp options + Address grid + 44px touch + Dirty-Reset Discipline)
- [ ] All Vitest specs in this plan pass; apps/web tsc --noEmit green
</success_criteria>

<output>
After completion, create `.planning/phases/10-schulstammdaten-zeitraster/10-03b-SUMMARY.md` documenting:
- Active TimetableRun endpoint URL actually used in useActiveTimetableRun.ts (and any client-side filter logic if the backend doesn't support a status query param)
- Whether SchoolDetailsTab needed to fall back to controlled Select handling (RHF + shadcn Select integration is non-trivial — note any Controller wrapper used)
- Confirmation that useCreateHoliday/useDeleteHoliday/useCreateAutonomousDay/useDeleteAutonomousDay all return successful 201/204 responses end-to-end (verified by `curl` against the dev API)
</output>
</output>
