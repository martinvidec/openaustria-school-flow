import { Link } from '@tanstack/react-router';
import { MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoleChip } from './RoleChip';
import { StatusBadge } from './StatusBadge';
import type { UserDirectorySummary } from '@/features/users/types';

/**
 * Phase 13-02 — mobile (<640px) user list as stacked Cards.
 * UI-SPEC §Layout §`/admin/users` mobile rules:
 *   - Each card: heading (Nachname Vorname), muted email, Rollen chip-list
 *     (max 3 + +N overflow), StatusBadge, Verknüpft-mit chip if linked,
 *     '…' dropdown top-right
 *   - All interactive elements ≥44px touch target
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

export function UserMobileCards({ users, loading, onDisable, onEnable }: Props) {
  if (loading && users.length === 0) {
    return (
      <div className="md:hidden text-sm text-muted-foreground py-12 text-center">
        Lade User-Daten …
      </div>
    );
  }
  if (users.length === 0) {
    return (
      <div className="md:hidden text-sm text-muted-foreground py-12 text-center">
        Keine User gefunden
      </div>
    );
  }
  return (
    <div className="md:hidden flex flex-col gap-2">
      {users.map((u) => {
        const visibleRoles = u.roles.slice(0, 3);
        const overflow = u.roles.length - visibleRoles.length;
        return (
          <Card key={u.id} className="overflow-hidden">
            <CardContent className="p-3 flex flex-col gap-2">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Aktionen"
                      className="min-h-11 min-w-11"
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
                  {PERSON_TYPE_LABEL[u.personLink.personType] ?? u.personLink.personType}:{' '}
                  <span className="text-foreground">
                    {u.personLink.firstName} {u.personLink.lastName}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
