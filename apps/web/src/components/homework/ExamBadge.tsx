import { ClipboardList } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ExamDto } from '@schoolflow/shared';

interface ExamBadgeProps {
  exam: ExamDto;
  onClick?: () => void;
}

/**
 * 16x16px ClipboardList icon badge overlay for timetable cells.
 * Warning color fill (hsl(38 92% 50%)) for urgency differentiation.
 * On click: opens Popover showing exam title, date, subject.
 *
 * Per UI-SPEC D-04, HW-02:
 * - Badge is 16x16 Lucide icon
 * - aria-label="Pruefung: {title}"
 */
export function ExamBadge({ exam, onClick }: ExamBadgeProps) {
  const examDate = new Date(exam.date).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-center"
          aria-label={`Pruefung: ${exam.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <ClipboardList className="h-4 w-4" style={{ color: 'hsl(38 92% 50%)' }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold leading-[1.4]">
            {exam.title}
          </p>
          <p className="text-xs text-muted-foreground leading-[1.3]">
            Datum: {examDate}
          </p>
          {exam.subjectName && (
            <p className="text-xs text-muted-foreground leading-[1.3]">
              Fach: {exam.subjectName}
            </p>
          )}
          {exam.duration && (
            <p className="text-xs text-muted-foreground leading-[1.3]">
              Dauer: {exam.duration} Minuten
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
