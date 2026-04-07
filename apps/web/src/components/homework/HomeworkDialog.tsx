import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCreateHomework, useUpdateHomework } from '@/hooks/useHomework';
import type { HomeworkDto } from '@schoolflow/shared';

interface HomeworkDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  schoolId: string;
  lessonId?: string;
  classSubjectId?: string;
  classBookEntryId?: string;
  homework?: HomeworkDto;
  onClose: () => void;
}

/**
 * Dialog for creating/editing homework assignments.
 *
 * Per UI-SPEC D-01, HW-01:
 * - Fields: title (required), description (optional), dueDate (required, >= today)
 * - classSubjectId pre-filled from context
 * - CTA: "Hausaufgabe erstellen" (create) / "Speichern" (edit)
 * - Validation: title min 1 char, dueDate required and >= today
 */
export function HomeworkDialog({
  open,
  mode,
  schoolId,
  classSubjectId,
  classBookEntryId,
  homework,
  onClose,
}: HomeworkDialogProps) {
  const [title, setTitle] = useState(homework?.title ?? '');
  const [description, setDescription] = useState(homework?.description ?? '');
  const [dueDate, setDueDate] = useState(
    homework?.dueDate
      ? homework.dueDate.slice(0, 10)
      : '',
  );

  const createMutation = useCreateHomework(schoolId);
  const updateMutation = useUpdateHomework(schoolId);

  const today = new Date().toISOString().slice(0, 10);
  const isValid = title.trim().length >= 1 && dueDate >= today;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    if (mode === 'create') {
      createMutation.mutate(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
          classSubjectId: classSubjectId ?? '',
          classBookEntryId: classBookEntryId || undefined,
        },
        { onSuccess: () => onClose() },
      );
    } else if (homework) {
      updateMutation.mutate(
        {
          id: homework.id,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
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
            {mode === 'create' ? 'Hausaufgabe erstellen' : 'Hausaufgabe bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Erstellen Sie eine neue Hausaufgabe fuer diese Stunde.'
              : 'Bearbeiten Sie die Hausaufgabe.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="homework-title"
              className="text-sm font-semibold leading-[1.4]"
            >
              Titel *
            </label>
            <input
              id="homework-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Titel der Hausaufgabe"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="homework-description"
              className="text-sm font-semibold leading-[1.4]"
            >
              Beschreibung
            </label>
            <textarea
              id="homework-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Optionale Beschreibung"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label
              htmlFor="homework-due-date"
              className="text-sm font-semibold leading-[1.4]"
            >
              Faellig am *
            </label>
            <input
              id="homework-due-date"
              type="date"
              required
              min={today}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              disabled={!isValid || isPending}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending
                ? 'Wird gespeichert...'
                : mode === 'create'
                  ? 'Hausaufgabe erstellen'
                  : 'Speichern'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
