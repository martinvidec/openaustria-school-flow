import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import {
  useDsfaEntries,
  useDeleteDsfa,
  type DsfaEntryDto,
} from '@/hooks/useDsfa';
import { DsfaEditDialog } from './DsfaEditDialog';

/**
 * Phase 15-07 Task 2: DSFA-Eintrag list + create/edit/delete UI.
 *
 * Phase 16 Plan 05 (D-15) — migrated to <DataList> for mobile-card support
 * at <sm. Each row preserves `data-dsfa-id={id}` on BOTH desktop <tr> and
 * mobile-card wrapper so the existing E2E suite (`admin-dsgvo-dsfa.spec.ts`)
 * continues to match.
 *
 * Renders inside the DSFA sub-tab of /admin/dsgvo. Columns per UI-SPEC § 3a:
 *  - Titel
 *  - Datenkategorien (renders the array as ", "-joined)
 *  - Zuletzt aktualisiert (response includes updatedAt — not on the hook
 *    DsfaEntryDto inline type, so cast at usage point per plan 15-07
 *    convention; Phase 16 will tighten the inline type)
 *  - Aktionen
 *
 * Delete uses single-step confirmation per UI-SPEC § Destructive
 * confirmations (DSFA = low blast radius, no email-token).
 */

interface Props {
  schoolId: string;
}

interface EditingState {
  mode: 'create' | 'edit';
  entry?: DsfaEntryDto;
}

export function DsfaTable({ schoolId }: Props) {
  const query = useDsfaEntries(schoolId);
  const del = useDeleteDsfa();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DsfaEntryDto | null>(null);

  const formatDate = (raw: unknown): string => {
    if (typeof raw !== 'string' && !(raw instanceof Date)) return '—';
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('de-AT');
  };

  const columns: DataListColumn<DsfaEntryDto>[] = [
    { key: 'title', header: 'Titel', cell: (d) => d.title },
    {
      key: 'dataCategories',
      header: 'Datenkategorien',
      cell: (d) =>
        Array.isArray(d.dataCategories) && d.dataCategories.length > 0
          ? d.dataCategories.join(', ')
          : '—',
    },
    {
      key: 'updatedAt',
      header: 'Zuletzt aktualisiert',
      cell: (d) => formatDate((d as { updatedAt?: unknown }).updatedAt),
    },
    {
      key: 'actions',
      header: 'Aktionen',
      className: 'text-right',
      cell: (d) => (
        <div className="text-right space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing({ mode: 'edit', entry: d })}
          >
            Bearbeiten
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setPendingDelete(d)}
          >
            Löschen
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Datenschutz-Folgenabschätzungen nach Art. 35 DSGVO.
        </div>
        <Button onClick={() => setEditing({ mode: 'create' })}>
          DSFA anlegen
        </Button>
      </div>

      {query.isError && (
        <p className="text-destructive">
          DSFA-Einträge konnten nicht geladen werden.
        </p>
      )}

      {query.data && query.data.length === 0 && !query.isLoading && (
        <div className="rounded-md border p-8 text-center">
          <p className="font-semibold">Keine DSFA-Einträge vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Lege eine Datenschutz-Folgenabschätzung an, sobald eine neue
            Verarbeitung mit hohem Risiko geplant ist.
          </p>
          <Button
            className="mt-4"
            onClick={() => setEditing({ mode: 'create' })}
          >
            DSFA anlegen
          </Button>
        </div>
      )}

      {(query.isLoading || (query.data && query.data.length > 0)) && (
        <DataList<DsfaEntryDto>
          rows={query.data ?? []}
          columns={columns}
          getRowId={(d) => d.id}
          getRowAttrs={(d) => ({ 'data-dsfa-id': d.id })}
          loading={query.isLoading}
          mobileCard={(d) => (
            <div className="flex flex-col gap-2">
              <div className="text-base font-semibold leading-6">{d.title}</div>
              <div className="text-sm text-muted-foreground leading-5">
                {Array.isArray(d.dataCategories) && d.dataCategories.length > 0
                  ? d.dataCategories.join(', ')
                  : 'Keine Kategorien'}
              </div>
              <div className="text-xs text-muted-foreground leading-5">
                {formatDate((d as { updatedAt?: unknown }).updatedAt)}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-11"
                  onClick={() => setEditing({ mode: 'edit', entry: d })}
                >
                  Bearbeiten
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 min-h-11"
                  onClick={() => setPendingDelete(d)}
                >
                  Löschen
                </Button>
              </div>
            </div>
          )}
        />
      )}

      {editing && (
        <DsfaEditDialog
          open
          mode={editing.mode}
          entry={editing.entry}
          schoolId={schoolId}
          onClose={() => setEditing(null)}
        />
      )}

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && !del.isPending && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DSFA-Eintrag wirklich löschen?</DialogTitle>
            <DialogDescription>
              Der Eintrag wird sofort entfernt. Diese Aktion kann nicht
              rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={del.isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => {
                if (!pendingDelete) return;
                del.mutate(pendingDelete.id, {
                  onSettled: () => setPendingDelete(null),
                });
              }}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
