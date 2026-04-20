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

export function DeleteSchoolYearDialog({
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
          <DialogTitle>Schuljahr loeschen?</DialogTitle>
          <DialogDescription>
            &quot;{yearName}&quot; wird dauerhaft geloescht. Diese Aktion kann nicht rueckgaengig
            gemacht werden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting} autoFocus>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            Loeschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
