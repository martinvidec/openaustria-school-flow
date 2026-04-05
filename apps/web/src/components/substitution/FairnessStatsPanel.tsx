import { useState } from 'react';
import {
  useSubstitutionStats,
  type StatsWindow,
} from '@/hooks/useSubstitutionStats';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FairnessStatRow } from '@schoolflow/shared';

interface FairnessStatsPanelProps {
  schoolId: string | undefined;
}

const WINDOW_LABELS: Array<{ value: StatsWindow; label: string }> = [
  { value: 'week', label: 'Aktuelle Woche' },
  { value: 'month', label: 'Aktueller Monat' },
  { value: 'semester', label: 'Aktuelles Semester' },
  { value: 'schoolYear', label: 'Aktuelles Schuljahr' },
  { value: 'custom', label: 'Benutzerdefiniert' },
];

const INPUT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Fairness delta color encoding per 06-UI-SPEC.md (D-17):
 *   delta <= 0   → success (at/below avg)
 *   0 < d <= +2  → neutral (slight overload)
 *   +2 < d <= +5 → warning (notable)
 *   d > +5       → destructive (severe)
 */
function deltaColorClass(delta: number): string {
  if (delta <= 0) return 'text-[hsl(142_71%_45%)]';
  if (delta <= 2) return 'text-muted-foreground';
  if (delta <= 5) return 'text-[hsl(38_92%_50%)]';
  return 'text-destructive';
}

function formatDelta(d: number): string {
  if (Math.abs(d) < 0.05) return '= Schnitt';
  if (d > 0) return `+${d.toFixed(1)} vs Schnitt`;
  return `${d.toFixed(1)} vs Schnitt`;
}

/**
 * Fairness statistics panel (SUBST-06, D-17, D-18).
 *
 * Window defaults to 'semester' per D-18. Custom window reveals two
 * native date inputs; query is only fired when both bounds are set.
 * Table uses inline HTML per Phase 4/5 precedent.
 */
export function FairnessStatsPanel({ schoolId }: FairnessStatsPanelProps) {
  const [window, setWindow] = useState<StatsWindow>('semester');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { data, isLoading, isError } = useSubstitutionStats(
    schoolId,
    window,
    window === 'custom' ? customStart : undefined,
    window === 'custom' ? customEnd : undefined,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="min-w-[220px]">
          <label
            htmlFor="stats-window"
            className="text-sm font-semibold mb-2 block"
          >
            Zeitraum
          </label>
          <Select
            value={window}
            onValueChange={(v) => setWindow(v as StatsWindow)}
          >
            <SelectTrigger id="stats-window" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_LABELS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {window === 'custom' && (
          <>
            <div>
              <label
                htmlFor="stats-custom-start"
                className="text-sm font-semibold mb-2 block"
              >
                Von
              </label>
              <input
                id="stats-custom-start"
                type="date"
                className={INPUT_CLASS}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="stats-custom-end"
                className="text-sm font-semibold mb-2 block"
              >
                Bis
              </label>
              <input
                id="stats-custom-end"
                type="date"
                className={INPUT_CLASS}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Wird geladen...</p>
      )}

      {isError && (
        <p className="text-destructive text-sm">
          Statistik konnte nicht geladen werden. Bitte versuchen Sie es
          spaeter erneut.
        </p>
      )}

      {data && data.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-md">
          <h3 className="text-lg font-semibold">Keine Statistik verfuegbar</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Im gewaehlten Zeitraum wurden keine Vertretungen erfasst.
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto border border-border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-semibold sticky left-0 bg-muted">
                  Lehrer/in
                </th>
                <th className="text-right p-3 font-semibold">Gegeben</th>
                <th className="text-right p-3 font-semibold">Gegeben (WE)</th>
                <th className="text-right p-3 font-semibold">Erhalten</th>
                <th className="text-right p-3 font-semibold">
                  Entfall betroffen
                </th>
                <th className="text-right p-3 font-semibold">
                  Stillarbeit betroffen
                </th>
                <th className="text-right p-3 font-semibold">Abweichung</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: FairnessStatRow) => (
                <tr
                  key={r.teacherId}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="p-3 font-medium sticky left-0 bg-background">
                    {r.teacherName}
                  </td>
                  <td className="p-3 text-right">{r.givenCount}</td>
                  <td className="p-3 text-right">
                    {r.givenWerteinheiten.toFixed(1)}
                  </td>
                  <td className="p-3 text-right">{r.receivedCount}</td>
                  <td className="p-3 text-right">
                    {r.entfallAffectedCount}
                  </td>
                  <td className="p-3 text-right">
                    {r.stillarbeitAffectedCount}
                  </td>
                  <td
                    className={`p-3 text-right font-semibold ${deltaColorClass(r.deltaVsAverage)}`}
                  >
                    {formatDelta(r.deltaVsAverage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
