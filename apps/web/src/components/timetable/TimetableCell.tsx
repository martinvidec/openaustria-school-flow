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

  const cellContent = (
    <div
      className={cn(
        'flex flex-col justify-center px-1.5 py-1 h-full w-full rounded-sm overflow-hidden',
        editable && 'cursor-grab hover:ring-2 hover:ring-primary/30',
        lesson.changeType === 'cancelled' && 'line-through',
      )}
      style={{
        backgroundColor: lesson.changeType ? undefined : color.bg,
        color: lesson.changeType ? undefined : color.text,
      }}
    >
      {/* Line 1: Subject abbreviation */}
      <span className="text-sm font-semibold leading-[1.2] truncate">
        {lesson.subjectAbbreviation}
      </span>
      {/* Line 2: Teacher surname */}
      <span className="text-xs leading-[1.3] truncate">
        {lesson.teacherSurname}
      </span>
      {/* Line 3: Room name */}
      <span className="text-xs leading-[1.3] truncate">
        {lesson.roomName}
      </span>
    </div>
  );

  return (
    <div
      role="gridcell"
      aria-label={ariaLabel}
      tabIndex={editable ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className="h-full w-full"
    >
      {lesson.changeType ? (
        <ChangeIndicator
          changeType={lesson.changeType}
          originalValue={originalValue}
          newValue={newValue}
        >
          {cellContent}
        </ChangeIndicator>
      ) : (
        cellContent
      )}
    </div>
  );
}
