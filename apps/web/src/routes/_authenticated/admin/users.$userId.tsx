import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useUser } from '@/features/users/hooks/use-user';

const TabValue = z.enum(['stammdaten', 'rollen', 'berechtigungen', 'overrides']);
type TabValueT = z.infer<typeof TabValue>;

export const Route = createFileRoute('/_authenticated/admin/users/$userId')({
  validateSearch: z.object({ tab: TabValue.default('stammdaten') }),
  component: UserDetailPage,
});

/**
 * Phase 13-02 Task 1 — route stub. UserDetailTabs + 4 tab components are
 * wired in Task 2 (Stammdaten / Rollen) and Task 3 (Berechtigungen /
 * Overrides & Verknüpfung).
 */
function UserDetailPage() {
  const { userId } = Route.useParams();
  const { data: user, isLoading } = useUser(userId);

  // Suppress unused-tab warning until the tab container is wired in Task 2.
  void TabValue;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedTabType: TabValueT = 'stammdaten';
  void _unusedTabType;

  if (isLoading) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Admin', href: '/admin/school/settings' },
          { label: 'User & Berechtigungen', href: '/admin/users' },
        ]}
        title="Lade …"
      >
        <div />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Admin', href: '/admin/school/settings' },
          { label: 'User & Berechtigungen', href: '/admin/users' },
        ]}
        title="User nicht gefunden"
      >
        <p className="text-sm text-muted-foreground">
          Dieser User existiert nicht oder wurde aus Keycloak entfernt.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'User & Berechtigungen', href: '/admin/users' },
        { label: `${user.firstName} ${user.lastName}` },
      ]}
      title={`${user.firstName} ${user.lastName}`}
      subtitle={`${user.email} · ${user.id.slice(0, 8)}`}
    >
      <div className="text-sm text-muted-foreground">
        Detail-Tabs — implemented in Tasks 2 + 3
      </div>
    </PageShell>
  );
}
