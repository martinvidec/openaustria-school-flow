import { Link } from '@tanstack/react-router';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useLatestTimetableRun } from '@/lib/hooks/useLatestTimetableRun';

/**
 * Phase 14-02 Tuning-Page header badge per UI-SPEC §Tuning-Page header copy.
 *
 * Three states:
 *  - No prior run            → muted "Noch kein Solve-Run"
 *  - Hard=0 (feasible)       → CircleCheck + green icon
 *  - Hard<0 (infeasible)     → TriangleAlert + amber icon
 *
 * Always renders a deep-link to /admin/timetable-history (history) and
 * a separate ghost button "Generator starten" pointing at /admin/solver.
 */
interface Props {
  schoolId: string;
}

export function LastRunScoreBadge({ schoolId }: Props) {
  const { data: run } = useLatestTimetableRun(schoolId);

  const generatorButton = (
    <Button asChild variant="ghost" size="sm">
      <Link to="/admin/solver">Generator starten</Link>
    </Button>
  );

  if (!run || !run.completedAt) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md font-semibold">
          Noch kein Solve-Run
        </span>
        {generatorButton}
      </div>
    );
  }

  const completed = new Date(run.completedAt);
  const relative = formatDistanceToNow(completed, { addSuffix: true, locale: de });
  const hard = run.hardScore ?? 0;
  const soft = run.softScore ?? 0;
  const feasible = hard === 0;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="inline-flex items-center gap-2 text-sm bg-secondary px-3 py-1 rounded-md font-semibold tabular-nums">
        {feasible ? (
          <CircleCheck className="h-4 w-4 text-success" aria-hidden />
        ) : (
          <TriangleAlert className="h-4 w-4 text-warning" aria-hidden />
        )}
        Letzter Solve-Run {relative} — Hard={hard} · Soft={soft}
      </span>
      <Link
        to="/admin/timetable-history"
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        → History öffnen
      </Link>
      {generatorButton}
    </div>
  );
}
