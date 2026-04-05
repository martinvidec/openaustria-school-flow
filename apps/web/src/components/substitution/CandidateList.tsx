import { useState } from 'react';
import { useRankedCandidates } from '@/hooks/useRankedCandidates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScoreBreakdownRow } from './ScoreBreakdownRow';
import type { RankedCandidateDto } from '@schoolflow/shared';
import { cn } from '@/lib/utils';

interface CandidateListProps {
  schoolId: string | undefined;
  substitutionId: string;
  onOffer: (candidateTeacherId: string) => Promise<void>;
}

/**
 * Ranked candidate list for a single open Substitution row.
 * (SUBST-02, D-05, D-06, D-08)
 *
 * Top candidate is highlighted via a 1px accent left border + tinted
 * background. Clicking "Anbieten" opens a confirmation dialog with the
 * exact German copy from 06-UI-SPEC.md Copywriting Contract.
 *
 * Error states:
 *   - loading    → "Kandidaten werden geladen..."
 *   - fetch error → actionable German message
 *   - empty      → "Keine verfuegbaren Kandidaten fuer diese Stunde."
 */
export function CandidateList({
  schoolId,
  substitutionId,
  onOffer,
}: CandidateListProps) {
  const {
    data: candidates,
    isLoading,
    isError,
    refetch,
  } = useRankedCandidates(schoolId, substitutionId);
  const [selected, setSelected] = useState<RankedCandidateDto | null>(null);
  const [offering, setOffering] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 text-muted-foreground text-sm">
        Kandidaten werden geladen...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="p-4">
        <p className="text-destructive text-sm mb-2">
          Kandidatenliste konnte nicht geladen werden.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Erneut laden
        </Button>
      </div>
    );
  }
  if (!candidates || candidates.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-sm">
        Keine verfuegbaren Kandidaten fuer diese Stunde.
      </div>
    );
  }

  async function handleConfirmOffer() {
    if (!selected) return;
    setOffering(true);
    try {
      await onOffer(selected.teacherId);
      setSelected(null);
    } finally {
      setOffering(false);
    }
  }

  return (
    <div className="border border-border rounded-md">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h4 className="font-semibold text-sm">Kandidaten</h4>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          Aktualisieren
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {candidates.map((c, idx) => (
          <li
            key={c.teacherId}
            className={cn(
              'flex items-center justify-between gap-3 p-3',
              idx === 0 && 'border-l-4 border-l-primary bg-primary/5',
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {idx + 1}. {c.teacherName}
                </span>
                <span className="text-sm font-semibold">
                  {Math.round(c.score * 100)}%
                </span>
                {idx === 0 && (
                  <Badge variant="default" className="text-xs">
                    Empfohlen
                  </Badge>
                )}
                {c.isKlassenvorstand && (
                  <Badge variant="outline" className="text-xs">
                    KV
                  </Badge>
                )}
              </div>
              <ScoreBreakdownRow breakdown={c.breakdown} />
            </div>
            <Button size="sm" onClick={() => setSelected(c)}>
              Anbieten
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vertretung anbieten</DialogTitle>
            <DialogDescription>
              Moechten Sie die Vertretung an {selected?.teacherName} anbieten?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={offering}
            >
              Abbrechen
            </Button>
            <Button onClick={handleConfirmOffer} disabled={offering}>
              {offering ? 'Wird angeboten...' : 'Anbieten'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
