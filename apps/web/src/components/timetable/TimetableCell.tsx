import { cn } from '@/lib/utils';
import { ChangeIndicator } from './ChangeIndicator';
import type { TimetableViewLesson, SubjectColorPair } from '@schoolflow/shared';

/** Map DayOfWeek enum to German day name for aria-label */
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Montag',
  TUESDAY: 'Dienstag',
  WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag',
  FRIDAY: 'Freitag',
  SATURDAY: 'Samstag',
};

interface TimetableCellProps {
  lesson: TimetableViewLesson;
  color: SubjectColorPair;
  onClick?: () => void;
  editable?: boolean;
}

/**
 * Single lesson cell component for the timetable grid.
 * Shows 3 lines: subject abbreviation, teacher surname, room name.
 * Uses subject color pair for background/text.
 * Wraps in ChangeIndicator when lesson has a change type.
 *
 * Per UI-SPEC D-02:
 * - Line 1: subjectAbbreviation (14px, semibold, line-height 1.2)
 * - Line 2: teacherSurname (12px, regular, line-height 1.3)
 * - Line 3: roomName (12px, regular, line-height 1.3)
 */
export function TimetableCell({
  lesson,
  color,
  onClick,
  editable = false,
}: TimetableCellProps) {
  const dayLabel = DAY_LABELS[lesson.dayOfWeek] ?? lesson.dayOfWeek;
  const ariaLabel = `${lesson.subjectName} bei ${lesson.teacherSurname} in ${lesson.roomName}, ${dayLabel} ${lesson.periodNumber}. Stunde`;

  // Determine what to pass to ChangeIndicator for substitution/room-swap details
  let originalValue: string | undefined;
  let newValue: string | undefined;

  if (lesson.changeType === 'substitution') {
    originalValue = lesson.originalTeacherSurname;
    newValue = lesson.teacherSurname;
  } else if (lesson.changeType === 'room-swap') {
    originalValue = lesson.originalRoomName;
    newValue = lesson.roomName;
  }

  // For change types, build the 3 lines inline with change info
  // instead of adding a 4th line that overflows the fixed cell height.
  const hasChange = !!lesson.changeType;
  const isSubstitution = lesson.changeType === 'substitution';
  const isStillarbeit = lesson.changeType === 'stillarbeit';
  const isCancelled = lesson.changeType === 'cancelled';

  const cellContent = (
    <div
      className={cn(
        'flex flex-col justify-center px-1.5 py-1 h-full w-full rounded-sm overflow-hidden',
        editable && 'cursor-grab hover:ring-2 hover:ring-primary/30',
      )}
      style={{
        backgroundColor: hasChange ? undefined : color.bg,
        color: hasChange ? undefined : color.text,
      }}
    >
      {/* Line 1: Subject abbreviation */}
      <span className={cn('text-sm font-semibold leading-[1.2] truncate', isCancelled && 'line-through opacity-60')}>
        {lesson.subjectAbbreviation}
        {isStillarbeit && (
          <span className="text-[10px] font-normal ml-1">Stillarbeit</span>
        )}
      </span>
      {/* Line 2: Teacher — hidden on mobile (base/sm), visible on md+ */}
      <span className={cn('text-xs leading-[1.3] truncate hidden sm:block', isCancelled && 'line-through opacity-60')}>
        {isSubstitution && originalValue ? (
          <>
            <span className="line-through opacity-50">{originalValue}</span>
            {newValue && <span className="ml-0.5 font-medium">{newValue}</span>}
          </>
        ) : (
          lesson.teacherSurname
        )}
      </span>
      {/* Line 3: Room — hidden on mobile (base/sm), visible on md+ */}
      <span className={cn('text-xs leading-[1.3] truncate hidden sm:block', isCancelled && 'line-through opacity-60')}>
        {lesson.roomName}
      </span>
    </div>
  );

  return (
    <div
      role="gridcell"
      aria-label={ariaLabel}
      tabIndex={editable ? 0 : -1}
      title={`${lesson.subjectName} - ${lesson.teacherSurname} - ${lesson.roomName}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className="h-full w-full min-h-[44px] sm:min-h-0"
    >
      {hasChange ? (
        <ChangeIndicator changeType={lesson.changeType ?? null}>
          {cellContent}
        </ChangeIndicator>
      ) : (
        cellContent
      )}
    </div>
  );
}
