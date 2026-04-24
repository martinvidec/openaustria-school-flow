import { createFileRoute } from '@tanstack/react-router';
import { PageShell } from '@/components/admin/shared/PageShell';

export const Route = createFileRoute('/_authenticated/admin/users/')({
  component: UsersIndexPage,
});

/**
 * Phase 13-02 Task 1 — route stub. Filter bar / list / mobile cards are
 * wired in Task 2.
 */
function UsersIndexPage() {
  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'User & Berechtigungen' },
      ]}
      title="User & Berechtigungen"
      subtitle="Zentralverwaltung für Keycloak-User, Rollen und feingranulare Berechtigungen."
    >
      <div className="text-sm text-muted-foreground">
        List page — implemented in Task 2
      </div>
    </PageShell>
  );
}
