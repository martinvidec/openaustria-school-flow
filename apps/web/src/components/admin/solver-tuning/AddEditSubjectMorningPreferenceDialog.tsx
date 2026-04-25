import { useEffect, useState } from 'react';
import {
  constraintTemplateParamsSchema,
  type ConstraintTemplateParams,
} from '@schoolflow/shared';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  SubjectAutocomplete,
  type SubjectAutocompleteValue,
} from './SubjectAutocomplete';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  schoolId: string;
  initial?: ConstraintTemplate | null;
  subjectNames?: Record<string, string>;
  onCancel: () => void;
  onSubmit: (
    params: ConstraintTemplateParams & { templateType: 'SUBJECT_MORNING' },
    isActive: boolean,
  ) => void;
  isSubmitting?: boolean;
}

export function AddEditSubjectMorningPreferenceDialog({
  open,
  mode,
  schoolId,
  initial,
  subjectNames,
  onCancel,
  onSubmit,
  isSubmitting,
}: Props) {
  const [subjectValue, setSubjectValue] = useState<SubjectAutocompleteValue | null>(null);
  const [latestPeriod, setLatestPeriod] = useState<string>('1');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial && initial.templateType === 'SUBJECT_MORNING') {
      const sid = String(initial.params.subjectId ?? '');
      const lp = Number(initial.params.latestPeriod ?? 1);
      setSubjectValue(
        sid
          ? { id: sid, name: subjectNames?.[sid] ?? sid, shortName: '' }
          : null,
      );
      setLatestPeriod(String(lp));
      setIsActive(initial.isActive);
    } else {
      setSubjectValue(null);
      setLatestPeriod('1');
      setIsActive(true);
    }
    setError(null);
  }, [open, initial, subjectNames]);

  const handleSubmit = () => {
    setError(null);
    if (!subjectValue) {
      setError('Bitte wählen Sie ein Fach.');
      return;
    }
    const n = Number(latestPeriod);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      setError('Periode muss zwischen 1 und 12 liegen.');
      return;
    }
    const params = {
      templateType: 'SUBJECT_MORNING' as const,
      subjectId: subjectValue.id,
      latestPeriod: n,
    };
    const parsed = constraintTemplateParamsSchema.safeParse(params);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Eingabe ungültig.');
      return;
    }
    onSubmit(parsed.data as typeof params, isActive);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Vormittags-Präferenz anlegen'
              : 'Vormittags-Präferenz bearbeiten'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Fach</Label>
            <SubjectAutocomplete
              schoolId={schoolId}
              value={subjectValue}
              onChange={setSubjectValue}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-morning-period">Spätestens bis Periode</Label>
            <Input
              id="subject-morning-period"
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              value={latestPeriod}
              onChange={(e) => setLatestPeriod(e.target.value)}
              className="min-h-11 sm:min-h-9 tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Fach soll bevorzugt bis einschließlich dieser Periode liegen.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="subject-morning-active">Aktiv</Label>
            <Switch
              id="subject-morning-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Eintrag aktiv schalten"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
