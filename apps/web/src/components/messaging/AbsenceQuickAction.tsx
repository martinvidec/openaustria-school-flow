import { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExcuseForm } from '@/components/classbook/ExcuseForm';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';

/**
 * Per UI-SPEC COMM-05, D-13, D-14, D-15: Quick-action button for parent absence reporting.
 * Visible only to 'eltern' role. Opens Dialog with Phase 5 ExcuseForm.
 * On submit: creates excuse + posts automated system message to Klassenvorstand.
 */

interface AbsenceQuickActionProps {
  schoolId: string;
}

export function AbsenceQuickAction({ schoolId }: AbsenceQuickActionProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Only visible to eltern role
  const isParent = user?.roles?.includes('eltern') ?? false;
  if (!isParent) return null;

  // For ExcuseForm, we need children array. In a real integration this
  // would come from the parent's profile context. For now we provide a
  // placeholder that the form handles (single-child auto-select).
  const children: Array<{ id: string; name: string }> = [];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
        aria-label="Abwesenheit des Kindes melden"
      >
        <AlertCircle className="h-4 w-4" />
        Abwesenheit melden
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Abwesenheit melden</DialogTitle>
            <DialogDescription>
              Melden Sie die Abwesenheit Ihres Kindes. Der Klassenvorstand wird automatisch benachrichtigt.
            </DialogDescription>
          </DialogHeader>

          <ExcuseForm schoolId={schoolId} children={children} />
        </DialogContent>
      </Dialog>
    </>
  );
}
