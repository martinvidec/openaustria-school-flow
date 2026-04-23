import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
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
  type SubjectAffectedEntities,
} from '@/components/admin/teacher/AffectedEntitiesList';
import { useDeleteSubject, SubjectApiError } from '@/hooks/useSubjects';

/**
 * DeleteSubjectDialog — Phase 11 Plan 11-02 SUBJECT-05.
 * Two states:
 *   - Happy: amber AlertTriangle + body + Abbrechen + Löschen(destructive)
 *   - Blocked (409): red AlertTriangle + AffectedEntitiesList + single
 *     Schließen footer; also fires red toast (UI-SPEC §4.3).
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  subjectId: string;
  subjectName: string;
  onDeleted?: () => void;
}

export function DeleteSubjectDialog({
  open,
  onOpenChange,
  schoolId,
  subjectId,
  subjectName,
  onDeleted,
}: Props) {
  const [blocked, setBlocked] = useState<SubjectAffectedEntities | null>(null);
  const deleteMutation = useDeleteSubject(schoolId);

  const handleConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(subjectId);
      onOpenChange(false);
      setBlocked(null);
      onDeleted?.();
    } catch (err) {
      if (err instanceof SubjectApiError && err.status === 409) {
        const affected = err.problem.extensions?.affectedEntities as
          | SubjectAffectedEntities
          | undefined;
        if (affected) {
          setBlocked(affected);
          toast.error('Fach kann nicht gelöscht werden', {
            description: err.problem.detail,
          });
        }
      }
    }
  };

  const handleClose = () => {
    setBlocked(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`h-6 w-6 ${blocked ? 'text-destructive' : 'text-amber-600'}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <DialogTitle>
                {blocked ? 'Fach kann nicht gelöscht werden' : 'Fach löschen?'}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  {blocked ? (
                    <>
                      <p className="mb-3">
                        <strong>{subjectName}</strong> ist noch mit folgenden
                        Datensätzen verknüpft. Lösen Sie die oben aufgeführten
                        Zuordnungen, bevor Sie das Fach löschen.
                      </p>
                      <AffectedEntitiesList kind="subject" entities={blocked} />
                    </>
                  ) : (
                    <p>
                      "{subjectName}" wird dauerhaft gelöscht. Diese Aktion
                      kann nicht rückgängig gemacht werden.
                    </p>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {blocked ? (
            <Button onClick={handleClose}>Schließen</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose} autoFocus>
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={deleteMutation.isPending}
                data-testid="subject-delete-confirm"
              >
                Löschen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
