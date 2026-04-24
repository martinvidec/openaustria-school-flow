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
  type StudentAffectedEntities,
} from '@/components/admin/teacher/AffectedEntitiesList';
import { useDeleteStudent, StudentApiError } from '@/hooks/useStudents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  studentId: string;
  studentName: string;
  onDeleted?: () => void;
}

export function DeleteStudentDialog({
  open,
  onOpenChange,
  schoolId,
  studentId,
  studentName,
  onDeleted,
}: Props) {
  const [blocked, setBlocked] = useState<StudentAffectedEntities | null>(null);
  const deleteMutation = useDeleteStudent(schoolId);

  const handleConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(studentId);
      onOpenChange(false);
      setBlocked(null);
      onDeleted?.();
    } catch (err) {
      if (err instanceof StudentApiError && err.status === 409) {
        const affected = err.problem.extensions?.affectedEntities as
          | StudentAffectedEntities
          | undefined;
        if (affected) {
          setBlocked(affected);
          toast.error('Schüler:in kann nicht gelöscht werden', {
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
                {blocked ? 'Schüler:in kann nicht gelöscht werden' : 'Schüler:in löschen?'}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  {blocked ? (
                    <>
                      <p className="mb-3">
                        <strong>{studentName}</strong> hat noch Verknüpfungen. Öffnen Sie die
                        Details oder archivieren Sie stattdessen.
                      </p>
                      <AffectedEntitiesList kind="student" entities={blocked} />
                    </>
                  ) : (
                    <p>
                      <strong>{studentName}</strong> wird endgültig gelöscht. Diese Aktion kann
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
