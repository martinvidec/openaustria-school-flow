---
status: diagnosed
trigger: "Investigate drag-and-drop constraint validation blocker on timetable edit page"
created: 2026-04-02T00:00:00Z
updated: 2026-04-02T00:30:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED -- 3 distinct root causes identified for 4 DnD symptoms
test: Code trace complete across all DnD files
expecting: n/a
next_action: Return diagnosis

## Symptoms

expected: |
  1. Green/yellow/red overlay feedback on drag-over cells based on constraint validation
  2. Highlighted cell matches mouse cursor position
  3. Drop on green (valid) cells successfully moves the lesson
  4. Lessons can be moved to empty slots

actual: |
  1. Only green overlay shows - no yellow/red feedback
  2. Highlighted cell does NOT correspond to mouse position (wrong cell)
  3. Snap-back happens ALWAYS even on green cells
  4. Lessons cannot be moved to empty slots at all

errors: |
  - Known issue from earlier UAT: Frontend sends targetDayOfWeek/targetPeriodNumber but DTO expects targetDay/targetPeriod (FIXED in plan 11)
  - Known issue from earlier UAT: DTO uses @IsUUID() but seed IDs are not UUIDs (FIXED in plan 11)
  - NEW: forbidNonWhitelisted rejects move request because body contains lessonId not in MoveLessonDto
  - NEW: closestCenter collision detection picks wrong droppable in sparse grid

reproduction: Drag a lesson on the timetable edit page and try to drop on an empty cell
started: Since DnD implementation (phase 04)

## Eliminated

- hypothesis: "DTO field name mismatch (targetDayOfWeek vs targetDay)"
  evidence: Plan 11 fixed the naming. Current code in useDragConstraints.ts and timetable-edit.tsx correctly uses targetDay/targetPeriod matching ValidateMoveDto and MoveLessonDto.
  timestamp: 2026-04-02T00:10:00Z

- hypothesis: "@IsUUID() validation rejecting seed IDs"
  evidence: Plan 11 replaced @IsUUID with @IsString + @IsNotEmpty. Current DTOs no longer use @IsUUID for lessonId.
  timestamp: 2026-04-02T00:10:00Z

## Evidence

