import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSolveReport } from '@/hooks/useSolverDiagnostics';

/** Show at most this many rows per utilization list. */
const MAX_ROWS = 8;

function UtilBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${clamped >= 90 ? 'bg-amber-500' : 'bg-primary'}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/**
 * Issue #177-D — post-run solve report on /admin/solver.
 *
 * For the most recent finished run, shows teacher/room utilization (lessons vs
 * available slots), the per-class lesson distribution, and the hardest
 * remaining constraints — independent of whether the run completed cleanly or
 * with conflicts. Read-only.
 */
export function SolveReportCard({
  schoolId,
  runId,
}: {
  schoolId: string;
  runId: string;
}) {
  const { data } = useSolveReport(schoolId, runId);

  if (!data || data.lessonCount === 0) return null;

  return (
    <Card data-testid="solve-report-card">
      <CardHeader>
        <CardTitle className="text-[20px]">Auswertung des letzten Laufs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <p className="text-xs text-muted-foreground">
          {data.lessonCount} Lektionen · {data.gridSlots} Slots ·{' '}
          {data.teacherUtilization.length} Lehrer · {data.roomUtilization.length}{' '}
          Räume
        </p>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Lehrer-Auslastung
          </h3>
          <ul className="space-y-2">
            {data.teacherUtilization.slice(0, MAX_ROWS).map((t) => (
              <li key={t.teacherId} className="space-y-1">
                <div className="flex justify-between">
                  <span>{t.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {t.lessons}/{data.gridSlots} · {t.pct}%
                  </span>
                </div>
                <UtilBar pct={t.pct} />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Raum-Auslastung
          </h3>
          <ul className="space-y-2">
            {data.roomUtilization.slice(0, MAX_ROWS).map((r) => (
              <li key={r.roomId} className="space-y-1">
                <div className="flex justify-between">
                  <span>{r.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {r.lessons}/{data.gridSlots} · {r.pct}%
                  </span>
                </div>
                <UtilBar pct={r.pct} />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Wochenstunden pro Klasse
          </h3>
          <ul className="space-y-1">
            {data.classDistribution.slice(0, MAX_ROWS).map((c) => (
              <li key={c.classId} className="flex justify-between">
                <span>{c.label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {c.lessons}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {data.topConstraints.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Härteste Constraints
            </h3>
            <ul className="space-y-1">
              {data.topConstraints.map((v) => (
                <li key={v.type} className="flex justify-between">
                  <span>{v.type}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {v.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
