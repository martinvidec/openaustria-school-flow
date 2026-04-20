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
  impactedRunsCount: number;
  isSaving?: boolean;
  onCancel: () => void;
  onSaveOnly: () => void;
  onSaveAndRerun: () => void;
}

export function DestructiveEditDialog({
  open,
  impactedRunsCount,
  isSaving,
  onCancel,
  onSaveOnly,
  onSaveAndRerun,
}: Props) {
  const plural =
    impactedRunsCount === 1 ? 'bestehender Stundenplan verwendet' : 'bestehende Stundenplaene verwenden';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
            <div>
              <DialogTitle>Zeitraster-Aenderung betrifft aktive Stundenplaene</DialogTitle>
              <DialogDescription>
                {impactedRunsCount} {plural} dieses Zeitraster.{' '}
                <span className="text-muted-foreground">
                  Aenderungen koennen Kollisionen verursachen. Waehlen Sie, wie Sie fortfahren
                  moechten.
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={onCancel} autoFocus disabled={isSaving}>
            Abbrechen
          </Button>
          <Button variant="secondary" onClick={onSaveOnly} disabled={isSaving}>
            Nur speichern
          </Button>
          <Button onClick={onSaveAndRerun} disabled={isSaving}>
            Speichern + Solver neu starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
