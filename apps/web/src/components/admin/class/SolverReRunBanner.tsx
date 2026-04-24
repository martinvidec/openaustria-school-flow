import { TriangleAlert } from 'lucide-react';

/**
 * Amber banner surfacing the solver-re-run notice after stammdaten/stundentafel
 * save. No automatic re-solve — admins trigger the solver manually when ready.
 *
 * Copy verbatim from 12-UI-SPEC.md Copywriting Contract:
 * "Änderungen wirken sich erst beim nächsten Stundenplan-Lauf aus."
 */
export function SolverReRunBanner() {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <span>Änderungen wirken sich erst beim nächsten Stundenplan-Lauf aus.</span>
    </div>
  );
}
