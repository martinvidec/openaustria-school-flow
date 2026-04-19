---
phase: 10-schulstammdaten-zeitraster
plan: 03a
type: execute
wave: 3
depends_on: [01a, 01b, 02]
files_modified:
  - apps/web/src/routes/_authenticated/admin/school.settings.tsx
  - apps/web/src/components/admin/shared/PageShell.tsx
  - apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx
  - apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx
  - apps/web/src/components/admin/shared/InfoBanner.tsx
  - apps/web/src/components/admin/shared/WarnDialog.tsx
  - apps/web/src/components/admin/shared/__tests__/UnsavedChangesDialog.spec.tsx
  - apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx
  - apps/web/src/components/admin/school-settings/TimeGridTab.tsx
  - apps/web/src/components/admin/school-settings/SchoolYearsTab.tsx
  - apps/web/src/components/admin/school-settings/OptionsTab.tsx
  - apps/web/src/stores/school-context-store.ts
  - apps/web/src/components/layout/AppSidebar.tsx
  - apps/web/src/components/layout/MobileSidebar.tsx
  - apps/web/src/routes/_authenticated/admin/__tests__/school.settings.spec.tsx
autonomous: true
requirements:
  - SCHOOL-01
must_haves:
  truths:
    - "Route /admin/school/settings renders 4 tabs (Stammdaten, Zeitraster, Schuljahre, Optionen) at desktop"
    - "Mobile (< md) renders the tab bar as a Select dropdown"
    - "Active tab persists via ?tab= search param and survives reload"
    - "Tabs 2-4 are disabled when schoolId is undefined (empty-flow)"
    - "Sidebar entry 'Schulverwaltung' navigates admin/schulleitung users to /admin/school/settings"
    - "UnsavedChangesDialog component is reusable (apps/web/src/components/admin/shared/) with {onDiscard, onCancel, onSaveAndContinue, isSaving} props"
    - "Tab-to-tab switch with isDirty triggers UnsavedChangesDialog; useBlocker triggers it on router navigation"
    - "Zustand school-context-store extended with activeSchoolYearId and abWeekEnabled"
    - "Four placeholder tab components exist so the route compiles; Plan 03b/04/05 replace bodies"
  artifacts:
    - path: "apps/web/src/routes/_authenticated/admin/school.settings.tsx"
      provides: "Route shell with 4 TabsTrigger + 4 TabsContent"
      contains: "createFileRoute"
    - path: "apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx"
      provides: "Reusable dialog with 3 buttons"
    - path: "apps/web/src/components/admin/shared/PageShell.tsx"
      provides: "Reusable breadcrumb + title shell"
    - path: "apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx"
      provides: "Mobile-only sticky bottom save bar"
    - path: "apps/web/src/components/admin/shared/InfoBanner.tsx"
      provides: "Reusable info banner (used in §5.6, §6.2)"
    - path: "apps/web/src/components/admin/shared/WarnDialog.tsx"
      provides: "Reusable warn dialog with AlertTriangle"
    - path: "apps/web/src/components/layout/AppSidebar.tsx"
      contains: "Schulverwaltung"
    - path: "apps/web/src/components/layout/MobileSidebar.tsx"
      contains: "Schulverwaltung"
  key_links:
    - from: "school.settings.tsx"
      to: "useSchoolContext store"
      via: "schoolId selector"
      pattern: "useSchoolContext\\(\\(s\\) => s\\.schoolId\\)"
---

<objective>
Wave 3 frontend foundation (split A): page-shell route + reusable shared admin components + Zustand extension + sidebar entry + four placeholder tab components. This plan establishes the v1.1 admin surface pattern (Phases 11-16 will reuse it per UI-SPEC §16 Reusability Manifest). Plan 03b replaces SchoolDetailsTab with the full Stammdaten implementation; Plans 04/05 replace TimeGridTab/SchoolYearsTab/OptionsTab.

