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
  useDsfaEntries,
  useDeleteDsfa,
  type DsfaEntryDto,
} from '@/hooks/useDsfa';
import { DsfaEditDialog } from './DsfaEditDialog';

/**
 * Phase 15-07 Task 2: DSFA-Eintrag list + create/edit/delete UI.
 *
 * Renders inside the DSFA sub-tab of /admin/dsgvo. Columns per UI-SPEC § 3a:
 *  - Titel
 *  - Datenkategorien (renders the array as ", "-joined)
 *  - Zuletzt aktualisiert (response includes updatedAt — not on the hook
 *    DsfaEntryDto inline type, so cast at usage point per plan 15-07
 *    convention; Phase 16 will tighten the inline type)
 *  - Aktionen
 *
 * Each row carries data-dsfa-id={id} for E2E selectors per UI-SPEC § C-8.
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

      {query.isLoading && (
        <p className="text-muted-foreground">Lädt…</p>
      )}
      {query.isError && (
        <p className="text-destructive">
          DSFA-Einträge konnten nicht geladen werden.
        </p>
      )}

      {query.data && query.data.length === 0 && (
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

      {query.data && query.data.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Titel</th>
                <th className="p-2 text-left">Datenkategorien</th>
                <th className="p-2 text-left">Zuletzt aktualisiert</th>
                <th className="p-2 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((d) => (
                <tr
                  key={d.id}
                  data-dsfa-id={d.id}
                  className="border-t"
                >
                  <td className="p-2">{d.title}</td>
                  <td className="p-2">
                    {Array.isArray(d.dataCategories) &&
                    d.dataCategories.length > 0
                      ? d.dataCategories.join(', ')
                      : '—'}
                  </td>
                  <td className="p-2">
                    {formatDate((d as { updatedAt?: unknown }).updatedAt)}
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing({ mode: 'edit', entry: d })
                      }
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
