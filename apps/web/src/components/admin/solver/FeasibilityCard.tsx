import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeasibility } from '@/hooks/useSolverDiagnostics';

/**
 * Issue #177-D — pre-solve dimensioning check on /admin/solver.
 *
 * Warns the admin BEFORE a (multi-minute) solve when the problem is
 * over-dimensioned (a class/teacher demands more hours than slots, too few
 * rooms, …). It never blocks generation — the admin can still start the
 * solver — but it turns a guaranteed-to-fail run into an informed decision.
 */
export function FeasibilityCard({ schoolId }: { schoolId: string }) {
  const { data, isLoading } = useFeasibility(schoolId);

  if (isLoading || !data) return null;

  const errors = data.warnings.filter((w) => w.severity === 'error');
  const warns = data.warnings.filter((w) => w.severity === 'warning');

  // Healthy + nothing to flag → a compact reassurance line.
  if (data.warnings.length === 0) {
    return (
      <Card data-testid="feasibility-card" data-feasible="true">
        <CardContent className="flex items-center gap-2 py-3 text-sm">
          <span
            className="inline-block h-2 w-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            Dimensionierung geprüft: {data.totalLessons} Lektionen passen in{' '}
            {data.gridSlots} Slots · {data.classCount} Klassen ·{' '}
            {data.teacherCount} Lehrer · {data.roomCount} Räume.
          </span>
        </CardContent>
      </Card>
    );
  }

  const hasErrors = errors.length > 0;

  return (
    <Card
      className={
        hasErrors
          ? 'border-destructive/60 bg-destructive/5'
          : 'border-amber-400/60 bg-amber-50/40'
      }
      data-testid="feasibility-card"
      data-feasible={String(data.feasible)}
    >
      <CardHeader>
        <CardTitle
          className={`text-[20px] ${hasErrors ? 'text-destructive' : 'text-amber-700'}`}
        >
          {hasErrors
            ? 'Dimensionierungs-Problem erkannt'
            : 'Dimensionierungs-Hinweis'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {hasErrors && (
          <p className="text-muted-foreground">
            Dieses Setup ist sehr wahrscheinlich nicht lösbar. Sie können den
            Solver trotzdem starten, er wird aber voraussichtlich kein
            konfliktfreies Ergebnis liefern.
          </p>
        )}
        <ul className="space-y-1.5">
          {[...errors, ...warns].map((w, i) => (
            <li
              key={`${w.type}-${i}`}
              className="flex items-start gap-2"
              data-testid={`feasibility-warning-${w.severity}`}
            >
              <span
                className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                  w.severity === 'error' ? 'bg-destructive' : 'bg-amber-500'
                }`}
                aria-hidden="true"
              />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
