import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoBanner } from '@/components/admin/shared/InfoBanner';
import { cn } from '@/lib/utils';
import type { TeacherDto } from '@/hooks/useTeachers';

/**
 * VerfuegbarkeitsGrid — desktop (>=md) visual week-grid.
 *
 * Click toggles a cell between "verfügbar" and "geblockt" (BLOCKED_PERIOD).
 * Blocked cells render a diagonal-hatch pattern + Lock icon.
 * Save sends one AvailabilityRule per day (ruleType=BLOCKED_PERIOD, periodNumbers[]).
 */

const DAYS: Array<{ code: 'MONDAY'|'TUESDAY'|'WEDNESDAY'|'THURSDAY'|'FRIDAY'|'SATURDAY'; label: string }> = [
  { code: 'MONDAY', label: 'Mo' },
  { code: 'TUESDAY', label: 'Di' },
  { code: 'WEDNESDAY', label: 'Mi' },
  { code: 'THURSDAY', label: 'Do' },
  { code: 'FRIDAY', label: 'Fr' },
  { code: 'SATURDAY', label: 'Sa' },
];

type CellKey = `${typeof DAYS[number]['code']}-${number}`;

interface Props {
  teacher: TeacherDto;
  /** Optional period count (default 8 — common Austrian max). */
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

export function VerfuegbarkeitsGrid({ teacher, periodCount = 8, onSave, isSaving = false }: Props) {
  const initial = useMemo(() => loadBlockedSet(teacher), [teacher]);
  const [blocked, setBlocked] = useState<Set<CellKey>>(initial);
  const periods = useMemo(() => Array.from({ length: periodCount }, (_, i) => i + 1), [periodCount]);

  const toggle = (day: typeof DAYS[number]['code'], period: number) => {
    const key: CellKey = `${day}-${period}`;
    const next = new Set(blocked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setBlocked(next);
  };

  const handleSave = async () => {
    // Group by day -> periodNumbers[]
    const byDay: Record<string, number[]> = {};
    for (const key of blocked) {
      const [day, pStr] = key.split('-');
      (byDay[day] ??= []).push(Number(pStr));
    }
    const rules = Object.entries(byDay).map(([day, pns]) => ({
      ruleType: 'BLOCKED_PERIOD' as const,
      dayOfWeek: day,
      periodNumbers: pns.sort((a, b) => a - b),
      isHard: true,
    }));
    await onSave(rules);
  };

  if (periods.length === 0) {
    return (
      <InfoBanner>
        Kein Zeitraster konfiguriert. Bitte zuerst in{' '}
        <a className="underline" href="/admin/school/settings?tab=timegrid">Schulverwaltung</a>{' '}
        einrichten.
      </InfoBanner>
    );
  }

  return (
    <div className="hidden md:block space-y-4">
      <div className="overflow-x-auto">
        <table role="grid" className="w-full border-collapse">
          <caption className="sr-only">
            Verfügbarkeits-Raster — {periods.length} Perioden × {DAYS.length} Tage
          </caption>
          <thead>
            <tr>
              <th className="w-14 p-2 text-xs text-muted-foreground"></th>
              {DAYS.map((d) => (
                <th key={d.code} scope="col" className="p-2 text-sm font-medium">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <th scope="row" className="p-2 text-xs font-medium text-muted-foreground text-right">
                  {p}.
                </th>
                {DAYS.map((d) => {
                  const key: CellKey = `${d.code}-${p}`;
                  const isBlocked = blocked.has(key);
                  return (
                    <td key={d.code} className="p-1">
                      <button
                        type="button"
                        role="gridcell"
                        aria-pressed={isBlocked}
                        aria-label={`${d.label}, ${p}. Stunde, ${isBlocked ? 'geblockt' : 'verfügbar'}`}
                        onClick={() => toggle(d.code, p)}
                        className={cn(
                          'relative h-12 w-full rounded-md border border-border transition-colors flex items-center justify-center',
                          isBlocked ? 'bg-muted text-muted-foreground' : 'bg-background hover:bg-accent',
                        )}
                        style={
                          isBlocked
                            ? {
                                backgroundImage:
                                  'repeating-linear-gradient(45deg, transparent 0 4px, var(--color-muted-foreground, rgba(0,0,0,0.3)) 4px 5px)',
                              }
                            : undefined
                        }
                      >
                        {isBlocked && <Lock className="h-4 w-4" aria-hidden />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          Speichern
        </Button>
      </div>
    </div>
  );
}
