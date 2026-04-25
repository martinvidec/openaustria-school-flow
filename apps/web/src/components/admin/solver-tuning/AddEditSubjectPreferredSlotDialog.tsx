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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SubjectAutocomplete,
  type SubjectAutocompleteValue,
} from './SubjectAutocomplete';
import { WOCHENTAG_FULL_LABELS, type WochentagDay } from './WochentagBadge';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';

const DAYS: WochentagDay[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
];

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  schoolId: string;
  initial?: ConstraintTemplate | null;
  subjectNames?: Record<string, string>;
  onCancel: () => void;
  onSubmit: (
    params: ConstraintTemplateParams & { templateType: 'SUBJECT_PREFERRED_SLOT' },
    isActive: boolean,
  ) => void;
  isSubmitting?: boolean;
}

export function AddEditSubjectPreferredSlotDialog({
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
  const [day, setDay] = useState<WochentagDay>('MONDAY');
  const [period, setPeriod] = useState<string>('1');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial && initial.templateType === 'SUBJECT_PREFERRED_SLOT') {
      const sid = String(initial.params.subjectId ?? '');
      const d = String(initial.params.dayOfWeek ?? 'MONDAY') as WochentagDay;
      const p = Number(initial.params.period ?? 1);
      setSubjectValue(
        sid
          ? { id: sid, name: subjectNames?.[sid] ?? sid, shortName: '' }
          : null,
      );
      setDay(d);
      setPeriod(String(p));
      setIsActive(initial.isActive);
    } else {
      setSubjectValue(null);
      setDay('MONDAY');
      setPeriod('1');
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
    const n = Number(period);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      setError('Periode muss zwischen 1 und 12 liegen.');
      return;
    }
    const params = {
      templateType: 'SUBJECT_PREFERRED_SLOT' as const,
      subjectId: subjectValue.id,
      dayOfWeek: day,
      period: n,
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
              ? 'Bevorzugten Slot anlegen'
              : 'Bevorzugten Slot bearbeiten'}
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
            <Label htmlFor="preferred-slot-day">Wochentag</Label>
            <Select value={day} onValueChange={(v) => setDay(v as WochentagDay)}>
              <SelectTrigger id="preferred-slot-day" className="min-h-11 sm:min-h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {WOCHENTAG_FULL_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-slot-period">Periode</Label>
            <Input
              id="preferred-slot-period"
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="min-h-11 sm:min-h-9 tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Periode innerhalb des Schul-Zeitrasters.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="preferred-slot-active">Aktiv</Label>
            <Switch
              id="preferred-slot-active"
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
