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
import { AffectedEntitiesList, type AffectedEntities } from './AffectedEntitiesList';
import { useDeleteTeacher, TeacherApiError } from '@/hooks/useTeachers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  onDeleted?: () => void;
}

export function DeleteTeacherDialog({ open, onOpenChange, schoolId, teacherId, teacherName, onDeleted }: Props) {
  const [blocked, setBlocked] = useState<AffectedEntities | null>(null);
  const deleteMutation = useDeleteTeacher(schoolId);

  const handleConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(teacherId);
      onOpenChange(false);
      setBlocked(null);
      onDeleted?.();
    } catch (err) {
      if (err instanceof TeacherApiError && err.status === 409) {
        const affected = err.problem.extensions?.affectedEntities as AffectedEntities | undefined;
        if (affected) {
          setBlocked(affected);
          // Also surface a toast (UI-SPEC §4.3)
          toast.error('Lehrperson kann nicht gelöscht werden', {
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
            <div>
              <DialogTitle>
                {blocked ? 'Lehrperson kann nicht gelöscht werden' : 'Lehrperson löschen?'}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  {blocked ? (
                    <>
                      <p className="mb-3">
                        <strong>{teacherName}</strong> ist noch mit folgenden Datensätzen verknüpft.
                        Bitte lösen Sie erst alle Zuordnungen.
                      </p>
                      <AffectedEntitiesList entities={blocked} />
                    </>
                  ) : (
                    <p>
                      <strong>{teacherName}</strong> wird endgültig gelöscht. Diese Aktion kann
                      nicht rückgängig gemacht werden.
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
              <Button variant="ghost" onClick={handleClose}>
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={deleteMutation.isPending}
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
