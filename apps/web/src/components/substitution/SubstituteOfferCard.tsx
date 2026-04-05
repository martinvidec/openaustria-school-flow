import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { useRespondToOffer } from '@/hooks/useOfferedSubstitutions';
import { useHandoverNote } from '@/hooks/useHandoverNote';
import { HandoverNoteView } from './HandoverNoteView';
import type { SubstitutionDto, AbsenceReason } from '@schoolflow/shared';

interface SubstituteOfferCardProps {
  schoolId: string;
  substitution: SubstitutionDto;
}

const REASON_LABELS: Record<AbsenceReason, string> = {
  KRANK: 'Krank',
  FORTBILDUNG: 'Fortbildung',
  DIENSTREISE: 'Dienstreise',
  SCHULVERANSTALTUNG: 'Schulveranstaltung',
  ARZTTERMIN: 'Arzttermin',
  SONSTIGES: 'Sonstiges',
};

/**
 * SUBST-03 (D-22) — Single offer card rendered on /teacher/substitutions.
 *
 * Shows the substitute teacher everything they need to make the decision:
 *  - Date (weekday + day, month, year in de-AT format)
 *  - Period + subject + class
 *  - Original teacher (the one they would be replacing)
 *  - Absence reason (optional, via REASON_LABELS)
 *  - Inline HandoverNoteView with any existing note from the absent teacher
 *  - Two CTAs: "Akzeptieren" (primary) and "Ablehnen" (destructive)
 *
 * Both CTAs open a confirmation dialog with verbatim German copy from
 * 06-UI-SPEC.md. Decline dialog has an optional reason textarea.
 *
 * 44px minimum touch target on both buttons per BOOK-07 / UI-SPEC D-22.
 */
export function SubstituteOfferCard({
  schoolId,
  substitution: sub,
}: SubstituteOfferCardProps) {
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const respond = useRespondToOffer();
  const { data: note = null } = useHandoverNote(sub.id);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('de-AT', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const dateLabel = formatDate(sub.date);
  const subjectLabel = sub.subjectName ?? sub.subjectAbbreviation;

  const handleAccept = async () => {
    try {
      await respond.mutateAsync({
        schoolId,
        substitutionId: sub.id,
        accept: true,
      });
      toast.success('Vertretung angenommen');
      setAcceptOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Antwort konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
      );
    }
  };

  const handleDecline = async () => {
    try {
      await respond.mutateAsync({
        schoolId,
        substitutionId: sub.id,
        accept: false,
        declineReason: declineReason.trim() || undefined,
      });
      toast.success('Vertretung abgelehnt');
      setDeclineOpen(false);
      setDeclineReason('');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Antwort konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
      );
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold">{dateLabel}</h3>
          <p className="text-sm text-muted-foreground">
            {sub.periodNumber}. Stunde &middot; {subjectLabel} &middot;{' '}
            {sub.className}
          </p>
          <p className="text-sm mt-1">
            Vertretung fuer: <strong>{sub.originalTeacherName}</strong>
          </p>
        </div>
        <Badge variant="outline">Angeboten</Badge>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Uebergabenotiz</h4>
        <HandoverNoteView note={note} emptyContext="substitute" />
      </div>

      <div className="flex gap-3 flex-wrap sm:flex-nowrap">
        <Button
          type="button"
          className="flex-1 min-h-[44px]"
          onClick={() => setAcceptOpen(true)}
        >
          Akzeptieren
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="flex-1 min-h-[44px]"
          onClick={() => setDeclineOpen(true)}
        >
          Ablehnen
        </Button>
      </div>

      {/* Accept confirmation dialog */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vertretung annehmen</DialogTitle>
            <DialogDescription>
              Moechten Sie die Vertretung fuer {subjectLabel} / {sub.className}{' '}
              am {dateLabel} annehmen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAcceptOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleAccept}
              disabled={respond.isPending}
            >
              Annehmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline confirmation dialog (optional reason) */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vertretung ablehnen</DialogTitle>
            <DialogDescription>
              Bitte geben Sie optional einen Grund fuer die Ablehnung an.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Begruendung (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeclineOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDecline}
              disabled={respond.isPending}
            >
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Absence reason helper text (not in dialog — shown in card if present) */}
      {sub.type && (
        <p className="sr-only">
          Reason reference: {REASON_LABELS[sub.type as unknown as AbsenceReason] ?? ''}
        </p>
      )}
    </Card>
  );
}
