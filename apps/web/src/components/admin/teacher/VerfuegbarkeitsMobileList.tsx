import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import type { TeacherDto } from '@/hooks/useTeachers';

/**
 * VerfuegbarkeitsMobileList — mobile (<md) fallback for the Verfuegbarkeits-Grid.
 * Day-Picker <Select> + single-column period toggle list, each row h-11 (44px WCAG).
 */

const DAYS = [
  { code: 'MONDAY', label: 'Montag' },
  { code: 'TUESDAY', label: 'Dienstag' },
  { code: 'WEDNESDAY', label: 'Mittwoch' },
  { code: 'THURSDAY', label: 'Donnerstag' },
  { code: 'FRIDAY', label: 'Freitag' },
  { code: 'SATURDAY', label: 'Samstag' },
] as const;

type CellKey = `${typeof DAYS[number]['code']}-${number}`;

interface Props {
  teacher: TeacherDto;
  periodCount?: number;
  onSave: (rules: Array<{ ruleType: 'BLOCKED_PERIOD'; dayOfWeek: string; periodNumbers: number[]; isHard: boolean }>) => Promise<void> | void;
  isSaving?: boolean;
}

function loadBlockedSet(teacher: TeacherDto): Set<CellKey> {
  const set = new Set<CellKey>();
  for (const rule of teacher.availabilityRules ?? []) {
    if (rule.ruleType !== 'BLOCKED_PERIOD' || !rule.dayOfWeek) continue;
    for (const p of rule.periodNumbers ?? []) {
      set.add(`${rule.dayOfWeek}-${p}` as CellKey);
    }
  }
  return set;
}

export function VerfuegbarkeitsMobileList({ teacher, periodCount = 8, onSave, isSaving = false }: Props) {
  const [day, setDay] = useState<typeof DAYS[number]['code']>('MONDAY');
  const initial = useMemo(() => loadBlockedSet(teacher), [teacher]);
  const [blocked, setBlocked] = useState<Set<CellKey>>(initial);
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  const toggle = (period: number) => {
    const key: CellKey = `${day}-${period}`;
    const next = new Set(blocked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setBlocked(next);
  };

  const handleSave = async () => {
    const byDay: Record<string, number[]> = {};
    for (const key of blocked) {
      const [d, pStr] = key.split('-');
      (byDay[d] ??= []).push(Number(pStr));
    }
    const rules = Object.entries(byDay).map(([d, pns]) => ({
      ruleType: 'BLOCKED_PERIOD' as const,
      dayOfWeek: d,
      periodNumbers: pns.sort((a, b) => a - b),
      isHard: true,
    }));
    await onSave(rules);
  };

  return (
    <div className="md:hidden space-y-3">
      <div>
        <label htmlFor="mobile-day-picker" className="text-sm font-medium">Tag</label>
        <Select value={day} onValueChange={(v) => setDay(v as typeof DAYS[number]['code'])}>
          <SelectTrigger id="mobile-day-picker" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d.code} value={d.code}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        {periods.map((p) => {
          const isBlocked = blocked.has(`${day}-${p}` as CellKey);
          return (
            <div key={p} className="flex items-center justify-between h-11 px-3 rounded-md border border-border">
              <span className="text-sm">{p}. Stunde</span>
              <Toggle
                pressed={isBlocked}
                onPressedChange={() => toggle(p)}
                aria-label={`${p}. Stunde ${isBlocked ? 'freigeben' : 'blockieren'}`}
                className="h-11 w-11"
              >
                <Lock className="h-4 w-4" aria-hidden />
              </Toggle>
            </div>
          );
        })}
      </div>
      <Button onClick={handleSave} disabled={isSaving} className="w-full h-11">
        Speichern
      </Button>
    </div>
  );
}
