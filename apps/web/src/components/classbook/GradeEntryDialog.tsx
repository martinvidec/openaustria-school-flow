import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GradeValuePicker } from './GradeValuePicker';
import { useCreateGrade, useUpdateGrade } from '@/hooks/useGrades';
import type { GradeEntryDto, GradeCategory } from '@schoolflow/shared';
import { Loader2 } from 'lucide-react';

interface GradeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classSubjectId: string;
  studentId?: string;
  students: Array<{ id: string; name: string }>;
  existingGrade?: GradeEntryDto;
  onSave?: () => void;
}

/**
 * Dialog for adding/editing a grade entry with Austrian Notensystem support.
 *
 * Per D-05, D-06, UI-SPEC:
 * - Title: "Neue Note erfassen" (add) or "Note bearbeiten" (edit)
 * - Fields: Student select, Category select, GradeValuePicker, Description textarea, Date
 * - Uses useCreateGrade / useUpdateGrade TanStack Query hooks
 * - Toast on success/error per copywriting contract
 */
export function GradeEntryDialog({
  open,
  onOpenChange,
  schoolId,
  classSubjectId,
  studentId,
  students,
  existingGrade,
  onSave,
}: GradeEntryDialogProps) {
  const isEdit = !!existingGrade;

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    existingGrade?.studentId ?? studentId ?? '',
  );
  const [category, setCategory] = useState<GradeCategory>(
    existingGrade?.category ?? 'MITARBEIT',
  );
  const [gradeValue, setGradeValue] = useState<number | null>(
    existingGrade?.value ?? null,
  );
  const [description, setDescription] = useState<string>(
    existingGrade?.description ?? '',
  );
  const [date, setDate] = useState<string>(
    existingGrade?.date ?? new Date().toISOString().split('T')[0],
  );

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setSelectedStudentId(existingGrade?.studentId ?? studentId ?? '');
      setCategory(existingGrade?.category ?? 'MITARBEIT');
      setGradeValue(existingGrade?.value ?? null);
      setDescription(existingGrade?.description ?? '');
      setDate(existingGrade?.date ?? new Date().toISOString().split('T')[0]);
    }
  }, [open, existingGrade, studentId]);

  const createMutation = useCreateGrade(schoolId);
  const updateMutation = useUpdateGrade(schoolId);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const canSubmit = selectedStudentId && gradeValue !== null && date;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      if (isEdit && existingGrade) {
        await updateMutation.mutateAsync({
          gradeId: existingGrade.id,
          value: gradeValue!,
          description: description || undefined,
          date,
        });
      } else {
        await createMutation.mutateAsync({
          classSubjectId,
          studentId: selectedStudentId,
          category,
          value: gradeValue!,
          description: description || undefined,
          date,
        });
      }
      toast.success('Note gespeichert');
      onOpenChange(false);
      onSave?.();
    } catch {
      toast.error('Note konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Note bearbeiten' : 'Neue Note erfassen'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Aendern Sie die Bewertung fuer den Schueler.'
              : 'Erfassen Sie eine neue Bewertung fuer einen Schueler.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Student select */}
          <div className="grid gap-2">
            <Label htmlFor="grade-student">Schueler/in</Label>
            <Select
              value={selectedStudentId}
              onValueChange={setSelectedStudentId}
              disabled={isEdit}
            >
              <SelectTrigger id="grade-student">
                <SelectValue placeholder="Schueler/in auswaehlen" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category select */}
          <div className="grid gap-2">
            <Label htmlFor="grade-category">Kategorie</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as GradeCategory)}
              disabled={isEdit}
            >
              <SelectTrigger id="grade-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHULARBEIT">Schularbeit</SelectItem>
                <SelectItem value="MUENDLICH">Muendlich</SelectItem>
                <SelectItem value="MITARBEIT">Mitarbeit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grade value picker */}
          <div className="grid gap-2">
            <Label>Notenwert</Label>
            <GradeValuePicker value={gradeValue} onChange={setGradeValue} />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="grade-description">Beschreibung (optional)</Label>
            <Textarea
              id="grade-description"
              placeholder="z.B. Schularbeit Kapitel 3-5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label htmlFor="grade-date">Datum</Label>
            <input
              id="grade-date"
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Speichern' : 'Note hinzufuegen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
