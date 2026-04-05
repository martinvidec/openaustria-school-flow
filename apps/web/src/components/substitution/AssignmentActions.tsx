import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AssignmentActionsProps {
  onToggleCandidates: () => void;
  onSetEntfall: () => Promise<void>;
  onSetStillarbeit: (supervisorTeacherId?: string) => Promise<void>;
  isCandidatesOpen: boolean;
}

/**
 * Three-button action group on an unassigned Substitution row
 * (SUBST-02, D-04).
 *
 * - "Vertretung anbieten" toggles the inline CandidateList expansion.
 * - "Entfall" + "Stillarbeit" open confirmation dialogs with exact German
 *   copy from the 06-UI-SPEC.md Copywriting Contract.
 *
 * Supervisor selection on Stillarbeit is intentionally left as optional
 * per D-04 ("any available teacher supervises"). A supervisor picker is a
 * future enhancement — v1 submits with supervisor=undefined, so the
 * backend falls back to the original teacher for the CBE FK.
 */
export function AssignmentActions({
  onToggleCandidates,
  onSetEntfall,
  onSetStillarbeit,
  isCandidatesOpen,
}: AssignmentActionsProps) {
  const [entfallOpen, setEntfallOpen] = useState(false);
  const [stillarbeitOpen, setStillarbeitOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleEntfall() {
    setBusy(true);
    try {
      await onSetEntfall();
      setEntfallOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleStillarbeit() {
    setBusy(true);
    try {
      await onSetStillarbeit(undefined);
      setStillarbeitOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="default"
          size="sm"
          onClick={onToggleCandidates}
        >
          {isCandidatesOpen ? 'Kandidaten ausblenden' : 'Vertretung anbieten'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEntfallOpen(true)}
        >
          Entfall
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStillarbeitOpen(true)}
        >
          Stillarbeit
        </Button>
      </div>

      {/* Entfall confirmation dialog */}
      <Dialog open={entfallOpen} onOpenChange={(o) => !o && setEntfallOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Als Entfall markieren</DialogTitle>
            <DialogDescription>
              {`Die Stunde wird abgesagt. Es wird kein Klassenbuch-Eintrag erstellt. Fortfahren?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEntfallOpen(false)}
              disabled={busy}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleEntfall}
              disabled={busy}
            >
              {busy ? 'Wird verarbeitet...' : 'Als Entfall markieren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stillarbeit confirmation dialog */}
      <Dialog
        open={stillarbeitOpen}
        onOpenChange={(o) => !o && setStillarbeitOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stillarbeit einrichten</DialogTitle>
            <DialogDescription>
              Die Klasse arbeitet selbststaendig. Optional: aufsichtfuehrende
              Lehrkraft auswaehlen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStillarbeitOpen(false)}
              disabled={busy}
            >
              Abbrechen
            </Button>
            <Button onClick={handleStillarbeit} disabled={busy}>
              {busy ? 'Wird verarbeitet...' : 'Stillarbeit einrichten'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
