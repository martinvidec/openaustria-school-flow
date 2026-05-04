import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRequestExport } from '@/hooks/useDsgvoExportJob';

/**
 * Phase 15-08 Task 3: Single-step trigger dialog for Art. 15 / 20 data
 * exports (DSGVO-ADM-05).
 *
 * Reachable from the ConsentsTab toolbar `Datenexport anstoßen` primary
 * button. Admin pastes the Person UUID and the schoolId is taken from the
 * surrounding tab context (passed in via props).
 *
 * After submit the dialog closes immediately and the admin watches BullMQ
 * progress in the JobsTab via the per-id polling hook (Task 2). Pivoting
 * the dialog into a status-tracking pane is intentionally OUT-OF-SCOPE for
 * v1 — JobsTab already shows the live status. A full Person-picker with
 * autocomplete is also DEFERRED (documented in 15-08 SUMMARY).
 */

interface Props {
  open: boolean;
  schoolId: string;
  /** Optional pre-filled Person UUID — explicit click required, no auto-fill from row context. */
  personId?: string;
  onClose: () => void;
}

export function RequestExportDialog({
  open,
  schoolId,
  personId,
  onClose,
}: Props) {
  const [pid, setPid] = useState(personId ?? '');
  const [error, setError] = useState<string | null>(null);
  const requestExport = useRequestExport();

  useEffect(() => {
    if (open) {
      setPid(personId ?? '');
      setError(null);
    }
  }, [open, personId]);

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!pid.trim()) {
      setError('Pflichtfeld.');
      return;
    }
    requestExport.mutate(
      { personId: pid.trim(), schoolId },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !requestExport.isPending && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Datenexport anstoßen</DialogTitle>
          <DialogDescription>
            Art. 15 DSGVO — der Job läuft im Hintergrund. Status siehst du im
            Tab „Jobs“.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-1">
            <Label
              htmlFor="export-person-id"
              className="text-muted-foreground"
            >
              Person-ID
            </Label>
            <Input
              id="export-person-id"
              value={pid}
              onChange={(e) => {
                setPid(e.target.value);
                setError(null);
              }}
              placeholder="UUID der Person"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={requestExport.isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={requestExport.isPending}>
              Datenexport anstoßen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
