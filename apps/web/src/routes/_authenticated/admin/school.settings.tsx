import { createFileRoute, useBlocker } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export function SchoolSettingsPage() {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab: TabValueT = search.tab ?? 'details';
  const [dirty, setDirty] = useState<Record<TabValueT, boolean>>({
    details: false,
    timegrid: false,
    years: false,
    options: false,
  });
  const isAnyDirty = Object.values(dirty).some(Boolean);

  const setTab = (value: TabValueT) =>
    navigate({ search: (prev) => ({ ...prev, tab: value }), replace: true });

  // Stable callbacks so child tabs' useEffect(() => onDirtyChange(isDirty),
  // [isDirty, onDirtyChange]) does not fire on every parent render (infinite
  // loop caused by a fresh inline lambda each render).
  const setDetailsDirty = useCallback(
    (d: boolean) => setDirty((s) => ({ ...s, details: d })),
    [],
  );
  const setTimeGridDirty = useCallback(
    (d: boolean) => setDirty((s) => ({ ...s, timegrid: d })),
    [],
  );
  const setYearsDirty = useCallback(
    (d: boolean) => setDirty((s) => ({ ...s, years: d })),
    [],
  );
  const setOptionsDirty = useCallback(
    (d: boolean) => setDirty((s) => ({ ...s, options: d })),
    [],
  );

  // TanStack Router's useBlocker arms as soon as isAnyDirty is true and fires
  // the UnsavedChangesDialog on router navigation (sidebar click, back button,
  // breadcrumb). Tab-to-tab switches within this route also mutate search
  // params, so blocker.reset()/proceed() flows handle those too.
  const blocker = useBlocker({ shouldBlockFn: () => isAnyDirty, withResolver: true });

  const tabsDisabled = !schoolId;

  return (
    <PageShell
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Schulverwaltung' }]}
      title="Schulverwaltung"
      subtitle="Stammdaten, Zeitraster, Schuljahre und Optionen dieser Schule pflegen."
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValueT)}>
        <TabsList className="hidden sm:flex">
          <TabsTrigger value="details">Stammdaten</TabsTrigger>
          <TabsTrigger value="timegrid" disabled={tabsDisabled} aria-disabled={tabsDisabled}>
            Zeitraster
          </TabsTrigger>
          <TabsTrigger value="years" disabled={tabsDisabled} aria-disabled={tabsDisabled}>
            Schuljahre
          </TabsTrigger>
          <TabsTrigger value="options" disabled={tabsDisabled} aria-disabled={tabsDisabled}>
            Optionen
          </TabsTrigger>
        </TabsList>
        <Select value={tab} onValueChange={(v) => setTab(v as TabValueT)}>
          <SelectTrigger className="sm:hidden h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="details">Stammdaten</SelectItem>
            <SelectItem value="timegrid" disabled={tabsDisabled}>
              Zeitraster
            </SelectItem>
            <SelectItem value="years" disabled={tabsDisabled}>
              Schuljahre
            </SelectItem>
            <SelectItem value="options" disabled={tabsDisabled}>
              Optionen
            </SelectItem>
          </SelectContent>
        </Select>

        <TabsContent value="details">
          <SchoolDetailsTab onDirtyChange={setDetailsDirty} />
        </TabsContent>
        <TabsContent value="timegrid">
          {schoolId && <TimeGridTab schoolId={schoolId} onDirtyChange={setTimeGridDirty} />}
        </TabsContent>
        <TabsContent value="years">
          {schoolId && <SchoolYearsTab schoolId={schoolId} onDirtyChange={setYearsDirty} />}
        </TabsContent>
        <TabsContent value="options">
          {schoolId && <OptionsTab schoolId={schoolId} onDirtyChange={setOptionsDirty} />}
        </TabsContent>
      </Tabs>

      <UnsavedChangesDialog
        open={blocker.status === 'blocked'}
        onDiscard={() => {
          setDirty({ details: false, timegrid: false, years: false, options: false });
          blocker.proceed?.();
        }}
        onCancel={() => blocker.reset?.()}
        onSaveAndContinue={() => {
          // v1: proceed — Plans 03b/04/05 wire the active tab's submit handler
          // via a shared submit-event in a follow-up. Dialog still resets dirty
          // via proceed so the navigation completes cleanly.
          blocker.proceed?.();
        }}
      />
    </PageShell>
  );
}
