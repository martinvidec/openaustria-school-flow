import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ResourceDto } from '@schoolflow/shared';

/** Human-readable resource type labels */
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  'Tablet-Wagen': 'Tablet-Wagen',
  'Laborgeraet': 'Laborgeraet',
  'Beamer': 'Beamer',
  'Sonstiges': 'Sonstiges',
};

interface ResourceListProps {
  /** List of resources to display */
  resources: ResourceDto[];
  /** Called when add button is clicked */
  onAdd: () => void;
  /** Called when edit action is triggered for a resource */
  onEdit: (resource: ResourceDto) => void;
  /** Called when delete is confirmed for a resource */
  onDelete: (resource: ResourceDto) => void;
  /** Whether a delete operation is in progress */
  isDeleting?: boolean;
}

/**
 * Table-based CRUD list for resources.
 * Displays resources with name, type, quantity, description, and action buttons.
 * Delete action requires confirmation via a dialog with destructive copy.
 *
 * Per UI-SPEC D-15.
 */
export function ResourceList({
  resources,
  onAdd,
  onEdit,
  onDelete,
  isDeleting = false,
}: ResourceListProps) {
  const [deleteTarget, setDeleteTarget] = useState<ResourceDto | null>(null);

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    onDelete(deleteTarget);
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Name
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Typ
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Menge
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Beschreibung
              </th>
              <th className="h-12 px-4 text-right align-middle font-semibold text-muted-foreground">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id} className="border-b last:border-0">
                <td className="px-4 py-3 align-middle font-medium">
                  {resource.name}
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground">
                  {RESOURCE_TYPE_LABELS[resource.resourceType] ??
                    resource.resourceType}
                </td>
                <td className="px-4 py-3 align-middle">
                  {resource.quantity}
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground truncate max-w-[200px]">
                  {resource.description ?? '-'}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(resource)}
                      aria-label={`${resource.name} bearbeiten`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(resource)}
                      aria-label={`${resource.name} loeschen`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ressource loeschen</DialogTitle>
            <DialogDescription>
              Ressource &lsquo;{deleteTarget?.name}&rsquo; loeschen? Alle
              zugehoerigen Buchungen werden ebenfalls geloescht.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Wird geloescht...' : 'Loeschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
