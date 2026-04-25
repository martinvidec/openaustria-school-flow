import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { SolverTuningTabs } from '@/components/admin/solver-tuning/SolverTuningTabs';
import { LastRunScoreBadge } from '@/components/admin/solver-tuning/LastRunScoreBadge';
import { DriftBanner } from '@/components/admin/solver-tuning/DriftBanner';
import { useSchoolContext } from '@/stores/school-context-store';
import { useAuth } from '@/hooks/useAuth';

/**
 * Phase 14-02: `/admin/solver-tuning` route shell.
 *
 * Strict admin-only per D-03 (Solver-Tuning is technical configuration that
 * must not be touched by Schulleitung). Sidebar entry is hidden for non-admin
 * roles; this route component additionally enforces the gate to defend
 * against direct URL access (T-14-08 mitigation).
 */

const TabSearchSchema = z.object({
  tab: z
    .enum(['constraints', 'weights', 'restrictions', 'preferences'])
    .optional(),
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

  if (!isAdmin) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Admin', href: '/admin/school/settings' },
          { label: 'Solver-Tuning' },
        ]}
        title="Aktion nicht erlaubt"
      >
        <p className="text-sm text-muted-foreground">
          Diese Funktion ist nur für Administratoren verfügbar.
        </p>
      </PageShell>
    );
  }

  if (!schoolId) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Admin', href: '/admin/school/settings' },
          { label: 'Solver-Tuning' },
        ]}
        title="Solver-Tuning"
        subtitle="Constraint-Konfiguration und Gewichtungen pro Schule"
      >
        <p className="text-sm text-muted-foreground">Lade Solver-Konfiguration …</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'Solver-Tuning' },
      ]}
      title="Solver-Tuning"
      subtitle="Constraint-Konfiguration und Gewichtungen pro Schule"
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <LastRunScoreBadge schoolId={schoolId} />
      </div>
      <DriftBanner schoolId={schoolId} />
      <SolverTuningTabs schoolId={schoolId} initialTab={tab} />
    </PageShell>
  );
}
