import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ChangeIndicatorProps {
  changeType:
    | 'substitution'
    | 'cancelled'
    | 'room-swap'
    | 'stillarbeit'
    | null;
  originalValue?: string;
  newValue?: string;
  /** Name of the supervising teacher for stillarbeit variant (Phase 6) */
  supervisingTeacher?: string;
  children: React.ReactNode;
}

/**
 * Left-border badge component showing change status on a timetable cell.
 * Wraps children with color-coded border and background per change type.
 *
 * Colors per UI-SPEC D-11:
 * - substitution: orange-500 border, orange-50 bg
 * - cancelled: red-500 border, red-50 bg, "Entfall" badge
 * - room-swap: blue-500 border, blue-50 bg
 * - stillarbeit (Phase 6, SUBST-05): orange-500 border (same as substitution),
 *   "Stillarbeit" label + optional "Aufsicht: {name}" supervisor line.
 *   Reuses substitution orange per Phase 6 UI-SPEC rationale: Stillarbeit is
 *   a class of substitution (D-04), so the color is shared; differentiation
 *   happens via the text label, not via a new color token.
 */
export function ChangeIndicator({
  changeType,
  originalValue,
  newValue,
  supervisingTeacher,
  children,
}: ChangeIndicatorProps) {
  if (!changeType) {
    return <>{children}</>;
  }

  const styles = getChangeStyles(changeType);

  return (
    <div
      className={cn(
        'relative h-full w-full rounded-sm',
        styles.borderClass,
        styles.bgClass,
      )}
    >
      {/* Main content with possible strikethrough for cancelled */}
      <div className={cn(changeType === 'cancelled' && 'line-through opacity-60')}>
        {children}
      </div>

      {/* Change-specific content overlay */}
      {changeType === 'cancelled' && (
        <Badge
          variant="destructive"
          className="absolute top-0.5 right-0.5 text-[10px] px-1 py-0"
        >
          Entfall
        </Badge>
      )}

      {changeType === 'substitution' && originalValue && (
        <div className="absolute bottom-0.5 left-1 text-[10px] leading-tight">
          <span className="line-through opacity-60">{originalValue}</span>
          {newValue && (
            <span className="ml-1 font-medium">{newValue}</span>
          )}
        </div>
      )}

      {changeType === 'room-swap' && originalValue && (
        <div className="absolute bottom-0.5 left-1 text-[10px] leading-tight">
          <span className="line-through opacity-60">{originalValue}</span>
          <span className="mx-0.5">{'->'}</span>
          <span className="font-medium">{newValue}</span>
        </div>
      )}

      {changeType === 'stillarbeit' && (
        <div className="absolute inset-x-1 bottom-0.5 text-[10px] leading-tight">
          <div className="font-semibold text-[12px]">Stillarbeit</div>
          {supervisingTeacher && (
            <div className="text-muted-foreground truncate">
              Aufsicht: {supervisingTeacher}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getChangeStyles(
  changeType: 'substitution' | 'cancelled' | 'room-swap' | 'stillarbeit',
) {
  switch (changeType) {
    case 'substitution':
      return {
        borderClass: 'border-l-4 border-l-[hsl(25,95%,53%)]',
        bgClass: 'bg-[hsl(33,100%,96%)]',
      };
    case 'cancelled':
      return {
        borderClass: 'border-l-4 border-l-[hsl(0,84%,60%)]',
        bgClass: 'bg-[hsl(0,86%,97%)]',
      };
    case 'room-swap':
      return {
        borderClass: 'border-l-4 border-l-[hsl(221,83%,53%)]',
        bgClass: 'bg-[hsl(214,95%,93%)]',
      };
    case 'stillarbeit':
      // Shares the substitution orange palette per Phase 6 UI-SPEC D-11
      return {
        borderClass: 'border-l-4 border-l-[hsl(25,95%,53%)]',
        bgClass: 'bg-[hsl(33,100%,96%)]',
      };
  }
}
