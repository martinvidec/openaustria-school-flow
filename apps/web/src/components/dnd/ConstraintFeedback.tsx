import type { ConstraintViolation, ConstraintWarning } from '@schoolflow/shared';

interface ConstraintFeedbackProps {
  /** Hard constraint violations (block drop) */
  violations: ConstraintViolation[];
  /** Soft constraint warnings (allow drop with indicator) */
  warnings: ConstraintWarning[];
  /** Position for the feedback tooltip */
  position: { x: number; y: number };
}

/**
 * Tooltip overlay showing violation/warning details during drag.
 * Renders near the cursor position with constraint details.
 *
 * Hard violations shown in red with block icon (per UI-SPEC DnD tooltip):
 * - "Lehrerkonflikt: {teacherName} unterrichtet bereits in Periode {N}"
 * - "Raumkonflikt: {roomName} ist in Periode {N} bereits belegt"
 *
 * Soft warnings shown in yellow with info icon:
 * - "Hinweis: {constraintDescription}"
 */
export function ConstraintFeedback({
  violations,
  warnings,
  position,
}: ConstraintFeedbackProps) {
  if (violations.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed z-50 max-w-xs rounded-md border bg-popover p-3 text-popover-foreground shadow-md pointer-events-none"
      style={{
        left: position.x + 16,
        top: position.y + 16,
      }}
      role="tooltip"
      aria-live="polite"
    >
      {/* Hard violations */}
      {violations.length > 0 && (
        <div className="space-y-1">
          {violations.map((v, i) => (
            <div key={`v-${i}`} className="flex items-start gap-2 text-sm">
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: 'hsl(0 84% 60%)' }}
                aria-hidden="true"
              />
              <span className="text-destructive">{v.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Soft warnings */}
      {warnings.length > 0 && (
        <div className={violations.length > 0 ? 'mt-2 space-y-1' : 'space-y-1'}>
          {warnings.map((w, i) => (
            <div key={`w-${i}`} className="flex items-start gap-2 text-sm">
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: 'hsl(38 92% 50%)' }}
                aria-hidden="true"
              />
              <span style={{ color: 'hsl(38 92% 50%)' }}>
                Hinweis: {w.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
