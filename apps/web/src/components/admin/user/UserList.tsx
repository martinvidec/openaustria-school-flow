import { Link } from '@tanstack/react-router';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import { RoleChip } from './RoleChip';
import { StatusBadge } from './StatusBadge';
import type { UserDirectorySummary } from '@/features/users/types';

/**
 * Phase 17 Plan 17-04 — User list migrated from `UserListTable` +
 * `UserMobileCards` onto the shared `<DataList>` primitive.
 *
 * **Pagination split:** The pagination block from the old
 * UserListTable.tsx:188–231 is NOT part of DataList. It now lives as an
 * adjunct in `routes/_authenticated/admin/users.index.tsx` directly under
 * `<UserList />`. Loading + empty branches fold into DataList's `loading`
 * and `emptyState` props (DataList ships its own 5-row skeleton —
 * DataList.tsx:202–222).
 */

interface Props {
  users: UserDirectorySummary[];
  loading?: boolean;
  onDisable?: (user: UserDirectorySummary) => void;
  onEnable?: (user: UserDirectorySummary) => void;
}

const PERSON_TYPE_LABEL: Record<string, string> = {
  TEACHER: 'Lehrkraft',
  STUDENT: 'Schüler:in',
  PARENT: 'Erziehungsberechtigte:n',
};

export function UserList({ users, loading, onDisable, onEnable }: Props) {
  const columns: DataListColumn<UserDirectorySummary>[] = [
    {
      key: 'lastName',
      header: 'Nachname',
      cell: (u) => (
        <Link
          to="/admin/users/$userId"
          params={{ userId: u.id }}
          search={{ tab: 'stammdaten' }}
          className="font-medium hover:underline"
        >
          {u.lastName || '—'}
        </Link>
      ),
    },
    {
      key: 'firstName',
      header: 'Vorname',
      cell: (u) => u.firstName || '—',
    },
    {
      key: 'email',
      header: 'E-Mail',
      className: 'text-muted-foreground',
      cell: (u) => u.email || '—',
    },
    {
      key: 'roles',
      header: 'Rollen',
      cell: (u) => {
        if (u.roles.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        const visibleRoles = u.roles.slice(0, 3);
        const overflow = u.roles.length - visibleRoles.length;
        return (
          <span className="inline-flex flex-wrap gap-1">
            {visibleRoles.map((r) => (
              <RoleChip key={r} roleName={r} />
            ))}
            {overflow > 0 && (
              <span className="text-xs text-muted-foreground">+{overflow}</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'personLink',
      header: 'Verknüpft mit',
      cell: (u) =>
        u.personLink ? (
          <span className="text-sm">
            <span className="text-muted-foreground">
              {PERSON_TYPE_LABEL[u.personLink.personType] ??
                u.personLink.personType}{' '}
            </span>
            {u.personLink.firstName} {u.personLink.lastName}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'text-center',
      cell: (u) => <StatusBadge enabled={u.enabled} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-right',
      cell: (u) => (
        <span
          data-row-action
          onClick={(e) => e.stopPropagation()}
          className="inline-flex justify-end"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Aktionen"
                data-row-action
                className="min-h-11 min-w-11"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: u.id }}
                  search={{ tab: 'stammdaten' }}
                >
                  Öffnen
                </Link>
              </DropdownMenuItem>
              {u.enabled ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    onDisable?.(u);
                  }}
                >
                  Sperren
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onEnable?.(u);
                  }}
                >
                  Reaktivieren
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  return (
    <DataList<UserDirectorySummary>
      rows={users}
      columns={columns}
      getRowId={(u) => u.id}
      desktopWrapperTestId="user-desktop-table"
      mobileWrapperTestId="user-mobile-cards"
      loading={loading}
      emptyState={<>Keine User gefunden</>}
      mobileCard={(u) => {
        const visibleRoles = u.roles.slice(0, 3);
        const overflow = u.roles.length - visibleRoles.length;
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: u.id }}
                  search={{ tab: 'stammdaten' }}
                  className="text-base font-semibold hover:underline truncate block"
                >
                  {u.lastName} {u.firstName}
                </Link>
                <div className="text-xs text-muted-foreground truncate">
                  {u.email || '—'}
                </div>
              </div>
              <span data-row-action onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Aktionen"
                      className="min-h-11 min-w-11"
                      data-row-action
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: u.id }}
                        search={{ tab: 'stammdaten' }}
                      >
                        Öffnen
                      </Link>
                    </DropdownMenuItem>
                    {u.enabled ? (
                      <DropdownMenuItem
                        className="text-destructive min-h-11"
                        onSelect={(e) => {
                          e.preventDefault();
                          onDisable?.(u);
                        }}
                      >
                        Sperren
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="min-h-11"
                        onSelect={(e) => {
                          e.preventDefault();
                          onEnable?.(u);
                        }}
                      >
                        Reaktivieren
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {visibleRoles.map((r) => (
                <RoleChip key={r} roleName={r} />
              ))}
              {overflow > 0 && (
                <span className="text-xs text-muted-foreground">+{overflow}</span>
              )}
              <StatusBadge enabled={u.enabled} className="ml-auto" />
            </div>

            {u.personLink && (
              <div className="text-xs text-muted-foreground">
                {PERSON_TYPE_LABEL[u.personLink.personType] ??
                  u.personLink.personType}
                :{' '}
                <span className="text-foreground">
                  {u.personLink.firstName} {u.personLink.lastName}
                </span>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
