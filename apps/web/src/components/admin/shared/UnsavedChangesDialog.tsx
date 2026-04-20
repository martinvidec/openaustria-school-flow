import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  isSaving?: boolean;
  onDiscard: () => void;
  onCancel: () => void;
  onSaveAndContinue: () => void;
}

export function UnsavedChangesDialog({
  open,
  isSaving,
  onDiscard,
  onCancel,
  onSaveAndContinue,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden />
            <div>
              <DialogTitle>Aenderungen verwerfen?</DialogTitle>
              <DialogDescription>
                Sie haben ungespeicherte Aenderungen in diesem Tab. Wenn Sie jetzt wechseln, gehen
                diese verloren.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={onDiscard} disabled={isSaving}>
            Verwerfen
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={isSaving} autoFocus>
            Abbrechen
          </Button>
          <Button onClick={onSaveAndContinue} disabled={isSaving}>
            {isSaving ? 'Wird gespeichert...' : 'Speichern & Weiter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
