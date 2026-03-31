import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ChangeIndicatorProps {
  changeType: 'substitution' | 'cancelled' | 'room-swap' | null;
  originalValue?: string;
  newValue?: string;
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
 */
export function ChangeIndicator({
  changeType,
  originalValue,
  newValue,
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
    </div>
  );
}

function getChangeStyles(changeType: 'substitution' | 'cancelled' | 'room-swap') {
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
  }
}
