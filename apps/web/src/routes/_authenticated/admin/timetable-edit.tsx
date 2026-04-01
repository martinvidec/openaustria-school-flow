import { useState, useCallback, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  DndContext,
  DragOverlay as DndKitDragOverlayRaw,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { DayWeekToggle } from '@/components/timetable/DayWeekToggle';
import { ABWeekTabs } from '@/components/timetable/ABWeekTabs';
import { PerspectiveSelector } from '@/components/timetable/PerspectiveSelector';
import { EditHistoryPanel } from '@/components/timetable/EditHistoryPanel';
import { DraggableLesson } from '@/components/dnd/DraggableLesson';
import { DroppableSlot } from '@/components/dnd/DroppableSlot';
import { DragOverlayComponent } from '@/components/dnd/DragOverlay';
import { ConstraintFeedback } from '@/components/dnd/ConstraintFeedback';

import {
  useTimetableView,
  useTeachers,
  useClasses,
  useRooms,
} from '@/hooks/useTimetable';
import { useMoveLesson } from '@/hooks/useTimetableEdit';
import { useDragConstraints } from '@/hooks/useDragConstraints';
import { useTimetableStore } from '@/stores/timetable-store';
import { useAuth } from '@/hooks/useAuth';
import { getSubjectColorWithOverride } from '@/lib/colors';
import type { TimetableViewLesson, SubjectColorPair } from '@schoolflow/shared';

export const Route = createFileRoute(
  '/_authenticated/admin/timetable-edit',
)({
  component: TimetableEditPage,
});

void DndKitDragOverlayRaw; // ensure import not tree-shaken

/**
 * Admin timetable editing page with DnD support.
 *
 * Structure:
 * - Page title "Stundenplan bearbeiten"
 * - PerspectiveSelector + DayWeekToggle + ABWeekTabs
 * - "Bearbeiten" / "Bearbeitung beenden" toggle
 * - TimetableGrid wrapped in DndContext (edit mode)
 * - EditHistoryPanel side panel (when not dragging)
 *
 * DnD behavior:
 * - PointerSensor with 8px activation distance
 * - KeyboardSensor for accessibility (Tab, Space, Arrows)
 * - onDragOver: debounced constraint validation via useDragConstraints
 * - onDragEnd: hard violations block drop, soft warnings allow with toast
 */
function TimetableEditPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin =
    roles.includes('admin') || roles.includes('schulleitung');

  // TODO: schoolId should come from user context or route params
  const schoolId = 'current-school-id';

  const {
    perspective,
    perspectiveId,
    perspectiveName,
    weekType,
    viewMode,
    editMode,
    selectedDay,
    setPerspective,
    setWeekType,
    setViewMode,
    setEditMode,
  } = useTimetableStore();

  // Perspective selector data
  const { data: teachers = [] } = useTeachers(isAdmin ? schoolId : undefined);
  const { data: classes = [] } = useClasses(isAdmin ? schoolId : undefined);
  const { data: roomsList = [] } = useRooms(isAdmin ? schoolId : undefined);

  // Timetable data
  const {
    data: timetableData,
    isLoading,
    isError,
  } = useTimetableView(schoolId, perspective, perspectiveId, weekType);

  // DnD hooks
  const moveLesson = useMoveLesson(schoolId);
  const { validationResult, validatingSlot, validateMove, clearValidation } =
    useDragConstraints(schoolId);

  // DnD state
  const [activeLesson, setActiveLesson] = useState<TimetableViewLesson | null>(
    null,
  );
  const [activeColor, setActiveColor] = useState<SubjectColorPair | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentOverSlot, setCurrentOverSlot] = useState<string | null>(null);
  const dragRef = useRef<{ lessonId: string } | null>(null);

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  // Track mouse position for constraint feedback tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // DnD event handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const lesson = active.data.current?.lesson as TimetableViewLesson | undefined;
    const color = active.data.current?.color as SubjectColorPair | undefined;

    if (lesson && color) {
      setActiveLesson(lesson);
      setActiveColor(color);
      dragRef.current = { lessonId: active.id as string };
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over || !dragRef.current) {
        setCurrentOverSlot(null);
        return;
      }

      const data = over.data.current;
      if (!data?.day || data?.period === undefined) return;

      const slotId = `${data.day}-${data.period}`;
      setCurrentOverSlot(slotId);

      // Call debounced constraint validation
      validateMove(
        dragRef.current.lessonId,
        data.day as string,
        data.period as number,
      );
    },
    [validateMove],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;
      setActiveLesson(null);
      setActiveColor(null);
      setCurrentOverSlot(null);
      dragRef.current = null;

      if (!over) {
        clearValidation();
        return;
      }

      const data = over.data.current;
      if (!data?.day || data?.period === undefined) {
        clearValidation();
        return;
      }

      const lessonId = event.active.id as string;
      const targetDay = data.day as string;
      const targetPeriod = data.period as number;

      // Check constraint validation result
      if (validationResult) {
        if (validationResult.hardViolations.length > 0) {
          // Hard violations block the drop
          toast.error(
            `Verschiebung nicht moeglich: ${validationResult.hardViolations[0].description}`,
          );
          clearValidation();
          return;
        }

        // Soft warnings: allow drop but show warning toast
        if (validationResult.softWarnings.length > 0) {
          moveLesson.mutate(
            { lessonId, targetDay, targetPeriod },
            {
              onSuccess: () => {
                toast.info(
                  `Stunde verschoben (Hinweis: ${validationResult.softWarnings[0].description})`,
                );
              },
            },
          );
        } else {
          // Valid move, no warnings
          moveLesson.mutate({ lessonId, targetDay, targetPeriod });
        }
      } else {
        // No validation result yet (edge case: very fast drop)
        // Proceed with move -- server will validate again
        moveLesson.mutate({ lessonId, targetDay, targetPeriod });
      }

      clearValidation();
    },
    [validationResult, moveLesson, clearValidation],
  );

  const handleDragCancel = useCallback(() => {
    setActiveLesson(null);
    setActiveColor(null);
    setCurrentOverSlot(null);
    dragRef.current = null;
    clearValidation();
  }, [clearValidation]);

  // Build lesson lookup for rendering DraggableLesson/DroppableSlot
  const lessonMap = new Map<string, TimetableViewLesson>();
  if (timetableData) {
    for (const lesson of timetableData.lessons) {
      lessonMap.set(`${lesson.dayOfWeek}-${lesson.periodNumber}`, lesson);
    }
  }

  return (
    <div className="space-y-6" onMouseMove={handleMouseMove}>
      {/* Page title */}
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.2]">
          Stundenplan bearbeiten
        </h1>

        {/* Edit mode toggle */}
        <Button
          variant={editMode ? 'destructive' : 'default'}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? 'Bearbeitung beenden' : 'Bearbeiten'}
        </Button>
      </div>

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-4">
        <PerspectiveSelector
          role={isAdmin ? 'admin' : 'lehrer'}
          teachers={teachers}
          classes={classes}
          rooms={roomsList}
          selected={{
            perspective,
            id: perspectiveId ?? '',
            name: perspectiveName,
          }}
          onSelect={setPerspective}
        />

        <DayWeekToggle value={viewMode} onChange={setViewMode} />

        <ABWeekTabs
          weekType={weekType}
          onChange={setWeekType}
          isABMode={timetableData?.abWeekEnabled ?? false}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-muted-foreground">
                Stundenplan wird geladen...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive text-center">
              Stundenplan konnte nicht geladen werden. Bitte versuchen Sie es
              spaeter erneut.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && (!timetableData || timetableData.lessons.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Kein Stundenplan vorhanden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Es wurde noch kein Stundenplan generiert. Starten Sie die
              automatische Erstellung unter Verwaltung.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timetable grid with DnD */}
      {timetableData && timetableData.lessons.length > 0 && (
        <div className="flex gap-6">
          {/* Main grid area */}
          <div className="flex-1 min-w-0">
            {editMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <TimetableGrid
                  periods={timetableData.periods}
                  days={timetableData.activeDays}
                  lessons={timetableData.lessons}
                  subjectColors={getSubjectColorWithOverride}
                  showBreaks
                  viewMode={viewMode}
                  selectedDay={selectedDay ?? undefined}
                  editable
                  onCellClick={undefined}
                  renderCell={(lesson, color) => (
                    <DraggableLesson
                      lessonId={lesson.id}
                      lesson={lesson}
                      color={color}
                    />
                  )}
                  renderEmptySlot={(day, period) => {
                    const slotKey = `${day}-${period}`;
                    const isBreakSlot = timetableData.periods.find(
                      (p) => p.periodNumber === period,
                    )?.isBreak;
                    // Break rows are never valid drop targets
                    if (isBreakSlot) return null;
                    return (
                      <DroppableSlot
                        day={day}
                        period={period}
                        validationState={
                          validatingSlot === slotKey
                            ? validationResult
                            : null
                        }
                        isValidating={validatingSlot === slotKey && !validationResult}
                        isOver={currentOverSlot === slotKey}
                      />
                    );
                  }}
                />

                {/* Drag overlay (ghost preview) */}
                <DragOverlayComponent
                  lesson={activeLesson}
                  color={activeColor}
                />

                {/* Constraint feedback tooltip */}
                {activeLesson &&
                  validationResult &&
                  (validationResult.hardViolations.length > 0 ||
                    validationResult.softWarnings.length > 0) && (
                    <ConstraintFeedback
                      violations={validationResult.hardViolations}
                      warnings={validationResult.softWarnings}
                      position={mousePos}
                    />
                  )}
              </DndContext>
            ) : (
              <TimetableGrid
                periods={timetableData.periods}
                days={timetableData.activeDays}
                lessons={timetableData.lessons}
                subjectColors={getSubjectColorWithOverride}
                showBreaks
                viewMode={viewMode}
                selectedDay={selectedDay ?? undefined}
                editable={false}
                onCellClick={undefined}
              />
            )}
          </div>

          {/* Edit history side panel (desktop only, hidden during drag) */}
          {timetableData.runId && !activeLesson && (
            <div className="hidden lg:block w-80 shrink-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aenderungsverlauf</CardTitle>
                </CardHeader>
                <CardContent>
                  <EditHistoryPanel
                    schoolId={schoolId}
                    runId={timetableData.runId}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
