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
  yearName: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ActivateSchoolYearDialog({
  open,
  yearName,
  isSubmitting,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schuljahr aktivieren</DialogTitle>
          <DialogDescription>
            &quot;{yearName}&quot; wird zum aktiven Schuljahr. Bestehende Stundenplaene und
            Klassenbuch-Eintraege bleiben unveraendert.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting} autoFocus>
            Abbrechen
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Wird aktiviert...' : 'Aktivieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