Purpose: Without this plan, Plans 03b/04/05 cannot mount their tab components — the route file declares all 4 TabsContent slots so subsequent plans modify ONLY tab component files (no route-file conflict). Reusable shared components get extracted now per UI-SPEC §16 so Phases 11-16 import them by name. Plan 03b runs in Wave 3 immediately after this plan completes; it depends on 03a because it replaces the SchoolDetailsTab file declared here.

Output: Route file with full tab-shell composition; 5 reusable shared admin components in apps/web/src/components/admin/shared/; Zustand store extension for activeSchoolYearId + abWeekEnabled mirroring; sidebar entry "Schulverwaltung" in both AppSidebar and MobileSidebar; 4 placeholder tab components that downstream plans fill in; route + UnsavedChangesDialog spec coverage.
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
@.planning/phases/10-schulstammdaten-zeitraster/10-01a-SUMMARY.md
@.planning/phases/10-schulstammdaten-zeitraster/10-01b-SUMMARY.md
@.planning/phases/10-schulstammdaten-zeitraster/10-02-SUMMARY.md
@apps/web/src/routes/_authenticated/admin/timetable-edit.tsx
@apps/web/src/routes/_authenticated/admin/resources.tsx
@apps/web/src/components/rooms/ResourceList.tsx
@apps/web/src/components/timetable/ABWeekTabs.tsx
@apps/web/src/components/layout/AppSidebar.tsx
@apps/web/src/components/layout/MobileSidebar.tsx
@apps/web/src/stores/school-context-store.ts
@apps/web/src/lib/api.ts

<interfaces>
<!-- Available imports after Plans 01a/01b/02 land. Do NOT explore — use these directly. -->

From @schoolflow/shared (Plan 01b):
```typescript
import {
  SchoolDetailsSchema, SchoolDetailsInput, SCHOOL_TYPES, SchoolType,
  TimeGridSchema, TimeGridInput, PeriodSchema, PeriodInput,
  SchoolYearSchema, SchoolYearInput,
  type SchoolDto, type TimeGridDto, type SchoolYearDto, type PeriodDto,
} from '@schoolflow/shared';
```

From apps/web/src/stores/school-context-store.ts (current shape — extend, do not break):
```typescript
interface SchoolContextState {
  schoolId: string | null;
  personType: 'TEACHER' | 'STUDENT' | 'PARENT' | null;
  setContext: (data: { schoolId?: string | null; personType?: ... }) => void;
}
```

