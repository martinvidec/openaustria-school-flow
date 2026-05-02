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
  useVvzEntries,
  useDeleteVvz,
  type VvzEntryDto,
} from '@/hooks/useVvz';
import { VvzEditDialog } from './VvzEditDialog';

/**
 * Phase 15-07 Task 3: VVZ-Eintrag list + create/edit/delete UI.
 *
 * Phase 16 Plan 05 (D-15) — migrated to <DataList> for mobile-card support
 * at <sm. Each row preserves `data-vvz-id={id}` on BOTH desktop <tr> and
 * mobile-card wrapper so the existing E2E suite (`admin-dsgvo-vvz.spec.ts`)
 * continues to match.
 *
 * Renders inside the VVZ sub-tab of /admin/dsgvo. Columns per UI-SPEC § 3b:
 *  - Verarbeitungstätigkeit
 *  - Zweck
 *  - Rechtsgrundlage
 *  - Aktionen
 *
 * Delete uses single-step confirmation per UI-SPEC § Destructive
 * confirmations (VVZ = low blast radius, no email-token).
 */

interface Props {
  schoolId: string;
}

interface EditingState {
  mode: 'create' | 'edit';
  entry?: VvzEntryDto;
}

export function VvzTable({ schoolId }: Props) {
  const query = useVvzEntries(schoolId);
  const del = useDeleteVvz();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VvzEntryDto | null>(null);

  const columns: DataListColumn<VvzEntryDto>[] = [
    {
      key: 'activityName',
      header: 'Verarbeitungstätigkeit',
      cell: (v) => v.activityName,
    },
    {
      key: 'purpose',
      header: 'Zweck',
      className: 'max-w-md',
      cell: (v) => <span className="line-clamp-2">{v.purpose}</span>,
    },
    {
      key: 'legalBasis',
      header: 'Rechtsgrundlage',
      className: 'max-w-md',
      cell: (v) => <span className="line-clamp-2">{v.legalBasis}</span>,
    },
    {
      key: 'actions',
      header: 'Aktionen',
      className: 'text-right',
      cell: (v) => (
        <div className="text-right space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing({ mode: 'edit', entry: v })}
          >
            Bearbeiten
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setPendingDelete(v)}
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
          Verzeichnis von Verarbeitungstätigkeiten nach Art. 30 DSGVO.
        </div>
        <Button onClick={() => setEditing({ mode: 'create' })}>
          VVZ-Eintrag anlegen
        </Button>
      </div>

      {query.isError && (
        <p className="text-destructive">
          VVZ-Einträge konnten nicht geladen werden.
        </p>
      )}

      {query.data && query.data.length === 0 && !query.isLoading && (
        <div className="rounded-md border p-8 text-center">
          <p className="font-semibold">Keine VVZ-Einträge vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Das Verarbeitungsverzeichnis ist DSGVO-Pflicht (Art. 30). Lege
            deinen ersten Eintrag an.
          </p>
          <Button
            className="mt-4"
            onClick={() => setEditing({ mode: 'create' })}
          >
            VVZ-Eintrag anlegen
          </Button>
        </div>
      )}

      {(query.isLoading || (query.data && query.data.length > 0)) && (
        <DataList<VvzEntryDto>
          rows={query.data ?? []}
          columns={columns}
          getRowId={(v) => v.id}
          getRowAttrs={(v) => ({ 'data-vvz-id': v.id })}
          loading={query.isLoading}
          mobileCard={(v) => (
            <div className="flex flex-col gap-2">
              <div className="text-base font-semibold leading-6">
                {v.activityName}
              </div>
              <div className="text-sm leading-5 line-clamp-3">{v.purpose}</div>
              <div className="text-xs text-muted-foreground leading-5 line-clamp-2">
                {v.legalBasis}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-11"
                  onClick={() => setEditing({ mode: 'edit', entry: v })}
                >
                  Bearbeiten
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 min-h-11"
                  onClick={() => setPendingDelete(v)}
                >
                  Löschen
                </Button>
              </div>
            </div>
          )}
        />
      )}

      {editing && (
        <VvzEditDialog
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
            <DialogTitle>VVZ-Eintrag wirklich löschen?</DialogTitle>
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
