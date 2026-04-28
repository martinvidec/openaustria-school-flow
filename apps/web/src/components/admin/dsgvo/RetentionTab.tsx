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
  useRetentionPolicies,
  useDeleteRetentionPolicy,
  type RetentionPolicyDto,
} from '@/hooks/useRetention';
import { RetentionEditDialog } from './RetentionEditDialog';

/**
 * Phase 15-06 Task 4: Aufbewahrung tab body — retention-policy CRUD.
 *
 * Renders:
 *  - Toolbar with primary "Neue Richtlinie" button (opens
 *    RetentionEditDialog in create mode)
 *  - Native <table> of policies (cols: Kategorie / Aufbewahrung (Tage) /
 *    Aktionen)
 *  - Per-row "Bearbeiten" + "Löschen" actions
 *  - Empty state with verbatim UI-SPEC copy + CTA
 *  - Single-step confirm dialog for delete (low blast radius — no email
 *    token per UI-SPEC § Destructive confirmations)
 *
 * Each row carries data-retention-category={dataCategory} per UI-SPEC §
 * Mutation invariants for E2E selectors. (Plan 15-10 will assert.)
 *
 * NOTE — deviation matching RetentionEditDialog: the plan prose listed
 * a "Rechtsgrundlage" column, but `legalBasis` does not exist on the
 * RetentionPolicy model or DTO. Column omitted from the table to match
 * the actual data shape.
 */

interface Props {
  schoolId: string;
}

interface EditingState {
  mode: 'create' | 'edit';
  policy?: RetentionPolicyDto;
}

export function RetentionTab({ schoolId }: Props) {
  const query = useRetentionPolicies(schoolId);
  const del = useDeleteRetentionPolicy();

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<RetentionPolicyDto | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Aufbewahrungsfristen pro Datenkategorie verwalten.
        </div>
        <Button onClick={() => setEditing({ mode: 'create' })}>
          Neue Richtlinie
        </Button>
      </div>

      {query.isLoading && (
        <p className="text-muted-foreground">Lädt…</p>
      )}
      {query.isError && (
        <p className="text-destructive">
          Aufbewahrungsrichtlinien konnten nicht geladen werden.
        </p>
      )}

      {query.data && query.data.length === 0 && (
        <div className="rounded-md border p-8 text-center">
          <p className="font-semibold">
            Keine Aufbewahrungsrichtlinien angelegt
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Lege eine Richtlinie pro Datenkategorie an, um die
            DSGVO-Mindestvorgaben zu erfüllen.
          </p>
          <Button
            className="mt-4"
            onClick={() => setEditing({ mode: 'create' })}
          >
            Neue Richtlinie
          </Button>
        </div>
      )}

      {query.data && query.data.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Kategorie</th>
                <th className="p-2 text-left">Aufbewahrung (Tage)</th>
                <th className="p-2 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((p) => (
                <tr
                  key={p.id}
                  data-retention-category={p.dataCategory}
                  className="border-t"
                >
                  <td className="p-2">{p.dataCategory}</td>
                  <td className="p-2">{p.retentionDays}</td>
                  <td className="p-2 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing({ mode: 'edit', policy: p })
                      }
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setPendingDelete(p)}
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
        <RetentionEditDialog
          open
          mode={editing.mode}
          policy={editing.policy}
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
            <DialogTitle>
              Aufbewahrungsrichtlinie wirklich löschen?
            </DialogTitle>
            <DialogDescription>
              Die Richtlinie wird sofort entfernt. Bereits angewendete
              Aufbewahrungsfristen bleiben unberührt.
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
