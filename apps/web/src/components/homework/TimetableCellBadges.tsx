import type { HomeworkDto, ExamDto } from '@schoolflow/shared';
import { HomeworkBadge } from './HomeworkBadge';
import { ExamBadge } from './ExamBadge';

interface TimetableCellBadgesProps {
  children: React.ReactNode;
  homework?: HomeworkDto;
  exam?: ExamDto;
  onHomeworkClick?: () => void;
  onExamClick?: () => void;
}

/**
 * Wrapper component that positions HomeworkBadge and ExamBadge in the
 * top-right corner of a TimetableCell. Absolute positioning within cell.
 *
 * Per UI-SPEC D-04:
 * - Badge container: flex, gap-1 (4px), positioned top-1 right-1 absolute
 * - HomeworkBadge leftmost, ExamBadge rightmost when both present
 * - Does not alter the cell's subject color background
 * - No modification to TimetableGrid or TimetableCell themselves
 */
export function TimetableCellBadges({
  children,
  homework,
  exam,
  onHomeworkClick,
  onExamClick,
}: TimetableCellBadgesProps) {
  const hasBadges = !!homework || !!exam;

  return (
    <div className="relative h-full w-full">
      {children}
      {hasBadges && (
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          {homework && (
            <HomeworkBadge homework={homework} onClick={onHomeworkClick} />
          )}
          {exam && <ExamBadge exam={exam} onClick={onExamClick} />}
        </div>
      )}
    </div>
  );
}
