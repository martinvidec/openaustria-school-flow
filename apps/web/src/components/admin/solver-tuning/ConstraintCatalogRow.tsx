import { ArrowRight, Lock } from 'lucide-react';
import type { ConstraintCatalogEntry } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SeverityBadge } from './SeverityBadge';

/**
 * Phase 14-02: single Constraint catalog row.
 *
 * Critical E2E selectors (Plan 14-03 dependency):
 *  - `data-severity={entry.severity}` on row container — required by
 *    E2E-SOLVER-01 (catalog-readonly).
 *  - Soft-row edit button has `aria-label="Gewichtung bearbeiten"`.
 *
 * Per UI-SPEC §Tab "Constraints" §Per-surface layout rules:
 *  Desktop: grid `grid-cols-[2fr_auto_3fr_auto]`
 *  Mobile:  stacks vertically into Card layout (rows 1..4)
 */
interface Props {
  entry: ConstraintCatalogEntry;
  onEditWeight: (constraintName: string) => void;
}

export function ConstraintCatalogRow({ entry, onEditWeight }: Props) {
  const isHard = entry.severity === 'HARD';
  return (
    <div
      data-severity={entry.severity}
      data-constraint-name={entry.name}
      className="border rounded-md bg-card p-4 grid gap-3 sm:grid-cols-[2fr_auto_3fr_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{entry.displayName}</div>
        <div className="text-xs text-muted-foreground truncate font-mono">
          {entry.name}
        </div>
      </div>
      <div className="justify-self-start sm:justify-self-auto">
        <SeverityBadge severity={entry.severity} />
      </div>
      <div className="text-sm text-muted-foreground sm:max-w-md">
        {entry.description}
      </div>
      <div className="justify-self-start sm:justify-self-end">
        {isHard ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  aria-label="Hard-Constraint immer aktiv"
                  className="inline-flex items-center justify-center h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground"
                >
                  <Lock className="h-4 w-4" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Hard-Constraints sind im Solver immer aktiv und können nicht
                deaktiviert werden.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary min-h-11 sm:min-h-9 w-full sm:w-auto"
            aria-label="Gewichtung bearbeiten"
            onClick={() => onEditWeight(entry.name)}
          >
            Gewichtung bearbeiten
            <ArrowRight className="h-4 w-4 ml-1" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
