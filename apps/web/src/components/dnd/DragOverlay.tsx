import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import type { TimetableViewLesson, SubjectColorPair } from '@schoolflow/shared';

interface DragOverlayProps {
  /** Active lesson being dragged (null when not dragging) */
  lesson: TimetableViewLesson | null;
  /** Subject color pair for the lesson (null when not dragging) */
  color: SubjectColorPair | null;
}

/**
 * Ghost preview following the cursor during drag.
 * Uses @dnd-kit's DragOverlay component for portal rendering.
 *
 * Renders a TimetableCell-like preview with:
 * - Slight shadow for depth
 * - Scale transform (1.02) for lifted appearance
 * - Subject color background
 *
 * Respects `prefers-reduced-motion` per accessibility contract:
 * instant transitions when reduced motion is enabled.
 */
export function DragOverlayComponent({ lesson, color }: DragOverlayProps) {
  return (
    <DndKitDragOverlay
      dropAnimation={null}
      className="drag-overlay-reduced-motion"
    >
      {lesson && color ? (
        <div
          className="flex flex-col justify-center px-1.5 py-1 rounded-sm overflow-hidden shadow-lg"
          style={{
            backgroundColor: color.bg,
            color: color.text,
            width: '120px',
            minHeight: '56px',
            transform: 'scale(1.02)',
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
      ) : null}
    </DndKitDragOverlay>
  );
}

/**
 * CSS for reduced motion preference.
 * Import this in the global stylesheet or include inline:
 *
 * @media (prefers-reduced-motion: reduce) {
 *   .drag-overlay-reduced-motion * {
 *     transition: none !important;
 *     animation: none !important;
 *   }
 * }
 */
