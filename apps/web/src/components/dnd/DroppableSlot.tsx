import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { MoveValidation } from '@schoolflow/shared';

interface DroppableSlotProps {
  /** Day of week for this slot */
  day: string;
  /** Period number for this slot */
  period: number;
  /** Current validation result (null when not validating) */
  validationState: MoveValidation | null;
  /** Whether validation is currently in progress */
  isValidating: boolean;
  /** Whether a draggable is currently over this slot */
  isOver: boolean;
}

/**
 * Drop target for empty timetable slots during admin DnD editing.
 * Uses @dnd-kit useDroppable for drop detection.
 *
 * Constraint feedback overlay colors (per UI-SPEC D-07, D-08):
 * - Default (not over): muted background, normal empty slot
 * - Over + valid (no violations): green background + green border
 * - Over + hard violation: red background + red border
 * - Over + soft warning only: yellow background + yellow border
 *
 * Minimum 44px height for touch target accessibility (WCAG 2.5.5).
 */
export function DroppableSlot({
  day,
  period,
  validationState,
  isValidating,
  isOver,
}: DroppableSlotProps) {
  const { setNodeRef } = useDroppable({
    id: `slot-${day}-${period}`,
    data: { day, period },
  });

  // Determine feedback state
  const hasHardViolation =
    isOver && validationState && validationState.hardViolations.length > 0;
  const hasSoftWarning =
    isOver &&
    validationState &&
    validationState.hardViolations.length === 0 &&
    validationState.softWarnings.length > 0;
  const isValid =
    isOver &&
    validationState &&
    validationState.hardViolations.length === 0 &&
    validationState.softWarnings.length === 0;

  const feedbackStyle: React.CSSProperties = {};
  if (hasHardViolation) {
    feedbackStyle.backgroundColor = 'hsl(0 84% 60% / 0.15)';
    feedbackStyle.border = '2px solid hsl(0 84% 60%)';
  } else if (hasSoftWarning) {
    feedbackStyle.backgroundColor = 'hsl(38 92% 50% / 0.15)';
    feedbackStyle.border = '2px solid hsl(38 92% 50%)';
  } else if (isValid) {
    feedbackStyle.backgroundColor = 'hsl(142 71% 45% / 0.15)';
    feedbackStyle.border = '2px solid hsl(142 71% 45%)';
  } else if (isOver) {
    // Over but still validating
    feedbackStyle.backgroundColor = 'hsl(221 83% 53% / 0.08)';
    feedbackStyle.border = '2px dashed hsl(221 83% 53% / 0.3)';
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[44px] h-full w-full rounded-sm transition-colors',
        !isOver && 'bg-muted/20',
        isValidating && isOver && 'animate-pulse',
      )}
      style={feedbackStyle}
      role="gridcell"
      aria-label={`Freier Slot ${day} Periode ${period}`}
      data-slot-day={day}
      data-slot-period={period}
    />
  );
}
