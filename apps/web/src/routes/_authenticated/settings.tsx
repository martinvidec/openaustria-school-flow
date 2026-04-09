import { createFileRoute } from '@tanstack/react-router';
import { ICalSettings } from '@/components/calendar/ICalSettings';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';
import { PwaInstallSettings } from '@/components/settings/PwaInstallSettings';
import { useSchoolContext } from '@/stores/school-context-store';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
});

/**
 * User settings page.
 * Contains iCal subscription management (IMPORT-03), push notification
 * opt-in (MOBILE-02, Phase 09 Plan 04), and PWA install card (MOBILE-03,
 * Phase 09 Plan 02).
 *
 * Responsive: full-width stacked cards on mobile, max-w-[640px] centered on md+.
 */
function SettingsPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';

  return (
    <div className="space-y-8 max-w-[640px] mx-auto">
      <h1 className="text-[28px] font-semibold leading-[1.2]">Einstellungen</h1>

      <ICalSettings schoolId={schoolId} />
      <PushNotificationSettings />
      <PwaInstallSettings />
    </div>
  );
}
