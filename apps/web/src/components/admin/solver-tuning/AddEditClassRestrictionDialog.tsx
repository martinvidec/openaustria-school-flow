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
  ClassAutocomplete,
  type ClassAutocompleteValue,
} from './ClassAutocomplete';
import type { ConstraintTemplate } from '@/lib/api/solver-tuning';

/**
 * Phase 14-02 Add/Edit dialog for `NO_LESSONS_AFTER` ConstraintTemplate.
 *
 * Validates via the shared `constraintTemplateParamsSchema` discriminated
 * union (NO_LESSONS_AFTER variant). Cross-reference 422 errors surface
 * via the mutation hook's onError destructive toast.
 */
interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  schoolId: string;
  initial?: ConstraintTemplate | null;
  classNames?: Record<string, string>;
  onCancel: () => void;
  onSubmit: (
    params: ConstraintTemplateParams & { templateType: 'NO_LESSONS_AFTER' },
    isActive: boolean,
  ) => void;
  isSubmitting?: boolean;
}

export function AddEditClassRestrictionDialog({
  open,
  mode,
  schoolId,
  initial,
  classNames,
  onCancel,
  onSubmit,
  isSubmitting,
}: Props) {
  const [classValue, setClassValue] = useState<ClassAutocompleteValue | null>(null);
  const [maxPeriod, setMaxPeriod] = useState<string>('1');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial && initial.templateType === 'NO_LESSONS_AFTER') {
      const initClassId = String(initial.params.classId ?? '');
      const initMax = Number(initial.params.maxPeriod ?? 1);
      setClassValue(
        initClassId
          ? {
              id: initClassId,
              name: classNames?.[initClassId] ?? initClassId,
              yearLevel: 0,
            }
          : null,
      );
      setMaxPeriod(String(initMax));
      setIsActive(initial.isActive);
    } else {
      setClassValue(null);
      setMaxPeriod('1');
      setIsActive(true);
    }
    setError(null);
  }, [open, initial, classNames]);

  const handleSubmit = () => {
    setError(null);
    if (!classValue) {
      setError('Bitte wählen Sie eine Klasse.');
      return;
    }
    const n = Number(maxPeriod);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      setError('Periode muss zwischen 1 und 12 liegen.');
      return;
    }
    const params = {
      templateType: 'NO_LESSONS_AFTER' as const,
      classId: classValue.id,
      maxPeriod: n,
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
              ? 'Klassen-Sperrzeit anlegen'
              : 'Klassen-Sperrzeit bearbeiten'}
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
            <Label htmlFor="class-restriction-klasse">Klasse</Label>
            <ClassAutocomplete
              schoolId={schoolId}
              value={classValue}
              onChange={setClassValue}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-restriction-period">Sperrt ab Periode</Label>
            <Input
              id="class-restriction-period"
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              value={maxPeriod}
              onChange={(e) => setMaxPeriod(e.target.value)}
              className="min-h-11 sm:min-h-9 tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Klasse darf bis einschließlich dieser Periode unterrichtet werden.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="class-restriction-active">Aktiv</Label>
            <Switch
              id="class-restriction-active"
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
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
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
