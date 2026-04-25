import { forwardRef, type ChangeEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ConstraintCatalogEntry } from '@schoolflow/shared';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Phase 14-02: single Slider row for the Gewichtungen tab (SOLVER-02/03).
 *
 * Critical E2E selector (Plan 14-03 dependency):
 *  - `data-constraint-name={entry.name}` on row container — required by
 *    E2E-SOLVER-02/03/10/11.
 *
 * Bidirectional Slider ↔ NumberInput sync:
 *   onChange propagates to parent which holds the canonical local value.
 *   NumberInput shows inline error (under the input) for out-of-range
 *   values; the Slider does NOT update on invalid NumberInput input.
 *
 * Visual states (UI-SPEC §Tab "Gewichtungen"):
 *   - Custom (current ≠ default): thumb halo `ring-2 ring-primary ring-offset-2`
 *     — see Slider customization below.
 *   - Dirty (current ≠ persisted): card tint `bg-warning/5`.
 */
interface Props {
  entry: ConstraintCatalogEntry;
  defaultWeight: number;
  currentWeight: number;
  persistedWeight: number;
  onChange: (next: number) => void;
  onReset: () => void;
}

export const ConstraintWeightSliderRow = forwardRef<HTMLDivElement, Props>(
  function ConstraintWeightSliderRow(
    { entry, defaultWeight, currentWeight, persistedWeight, onChange, onReset },
    ref,
  ) {
    const isCustom = currentWeight !== defaultWeight;
    const isDirty = currentWeight !== persistedWeight;
    const isInvalid =
      Number.isNaN(currentWeight) || currentWeight < 0 || currentWeight > 100;

    const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const n = raw === '' ? Number.NaN : Number(raw);
      onChange(n);
    };

    return (
      <div
        ref={ref}
        data-constraint-name={entry.name}
        className={cn(
          'border rounded-md bg-card p-4 transition-colors',
          isDirty && 'bg-warning/5 border-warning/40',
        )}
      >
        <div className="grid gap-3 sm:grid-cols-[2fr_3fr_auto_auto_auto] sm:items-center">
          {/* Label + Java name */}
          <div className="min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-sm font-semibold truncate">
                      {entry.displayName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      {entry.name}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {entry.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Slider — thumb is 44px on mobile (MOBILE-ADM-02 touch target),
              shrinks back to the shadcn default on sm+ (Plan 14-03 E2E-SOLVER-MOBILE-01 contract). */}
          <div className="px-1">
            <Slider
              min={0}
              max={100}
              step={1}
              value={[Number.isNaN(currentWeight) ? 0 : currentWeight]}
              onValueChange={(vals) => onChange(vals[0] ?? 0)}
              aria-label={`Gewichtung ${entry.displayName} (0 bis 100)`}
              className={cn(
                '[&_[role=slider]]:h-11 [&_[role=slider]]:w-11 sm:[&_[role=slider]]:h-5 sm:[&_[role=slider]]:w-5',
                isCustom && '[&_[role=slider]]:ring-2 [&_[role=slider]]:ring-primary [&_[role=slider]]:ring-offset-2',
              )}
            />
          </div>

          {/* NumberInput */}
          <div className="flex flex-col gap-1">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={Number.isNaN(currentWeight) ? '' : currentWeight}
              onChange={handleNumberChange}
              aria-label={`Gewichtung für ${entry.displayName}`}
              aria-invalid={isInvalid}
              className={cn(
                'w-20 sm:w-16 tabular-nums min-h-11 sm:min-h-9',
                isInvalid && 'border-destructive focus-visible:ring-destructive',
              )}
            />
          </div>

          {/* Default hint */}
          <div className="text-sm text-muted-foreground tabular-nums">
            Default: {defaultWeight}
          </div>

          {/* Reset icon */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Auf Default zurücksetzen"
              disabled={!isCustom}
              onClick={onReset}
              className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isInvalid && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            Gewichtungen müssen zwischen 0 und 100 liegen.
          </p>
        )}
      </div>
    );
  },
);
