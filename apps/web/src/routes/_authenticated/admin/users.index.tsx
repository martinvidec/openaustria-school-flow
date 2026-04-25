import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/admin/shared/PageShell';
import { useUsers } from '@/features/users/hooks/use-users';
import { UserFilterBar } from '@/components/admin/user/UserFilterBar';
import { UserListTable } from '@/components/admin/user/UserListTable';
import { UserMobileCards } from '@/components/admin/user/UserMobileCards';
import { DisableUserDialog } from '@/components/admin/user/DisableUserDialog';
import { EnableUserDialog } from '@/components/admin/user/EnableUserDialog';
import { useAuth } from '@/hooks/useAuth';
import type {
  UserDirectoryQuery,
  UserDirectorySummary,
} from '@/features/users/types';

export const Route = createFileRoute('/_authenticated/admin/users/')({
  component: UsersIndexPage,
});

const DEFAULT_FILTER: UserDirectoryQuery = {
  page: 1,
  limit: 25,
  linked: 'all',
  enabled: 'all',
};

function isFilterApplied(f: UserDirectoryQuery): boolean {
  return Boolean(
    f.search ||
      (f.role && f.role.length > 0) ||
      (f.linked && f.linked !== 'all') ||
      (f.enabled && f.enabled !== 'all'),
  );
}

function UsersIndexPage() {
  // Phase 13-03 USER-GUARD-02: client-side role gate matching the
  // sidebar gating in AppSidebar.tsx (UI-SPEC §590 — `roles: ['admin']`
  // only). Without this gate, schulleitung can paste the URL and reach
  // a page that 403s every API call but still renders the PageShell.
  const { user: currentUser } = useAuth();
  const isAdmin = (currentUser?.roles ?? []).includes('admin');

  const [filter, setFilter] = useState<UserDirectoryQuery>(DEFAULT_FILTER);
  const { data, isLoading } = useUsers(filter);
  const [toDisable, setToDisable] = useState<UserDirectorySummary | null>(null);
  const [toEnable, setToEnable] = useState<UserDirectorySummary | null>(null);

  if (!isAdmin) {
    return (
      <PageShell
        breadcrumbs={[
          { label: 'Admin', href: '/admin/school/settings' },
          { label: 'User & Berechtigungen' },
        ]}
        title="Aktion nicht erlaubt"
      >
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersRound className="h-10 w-10 text-muted-foreground mb-3" aria-hidden />
          <h3 className="text-lg font-semibold">Aktion nicht erlaubt</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Diese Funktion ist nur für Administratoren verfügbar.
          </p>
        </div>
      </PageShell>
    );
  }

  const users = data?.data ?? [];
  const meta = data?.meta;
  const filtered = isFilterApplied(filter);
  const isEmpty = !isLoading && users.length === 0;

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Admin', href: '/admin/school/settings' },
        { label: 'User & Berechtigungen' },
      ]}
      title="User & Berechtigungen"
      subtitle="Zentralverwaltung für Keycloak-User, Rollen und feingranulare Berechtigungen."
    >
      <UserFilterBar filter={filter} onChange={setFilter} />

      <div className="mt-4">
        <UserListTable
          users={users}
          loading={isLoading}
          meta={meta}
          onPageChange={(page) => setFilter({ ...filter, page })}
          onLimitChange={(limit) => setFilter({ ...filter, limit, page: 1 })}
          onDisable={setToDisable}
          onEnable={setToEnable}
        />
        <UserMobileCards
          users={users}
          loading={isLoading}
          onDisable={setToDisable}
          onEnable={setToEnable}
        />
      </div>

      {isEmpty && filtered && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersRound className="h-10 w-10 text-muted-foreground mb-3" aria-hidden />
          <h3 className="text-lg font-semibold">Keine User gefunden</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Passen Sie die Filter an oder setzen Sie sie zurück.
          </p>
          <Button variant="ghost" onClick={() => setFilter(DEFAULT_FILTER)}>
            Filter zurücksetzen
          </Button>
        </div>
      )}
      {isEmpty && !filtered && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UsersRound className="h-10 w-10 text-muted-foreground mb-3" aria-hidden />
          <h3 className="text-lg font-semibold">Keine User im Verzeichnis</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Der angebundene Keycloak-Realm enthält keine User. Legen Sie Accounts in der
            Keycloak-Admin-Oberfläche an.
          </p>
        </div>
      )}

      {toDisable && (
        <DisableUserDialog
          open={!!toDisable}
          user={toDisable}
          onClose={() => setToDisable(null)}
        />
      )}
      {toEnable && (
        <EnableUserDialog
          open={!!toEnable}
          user={toEnable}
          onClose={() => setToEnable(null)}
        />
      )}
    </PageShell>
  );
}
