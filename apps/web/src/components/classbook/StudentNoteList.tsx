import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudentNoteForm } from './StudentNoteForm';
import { useNotes, useDeleteNote } from '@/hooks/useClassbook';
import { useAuth } from '@/hooks/useAuth';
import type { StudentNoteDto } from '@schoolflow/shared';
import { Lock, MoreVertical, Loader2, Plus, MessageSquareText } from 'lucide-react';

interface StudentNoteListProps {
  entryId: string;
  schoolId: string;
}

/** Format date as dd.MM.yyyy HH:mm per UI-SPEC. */
function formatTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return isoStr;
  }
}

/** Group notes by studentId. Returns array of [studentName, notes[]] sorted by student name. */
function groupByStudent(notes: StudentNoteDto[]): Array<{ studentId: string; studentName: string; notes: StudentNoteDto[] }> {
  const groups = new Map<string, { studentName: string; notes: StudentNoteDto[] }>();
  for (const note of notes) {
    const existing = groups.get(note.studentId);
    if (existing) {
      existing.notes.push(note);
    } else {
      groups.set(note.studentId, { studentName: note.studentName, notes: [note] });
    }
  }
  // Sort groups by student name, notes within group by createdAt desc
  const result = Array.from(groups.entries())
    .map(([studentId, { studentName, notes }]) => ({
      studentId,
      studentName,
      notes: notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'de'));
  return result;
}

/**
 * Student notes list grouped by student with private flag visibility.
 *
 * Per D-10, UI-SPEC:
 * - Data fetching via useNotes TanStack Query hook (NOT raw apiFetch)
 * - Notes grouped by studentId with section headers
 * - Each note: author, timestamp (dd.MM.yyyy HH:mm), content preview, "Privat" badge with lock
 * - Actions dropdown on own notes: "Bearbeiten", "Loeschen"
 * - Delete via useDeleteNote TanStack Query hook with confirmation dialog
 * - "Notiz hinzufuegen" button opens inline StudentNoteForm
 * - Empty state: "Keine Notizen vorhanden"
 */
export function StudentNoteList({ entryId, schoolId }: StudentNoteListProps) {
  const { user } = useAuth();
  const { data: notes, isLoading } = useNotes(schoolId, entryId);
  const deleteMutation = useDeleteNote(schoolId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<StudentNoteDto | null>(null);
  const [deleteNote, setDeleteNote] = useState<StudentNoteDto | null>(null);

  // Group notes by student
  const grouped = useMemo(() => {
    if (!notes) return [];
    return groupByStudent(notes);
  }, [notes]);

  // Extract student list for form
  const studentList = useMemo(() => {
    if (!notes || notes.length === 0) return [];
    const seen = new Map<string, string>();
    for (const note of notes) {
      if (!seen.has(note.studentId)) {
        seen.set(note.studentId, note.studentName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [notes]);

  const handleDeleteNote = async () => {
    if (!deleteNote) return;
    try {
      await deleteMutation.mutateAsync(deleteNote.id);
      toast.success('Notiz geloescht');
      setDeleteNote(null);
    } catch {
      toast.error('Notiz konnte nicht geloescht werden.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div />
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Notiz hinzufuegen
          </Button>
        )}
      </div>

      {/* Add form (inline at top) */}
      {showAddForm && (
        <StudentNoteForm
          entryId={entryId}
          schoolId={schoolId}
          students={studentList}
          onSave={() => setShowAddForm(false)}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Empty state */}
      {(!notes || notes.length === 0) && !showAddForm && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <MessageSquareText className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Keine Notizen vorhanden</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Fuegen Sie Notizen zu einzelnen Schuelern hinzu.
          </p>
        </div>
      )}

      {/* Grouped notes */}
      {grouped.map((group) => (
        <div key={group.studentId} className="space-y-2">
          {/* Student section header */}
          <h4 className="text-sm font-semibold text-foreground">{group.studentName}</h4>

          {group.notes.map((note) => {
            const isOwn = user?.id === note.authorId;
            const isEditing = editingNote?.id === note.id;

            if (isEditing) {
              return (
                <StudentNoteForm
                  key={note.id}
                  entryId={entryId}
                  schoolId={schoolId}
                  students={studentList}
                  existingNote={note}
                  onSave={() => setEditingNote(null)}
                  onCancel={() => setEditingNote(null)}
                />
              );
            }

            return (
              <NoteCard
                key={note.id}
                note={note}
                isOwn={isOwn}
                onEdit={() => setEditingNote(note)}
                onDelete={() => setDeleteNote(note)}
              />
            );
          })}
        </div>
      ))}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteNote} onOpenChange={(open) => { if (!open) setDeleteNote(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Notiz loeschen</DialogTitle>
            <DialogDescription>
              Moechten Sie diese Notiz loeschen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNote(null)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteNote}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Loeschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Note Card Sub-component ---

function NoteCard({
  note,
  isOwn,
  onEdit,
  onDelete,
}: {
  note: StudentNoteDto;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border bg-card px-4 py-3 shadow-sm">
      {/* Header: author, timestamp, private badge, actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{note.authorName}</span>
          <span className="text-muted-foreground">{formatTimestamp(note.createdAt)}</span>
          {note.isPrivate && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Lock className="h-3 w-3" />
              Privat
            </Badge>
          )}
        </div>

        {/* Actions dropdown (own notes only) */}
        {isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Aktionen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Loeschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content with 2-line preview, expandable */}
      <div className="mt-2 text-sm">
        <p
          className={expanded ? '' : 'line-clamp-2'}
          onClick={() => setExpanded(!expanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
          aria-expanded={expanded}
          aria-label={expanded ? 'Notiz einklappen' : 'Notiz aufklappen'}
        >
          {note.content}
        </p>
        {note.content.length > 120 && (
          <button
            type="button"
            className="mt-1 text-xs text-primary hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          </button>
        )}
      </div>
    </div>
  );
}
