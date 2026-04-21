import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SCHOOL_DAYS, TimeGridSchema, type PeriodInput } from '@schoolflow/shared';
import { StickyMobileSaveBar } from '@/components/admin/shared/StickyMobileSaveBar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { useSchool } from '@/hooks/useSchool';
import { TimeGridConflictError, useTimeGrid, useUpdateTimeGrid } from '@/hooks/useTimeGrid';
import { apiFetch } from '@/lib/api';
import { DestructiveEditDialog } from './DestructiveEditDialog';
import { PeriodsEditor, durationFor, type PeriodWithId } from './PeriodsEditor';
import { TemplateReloadDialog } from './TemplateReloadDialog';

const DAY_LABELS: Record<(typeof SCHOOL_DAYS)[number], string> = {
  MONDAY: 'Mo',
  TUESDAY: 'Di',
  WEDNESDAY: 'Mi',
  THURSDAY: 'Do',
  FRIDAY: 'Fr',
  SATURDAY: 'Sa',
};

interface Props {
  schoolId: string;
  onDirtyChange?: (d: boolean) => void;
}

export function TimeGridTab({ schoolId, onDirtyChange }: Props) {
  const tgQuery = useTimeGrid(schoolId);
  const schoolQuery = useSchool(schoolId);
  const updateMut = useUpdateTimeGrid(schoolId);

  const [periods, setPeriods] = useState<PeriodWithId[]>([]);
  const [schoolDays, setSchoolDays] = useState<Array<(typeof SCHOOL_DAYS)[number]>>([]);
  const [serverSnapshot, setServerSnapshot] = useState<{
    periods: PeriodWithId[];
    schoolDays: Array<(typeof SCHOOL_DAYS)[number]>;
  } | null>(null);
  const [conflict, setConflict] = useState<{ open: boolean; count: number }>({
    open: false,
    count: 0,
  });
  const [templateOpen, setTemplateOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (tgQuery.data) {
      const ps: PeriodWithId[] = tgQuery.data.periods.map((p) => ({
        id: p.id,
        periodNumber: p.periodNumber,
        label: p.label ?? '',
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
      }));
      const ds = (tgQuery.data.schoolDays ?? []) as Array<(typeof SCHOOL_DAYS)[number]>;
      setPeriods(ps);
      setSchoolDays(ds);
      setServerSnapshot({ periods: ps, schoolDays: ds });
    }
  }, [tgQuery.data]);

  const isDirty = useMemo(
    () =>
      JSON.stringify({ periods, schoolDays }) !==
      JSON.stringify(serverSnapshot ?? { periods: [], schoolDays: [] }),
    [periods, schoolDays, serverSnapshot],
  );
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const buildDto = () => ({
    // The API's CreatePeriodDto requires `durationMin` (end-minus-start in minutes).
    // The shared PeriodSchema intentionally omits it — we compute it at submit
    // time so the server contract is satisfied without leaking a derived field
    // into the form state. durationFor returns null for invalid times; fall
    // back to 0 so class-validator surfaces the real error (Zod's
    // TimeGridSchema.safeParse already gates this in validateBeforeSave).
    periods: periods.map(({ id: _id, ...p }) => ({
      ...(p as PeriodInput),
      durationMin: durationFor(p) ?? 0,
    })),
    schoolDays,
  });

  const validateBeforeSave = (): boolean => {
    const result = TimeGridSchema.safeParse(buildDto());
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Ungueltige Eingabe';
      setValidationError(msg);
      toast.error(msg);
      return false;
    }
    setValidationError(null);
    return true;
  };

  const doSave = async (force: boolean): Promise<boolean> => {
    try {
      await updateMut.mutateAsync({ dto: buildDto(), force });
      setServerSnapshot({ periods, schoolDays });
      setConflict({ open: false, count: 0 });
      return true;
    } catch (e) {
      if (e instanceof TimeGridConflictError) {
        setConflict({ open: true, count: e.impactedRunsCount });
      }
      return false;
    }
  };

  const handleSave = () => {
    if (validateBeforeSave()) void doSave(false);
  };
  // D-13 bypass — both retry paths pass { force: true } to useUpdateTimeGrid
  // so the backend skips the impact-check; the dialog already confirmed intent.
  const handleSaveOnly = () => void doSave(true);
  const handleSaveAndRerun = async () => {
    const ok = await doSave(true);
    if (!ok) return;
    // Solver rerun — PINNED endpoint /api/v1/schools/:schoolId/timetable/solve
    // per timetable.controller.ts. Empty body uses backend defaults for
    // maxSolveSeconds and constraintWeights.
    const res = await apiFetch(`/api/v1/schools/${schoolId}/timetable/solve`, {
      method: 'POST',
      body: '{}',
    });
    if (res.ok) {
      toast.success('Stundenplan-Lauf gestartet.');
    } else {
      toast.error('Solver-Rerun konnte nicht gestartet werden.');
    }
  };

  const handleTemplateReload = () => setTemplateOpen(true);
  const handleTemplateConfirm = async () => {
    const schoolType = schoolQuery.data?.schoolType ?? 'AHS';
    const res = await apiFetch(`/api/v1/schools/templates?type=${schoolType}`);
    if (res.ok) {
      const tpl = await res.json().catch(() => ({}));
      const tplPeriods: Array<Omit<PeriodInput, 'periodNumber'> & Partial<PeriodInput>> =
        Array.isArray(tpl.periods) ? tpl.periods : [];
      const newPeriods: PeriodWithId[] = tplPeriods.map((p, i) => ({
        id: `tpl-${i}-${Date.now()}`,
        periodNumber: i + 1,
        label: p.label ?? '',
        startTime: p.startTime ?? '08:00',
        endTime: p.endTime ?? '08:50',
        isBreak: p.isBreak ?? false,
      }));
      setPeriods(newPeriods);
      if (Array.isArray(tpl.schoolDays)) {
        setSchoolDays(tpl.schoolDays as Array<(typeof SCHOOL_DAYS)[number]>);
      }
    } else {
      toast.error('Vorlage konnte nicht geladen werden.');
    }
    setTemplateOpen(false);
  };

  if (tgQuery.isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-muted rounded h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const isSaving = updateMut.isPending;

  return (
    <Card className="border-none shadow-none md:border md:shadow-sm p-6 md:p-8">
      <div>
        <h2 className="text-lg font-semibold">Zeitraster</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Unterrichtstage, Perioden und Pausen dieser Schule.
        </p>
      </div>

      <div className="mb-6">
        <Label className="text-sm font-medium text-muted-foreground mb-2 block">
          Unterrichtstage
        </Label>
        <div className="flex flex-wrap gap-2">
          {SCHOOL_DAYS.map((d) => {
            const active = schoolDays.includes(d);
            return (
              <Toggle
                key={d}
                pressed={active}
                onPressedChange={(v) =>
                  setSchoolDays(v ? [...schoolDays, d] : schoolDays.filter((x) => x !== d))
                }
                className="h-11 w-12 md:h-10"
                aria-label={`Unterrichtstag ${DAY_LABELS[d]}`}
              >
                {DAY_LABELS[d]}
              </Toggle>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          An inaktiven Tagen findet kein Unterricht statt.
        </p>
      </div>

      <PeriodsEditor
        periods={periods}
        onChange={setPeriods}
        onTemplateReload={handleTemplateReload}
      />

      {validationError && <p className="text-xs text-destructive mt-3">{validationError}</p>}

      <div className="hidden md:flex justify-end mt-6">
        <Button onClick={handleSave} disabled={!isDirty || isSaving} className="min-w-[8rem]">
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Speichern
        </Button>
      </div>

      <StickyMobileSaveBar isDirty={isDirty} isSaving={isSaving} onSave={handleSave} />

      <DestructiveEditDialog
        open={conflict.open}
        impactedRunsCount={conflict.count}
        isSaving={isSaving}
        onCancel={() => setConflict({ open: false, count: 0 })}
        onSaveOnly={handleSaveOnly}
        onSaveAndRerun={handleSaveAndRerun}
      />

      <TemplateReloadDialog
        open={templateOpen}
        schoolType={schoolQuery.data?.schoolType ?? 'AHS'}
        onCancel={() => setTemplateOpen(false)}
        onConfirm={handleTemplateConfirm}
      />
    </Card>
  );
}
