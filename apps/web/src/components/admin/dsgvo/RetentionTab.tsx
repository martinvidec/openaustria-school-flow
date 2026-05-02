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
  useRetentionPolicies,
  useDeleteRetentionPolicy,
  type RetentionPolicyDto,
} from '@/hooks/useRetention';
import { RetentionEditDialog } from './RetentionEditDialog';

/**
 * Phase 15-06 Task 4: Aufbewahrung tab body — retention-policy CRUD.
 *
 * Phase 16 Plan 05 (D-15) — migrated to <DataList> for mobile-card support
 * at <sm. The native `<table>` formerly inline in this Tab file has been
 * replaced with a DataList; the toolbar (heading + "Neue Richtlinie" CTA)
 * stays above. Each row preserves `data-retention-category={dataCategory}`
 * on BOTH desktop <tr> and mobile-card wrapper so the existing E2E suite
 * (`admin-dsgvo-retention.spec.ts`) continues to match.
 *
 * Renders:
 *  - Toolbar with primary "Neue Richtlinie" button (opens
 *    RetentionEditDialog in create mode)
 *  - DataList of policies (cols: Kategorie / Aufbewahrung (Tage) /
 *    Aktionen)
 *  - Per-row "Bearbeiten" + "Löschen" actions
 *  - Empty state with verbatim UI-SPEC copy + CTA
 *  - Single-step confirm dialog for delete (low blast radius — no email
 *    token per UI-SPEC § Destructive confirmations)
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

  const columns: DataListColumn<RetentionPolicyDto>[] = [
    { key: 'category', header: 'Kategorie', cell: (p) => p.dataCategory },
    {
      key: 'retentionDays',
      header: 'Aufbewahrung (Tage)',
      cell: (p) => p.retentionDays,
    },
    {
      key: 'actions',
      header: 'Aktionen',
      className: 'text-right',
      cell: (p) => (
        <div className="text-right space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing({ mode: 'edit', policy: p })}
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
        </div>
      ),
    },
  ];

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

      {query.isError && (
        <p className="text-destructive">
          Aufbewahrungsrichtlinien konnten nicht geladen werden.
        </p>
      )}

      {query.data && query.data.length === 0 && !query.isLoading && (
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

      {(query.isLoading || (query.data && query.data.length > 0)) && (
        <DataList<RetentionPolicyDto>
          rows={query.data ?? []}
          columns={columns}
          getRowId={(p) => p.id}
          getRowAttrs={(p) => ({ 'data-retention-category': p.dataCategory })}
          loading={query.isLoading}
          mobileCard={(p) => (
            <div className="flex flex-col gap-2">
              <div className="text-base font-semibold leading-6">
                {p.dataCategory}
              </div>
              <div className="text-sm text-muted-foreground leading-5">
                {p.retentionDays} Tage Aufbewahrung
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-11"
                  onClick={() => setEditing({ mode: 'edit', policy: p })}
                >
                  Bearbeiten
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 min-h-11"
                  onClick={() => setPendingDelete(p)}
                >
                  Löschen
                </Button>
              </div>
            </div>
          )}
        />
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
