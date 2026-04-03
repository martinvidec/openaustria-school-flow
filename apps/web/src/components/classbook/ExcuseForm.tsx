import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUploadField } from './FileUploadField';
import { useCreateExcuse } from '@/hooks/useExcuses';
import { apiFetch } from '@/lib/api';
import type { ExcuseReason } from '@schoolflow/shared';

interface ExcuseFormProps {
  schoolId: string;
  children: Array<{ id: string; name: string }>;
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

export function ExcuseForm({ schoolId, children }: ExcuseFormProps) {
  const today = formatDateForInput(new Date());

  const [studentId, setStudentId] = useState<string>(
    children.length === 1 ? children[0].id : '',
  );
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState<ExcuseReason | ''>('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const createExcuse = useCreateExcuse(schoolId);

  const validateDates = useCallback(
    (from: string, to: string): boolean => {
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
    },
    [],
  );

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    validateDates(value, endDate);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    validateDates(startDate, value);
  };

  const resetForm = () => {
    setStudentId(children.length === 1 ? children[0].id : '');
    setStartDate(formatDateForInput(new Date()));
    setEndDate(formatDateForInput(new Date()));
    setReason('');
    setNote('');
    setFile(null);
    setDateError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId || !reason) return;
    if (!validateDates(startDate, endDate)) return;

    try {
      const result = await createExcuse.mutateAsync({
        studentId,
        startDate,
        endDate,
        reason,
        note: note || undefined,
      });

      // Upload file if present
      if (file && result?.id) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiFetch(
          `/api/v1/schools/${schoolId}/classbook/excuses/${result.id}/attachment`,
          { method: 'POST', body: formData },
        );
        if (!res.ok) {
          toast.error('Datei konnte nicht hochgeladen werden.');
        }
      }

      toast.success('Entschuldigung eingereicht');
      resetForm();
    } catch {
      toast.error('Entschuldigung konnte nicht eingereicht werden. Bitte versuchen Sie es erneut.');
    }
  };

  const isSubmitting = createExcuse.isPending;
  const isFormValid = studentId && reason && startDate && endDate && !dateError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Child selector */}
      <div className="space-y-1.5">
        <Label htmlFor="excuse-child">Kind</Label>
        {children.length === 1 ? (
          <p className="text-sm text-foreground py-2">{children[0].name}</p>
        ) : (
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger id="excuse-child">
              <SelectValue placeholder="Kind auswaehlen" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Date range: Von / Bis */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="excuse-start">Von</Label>
          <input
            id="excuse-start"
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-required="true"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="excuse-end">Bis</Label>
          <input
            id="excuse-end"
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        <Label htmlFor="excuse-reason">Grund</Label>
        <Select value={reason} onValueChange={(v) => setReason(v as ExcuseReason)}>
          <SelectTrigger id="excuse-reason">
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
        <Label htmlFor="excuse-note">Anmerkung (optional)</Label>
        <Textarea
          id="excuse-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>

      {/* File upload */}
      <div className="space-y-1.5">
        <Label>Datei anfuegen (optional)</Label>
        <FileUploadField onFileSelect={setFile} />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Wird eingereicht...' : 'Entschuldigung einreichen'}
      </Button>
    </form>
  );
}
