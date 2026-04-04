import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { useCreateNote, useUpdateNote } from '@/hooks/useClassbook';
import type { StudentNoteDto } from '@schoolflow/shared';
import { Loader2 } from 'lucide-react';

interface StudentNoteFormProps {
  entryId: string;
  schoolId: string;
  studentId?: string;
  students: Array<{ id: string; name: string }>;
  existingNote?: StudentNoteDto;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Inline form for adding/editing a student note with private flag.
 *
 * Per D-10, UI-SPEC:
 * - Student select (pre-selected if studentId provided)
 * - Content textarea with 5000 char max
 * - "Nur fuer mich und Schulleitung sichtbar" checkbox for isPrivate
 * - Uses useCreateNote / useUpdateNote TanStack Query hooks (NOT raw apiFetch)
 * - Toast "Notiz gespeichert" on success
 */
export function StudentNoteForm({
  entryId,
  schoolId,
  studentId,
  students,
  existingNote,
  onSave,
  onCancel,
}: StudentNoteFormProps) {
  const isEdit = !!existingNote;

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    existingNote?.studentId ?? studentId ?? '',
  );
  const [content, setContent] = useState<string>(existingNote?.content ?? '');
  const [isPrivate, setIsPrivate] = useState<boolean>(existingNote?.isPrivate ?? false);

  // Reset form when existing note changes
  useEffect(() => {
    if (existingNote) {
      setSelectedStudentId(existingNote.studentId);
      setContent(existingNote.content);
      setIsPrivate(existingNote.isPrivate);
    }
  }, [existingNote]);

  const createMutation = useCreateNote(schoolId, entryId);
  const updateMutation = useUpdateNote(schoolId);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const canSubmit = selectedStudentId && content.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      if (isEdit && existingNote) {
        await updateMutation.mutateAsync({
          noteId: existingNote.id,
          content: content.trim(),
          isPrivate,
        });
      } else {
        await createMutation.mutateAsync({
          studentId: selectedStudentId,
          content: content.trim(),
          isPrivate,
        });
      }
      toast.success('Notiz gespeichert');
      onSave();
    } catch {
      toast.error('Notiz konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-4">
        {/* Student select */}
        <div className="grid gap-2">
          <Label htmlFor="note-student">Schueler/in</Label>
          <Select
            value={selectedStudentId}
            onValueChange={setSelectedStudentId}
            disabled={isEdit}
          >
            <SelectTrigger id="note-student">
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

        {/* Content textarea */}
        <div className="grid gap-2">
          <Label htmlFor="note-content">Notiz</Label>
          <Textarea
            id="note-content"
            placeholder="Notiz eingeben..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={3}
          />
          {content.length > 4500 && (
            <p className="text-xs text-muted-foreground">
              {content.length}/5000 Zeichen
            </p>
          )}
        </div>

        {/* Private checkbox */}
        <div className="flex items-center gap-2 min-h-[44px]">
          <input
            id="note-private"
            type="checkbox"
            className="h-5 w-5 rounded border-input accent-primary"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <Label htmlFor="note-private" className="cursor-pointer font-normal">
            Nur fuer mich und Schulleitung sichtbar
          </Label>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} size="sm" className="min-h-[44px]">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Speichern' : 'Notiz hinzufuegen'}
          </Button>
          <Button variant="outline" onClick={onCancel} size="sm" className="min-h-[44px]">
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
