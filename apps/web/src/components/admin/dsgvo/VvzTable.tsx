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
import {
  useVvzEntries,
  useDeleteVvz,
  type VvzEntryDto,
} from '@/hooks/useVvz';
import { VvzEditDialog } from './VvzEditDialog';

/**
 * Phase 15-07 Task 3: VVZ-Eintrag list + create/edit/delete UI.
 *
 * Renders inside the VVZ sub-tab of /admin/dsgvo. Columns per UI-SPEC § 3b:
 *  - Verarbeitungstätigkeit
 *  - Zweck
 *  - Rechtsgrundlage
 *  - Aktionen
 *
 * Each row carries data-vvz-id={id} for E2E selectors per UI-SPEC § C-8.
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

      {query.isLoading && (
        <p className="text-muted-foreground">Lädt…</p>
      )}
      {query.isError && (
        <p className="text-destructive">
          VVZ-Einträge konnten nicht geladen werden.
        </p>
      )}

      {query.data && query.data.length === 0 && (
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

      {query.data && query.data.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Verarbeitungstätigkeit</th>
                <th className="p-2 text-left">Zweck</th>
                <th className="p-2 text-left">Rechtsgrundlage</th>
                <th className="p-2 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((v) => (
                <tr
                  key={v.id}
                  data-vvz-id={v.id}
                  className="border-t"
                >
                  <td className="p-2">{v.activityName}</td>
                  <td className="p-2 max-w-md">
                    <span className="line-clamp-2">{v.purpose}</span>
                  </td>
                  <td className="p-2 max-w-md">
                    <span className="line-clamp-2">{v.legalBasis}</span>
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing({ mode: 'edit', entry: v })
                      }
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
