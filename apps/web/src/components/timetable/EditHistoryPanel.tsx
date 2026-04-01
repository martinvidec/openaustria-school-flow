import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEditHistory, useRevertEdit } from '@/hooks/useTimetableEdit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditHistoryPanelProps {
  schoolId: string;
  runId: string;
}

/** Map edit action types to German labels */
const ACTION_LABELS: Record<string, string> = {
  move: 'Verschoben',
  swap: 'Getauscht',
  cancel: 'Storniert',
  revert: 'Rueckgaengig',
};

/** Map edit action types to badge variants */
const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  move: 'default',
  swap: 'secondary',
  cancel: 'destructive',
  revert: 'outline',
};

/**
 * Side panel / full-page component showing edit history for the active timetable run.
 * Each edit record shows timestamp, action badge, description, and revert button.
 *
 * Revert shows a confirmation dialog per UI-SPEC destructive copy:
 * "Moechten Sie den Stundenplan auf den Stand von {timestamp} zuruecksetzen?
 *  Alle spaeter vorgenommenen Aenderungen gehen verloren."
 *
 * Empty state: "Keine Aenderungen" / "Es wurden noch keine manuellen
 * Aenderungen am Stundenplan vorgenommen."
 */
export function EditHistoryPanel({ schoolId, runId }: EditHistoryPanelProps) {
  const { data: history = [], isLoading } = useEditHistory(schoolId, runId);
  const revertMutation = useRevertEdit(schoolId, runId);
  const [revertTarget, setRevertTarget] = useState<{
    id: string;
    timestamp: string;
  } | null>(null);

  const handleRevert = () => {
    if (!revertTarget) return;
    revertMutation.mutate(revertTarget.id, {
      onSuccess: () => setRevertTarget(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        <span className="ml-2 text-sm text-muted-foreground">
          Verlauf wird geladen...
        </span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-8 text-center">
        <h3 className="text-base font-semibold">Keine Aenderungen</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Es wurden noch keine manuellen Aenderungen am Stundenplan vorgenommen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((record) => {
        const timestamp = format(new Date(record.createdAt), 'dd.MM.yyyy HH:mm', {
          locale: de,
        });
        const actionLabel = ACTION_LABELS[record.editAction] ?? record.editAction;
        const variant = ACTION_VARIANTS[record.editAction] ?? 'default';

        // Build description from previous/new state
        const prevDay = (record.previousState.dayOfWeek as string) ?? '';
        const prevPeriod = (record.previousState.periodNumber as number) ?? 0;
        const newDay = (record.newState.dayOfWeek as string) ?? '';
        const newPeriod = (record.newState.periodNumber as number) ?? 0;

        const description =
          record.editAction === 'move'
            ? `${prevDay} ${prevPeriod}. Std. -> ${newDay} ${newPeriod}. Std.`
            : actionLabel;

        return (
          <div
            key={record.id}
            className="flex items-center gap-3 rounded-md border p-3"
          >
            {/* Timestamp */}
            <span className="shrink-0 text-xs text-muted-foreground w-28">
              {timestamp}
            </span>

            {/* Action badge */}
            <Badge variant={variant} className="shrink-0">
              {actionLabel}
            </Badge>

            {/* Description */}
            <span className="flex-1 text-sm truncate">{description}</span>

            {/* Editor name */}
            {record.editedByName && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {record.editedByName}
              </span>
            )}

            {/* Revert button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevertTarget({ id: record.id, timestamp })}
              disabled={revertMutation.isPending}
            >
              Rueckgaengig
            </Button>
          </div>
        );
      })}

      {/* Revert confirmation dialog */}
      <Dialog
        open={!!revertTarget}
        onOpenChange={(open) => !open && setRevertTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aenderung rueckgaengig machen</DialogTitle>
            <DialogDescription>
              Moechten Sie den Stundenplan auf den Stand von{' '}
              {revertTarget?.timestamp} zuruecksetzen? Alle spaeter
              vorgenommenen Aenderungen gehen verloren.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevertTarget(null)}
              disabled={revertMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevert}
              disabled={revertMutation.isPending}
            >
              {revertMutation.isPending
                ? 'Wird zurueckgesetzt...'
                : 'Zuruecksetzen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
