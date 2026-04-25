import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useUser } from '@/features/users/hooks/use-user';
import { useAuth } from '@/hooks/useAuth';
import {
  UserDetailTabs,
  type UserDetailTab,
} from '@/components/admin/user/UserDetailTabs';

const TabValue = z.enum(['stammdaten', 'rollen', 'berechtigungen', 'overrides']);

export const Route = createFileRoute('/_authenticated/admin/users/$userId')({
  validateSearch: z.object({ tab: TabValue.default('stammdaten') }),
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: user, isLoading } = useUser(userId);
  const { user: currentUser } = useAuth();

  const tab: UserDetailTab = search.tab;

  const setTab = (next: UserDetailTab) =>
    navigate({ search: () => ({ tab: next }), replace: true });

  // Phase 13-03 USER-GUARD-02: client-side role gate matching the
  // sidebar gating in AppSidebar.tsx (UI-SPEC §590).
  const isAdmin = (currentUser?.roles ?? []).includes('admin');
  if (!isAdmin) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Admin', href: '/admin/school/settings' },
          { label: 'User & Berechtigungen' },
        ]}
        title="Aktion nicht erlaubt"
      >
        <p className="text-sm text-muted-foreground">
          Diese Funktion ist nur für Administratoren verfügbar.
        </p>
      </PageShell>
    );
  }

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
          Der User wurde möglicherweise in Keycloak entfernt. Zurück zur Liste.
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
      title={`${user.firstName} ${user.lastName}` || 'Keycloak-User'}
      subtitle={`${user.email || 'Keycloak-User'} · ${user.id.slice(0, 8)}`}
    >
      <UserDetailTabs
        user={user}
        currentUserId={currentUser?.id ?? ''}
        activeTab={tab}
        onTabChange={setTab}
      />
    </PageShell>
  );
}
