import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AffectedEntitiesList,
  type ClassAffectedEntities,
} from '@/components/admin/teacher/AffectedEntitiesList';
import { ClassApiError, useDeleteClass } from '@/hooks/useClasses';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classId: string;
  className: string;
  onDeleted?: () => void;
}

/**
 * Delete a class with Orphan-Guard handling (Phase 12-02 D-13.4).
 *
 * On 409 the dialog switches into its BLOCKED state and renders
 * `AffectedEntitiesList kind='class'` with the server-provided payload.
 * Dialog title swaps to "Klasse kann nicht gelöscht werden."
 */
export function DeleteClassDialog({
  open,
  onOpenChange,
  schoolId,
  classId,
  className,
  onDeleted,
}: Props) {
  const [blocked, setBlocked] = useState<ClassAffectedEntities | null>(null);
  const deleteMutation = useDeleteClass(schoolId);

  const handleConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(classId);
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      if (err instanceof ClassApiError && err.status === 409) {
        const affectedEntities = (err.problem.extensions as any)?.affectedEntities as
          | ClassAffectedEntities
          | undefined;
        if (affectedEntities) {
          setBlocked(affectedEntities);
        }
      }
    }
  };

  const handleClose = () => {
    setBlocked(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
            <div>
              <DialogTitle>
                {blocked ? 'Klasse kann nicht gelöscht werden' : 'Klasse löschen'}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  {blocked ? (
                    <div className="mt-2">
                      <p className="mb-2">
                        Die Klasse <strong>{className}</strong> enthält noch abhängige Daten.
                        Entfernen Sie diese zuerst:
                      </p>
                      <AffectedEntitiesList kind="class" entities={blocked} />
                    </div>
                  ) : (
                    <span>
                      Soll die Klasse <strong>{className}</strong> wirklich gelöscht
                      werden? Diese Aktion kann nicht rückgängig gemacht werden.
                    </span>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            {blocked ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!blocked && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