- timestamp: 2026-04-02T00:05:00Z
  checked: apps/api/src/main.ts line 21 + timetable.controller.ts line 46
  found: Global prefix is 'api/v1', controller path is 'api/v1/schools/:schoolId/timetable'. Actual route becomes api/v1/api/v1/schools/:schoolId/timetable/*. Vite proxy rewrites /api/v1/schools/{id}/(timetable|rooms|...) to prepend /api/v1, making requests hit the double-prefix route. This works in dev but is a latent production bug.
  implication: Routes work in dev via Vite proxy rewrite hack. Not a direct cause of the 4 symptoms.

- timestamp: 2026-04-02T00:10:00Z
  checked: apps/api/src/common/pipes/validation.pipe.ts
  found: ValidationPipe uses forbidNonWhitelisted: true. Any extra properties in request body cause 422 rejection.
  implication: This is ROOT CAUSE 1 for symptoms 3 and 4.

- timestamp: 2026-04-02T00:12:00Z
  checked: apps/web/src/hooks/useTimetableEdit.ts lines 19-23
  found: useMoveLesson sends dto body as JSON.stringify(dto) where dto is MoveLessonRequest = { lessonId, targetDay, targetPeriod, targetRoomId? }. The lessonId is ALSO in the URL path. But MoveLessonDto only defines { targetDay, targetPeriod, targetRoomId? } -- it does NOT have a lessonId property.
  implication: With forbidNonWhitelisted: true, the extra lessonId in body causes 422. EVERY move request fails.

- timestamp: 2026-04-02T00:15:00Z
  checked: timetable-edit.tsx line 331 -- collisionDetection={closestCenter}
  found: closestCenter picks the droppable whose CENTER is closest to the draggable's current center. DroppableSlots only exist for EMPTY cells. When the pointer is over an occupied cell (DraggableLesson, not a drop target), closestCenter picks the nearest empty cell by geometric center distance, which may be cells away from the mouse.
  implication: This is ROOT CAUSE 2 for symptom 2 (wrong cell highlighted).

- timestamp: 2026-04-02T00:18:00Z
  checked: DraggableLesson.tsx line 45 -- CSS.Translate.toString(transform)
  found: DraggableLesson applies CSS transform from useDraggable even though DragOverlay is used. This causes the ORIGINAL cell to visually move with the drag, which moves its bounding box. closestCenter uses bounding boxes for collision, so the moved original cell further confuses which droppable is "closest".
  implication: Exacerbates ROOT CAUSE 2. Standard @dnd-kit pattern with DragOverlay is to NOT apply transform to the original element (it stays in place with reduced opacity).

- timestamp: 2026-04-02T00:20:00Z
  checked: DroppableSlot.tsx lines 43-54 (validation state rendering logic)
  found: Yellow/red feedback requires validationState with hardViolations.length > 0 or softWarnings.length > 0. The validate-move endpoint works correctly (returns violations for clashes). But because closestCenter often picks the wrong cell AND the 200ms debounce means validation arrives for a different slot than the one currently "over", the yellow/red states rarely display correctly.
  implication: Symptom 1 (only green shows) is a consequence of ROOT CAUSE 2 (wrong cell targeted) and the debounce timing mismatch. When the right cell IS targeted, green shows because empty cells with no conflicts ARE valid.

- timestamp: 2026-04-02T00:22:00Z
  checked: useDragConstraints.ts error handling (lines 39-61)
  found: Plan 11 correctly added res.ok check and fallback MoveValidation on error. The validate-move endpoint works. But useMoveLesson (the actual MOVE) has separate error handling that catches the 422 but shows a generic error toast "Move failed" and the lesson snaps back.
  implication: The user sees snap-back because the move mutation fails with 422 due to the extra lessonId in body.

## Resolution

root_cause: |
  THREE ROOT CAUSES for four symptoms:

  ROOT CAUSE 1 (symptoms 3, 4 -- snap-back always, cannot move lessons):
  useMoveLesson sends { lessonId, targetDay, targetPeriod } in the request BODY, but MoveLessonDto only defines { targetDay, targetPeriod, targetRoomId? }. The lessonId is already in the URL path (/lessons/:lessonId/move). The global ValidationPipe has forbidNonWhitelisted: true, so the extra lessonId property in the body causes an AUTOMATIC 422 rejection of EVERY move request.
  File: apps/web/src/hooks/useTimetableEdit.ts line 20-22

  ROOT CAUSE 2 (symptom 2 -- wrong cell highlighted):
  DndContext uses closestCenter collision detection, which picks the droppable with the nearest geometric center. Since only EMPTY cells are droppable (occupied cells are DraggableLesson only), closestCenter selects whichever empty cell is nearest -- often not the one under the mouse. Additionally, DraggableLesson incorrectly applies CSS.Translate transform to the original element (standard @dnd-kit pattern with DragOverlay is to leave the original in place), which shifts its bounding box and further confuses closestCenter.
  Files: apps/web/src/routes/_authenticated/admin/timetable-edit.tsx line 331, apps/web/src/components/dnd/DraggableLesson.tsx line 45

  ROOT CAUSE 3 (symptom 1 -- only green feedback, no yellow/red):
  This is a CONSEQUENCE of Root Cause 2. Because closestCenter targets the wrong cell, the validate-move call validates the wrong slot. Even when it validates the correct slot, empty cells with no teacher/room/class conflicts are legitimately valid (green). Yellow/red would only show if there's a conflict at the target, but the wrong target is being validated. Additionally, the debounce timing (200ms) means the validation result often arrives for a previously-hovered cell rather than the current one.
  Files: apps/web/src/hooks/useDragConstraints.ts (debounce logic), apps/web/src/components/dnd/DroppableSlot.tsx (validation state rendering)

fix: |
  FIX 1: In useTimetableEdit.ts, strip lessonId from the body before sending (it's already in the URL):
    body: JSON.stringify({ targetDay: dto.targetDay, targetPeriod: dto.targetPeriod, targetRoomId: dto.targetRoomId })

  FIX 2: In timetable-edit.tsx, change collisionDetection from closestCenter to pointerWithin (from @dnd-kit/core).
    pointerWithin detects which droppable the pointer is actually inside, giving correct cell targeting.

  FIX 3: In DraggableLesson.tsx, remove the CSS.Translate transform when DragOverlay is used:
    transform: undefined (or only apply opacity reduction). The DragOverlay handles the visual preview.

  LATENT BUG (not causing current symptoms but will break production):
  The double api/v1 prefix in controller paths requires the Vite proxy rewrite hack. In production (no Vite proxy), all Phase 3/4 routes will 404.

verification:
files_changed: []
