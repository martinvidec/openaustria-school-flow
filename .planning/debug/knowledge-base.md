# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## dnd-constraint-validation — Drag-and-drop on timetable edit page snapped back, wrong cell highlighted, no yellow/red feedback
- **Date:** 2026-04-25
- **Error patterns:** drag, drop, dnd, snap-back, snap back, lessonId, MoveLessonDto, forbidNonWhitelisted, 422, ValidationPipe, closestCenter, pointerWithin, collisionDetection, DraggableLesson, CSS.Translate, transform, DragOverlay, validate-move, hardViolations, softWarnings, timetable-edit, useMoveLesson, useDragConstraints
- **Root cause:** Three concurrent root causes: (1) `useMoveLesson` sent `lessonId` in PATCH body, but `MoveLessonDto` whitelist excludes it and `ValidationPipe` has `forbidNonWhitelisted: true` → automatic 422 on every move; (2) `DndContext` used `closestCenter` collision detection, which selected the geometrically-nearest empty droppable instead of the cell under the pointer; (3) `DraggableLesson` applied `CSS.Translate.toString(transform)` to the original element while a `DragOverlay` was also active, shifting its bbox and worsening collision targeting.
- **Fix:** (1) Destructure `const { lessonId, ...moveBody } = dto;` and send `JSON.stringify(moveBody)` so `lessonId` stays in the URL only; (2) Switch `collisionDetection` from `closestCenter` to `pointerWithin`; (3) Remove the CSS transform from the original `DraggableLesson` and only set `opacity` (let `DragOverlay` handle the visual preview). All three fixes shipped together in commit `de9ee2b` "fix(04-13): fix drag-and-drop lesson moves".
- **Files changed:** apps/web/src/hooks/useTimetableEdit.ts, apps/web/src/routes/_authenticated/admin/timetable-edit.tsx, apps/web/src/components/dnd/DraggableLesson.tsx
---
