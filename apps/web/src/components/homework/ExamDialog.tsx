import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExamCollisionWarning } from './ExamCollisionWarning';
import { useCreateExam, useUpdateExam, useExamCollisionCheck } from '@/hooks/useExams';
import type { ExamDto } from '@schoolflow/shared';

interface ExamDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  schoolId: string;
  classId?: string;
  classSubjectId?: string;
  exam?: ExamDto;
  onClose: () => void;
}

/**
 * Dialog for scheduling/editing exams with inline collision detection.
 *
 * Per UI-SPEC D-02, D-03, HW-02:
 * - Fields: title, date, duration (optional), description (optional)
 * - On date change: calls useExamCollisionCheck, shows ExamCollisionWarning inline
 * - Submit: if collision and no override, shows warning. "Trotzdem eintragen" sets forceCreate=true
 * - CTA: "Pruefung eintragen" (create) / "Speichern" (edit)
 */
export function ExamDialog({
  open,
  mode,
  schoolId,
  classId,
  classSubjectId,
  exam,
  onClose,
}: ExamDialogProps) {
  const [title, setTitle] = useState(exam?.title ?? '');
  const [date, setDate] = useState(exam?.date ? exam.date.slice(0, 10) : '');
  const [duration, setDuration] = useState(
    exam?.duration != null ? String(exam.duration) : '',
  );
  const [description, setDescription] = useState(exam?.description ?? '');
  const [forceCreate, setForceCreate] = useState(false);

  const createMutation = useCreateExam(schoolId);
  const updateMutation = useUpdateExam(schoolId);

  // Check for collisions when date changes
  const { data: collisionData } = useExamCollisionCheck(
    schoolId,
    classId,
    date || undefined,
    mode === 'edit' ? exam?.id : undefined,
  );

  const hasCollision = collisionData?.hasCollision === true;

  // Reset forceCreate when date changes
  useEffect(() => {
    setForceCreate(false);
  }, [date]);

  const today = new Date().toISOString().slice(0, 10);
  const isValid = title.trim().length >= 1 && date >= today;
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Block submit if collision detected and user has not clicked "Trotzdem eintragen"
  const canSubmit = isValid && (!hasCollision || forceCreate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const durationNum = duration ? parseInt(duration, 10) : undefined;

    if (mode === 'create') {
      createMutation.mutate(
        {
          title: title.trim(),
          date,
          classSubjectId: classSubjectId ?? '',
          classId: classId ?? '',
          duration: durationNum,
          description: description.trim() || undefined,
          forceCreate: forceCreate || undefined,
        },
        { onSuccess: () => onClose() },
      );
    } else if (exam) {
      updateMutation.mutate(
        {
          id: exam.id,
          title: title.trim(),
          date,
          duration: durationNum,
          description: description.trim() || undefined,
        },
        { onSuccess: () => onClose() },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold leading-[1.2]">
            {mode === 'create' ? 'Pruefung eintragen' : 'Pruefung bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Planen Sie eine Pruefung fuer diese Klasse.'
              : 'Bearbeiten Sie die Pruefung.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="exam-title"
              className="text-sm font-semibold leading-[1.4]"
            >
              Titel *
            </label>
            <input
              id="exam-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Titel der Pruefung"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label
              htmlFor="exam-date"
              className="text-sm font-semibold leading-[1.4]"
            >
              Datum *
            </label>
            <input
              id="exam-date"
              type="date"
              required
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Collision warning (inline below date field per UI-SPEC D-03) */}
          {hasCollision && collisionData?.existingExam && (
            <ExamCollisionWarning
              existingExam={collisionData.existingExam}
              onOverride={() => setForceCreate(true)}
            />
          )}

          {/* Duration */}
          <div className="space-y-1.5">
            <label
              htmlFor="exam-duration"
              className="text-sm font-semibold leading-[1.4]"
            >
              Dauer (Minuten)
            </label>
            <input
              id="exam-duration"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="z.B. 50"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="exam-description"
              className="text-sm font-semibold leading-[1.4]"
            >
              Beschreibung
            </label>
            <textarea
              id="exam-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Optionale Beschreibung"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending
                ? 'Wird gespeichert...'
                : mode === 'create'
                  ? 'Pruefung eintragen'
                  : 'Speichern'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
