import { createFileRoute } from '@tanstack/react-router';
import { PageShell } from '@/components/admin/shared/PageShell';
import { DashboardChecklist } from '@/components/admin/dashboard/DashboardChecklist';
import { useSchoolContext } from '@/stores/school-context-store';
import { useAuth } from '@/hooks/useAuth';

/**
 * Phase 16 Plan 03 Task 2 — `/admin` route shell composing the dashboard
 * checklist (D-01 + D-06 + ADMIN-01 + ADMIN-02 + MOBILE-ADM-03).
 *
 * Strict admin-only per D-20: the sidebar entry hides for non-admin users
 * and this component additionally renders an admin-gate fallback to defend
 * against direct URL navigation (T-16-10 mitigation, mirroring the
 * `solver-tuning.tsx` pattern).
 *
 * Plan 02 LOCKED `DashboardChecklistProps = { schoolId: string | null | undefined }`
 * (a superset of the store shape `string | null`). We pass `schoolId`
 * VERBATIM — no `?? undefined`, no `as string`. The component normalizes
 * `null → undefined` internally before invoking `useDashboardStatus`.
 */
export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  // useSchoolContext.schoolId is `string | null` (school-context-store.ts:11).
  // Plan 02 contract accepts `string | null | undefined` — pass directly.
  const schoolId = useSchoolContext((s) => s.schoolId);
  const { user } = useAuth();
  const isAdmin = (user?.roles ?? []).includes('admin');

  if (!isAdmin) {
    return (
      <PageShell breadcrumbs={[{ label: 'Verwaltung' }]} title="Aktion nicht erlaubt">
        <p className="text-sm text-muted-foreground">
          Diese Funktion ist nur für Administratoren verfügbar.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[{ label: 'Verwaltung' }]}
      title="Dashboard"
      subtitle="Setup-Übersicht: prüfe, was für deine Schule schon eingerichtet ist und wo noch Schritte offen sind."
    >
      <DashboardChecklist schoolId={schoolId} />
    </PageShell>
  );
}
