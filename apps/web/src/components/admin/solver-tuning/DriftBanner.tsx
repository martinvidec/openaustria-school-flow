import { Link } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { useConstraintWeights } from '@/lib/hooks/useConstraintWeights';
import { useLatestTimetableRun } from '@/lib/hooks/useLatestTimetableRun';

/**
 * Phase 14-02 Drift banner per UI-SPEC §Constraint-Configuration-Drift.
 *
 * Visible when the constraint-weights `lastUpdatedAt` (Plan 14-01 GET
 * response shape `{ weights, lastUpdatedAt }`) is newer than the latest
 * TimetableRun.completedAt — i.e. admin changed weights AFTER the most
 * recent solve, so the run on disk doesn't reflect current settings.
 *
 * The hook return shape from `useConstraintWeights` is
 * `{ weights, lastUpdatedAt }` (Plan 14-01 contract — typed in
 * `apps/web/src/lib/hooks/useConstraintWeights.ts`). NO conditional
 * fallback path is needed.
 */
interface Props {
  schoolId: string;
}

export function DriftBanner({ schoolId }: Props) {
  const { data: weights } = useConstraintWeights(schoolId);
  const { data: run } = useLatestTimetableRun(schoolId);

  const lastUpdatedAt = weights?.lastUpdatedAt ?? null;
  const lastRunCompletedAt = run?.completedAt ?? null;

  if (!lastUpdatedAt || !lastRunCompletedAt) return null;

  const drift =
    new Date(lastUpdatedAt).getTime() > new Date(lastRunCompletedAt).getTime();
  if (!drift) return null;

  return (
    <div
      role="status"
      data-testid="drift-banner"
      className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm flex gap-3 items-start mb-4"
    >
      <TriangleAlert
        className="h-5 w-5 text-warning shrink-0 mt-0.5"
        aria-hidden
      />
      <div className="flex-1 space-y-1">
        <p className="leading-snug">
          Aktuelle Gewichtungen wurden nach dem letzten Solve-Run geändert.
          Starten Sie eine neue Generierung, um den Effekt zu prüfen.
        </p>
        <Link
          to="/admin/solver"
          className="text-primary underline-offset-2 hover:underline inline-flex items-center"
        >
          Generator starten
        </Link>
      </div>
    </div>
  );
}
