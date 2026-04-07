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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/stores/school-context-store';
import { apiFetch } from '@/lib/api';
import type { ExcuseReason } from '@schoolflow/shared';

/**
 * Per UI-SPEC COMM-05, D-13, D-14, D-15: Quick-action button for parent absence reporting.
 * Visible only to 'eltern' role. Opens Dialog with inline form that POSTs directly
 * to /api/v1/schools/:schoolId/absence-report (Phase 7 backend endpoint).
 * On submit: creates AbsenceExcuse + automated system message to Klassenvorstand.
 */

interface AbsenceQuickActionProps {
  schoolId: string;
}

const REASON_OPTIONS: Array<{ value: ExcuseReason; label: string }> = [
  { value: 'KRANK', label: 'Krank' },
  { value: 'ARZTTERMIN', label: 'Arzttermin' },
  { value: 'FAMILIAER', label: 'Familiaer' },
  { value: 'SONSTIG', label: 'Sonstig' },
];

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function AbsenceQuickAction({ schoolId }: AbsenceQuickActionProps) {
  const { user } = useAuth();
  const children = useSchoolContext((s) => s.children);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const today = formatDateForInput(new Date());
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedReason, setSelectedReason] = useState<ExcuseReason | ''>('');
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Only visible to eltern role
  const isParent = user?.roles?.includes('eltern') ?? false;
  if (!isParent) return null;

  const validateDates = (from: string, to: string): boolean => {
    if (to < from) {
      setDateError('Das Enddatum muss nach dem Startdatum liegen.');
      return false;
    }

    // Check start date not more than 30 days in the past
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateObj = new Date(from);
    if (startDateObj < thirtyDaysAgo) {
      setDateError('Das Startdatum darf nicht mehr als 30 Tage in der Vergangenheit liegen.');
      return false;
    }

    setDateError(null);
    return true;
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    validateDates(value, endDate);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    validateDates(startDate, value);
  };

  const resetForm = () => {
    setSelectedStudentId(children.length === 1 ? children[0].studentId : '');
    setStartDate(formatDateForInput(new Date()));
    setEndDate(formatDateForInput(new Date()));
    setSelectedReason('');
    setNoteText('');
    setDateError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const studentId = selectedStudentId || (children.length === 1 ? children[0].studentId : '');
    if (!studentId || !selectedReason) return;
    if (!validateDates(startDate, endDate)) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/absence-report`, {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          dateFrom: startDate,
          dateTo: endDate,
          reason: selectedReason,
          note: noteText || undefined,
        }),
      });
      if (!res.ok) throw new Error('Abwesenheit konnte nicht gemeldet werden.');

      toast.success('Abwesenheit gemeldet und Klassenvorstand benachrichtigt');
      resetForm();
      setDialogOpen(false);
    } catch {
      toast.error('Abwesenheit konnte nicht gemeldet werden. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-select single child
  const effectiveStudentId = selectedStudentId || (children.length === 1 ? children[0].studentId : '');
  const isFormValid = effectiveStudentId && selectedReason && startDate && endDate && !dateError;

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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Child selector */}
            <div className="space-y-1.5">
              <Label htmlFor="absence-child">Kind</Label>
              {children.length === 1 ? (
                <p className="text-sm text-foreground py-2">{children[0].studentName}</p>
              ) : (
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger id="absence-child">
                    <SelectValue placeholder="Kind auswaehlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.studentId} value={child.studentId}>
                        {child.studentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date range: Von / Bis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="absence-start">Von</Label>
                <input
                  id="absence-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="flex h-11 min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-required="true"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="absence-end">Bis</Label>
                <input
                  id="absence-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="flex h-11 min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-required="true"
                />
              </div>
            </div>

            {/* Date validation error */}
            {dateError && (
              <p className="text-sm text-destructive" role="alert">
                {dateError}
              </p>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="absence-reason">Grund</Label>
              <Select value={selectedReason} onValueChange={(v) => setSelectedReason(v as ExcuseReason)}>
                <SelectTrigger id="absence-reason">
                  <SelectValue placeholder="Grund auswaehlen" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="absence-note">Anmerkung (optional)</Label>
              <Textarea
                id="absence-note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                maxLength={2000}
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {isSubmitting ? 'Wird gemeldet...' : 'Abwesenheit melden'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
