import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import {
  useAuditEntries,
  type AuditEntryDto,
  type AuditFilters,
} from '@/hooks/useAuditEntries';
import { AuditDetailDrawer } from './AuditDetailDrawer';

/**
 * Phase 15-09 component: paginated audit-entries list.
 *
 * Phase 16 Plan 05 (D-15) — migrated to <DataList> so the same component
 * gives a desktop `<table>` AND a mobile-card stack at <sm. The pagination
 * controls + filter bar + drawer stay above/below the DataList. Each row
 * carries `data-audit-id={id}` + `data-audit-action={action}` for the
 * Plan 15-11 E2E suite — preserved on BOTH render paths via getRowAttrs.
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

  const columns: DataListColumn<AuditEntryDto>[] = [
    {
      key: 'action',
      header: 'Aktion',
      cell: (e) => (
        <Badge variant={actionVariant(e.action)}>{e.action}</Badge>
      ),
    },
    { key: 'resource', header: 'Ressource', cell: (e) => e.resource },
    {
      key: 'resourceId',
      header: 'Resource-ID',
      cell: (e) => (
        <span className="font-mono text-xs">{e.resourceId ?? '—'}</span>
      ),
    },
    {
      key: 'actor',
      header: 'Akteur',
      cell: (e) => e.actor?.email ?? e.userId,
    },
    {
      key: 'createdAt',
      header: 'Zeitstempel',
      cell: (e) => TS_FMT.format(new Date(e.createdAt)),
    },
    {
      key: 'actions',
      header: 'Aktionen',
      className: 'text-right',
      cell: (e) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={(ev) => {
              ev.stopPropagation();
              setDrawerEntry(e);
            }}
            aria-label="Detail öffnen"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {query.isError && (
        <p className="text-destructive">
          Audit-Log konnte nicht geladen werden.
        </p>
      )}

      {!query.isError && query.data && query.data.data.length === 0 && !query.isLoading && (
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

      {(query.isLoading || (query.data && query.data.data.length > 0)) && (
        <>
          <DataList<AuditEntryDto>
            rows={query.data?.data ?? []}
            columns={columns}
            getRowId={(e) => e.id}
            getRowAttrs={(e) => ({
              'data-audit-id': e.id,
              'data-audit-action': e.action,
            })}
            loading={query.isLoading}
            onRowClick={(e) => setDrawerEntry(e)}
            mobileCard={(e) => (
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-base font-semibold leading-6">
                    {e.resource}
                  </div>
                  <Badge variant={actionVariant(e.action)}>{e.action}</Badge>
                </div>
                {e.resourceId && (
                  <div className="text-xs font-mono text-muted-foreground leading-5 break-all">
                    {e.resourceId}
                  </div>
                )}
                <div className="text-sm text-muted-foreground leading-5">
                  {e.actor?.email ?? e.userId}
                </div>
                <div className="text-xs text-muted-foreground leading-5">
                  {TS_FMT.format(new Date(e.createdAt))}
                </div>
              </div>
            )}
          />

          {query.data && query.data.data.length > 0 && (
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
          )}
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
