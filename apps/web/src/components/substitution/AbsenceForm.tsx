import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { AbsenceReason } from '@schoolflow/shared';
import type {
  CreateTeacherAbsencePayload,
  CreateTeacherAbsenceResponse,
} from '@/hooks/useAbsences';

/**
 * Minimal teacher shape required by the absence form. The admin /teachers
 * endpoint returns rows with a joined person object — the parent route
 * normalises that down to this shape before passing to the form.
 */
export interface AbsenceFormTeacher {
  id: string;
  firstName: string;
  lastName: string;
}

interface AbsenceFormProps {
  teachers: AbsenceFormTeacher[];
  onSubmit: (
    payload: CreateTeacherAbsencePayload,
  ) => Promise<CreateTeacherAbsenceResponse>;
  onCancel?: () => void;
}

/**
 * Copy mapping preserved verbatim from 06-UI-SPEC.md Copywriting Contract.
 * Enum values map to backend Prisma enum AbsenceReason.
 */
const REASON_OPTIONS: Array<{ value: AbsenceReason; label: string }> = [
  { value: 'KRANK', label: 'Krank' },
  { value: 'FORTBILDUNG', label: 'Fortbildung' },
  { value: 'DIENSTREISE', label: 'Dienstreise' },
  { value: 'SCHULVERANSTALTUNG', label: 'Schulveranstaltung' },
  { value: 'ARZTTERMIN', label: 'Arzttermin' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
];

const INPUT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function AbsenceForm({
  teachers,
  onSubmit,
  onCancel,
}: AbsenceFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [teacherId, setTeacherId] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [reason, setReason] = useState<AbsenceReason>('KRANK');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);

  function validate(): boolean {
    setDateError(null);
    setPeriodError(null);
    if (!teacherId) {
      toast.error('Bitte waehlen Sie eine Lehrkraft aus.');
      return false;
    }
    if (new Date(dateTo) < new Date(dateFrom)) {
      setDateError('Das Enddatum muss nach dem Startdatum liegen.');
      return false;
    }
    if (periodFrom && periodTo) {
      const pf = parseInt(periodFrom, 10);
      const pt = parseInt(periodTo, 10);
      if (Number.isNaN(pf) || Number.isNaN(pt) || pt < pf) {
        setPeriodError(
          'Die End-Stunde muss nach der Anfangs-Stunde liegen.',
        );
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: CreateTeacherAbsencePayload = {
        teacherId,
        dateFrom,
        dateTo,
        periodFrom: periodFrom ? parseInt(periodFrom, 10) : undefined,
        periodTo: periodTo ? parseInt(periodTo, 10) : undefined,
        reason,
        note: note.trim() ? note.trim() : undefined,
      };
      const result = await onSubmit(payload);
      if (result.affectedLessonCount === 0) {
        toast.warning(
          'Keine Unterrichtsstunden im angegebenen Zeitraum gefunden.',
        );
      } else {
        toast.success(
          `Abwesenheit erfasst. ${result.affectedLessonCount} Stunden betroffen.`,
        );
      }
      // Reset form on success
      setTeacherId('');
      setPeriodFrom('');
      setPeriodTo('');
      setNote('');
      setReason('KRANK');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Abwesenheit konnte nicht erfasst werden. Bitte versuchen Sie es spaeter erneut.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Teacher select */}
        <div className="space-y-2">
          <label htmlFor="absence-teacher" className="text-sm font-semibold">
            Lehrer/in
          </label>
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger id="absence-teacher" className="w-full">
              <SelectValue placeholder="Lehrkraft auswaehlen" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.lastName}, {t.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="absence-date-from" className="text-sm font-semibold">
              Von
            </label>
            <input
              id="absence-date-from"
              type="date"
              required
              className={INPUT_CLASS}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="absence-date-to" className="text-sm font-semibold">
              Bis
            </label>
            <input
              id="absence-date-to"
              type="date"
              required
              className={INPUT_CLASS}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
        {dateError && (
          <p className="text-destructive text-sm" role="alert">
            {dateError}
          </p>
        )}

        {/* Period range (optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="absence-period-from"
              className="text-sm font-semibold"
            >
              Von Stunde (optional)
            </label>
            <input
              id="absence-period-from"
              type="number"
              min={1}
              max={12}
              className={INPUT_CLASS}
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              placeholder="1"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="absence-period-to"
              className="text-sm font-semibold"
            >
              Bis Stunde (optional)
            </label>
            <input
              id="absence-period-to"
              type="number"
              min={1}
              max={12}
              className={INPUT_CLASS}
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              placeholder="12"
              disabled={submitting}
            />
          </div>
        </div>
        {periodError && (
          <p className="text-destructive text-sm" role="alert">
            {periodError}
          </p>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <label htmlFor="absence-reason" className="text-sm font-semibold">
            Grund
          </label>
          <Select
            value={reason}
            onValueChange={(v) => setReason(v as AbsenceReason)}
          >
            <SelectTrigger id="absence-reason" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASON_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Note (optional) */}
        <div className="space-y-2">
          <label htmlFor="absence-note" className="text-sm font-semibold">
            Anmerkung (optional)
          </label>
          <Textarea
            id="absence-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Zusaetzliche Informationen (optional)"
            disabled={submitting}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Abbrechen
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Wird gespeichert...' : 'Abwesenheit erfassen'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
