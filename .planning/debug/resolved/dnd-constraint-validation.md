---
status: resolved
trigger: "Investigate drag-and-drop constraint validation blocker on timetable edit page"
created: 2026-04-02T00:00:00Z
updated: 2026-04-25T21:30:00Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: All three root causes were already remediated by commit de9ee2b (fix(04-13)) on 2026-04-02 -- the same day the diagnosis was written. Re-verification on 2026-04-25 confirmed the fixed-state code matches the proposed fixes exactly.
test: Re-read the five cited files in the current Phase 14 codebase; cross-checked DTO + ValidationPipe + frontend body construction + collisionDetection + DraggableLesson transform; ran web typecheck (clean) and web unit tests (93 pass, 66 todo, 14 skipped suites).
expecting: n/a -- no edits required, status moves to resolved
next_action: archive session, update knowledge base, surface E2E coverage gap

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

- hypothesis: "ROOT CAUSE 1 still applies in current codebase (lessonId in PATCH body)"
  evidence: Re-verified 2026-04-25 -- apps/web/src/hooks/useTimetableEdit.ts line 20 destructures `const { lessonId, ...moveBody } = dto;` and sends `JSON.stringify(moveBody)`. The lessonId is no longer in the body. ValidationPipe still has `forbidNonWhitelisted: true` (apps/api/src/common/pipes/validation.pipe.ts line 6) and MoveLessonDto still excludes lessonId, but the frontend correctly strips it. Already fixed by commit de9ee2b "fix(04-13): fix drag-and-drop lesson moves" on 2026-04-02 13:35.
  timestamp: 2026-04-25T21:25:00Z

- hypothesis: "ROOT CAUSE 2 still applies in current codebase (closestCenter collision detection)"
  evidence: Re-verified 2026-04-25 -- apps/web/src/routes/_authenticated/admin/timetable-edit.tsx line 10 imports `pointerWithin` (not `closestCenter`), and line 331 sets `collisionDetection={pointerWithin}`. Already fixed by commit de9ee2b on 2026-04-02 13:35.
  timestamp: 2026-04-25T21:25:00Z

- hypothesis: "ROOT CAUSE 2 (transform shifting bbox of original cell) still applies in current codebase"
  evidence: Re-verified 2026-04-25 -- apps/web/src/components/dnd/DraggableLesson.tsx lines 42-44 only sets `style: { opacity: isDragging ? 0.5 : 1 }`. CSS.Translate.toString(transform) is no longer applied to the original element; DragOverlay (DragOverlayComponent) handles the visual preview. Already fixed by commit de9ee2b on 2026-04-02 13:35.
  timestamp: 2026-04-25T21:25:00Z

- hypothesis: "ROOT CAUSE 3 (only green feedback) is still observable"
  evidence: Symptom 1 was diagnosed as a consequence of ROOT CAUSE 2. With pointerWithin in place and DraggableLesson no longer shifting its bbox, the validate-move call now targets the correct slot, so yellow/red can render correctly when conflicts exist. The DroppableSlot rendering logic (lines 43-54) and useDragConstraints debounce (200ms, line 62) are unchanged but no longer pathological because the targeted cell is correct.
  timestamp: 2026-04-25T21:25:00Z

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

- timestamp: 2026-04-25T21:20:00Z
  checked: git log -- apps/web/src/hooks/useTimetableEdit.ts apps/web/src/routes/_authenticated/admin/timetable-edit.tsx apps/web/src/components/dnd/DraggableLesson.tsx
  found: Commit de9ee2b "fix(04-13): fix drag-and-drop lesson moves (lessonId in body, collision detection, CSS transform)" landed 2026-04-02 13:35:39 +0200. Body says exactly the three fixes proposed by this diagnosis: "Exclude lessonId from PATCH body to prevent 422 (forbidNonWhitelisted); Replace closestCenter with pointerWithin for pointer-accurate collision detection; Remove CSS.Translate transform from DraggableLesson to fix collision geometry."
  implication: All three root causes were remediated the same day the diagnosis was written. The debug file was simply not updated to reflect this. No further code changes required.

- timestamp: 2026-04-25T21:25:00Z
  checked: apps/web/src/hooks/useTimetableEdit.ts (current), apps/web/src/routes/_authenticated/admin/timetable-edit.tsx (current), apps/web/src/components/dnd/DraggableLesson.tsx (current), apps/api/src/modules/timetable/dto/move-lesson.dto.ts, apps/api/src/common/pipes/validation.pipe.ts
  found: Phase 14 codebase still in fixed state. useTimetableEdit destructures lessonId out of body (line 20). timetable-edit imports `pointerWithin` (line 10) and uses it for collisionDetection (line 331). DraggableLesson only applies opacity to original element (lines 42-44). MoveLessonDto excludes lessonId field. ValidationPipe still has forbidNonWhitelisted: true (which is correct -- the frontend handles it correctly now).
  implication: Fixed state is consistent; no regression across the 13 phases since the fix shipped.

