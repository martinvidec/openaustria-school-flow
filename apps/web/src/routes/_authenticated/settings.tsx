import { createFileRoute } from '@tanstack/react-router';
import { ICalSettings } from '@/components/calendar/ICalSettings';
import { useSchoolContext } from '@/stores/school-context-store';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
});

/**
 * User settings page.
 * Contains iCal subscription management (IMPORT-03).
 *
 * Responsive: full-width stacked cards on mobile, max-w-[640px] centered on md+.
 */
function SettingsPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';

  return (
    <div className="space-y-8 max-w-[640px] mx-auto">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Einstellungen</h1>

      <ICalSettings schoolId={schoolId} />
    </div>
  );
}
