import { Link } from '@tanstack/react-router';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoleChip } from './RoleChip';
import { StatusBadge } from './StatusBadge';
import type { UserDirectorySummary, PaginatedResponse } from '@/features/users/types';

/**
 * Phase 13-02 — desktop dense user table.
 *
 * UI-SPEC §Layout §`/admin/users`:
 *   - 7 columns: Nachname | Vorname | E-Mail | Rollen | Verknüpft mit | Status | Aktionen
 *   - Default sort: Nachname ASC (server-driven; we render as-is)
 *   - Row click navigates to detail (search params default tab=stammdaten)
 *   - Pagination at bottom-right (25 / page default)
 */

interface Props {
  users: UserDirectorySummary[];
  loading?: boolean;
  meta?: PaginatedResponse<UserDirectorySummary>['meta'];
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onDisable?: (user: UserDirectorySummary) => void;
  onEnable?: (user: UserDirectorySummary) => void;
}

const PERSON_TYPE_LABEL: Record<string, string> = {
  TEACHER: 'Lehrkraft',
  STUDENT: 'Schüler:in',
  PARENT: 'Erziehungsberechtigte:n',
};

export function UserListTable({
  users,
  loading,
  meta,
  onPageChange,
  onLimitChange,
  onDisable,
  onEnable,
}: Props) {
  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th scope="col" className="text-left py-2 px-3 font-semibold">
                Nachname
              </th>
              <th scope="col" className="text-left py-2 px-3 font-semibold">
                Vorname
              </th>
              <th scope="col" className="text-left py-2 px-3 font-semibold">
                E-Mail
              </th>
              <th scope="col" className="text-left py-2 px-3 font-semibold">
                Rollen
              </th>
              <th scope="col" className="text-left py-2 px-3 font-semibold">
                Verknüpft mit
              </th>
              <th scope="col" className="text-center py-2 px-3 font-semibold">
                Status
              </th>
              <th scope="col" className="w-12" aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  Lade User-Daten …
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  Keine User gefunden
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const visibleRoles = u.roles.slice(0, 3);
                const overflow = u.roles.length - visibleRoles.length;
                return (
                  <tr key={u.id} className="border-b hover:bg-accent/50">
                    <td className="py-2 px-3">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: u.id }}
                        search={{ tab: 'stammdaten' }}
                        className="font-medium hover:underline"
                      >
                        {u.lastName || '—'}
                      </Link>
                    </td>
                    <td className="py-2 px-3">{u.firstName || '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground">{u.email || '—'}</td>
                    <td className="py-2 px-3">
                      {u.roles.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="inline-flex flex-wrap gap-1">
                          {visibleRoles.map((r) => (
                            <RoleChip key={r} roleName={r} />
                          ))}
                          {overflow > 0 && (
                            <span className="text-xs text-muted-foreground">+{overflow}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {u.personLink ? (
                        <span className="text-sm">
                          <span className="text-muted-foreground">
                            {PERSON_TYPE_LABEL[u.personLink.personType] ?? u.personLink.personType}{' '}
                          </span>
                          {u.personLink.firstName} {u.personLink.lastName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <StatusBadge enabled={u.enabled} />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Aktionen"
                            className="h-8 w-8"
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
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm">
          <div className="text-muted-foreground">
            {meta.totalIsApproximate ? 'ca. ' : ''}
            {meta.total} User
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground" htmlFor="page-size">
              Pro Seite:
            </label>
            <select
              id="page-size"
              className="border rounded-md px-2 py-1 bg-background"
              value={meta.limit}
              onChange={(e) => onLimitChange?.(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => onPageChange?.(meta.page - 1)}
            >
              Zurück
            </Button>
            <span className="px-2 tabular-nums">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPageChange?.(meta.page + 1)}
            >
              Weiter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
