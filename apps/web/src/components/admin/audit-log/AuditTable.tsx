import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useAuditEntries,
  type AuditEntryDto,
  type AuditFilters,
} from '@/hooks/useAuditEntries';
import { AuditDetailDrawer } from './AuditDetailDrawer';

/**
 * Phase 15-09 component: native `<table>` rendering of paginated audit
 * entries. Columns: Aktion / Ressource / Resource-ID / Akteur /
 * Zeitstempel / Aktionen (icon-only `Detail öffnen` button).
 *
 * Each row carries `data-audit-id={id}` + `data-audit-action={action}`
 * for the Plan 15-11 E2E suite (UI-SPEC § Mutation invariants).
 *
 * Pagination: simple Zurück/Weiter buttons that navigate `?page=` —
 * the URL is the source of truth, not local state.
 *
 * Empty states (UI-SPEC § Empty states audit-log rows):
 *   - filters active + zero results → "Keine Audit-Einträge gefunden"
 *   - no filters + zero results     → "Audit-Log noch leer"
 *
 * Drawer state is local — opening the drawer does NOT update the URL
 * (drawer is ephemeral; would clutter the URL contract per plan rationale).
 */

interface Props {
  filters: AuditFilters;
}

const TS_FMT = new Intl.DateTimeFormat('de-AT', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

function actionVariant(
  a: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (a) {
    case 'create':
      return 'default';
    case 'update':
      return 'secondary';
    case 'delete':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function AuditTable({ filters }: Props) {
  const navigate = useNavigate();
  const query = useAuditEntries(filters);
  const [drawerEntry, setDrawerEntry] = useState<AuditEntryDto | null>(null);

  const page = filters.page ?? 1;
  const totalPages = query.data?.meta.totalPages ?? 1;

  const goPage = (next: number) =>
    navigate({
      to: '/admin/audit-log',
      search: (prev) => ({ ...prev, page: next }),
    });

  const filtersActive = !!(
    filters.startDate ||
    filters.endDate ||
    filters.action ||
    filters.resource ||
    filters.userId ||
    filters.category
  );

  const reset = () =>
    navigate({
      to: '/admin/audit-log',
      search: () => ({ page: 1 }),
    });

  return (
    <div className="space-y-6">
      {query.isLoading && (
        <p className="text-muted-foreground">Lädt…</p>
      )}
      {query.isError && (
        <p className="text-destructive">
          Audit-Log konnte nicht geladen werden.
        </p>
      )}

      {query.data && query.data.data.length === 0 && (
        <div className="rounded-md border p-8 text-center">
          {filtersActive ? (
            <>
              <p className="font-semibold">Keine Audit-Einträge gefunden</p>
              <p className="text-sm text-muted-foreground">
                Kein Eintrag passt zu den gewählten Filtern. Erweitere den
                Zeitraum oder entferne Filter.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={reset}
              >
                Filter zurücksetzen
              </Button>
            </>
          ) : (
            <>
              <p className="font-semibold">Audit-Log noch leer</p>
              <p className="text-sm text-muted-foreground">
                Sobald Aktionen im System ausgeführt werden, erscheinen
                sie hier.
              </p>
            </>
          )}
        </div>
      )}

      {query.data && query.data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Aktion</th>
                  <th className="p-2 text-left">Ressource</th>
                  <th className="p-2 text-left">Resource-ID</th>
                  <th className="p-2 text-left">Akteur</th>
                  <th className="p-2 text-left">Zeitstempel</th>
                  <th className="p-2 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((e) => (
                  <tr
                    key={e.id}
                    data-audit-id={e.id}
                    data-audit-action={e.action}
                    className="border-t"
                  >
                    <td className="p-2">
                      <Badge variant={actionVariant(e.action)}>
                        {e.action}
                      </Badge>
                    </td>
                    <td className="p-2">{e.resource}</td>
                    <td className="p-2 font-mono text-xs">
                      {e.resourceId ?? '—'}
                    </td>
                    <td className="p-2">{e.actor?.email ?? e.userId}</td>
                    <td className="p-2">
                      {TS_FMT.format(new Date(e.createdAt))}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDrawerEntry(e)}
                        aria-label="Detail öffnen"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              Zurück
            </Button>
            <span className="text-sm text-muted-foreground">
              Seite {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              Weiter
            </Button>
          </div>
        </>
      )}

      <AuditDetailDrawer
        open={!!drawerEntry}
        entry={drawerEntry}
        onClose={() => setDrawerEntry(null)}
      />
    </div>
  );
}
