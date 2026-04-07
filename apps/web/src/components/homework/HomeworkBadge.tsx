import { BookOpen } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { HomeworkDto } from '@schoolflow/shared';

interface HomeworkBadgeProps {
  homework: HomeworkDto;
  onClick?: () => void;
}

/**
 * 16x16px BookOpen icon badge overlay for timetable cells.
 * Primary color fill (hsl(221 83% 53%) via text-primary class).
 * On click: opens Popover showing homework title, description excerpt, due date.
 *
 * Per UI-SPEC D-04, HW-01:
 * - Badge is 16x16 Lucide icon
 * - aria-label="Hausaufgabe: {title}"
 */
export function HomeworkBadge({ homework, onClick }: HomeworkBadgeProps) {
  const dueDate = new Date(homework.dueDate).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Truncate description to 2-line excerpt (~100 chars)
  const descriptionExcerpt = homework.description
    ? homework.description.length > 100
      ? homework.description.slice(0, 100) + '...'
      : homework.description
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-center"
          aria-label={`Hausaufgabe: ${homework.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <BookOpen className="h-4 w-4 text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold leading-[1.4]">
            {homework.title}
          </p>
          {descriptionExcerpt && (
            <p className="text-xs text-muted-foreground leading-[1.3] line-clamp-2">
              {descriptionExcerpt}
            </p>
          )}
          <p className="text-xs text-muted-foreground leading-[1.3]">
            Faellig am: {dueDate}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
