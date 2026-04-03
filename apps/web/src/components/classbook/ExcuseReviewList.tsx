import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExcuseCard } from './ExcuseCard';
import { useExcuses, useReviewExcuse } from '@/hooks/useExcuses';

interface ExcuseReviewListProps {
  schoolId: string;
}

export function ExcuseReviewList({ schoolId }: ExcuseReviewListProps) {
  const { data: excuses = [], isLoading, isError } = useExcuses(schoolId, 'PENDING');
  const reviewExcuse = useReviewExcuse(schoolId);

  // Dialog state
  const [reviewDialog, setReviewDialog] = useState<{
    excuseId: string;
    type: 'ACCEPTED' | 'REJECTED';
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const handleAcceptClick = (excuseId: string) => {
    setReviewDialog({ excuseId, type: 'ACCEPTED' });
    setReviewNote('');
  };

  const handleRejectClick = (excuseId: string) => {
    setReviewDialog({ excuseId, type: 'REJECTED' });
    setReviewNote('');
  };

  const handleConfirmReview = async () => {
    if (!reviewDialog) return;

    // Reject requires a note
    if (reviewDialog.type === 'REJECTED' && !reviewNote.trim()) return;

    try {
      await reviewExcuse.mutateAsync({
        excuseId: reviewDialog.excuseId,
        status: reviewDialog.type,
        reviewNote: reviewNote.trim() || undefined,
      });

      if (reviewDialog.type === 'ACCEPTED') {
        toast.success('Entschuldigung akzeptiert');
      } else {
        toast.success('Entschuldigung abgelehnt');
      }

      setReviewDialog(null);
      setReviewNote('');
    } catch {
      toast.error('Aktion konnte nicht ausgefuehrt werden. Bitte versuchen Sie es erneut.');
    }
  };

  const handleCloseDialog = () => {
    setReviewDialog(null);
    setReviewNote('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-sm text-muted-foreground">
              Entschuldigungen werden geladen...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-destructive text-center">
            Entschuldigungen konnten nicht geladen werden. Bitte versuchen Sie es spaeter erneut.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (excuses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine ausstehenden Entschuldigungen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Alle Entschuldigungen wurden bearbeitet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {excuses.map((excuse) => (
          <ExcuseCard
            key={excuse.id}
            excuse={excuse}
            showActions
            onAccept={handleAcceptClick}
            onReject={handleRejectClick}
          />
        ))}
      </div>

      {/* Review note dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.type === 'ACCEPTED'
                ? 'Entschuldigung akzeptieren'
                : 'Entschuldigung ablehnen'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog?.type === 'ACCEPTED'
                ? 'Sie koennen eine optionale Anmerkung hinzufuegen.'
                : 'Bitte geben Sie eine Begruendung fuer die Ablehnung an.'}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder={
              reviewDialog?.type === 'ACCEPTED'
                ? 'Optionale Anmerkung'
                : 'Begruendung der Ablehnung'
            }
            rows={3}
            aria-required={reviewDialog?.type === 'REJECTED' ? 'true' : 'false'}
          />

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirmReview}
              disabled={
                reviewExcuse.isPending ||
                (reviewDialog?.type === 'REJECTED' && !reviewNote.trim())
              }
              variant={reviewDialog?.type === 'REJECTED' ? 'destructive' : 'default'}
            >
              {reviewExcuse.isPending
                ? 'Wird verarbeitet...'
                : reviewDialog?.type === 'ACCEPTED'
                  ? 'Akzeptieren'
                  : 'Ablehnen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
