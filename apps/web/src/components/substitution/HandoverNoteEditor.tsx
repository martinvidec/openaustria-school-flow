import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadField } from '@/components/classbook/FileUploadField';
import {
  useCreateOrUpdateHandoverNote,
  useUploadHandoverAttachment,
} from '@/hooks/useHandoverNote';
import type { HandoverNoteDto } from '@schoolflow/shared';

interface HandoverNoteEditorProps {
  substitutionId: string;
  existingNote: HandoverNoteDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * SUBST-04 (D-15, D-16, D-20) — Dialog for the absent teacher to author or
 * edit a handover note for one Substitution.
 *
 * Reuses the Phase 5 FileUploadField component verbatim for attachment
 * uploads (PDF/JPG/PNG, max 5 MB, magic-byte validation on the server).
 *
 * German copy is taken verbatim from 06-UI-SPEC.md Copywriting Contract.
 * Dialog title "Uebergabenotiz verfassen", save CTA "Uebergabenotiz
 * speichern", content placeholder "Was der Vertretungslehrer wissen muss..."
 */
export function HandoverNoteEditor({
  substitutionId,
  existingNote,
  open,
  onOpenChange,
}: HandoverNoteEditorProps) {
  const [content, setContent] = useState(existingNote?.content ?? '');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const createOrUpdate = useCreateOrUpdateHandoverNote();
  const uploadAttachment = useUploadHandoverAttachment();

  // Reset local state when the dialog opens/closes or the existing note changes
  useEffect(() => {
    if (open) {
      setContent(existingNote?.content ?? '');
      setPendingFile(null);
    }
  }, [open, existingNote]);

  const handleSave = async () => {
    try {
      const note = await createOrUpdate.mutateAsync({
        substitutionId,
        content,
      });
      if (pendingFile) {
        await uploadAttachment.mutateAsync({
          noteId: note.id,
          substitutionId,
          file: pendingFile,
        });
      }
      toast.success('Uebergabenotiz gespeichert');
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Uebergabenotiz konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
      );
    }
  };

  const isPending = createOrUpdate.isPending || uploadAttachment.isPending;
  const canSave = content.trim().length > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Uebergabenotiz verfassen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handover-content">Notiz</Label>
            <Textarea
              id="handover-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Was der Vertretungslehrer wissen muss..."
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Anhaenge (optional)</Label>
            <p className="text-xs text-muted-foreground">
              PDF, JPG oder PNG (max. 5 MB pro Datei)
            </p>
            <FileUploadField
              onFileSelect={setPendingFile}
              accept="application/pdf,image/jpeg,image/png"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            Uebergabenotiz speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
