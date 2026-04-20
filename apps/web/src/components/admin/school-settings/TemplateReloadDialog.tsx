import { AlertTriangle } from 'lucide-react';
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
  schoolType: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TemplateReloadDialog({ open, schoolType, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
            <div>
              <DialogTitle>Zeitraster aus Vorlage neu laden?</DialogTitle>
              <DialogDescription>
                Die aktuell eingetragenen Perioden werden ersetzt durch die Vorlage &quot;
                {schoolType}-Standard&quot;. Nicht gespeicherte Aenderungen gehen verloren.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={onCancel} autoFocus>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Ueberschreiben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