From @tanstack/react-router (1.168+):
```typescript
import { createFileRoute, useBlocker } from '@tanstack/react-router';
// useBlocker({ shouldBlockFn: () => boolean, withResolver: true }) -> { status, proceed, reset }
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Page shell route + reusable shared admin components + sidebar entry + Zustand extension + 4 placeholder tabs</name>
  <files>apps/web/src/routes/_authenticated/admin/school.settings.tsx, apps/web/src/components/admin/shared/PageShell.tsx, apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx, apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx, apps/web/src/components/admin/shared/InfoBanner.tsx, apps/web/src/components/admin/shared/WarnDialog.tsx, apps/web/src/components/admin/shared/__tests__/UnsavedChangesDialog.spec.tsx, apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx, apps/web/src/components/admin/school-settings/TimeGridTab.tsx, apps/web/src/components/admin/school-settings/SchoolYearsTab.tsx, apps/web/src/components/admin/school-settings/OptionsTab.tsx, apps/web/src/stores/school-context-store.ts, apps/web/src/components/layout/AppSidebar.tsx, apps/web/src/components/layout/MobileSidebar.tsx, apps/web/src/routes/_authenticated/admin/__tests__/school.settings.spec.tsx</files>
  <read_first>
    - apps/web/src/routes/_authenticated/admin/timetable-edit.tsx (createFileRoute pattern; lines 43-47)
    - apps/web/src/routes/_authenticated/admin/resources.tsx (loading/error/empty Card pattern lines 151-189)
    - apps/web/src/components/timetable/ABWeekTabs.tsx (Tabs primitive usage; lines 21-35)
    - apps/web/src/components/rooms/ResourceList.tsx (Delete-Confirm Dialog pattern lines 122-155)
    - apps/web/src/components/layout/AppSidebar.tsx (navItems array structure lines 33-106)
    - apps/web/src/components/layout/MobileSidebar.tsx (mirror navItems shape)
    - apps/web/src/stores/school-context-store.ts (current Zustand `create` slice + setter convention lines 9-60)
    - .planning/phases/10-schulstammdaten-zeitraster/10-PATTERNS.md "school.settings.tsx" + "UnsavedChangesDialog.tsx" + "AppSidebar.tsx" + "school-context-store.ts" sections
    - .planning/phases/10-schulstammdaten-zeitraster/10-UI-SPEC.md §1 (Page Shell), §2 (Tab Content), §8 (Unsaved-Changes Dialog), §1.6 (Sticky Save Bar), §11 (Breakpoints), §13 (Copywriting), §15 (Icons), §16 (Reusability Manifest)
    - .planning/phases/10-schulstammdaten-zeitraster/10-RESEARCH.md §2 (route + tab shell), §3.3 (useBlocker pattern)
  </read_first>
  <behavior>
    - Test 1 (school.settings.spec.tsx): rendering Route at /admin/school/settings shows 4 TabsTrigger labels: "Stammdaten", "Zeitraster", "Schuljahre", "Optionen".
    - Test 2 (school.settings.spec.tsx): when useSchoolContext returns schoolId=null, TabsTrigger for "Zeitraster", "Schuljahre", "Optionen" have aria-disabled="true".
    - Test 3 (school.settings.spec.tsx): the search param `?tab=timegrid` activates the Zeitraster tab content on initial render.
    - Test 4 (UnsavedChangesDialog.spec.tsx): when open=true, the dialog renders 3 buttons "Verwerfen", "Abbrechen", "Speichern &amp; Weiter"; clicking Verwerfen calls onDiscard; Abbrechen calls onCancel; Speichern &amp; Weiter calls onSaveAndContinue with no args.
  </behavior>
  <action>
    Step A — Extend apps/web/src/stores/school-context-store.ts:
    - Read current state interface and setter signature.
    - ADD to the state interface: `activeSchoolYearId: string | null;` and `abWeekEnabled: boolean;`.
    - ADD defaults in the `create` initial state: `activeSchoolYearId: null` and `abWeekEnabled: false`.
    - EXTEND the `setContext` setter to accept `data.activeSchoolYearId` and `data.abWeekEnabled` (use the existing `?? null` / `?? false` default convention from the current setter).
    - Do NOT remove or rename existing fields (schoolId, personType etc.) — additive change only.

    Step B — Create apps/web/src/components/admin/shared/PageShell.tsx (per UI-SPEC §1.1-§1.4 + §16 reusability):
    ```tsx
    import { Link } from '@tanstack/react-router';
    import { ChevronRight } from 'lucide-react';
    import type { ReactNode } from 'react';

    interface Crumb { label: string; href?: string; }
    interface PageShellProps { breadcrumbs: Crumb[]; title: string; subtitle?: string; children: ReactNode; }

    export function PageShell({ breadcrumbs, title, subtitle, children }: PageShellProps) {
      return (
        <div className="space-y-6">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
                  {c.href ? (
                    <Link to={c.href} className="text-muted-foreground hover:text-foreground">{c.label}</Link>
                  ) : (
                    <span aria-current="page" className="text-foreground">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      );
    }
    ```

    Step C — Create apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx (per UI-SPEC §8 verbatim):
    ```tsx
    import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { AlertCircle } from 'lucide-react';

    interface Props {
      open: boolean;
      isSaving?: boolean;
      onDiscard: () => void;
      onCancel: () => void;
      onSaveAndContinue: () => void;
    }
    export function UnsavedChangesDialog({ open, isSaving, onDiscard, onCancel, onSaveAndContinue }: Props) {
      return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden />
                <div>
                  <DialogTitle>Aenderungen verwerfen?</DialogTitle>
                  <DialogDescription>
                    Sie haben ungespeicherte Aenderungen in diesem Tab. Wenn Sie jetzt wechseln, gehen diese verloren.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={onDiscard} disabled={isSaving}>Verwerfen</Button>
              <Button variant="ghost" onClick={onCancel} disabled={isSaving} autoFocus>Abbrechen</Button>
              <Button onClick={onSaveAndContinue} disabled={isSaving}>
                {isSaving ? 'Wird gespeichert...' : 'Speichern &amp; Weiter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
    ```

    Step D — Create apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx (per UI-SPEC §1.6):
    ```tsx
    import { Button } from '@/components/ui/button';
    import { Loader2 } from 'lucide-react';

    interface Props { isDirty: boolean; isSaving: boolean; onSave: () => void; label?: string; }
    export function StickyMobileSaveBar({ isDirty, isSaving, onSave, label = 'Speichern' }: Props) {
      if (!isDirty) return null;
      return (
        <div
          role="region"
          aria-label="Speichern"
          className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-3 z-40 transition-transform"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Button onClick={onSave} disabled={isSaving} className="w-full h-11">
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {label}
          </Button>
        </div>
      );
    }
    ```

    Step E — Create apps/web/src/components/admin/shared/InfoBanner.tsx (per UI-SPEC §5.6 + §6.2):
    ```tsx
    import { Info } from 'lucide-react';
    import type { ReactNode } from 'react';
    interface Props { children: ReactNode; }
    export function InfoBanner({ children }: Props) {
      return (
        <div className="bg-muted/50 border border-muted rounded-md p-3 text-sm" role="status">
          <Info className="h-4 w-4 mr-2 inline" aria-hidden />
          <span>{children}</span>
        </div>
      );
    }
    ```

    Step F — Create apps/web/src/components/admin/shared/WarnDialog.tsx (per UI-SPEC §7 generic — used by Plan 04 DestructiveEditDialog and future phases):
    ```tsx
    import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button, type ButtonProps } from '@/components/ui/button';
    import { AlertTriangle } from 'lucide-react';
    import type { ReactNode } from 'react';

    interface Action { label: string; variant?: ButtonProps['variant']; onClick: () => void; autoFocus?: boolean; }
    interface Props { open: boolean; title: string; description: ReactNode; actions: Action[]; onClose: () => void; }
    export function WarnDialog({ open, title, description, actions, onClose }: Props) {
      return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
                <div>
                  <DialogTitle>{title}</DialogTitle>
                  <DialogDescription>{description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              {actions.map((a, i) => (
                <Button key={i} variant={a.variant ?? 'default'} onClick={a.onClick} autoFocus={a.autoFocus}>
                  {a.label}
                </Button>
              ))}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
    ```

    Step G — Create apps/web/src/routes/_authenticated/admin/school.settings.tsx (the canonical route file — Plans 03b/04/05 will only touch tab component files, NOT this route):
    ```tsx
    import { createFileRoute, useBlocker } from '@tanstack/react-router';
    import { useState } from 'react';
    import { z } from 'zod';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { useSchoolContext } from '@/stores/school-context-store';
    import { PageShell } from '@/components/admin/shared/PageShell';
    import { UnsavedChangesDialog } from '@/components/admin/shared/UnsavedChangesDialog';
    import { SchoolDetailsTab } from '@/components/admin/school-settings/SchoolDetailsTab';
    import { TimeGridTab } from '@/components/admin/school-settings/TimeGridTab';
    import { SchoolYearsTab } from '@/components/admin/school-settings/SchoolYearsTab';
    import { OptionsTab } from '@/components/admin/school-settings/OptionsTab';

    const TabValue = z.enum(['details', 'timegrid', 'years', 'options']);
    type TabValueT = z.infer<typeof TabValue>;

    export const Route = createFileRoute('/_authenticated/admin/school/settings')({
      validateSearch: z.object({ tab: TabValue.optional() }),
      component: SchoolSettingsPage,
    });

    function SchoolSettingsPage() {
      const schoolId = useSchoolContext((s) => s.schoolId);
      const search = Route.useSearch();
      const navigate = Route.useNavigate();
      const tab: TabValueT = search.tab ?? 'details';
      const [dirty, setDirty] = useState<Record<TabValueT, boolean>>({ details: false, timegrid: false, years: false, options: false });
      const isAnyDirty = Object.values(dirty).some(Boolean);

      const setTab = (value: TabValueT) =>
        navigate({ search: (prev) => ({ ...prev, tab: value }), replace: true });

      const blocker = useBlocker({ shouldBlockFn: () => isAnyDirty, withResolver: true });

      const tabsDisabled = !schoolId;

      return (
        <PageShell
          breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Schulverwaltung' }]}
          title="Schulverwaltung"
          subtitle="Stammdaten, Zeitraster, Schuljahre und Optionen dieser Schule pflegen."
        >
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValueT)}>
            {/* Desktop tab bar */}
            <TabsList className="hidden md:flex">
              <TabsTrigger value="details">Stammdaten</TabsTrigger>
              <TabsTrigger value="timegrid" disabled={tabsDisabled} aria-disabled={tabsDisabled}>Zeitraster</TabsTrigger>
              <TabsTrigger value="years" disabled={tabsDisabled} aria-disabled={tabsDisabled}>Schuljahre</TabsTrigger>
              <TabsTrigger value="options" disabled={tabsDisabled} aria-disabled={tabsDisabled}>Optionen</TabsTrigger>
            </TabsList>
            {/* Mobile select */}
            <Select value={tab} onValueChange={(v) => setTab(v as TabValueT)}>
              <SelectTrigger className="md:hidden h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="details">Stammdaten</SelectItem>
                <SelectItem value="timegrid" disabled={tabsDisabled}>Zeitraster</SelectItem>
                <SelectItem value="years" disabled={tabsDisabled}>Schuljahre</SelectItem>
                <SelectItem value="options" disabled={tabsDisabled}>Optionen</SelectItem>
              </SelectContent>
            </Select>

            <TabsContent value="details">
              <SchoolDetailsTab onDirtyChange={(d) => setDirty((s) => ({ ...s, details: d }))} />
            </TabsContent>
            <TabsContent value="timegrid">{schoolId &amp;&amp; <TimeGridTab schoolId={schoolId} onDirtyChange={(d) => setDirty((s) => ({ ...s, timegrid: d }))} />}</TabsContent>
            <TabsContent value="years">{schoolId &amp;&amp; <SchoolYearsTab schoolId={schoolId} onDirtyChange={(d) => setDirty((s) => ({ ...s, years: d }))} />}</TabsContent>
            <TabsContent value="options">{schoolId &amp;&amp; <OptionsTab schoolId={schoolId} onDirtyChange={(d) => setDirty((s) => ({ ...s, options: d }))} />}</TabsContent>
          </Tabs>

          <UnsavedChangesDialog
            open={blocker.status === 'blocked'}
            onDiscard={() => { setDirty({ details: false, timegrid: false, years: false, options: false }); blocker.proceed?.(); }}
            onCancel={() => blocker.reset?.()}
            onSaveAndContinue={() => { /* proxied to active tab via shared submit-event; v1: just proceed */ blocker.proceed?.(); }}
          />
        </PageShell>
      );
    }
    ```

    Step H — Create FOUR placeholder tab components (Plan 03b replaces SchoolDetailsTab; Plans 04 + 05 replace the others). Each is a minimal component accepting `{schoolId?, onDirtyChange?}` props. The file MUST exist now so the route compiles.
    - apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx (placeholder — Plan 03b replaces with full SCHOOL-01 impl):
      ```tsx
      interface Props { onDirtyChange?: (d: boolean) => void; }
      export function SchoolDetailsTab(_props: Props) {
        return <div className="p-6 text-muted-foreground">Stammdaten — Plan 03b implementiert.</div>;
      }
      ```
    - apps/web/src/components/admin/school-settings/TimeGridTab.tsx (placeholder — Plan 04 replaces):
      ```tsx
      interface Props { schoolId: string; onDirtyChange?: (d: boolean) => void; }
      export function TimeGridTab(_props: Props) {
        return <div className="p-6 text-muted-foreground">Zeitraster — Plan 04 implementiert.</div>;
      }
      ```
    - apps/web/src/components/admin/school-settings/SchoolYearsTab.tsx (placeholder — Plan 05 replaces):
      ```tsx
      interface Props { schoolId: string; onDirtyChange?: (d: boolean) => void; }
      export function SchoolYearsTab(_props: Props) {
        return <div className="p-6 text-muted-foreground">Schuljahre — Plan 05 implementiert.</div>;
      }
      ```
    - apps/web/src/components/admin/school-settings/OptionsTab.tsx (placeholder — Plan 05 replaces):
      ```tsx
      interface Props { schoolId: string; onDirtyChange?: (d: boolean) => void; }
      export function OptionsTab(_props: Props) {
        return <div className="p-6 text-muted-foreground">Optionen — Plan 05 implementiert.</div>;
      }
      ```

    Step I — Add sidebar entry in apps/web/src/components/layout/AppSidebar.tsx:
    - Import: ADD `Building2` to the existing lucide-react import block at the top of the file.
    - Insert into the `navItems` array between `'Datenimport'` (existing — `/admin/import`, icon `Upload`) and `'Raeume'` (existing — `/rooms`):
      ```typescript
      {
        label: 'Schulverwaltung',
        href: '/admin/school/settings',
        icon: Building2,
        roles: ['admin', 'schulleitung'],
      },
      ```

    Step J — Mirror the same entry in apps/web/src/components/layout/MobileSidebar.tsx (same import + same array insertion at the same logical position).

    Step K — Write apps/web/src/routes/_authenticated/admin/__tests__/school.settings.spec.tsx:
    - Uses @testing-library/react.
    - Mocks useSchoolContext to return `{ schoolId: null }` then `{ schoolId: 'school-1' }`.
    - Renders the SchoolSettingsPage (extract the inner component as named export so the test can render without Router setup, OR wrap with a TanStack Router test harness).
    - Asserts behaviors 1, 2, 3 from the behavior block.
    - Use `screen.getByRole('tab', {name: /Stammdaten/i})` etc.

    Step L — Write apps/web/src/components/admin/shared/__tests__/UnsavedChangesDialog.spec.tsx covering Test 4 from the behavior block. Use `userEvent.click` on the buttons, assert handler was called.
  </action>
  <verify>
    <automated>cd /Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/apps/web &amp;&amp; pnpm exec vitest run src/routes/_authenticated/admin/__tests__/school.settings.spec.tsx src/components/admin/shared/__tests__/UnsavedChangesDialog.spec.tsx &amp;&amp; pnpm exec tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -F "createFileRoute('/_authenticated/admin/school/settings')" apps/web/src/routes/_authenticated/admin/school.settings.tsx` returns 1 match.
    - `grep -F "Stammdaten" apps/web/src/routes/_authenticated/admin/school.settings.tsx` returns at least 1 match.
    - `grep -F "Zeitraster" apps/web/src/routes/_authenticated/admin/school.settings.tsx` returns at least 1 match.
    - `grep -F "Schuljahre" apps/web/src/routes/_authenticated/admin/school.settings.tsx` returns at least 1 match.
    - `grep -F "Optionen" apps/web/src/routes/_authenticated/admin/school.settings.tsx` returns at least 1 match.
    - `grep -F "useBlocker" apps/web/src/routes/_authenticated/admin/school.settings.tsx` returns at least 1 match.
    - `grep -F "tabsDisabled" apps/web/src/routes/_authenticated/admin/school.settings.tsx` returns at least 3 matches.
    - `grep -F "Schulverwaltung" apps/web/src/components/layout/AppSidebar.tsx` returns 1 match.
    - `grep -F "Schulverwaltung" apps/web/src/components/layout/MobileSidebar.tsx` returns 1 match.
    - `grep -F "/admin/school/settings" apps/web/src/components/layout/AppSidebar.tsx` returns 1 match.
    - `grep -F "Building2" apps/web/src/components/layout/AppSidebar.tsx` returns at least 2 matches (import + navItems entry).
    - `grep -F "activeSchoolYearId" apps/web/src/stores/school-context-store.ts` returns at least 2 matches (interface + initial default).
    - `grep -F "abWeekEnabled" apps/web/src/stores/school-context-store.ts` returns at least 2 matches.
    - `ls apps/web/src/components/admin/shared/PageShell.tsx apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx apps/web/src/components/admin/shared/InfoBanner.tsx apps/web/src/components/admin/shared/WarnDialog.tsx` lists all 5 files.
    - `ls apps/web/src/components/admin/school-settings/SchoolDetailsTab.tsx apps/web/src/components/admin/school-settings/TimeGridTab.tsx apps/web/src/components/admin/school-settings/SchoolYearsTab.tsx apps/web/src/components/admin/school-settings/OptionsTab.tsx` lists all 4 placeholder files.
    - `grep -F "Verwerfen" apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx` returns 1 match.
    - `grep -F "Speichern" apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx` returns at least 2 matches.
    - `cd apps/web &amp;&amp; pnpm exec tsc --noEmit` exits 0.
    - Both new spec files pass via `pnpm exec vitest run`.
  </acceptance_criteria>
  <done>
    Route /admin/school/settings is wired with 4 tabs + mobile Select; useBlocker arms when any tab is dirty; sidebar entries added; Zustand store extended with activeSchoolYearId + abWeekEnabled; 5 reusable shared admin components live in apps/web/src/components/admin/shared/; 4 placeholder tab files exist so the route compiles. apps/web tsc --noEmit passes. Plan 03b can now mount its hook bundles + replace SchoolDetailsTab in the same wave.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → API | Route shell loads but does not yet read/write — Plan 03b adds the hook bundle |
| Zustand store mutation → Tab gating | Setting schoolId enables previously-disabled tabs |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-10-03a-01 | Tampering | Client-side bypass of disabled tabs (e.g. directly visiting ?tab=timegrid before schoolId exists) | mitigate | TabsContent for timegrid/years/options is conditionally rendered: `{schoolId &amp;&amp; <TimeGridTab />}` — the component never mounts without a schoolId, so any URL manipulation produces an empty panel rather than a broken tab |
| T-10-03a-02 | Information Disclosure | Sidebar entry visible to non-admin roles via DOM inspection | mitigate | navItems entry carries `roles: ['admin', 'schulleitung']`; existing sidebar role-gate logic filters based on user's role claim from JWT |
| T-10-03a-03 | Spoofing | useBlocker bypass via direct route navigation | accept | useBlocker only triggers UI dialog; backend does not depend on it for data integrity (server validates every PUT/POST) |
</threat_model>

<verification>
1. Visit /admin/school/settings — sidebar entry "Schulverwaltung" navigates correctly for admin role.
2. With no school in DB: tabs 2-4 are visibly disabled; Stammdaten tab shows placeholder text "Stammdaten — Plan 03b implementiert."
3. Tab switch with isDirty triggers UnsavedChangesDialog with German copy.
4. tsc --noEmit and vitest run both exit 0.
</verification>

<success_criteria>
- [ ] Route /admin/school/settings exists, compiles, and renders 4 tabs with mobile Select fallback
- [ ] 5 reusable shared admin components in apps/web/src/components/admin/shared/ — Phases 11-16 will import these
- [ ] 4 placeholder tab components exist so the route compiles
- [ ] Sidebar entries added (AppSidebar + MobileSidebar) with German label "Schulverwaltung"
- [ ] Zustand store extended with activeSchoolYearId and abWeekEnabled
- [ ] Both Vitest specs in this plan pass; apps/web tsc --noEmit green
</success_criteria>

<output>
After completion, create `.planning/phases/10-schulstammdaten-zeitraster/10-03a-SUMMARY.md` documenting:
- Save-and-Continue wiring decision (v1 just proceeds; if a multi-tab dispatch was implemented, document it)
- Any TanStack Router useBlocker behavior observed during testing
- Confirmation that all 4 placeholder tabs render the route without compile errors
</output>
</output>
