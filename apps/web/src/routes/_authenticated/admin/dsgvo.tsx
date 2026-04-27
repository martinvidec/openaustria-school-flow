import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { DsgvoTabs } from '@/components/admin/dsgvo/DsgvoTabs';
import { useSchoolContext } from '@/stores/school-context-store';
import { useAuth } from '@/hooks/useAuth';

/**
 * Phase 15-05: /admin/dsgvo route shell.
 *
 * Strict admin-only per D-22. Sidebar entry is hidden for non-admin roles;
 * this route component additionally enforces the gate to defend against
 * direct URL access (T-15-05-02 mitigation, mirrors solver-tuning.tsx).
 *
 * Tab + sub-tab deep-linking via Zod-validated search params (D-04 + D-26).
 * The DsgvoTabs shell (Task 2) writes back to the URL on every tab change.
 */

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
          { label: 'Verwaltung', href: '/admin/school/settings' },
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

  if (!schoolId) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Verwaltung', href: '/admin/school/settings' },
          { label: 'DSGVO-Verwaltung' },
        ]}
        title="DSGVO-Verwaltung"
        subtitle="Einwilligungen, Aufbewahrung, DSFA/VVZ und Datenexport-Jobs zentral verwalten."
      >
        <p className="text-sm text-muted-foreground">Lade Schulkontext …</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Verwaltung', href: '/admin/school/settings' },
        { label: 'DSGVO-Verwaltung' },
      ]}
      title="DSGVO-Verwaltung"
      subtitle="Einwilligungen, Aufbewahrung, DSFA/VVZ und Datenexport-Jobs zentral verwalten."
    >
      <DsgvoTabs schoolId={schoolId} initialTab={tab} initialSub={sub} />
    </PageShell>
  );
}
