import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMoveStudent, useBulkMoveStudents, type StudentDto } from '@/hooks/useStudents';

/**
 * Phase 12-01 MoveStudentDialog (STUDENT-03 / D-05).
 *
 * Two modes:
 *   - `single`: one-row move via PUT /students/:id with new classId
 *   - `bulk`: avatar-stack preview (max 5 visible + "+N weitere"), sequential
 *     PUT per row with progress counter in toast
 *
 * zodResolver would be ideal but the existing dialogs in this repo use plain
 * React state; we match that convention.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'single' | 'bulk';
  studentIds: string[];
  studentsById?: Map<string, StudentDto>;
  currentClassId?: string;
  schoolId: string;
  classes: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function MoveStudentDialog({
  open,
  onOpenChange,
  mode,
  studentIds,
  studentsById,
  currentClassId,
  schoolId,
  classes,
  onSuccess,
}: Props) {
  const singleMove = useMoveStudent(schoolId);
  const bulkMove = useBulkMoveStudents(schoolId);

  const [targetClassId, setTargetClassId] = useState('');
  const [notiz, setNotiz] = useState('');
  const [touched, setTouched] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const isBulk = mode === 'bulk';
  const total = studentIds.length;
  const isValid = !!targetClassId && targetClassId !== currentClassId;

  const handleConfirm = async () => {
    setTouched(true);
    if (!isValid) return;
    try {
      if (isBulk) {
        await bulkMove.mutateAsync({
          studentIds,
          targetClassId,
          onProgress: (done, total) => setProgress({ done, total }),
        });
      } else {
        await singleMove.mutateAsync({
          studentId: studentIds[0],
          targetClassId,
        });
      }
      onOpenChange(false);
      onSuccess?.();
      setTargetClassId('');
      setNotiz('');
      setProgress(null);
    } catch {
      // Toast fired in hook onError. Leave dialog open for retry/cancel.
    }
  };

  const previewStudents = isBulk && studentsById
    ? studentIds.slice(0, 5).map((id) => studentsById.get(id)).filter(Boolean) as StudentDto[]
    : [];
  const extraCount = isBulk ? Math.max(0, total - 5) : 0;

  const title = isBulk
    ? `${total} Schüler:innen in andere Klasse verschieben`
    : 'Schüler:in in andere Klasse verschieben';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isBulk
              ? 'Alle ausgewählten Schüler:innen werden in die Ziel-Klasse verschoben.'
              : 'Die Schüler:in wird in die Ziel-Klasse verschoben. Die Daten bleiben erhalten.'}
          </DialogDescription>
        </DialogHeader>

        {isBulk && previewStudents.length > 0 && (
          <div className="flex -space-x-2" aria-label="Ausgewählte Schüler:innen" data-testid="avatar-stack">
            {previewStudents.map((s) => (
              <span
                key={s.id}
                title={`${s.person.firstName} ${s.person.lastName}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold border-2 border-background"
              >
                {s.person.firstName.charAt(0)}
                {s.person.lastName.charAt(0)}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold border-2 border-background">
                +{extraCount} weitere
              </span>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="targetClassId">Ziel-Klasse</Label>
            <select
              id="targetClassId"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Bitte Ziel-Klasse auswählen</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} disabled={c.id === currentClassId}>
                  {c.name}
                  {c.id === currentClassId ? ' (aktuell)' : ''}
                </option>
              ))}
            </select>
            {touched && !targetClassId && (
              <p className="text-sm text-destructive mt-1">Bitte Ziel-Klasse auswählen</p>
            )}
          </div>

          <div>
            <Label htmlFor="notiz">Notiz (optional)</Label>
            <Textarea
              id="notiz"
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="Interner Vermerk zum Umzug"
              maxLength={500}
            />
          </div>
        </div>

        {progress && isBulk && (
          <p className="text-sm text-muted-foreground">
            {progress.done}/{progress.total} verschoben …
          </p>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || singleMove.isPending || bulkMove.isPending}
          >
            Verschieben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
