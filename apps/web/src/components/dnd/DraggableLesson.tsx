import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { TimetableCell } from '@/components/timetable/TimetableCell';
import type { TimetableViewLesson, SubjectColorPair } from '@schoolflow/shared';

interface DraggableLessonProps {
  /** Unique lesson identifier used as draggable ID */
  lessonId: string;
  /** Lesson data passed through DnD context */
  lesson: TimetableViewLesson;
  /** Subject color pair for the cell */
  color: SubjectColorPair;
  /** Whether dragging is disabled (e.g. edit mode off) */
  disabled?: boolean;
}

/**
 * Wraps TimetableCell with @dnd-kit useDraggable behavior.
 * When dragging, the original position shows a 2px dashed blue outline
 * (per UI-SPEC DnD current position indicator).
 *
 * The lesson data is passed via the `data` property so DndContext
 * event handlers can access it in onDragStart/onDragEnd.
 */
export function DraggableLesson({
  lessonId,
  lesson,
  color,
  disabled = false,
}: DraggableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: lessonId,
    data: { lesson, color },
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'h-full w-full',
        isDragging && 'border-2 border-dashed rounded-sm',
      )}
      {...attributes}
      {...listeners}
    >
      {/* Blue dashed outline via inline style for exact hsl value */}
      {isDragging && (
        <style>{`
          [data-dragging-source="${lessonId}"] {
            border-color: hsl(221 83% 53%);
            background: hsl(221 83% 53% / 0.1);
          }
        `}</style>
      )}
      <div data-dragging-source={isDragging ? lessonId : undefined}>
        <TimetableCell
          lesson={lesson}
          color={color}
          editable={!disabled}
        />
      </div>
    </div>
  );
}