- timestamp: 2026-04-25T21:28:00Z
  checked: pnpm --filter @schoolflow/web exec tsc --noEmit; pnpm --filter @schoolflow/web exec vitest run
  found: Typecheck clean (no errors). Unit tests: 93 passed, 66 todo, 14 skipped suites, 0 failed.
  implication: Web package builds and tests pass; the fixed state is healthy.

- timestamp: 2026-04-25T21:29:00Z
  checked: apps/web/e2e/ for DnD/timetable-edit specs
  found: No Playwright spec covers timetable-edit DnD or constraint validation. Existing specs cover admin CRUD, solver tuning, rooms booking, students, etc., but not the DnD flow this debug session diagnosed.
  implication: There is no automated regression guard for these fixes. Per user E2E-first directive (memory: feedback_e2e_first_no_uat), this is a coverage gap to address in a follow-up plan task. Not blocking resolution because the fix has been in production code for 23 days across 13 phases without regression complaints.

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
  Consequence of Root Cause 2. Because closestCenter targets the wrong cell, the validate-move call validates the wrong slot. Even when it validates the correct slot, empty cells with no teacher/room/class conflicts are legitimately valid (green). Yellow/red would only show if there is a conflict at the target, but the wrong target was being validated. Additionally, the debounce timing (200ms) means the validation result often arrives for a previously-hovered cell rather than the current one.
  Files: apps/web/src/hooks/useDragConstraints.ts (debounce logic), apps/web/src/components/dnd/DroppableSlot.tsx (validation state rendering)

fix: |
  All three fixes were applied by commit de9ee2b "fix(04-13): fix drag-and-drop lesson moves (lessonId in body, collision detection, CSS transform)" on 2026-04-02 13:35:39 +0200 -- the same day this diagnosis was written. The debug file was not updated at the time.

  FIX 1 (applied): apps/web/src/hooks/useTimetableEdit.ts line 20
    `const { lessonId, ...moveBody } = dto;`
    `body: JSON.stringify(moveBody)` -- strips lessonId from the body (it stays in the URL path).

  FIX 2 (applied): apps/web/src/routes/_authenticated/admin/timetable-edit.tsx line 10 + 331
    Imported `pointerWithin` from @dnd-kit/core; set `collisionDetection={pointerWithin}` on DndContext.

  FIX 3 (applied): apps/web/src/components/dnd/DraggableLesson.tsx lines 42-44
    Removed the CSS.Translate transform; only `opacity: isDragging ? 0.5 : 1` is set on the original element. DragOverlayComponent handles the visual preview.

  Re-verification on 2026-04-25 (Phase 14, ~77% of v1.1):
  - Read all five cited files in current state -- all match the proposed fixes
  - DTO + ValidationPipe checked: forbidNonWhitelisted is still true, MoveLessonDto still excludes lessonId, frontend correctly strips lessonId
  - `pnpm --filter @schoolflow/web exec tsc --noEmit` -- clean
  - `pnpm --filter @schoolflow/web exec vitest run` -- 93 pass, 66 todo, 14 skipped suites, 0 failed
  - No regression across 13 phases since the fix shipped

  COVERAGE GAP (not blocking, follow-up):
  apps/web/e2e/ has no spec for timetable-edit DnD or constraint validation. Per user E2E-first directive, this should be addressed in a future plan task.

  LATENT BUG (separate issue, not part of this debug session):
  The double api/v1 prefix in some controller paths requires the Vite proxy rewrite hack. In production (no Vite proxy), affected routes would 404. See memory: project_double_prefix_bug for status.

verification: |
  Re-verified 2026-04-25T21:25:00Z against current Phase 14 code.

  - Code-level: All three proposed fixes are present in their cited files (file paths unchanged; line numbers stable). Fixed state is internally consistent (frontend body matches DTO whitelist; collisionDetection uses pointerWithin; DraggableLesson does not shift bbox).
  - Build: pnpm --filter @schoolflow/web exec tsc --noEmit -- exit 0, no diagnostics.
  - Unit tests: pnpm --filter @schoolflow/web exec vitest run -- 19 test files passed, 14 skipped, 93 tests passed, 66 todo. 0 failed.
  - History: 23 days and 13 phases since commit de9ee2b without regression reports for these symptoms.
  - E2E: No Playwright coverage exists for the DnD flow -- documented as follow-up coverage gap.

files_changed:
  - apps/web/src/hooks/useTimetableEdit.ts (FIX 1, applied 2026-04-02 in commit de9ee2b)
  - apps/web/src/routes/_authenticated/admin/timetable-edit.tsx (FIX 2, applied 2026-04-02 in commit de9ee2b)
  - apps/web/src/components/dnd/DraggableLesson.tsx (FIX 3, applied 2026-04-02 in commit de9ee2b)
