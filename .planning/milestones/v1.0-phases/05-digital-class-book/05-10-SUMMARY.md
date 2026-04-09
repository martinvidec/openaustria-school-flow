---
plan: "05-10"
phase: "05-digital-class-book"
status: complete
started: 2026-04-04
completed: 2026-04-04
---

## Summary

Wired Noten and Notizen tabs to real GradeMatrix and StudentNoteList components (replacing placeholder text from Plan 07), applied responsive polish across all classbook components, and performed human UAT verification across desktop/tablet/mobile viewports.

## UAT Fixes Applied

During human verification, the following issues were discovered and fixed:

1. **Double API prefix** — 5 controllers had `api/v1/` in decorator + global prefix = broken routes
2. **Shared package CJS→ESM** — Vite couldn't resolve named exports from CJS output
3. **Timetable used Keycloak UUID as perspectiveId** — Added teacherId to school context store
4. **Attendance empty on first open** — Auto-initialize PRESENT records for all class students
5. **Student notes list empty** — Get student list from attendance records instead of existing notes
6. **DELETE hooks crash on 204** — Removed res.json() on No Content responses (notes + grades)
7. **Parent excuse form missing children** — Added children[] to /users/me, replaced missing /my-children endpoint
8. **Mobile nav missing items** — Added Entschuldigungen and Abwesenheit to MobileSidebar
9. **Tables not scrollable on mobile** — Added scroll containers to TimetableGrid, fixed AttendanceGrid overflow

## Key Files

### Created
- (none — this plan modified existing files only)

### Modified
- `apps/api/src/modules/user-context/user-context.controller.ts` — removed api/v1 prefix
- `apps/api/src/modules/room/room.controller.ts` — removed api/v1 prefix
- `apps/api/src/modules/timetable/timetable.controller.ts` — removed api/v1 prefix
- `apps/api/src/modules/timetable/constraint-template.controller.ts` — removed api/v1 prefix
- `apps/api/src/modules/resource/resource.controller.ts` — removed api/v1 prefix
- `apps/api/src/modules/timetable/dto/timetable-view.dto.ts` — IsUUID→IsString
- `packages/shared/package.json` — type: module, exports field
- `packages/shared/tsconfig.json` — ESNext module output
- `apps/web/src/stores/school-context-store.ts` — added teacherId
- `apps/web/src/routes/_authenticated/timetable/index.tsx` — use teacherId for perspective
- `apps/api/src/modules/user-context/user-context.service.ts` — children[] for parents
- `apps/api/src/modules/user-context/dto/user-context.dto.ts` — children DTO field
- `apps/api/src/modules/classbook/attendance.service.ts` — auto-init attendance records
- `apps/web/src/components/classbook/StudentNoteList.tsx` — student list from attendance
- `apps/web/src/hooks/useClassbook.ts` — fix DELETE res.json()
- `apps/web/src/hooks/useGrades.ts` — fix DELETE res.json()
- `apps/web/src/routes/_authenticated/excuses/index.tsx` — use useUserContext for children
- `apps/web/src/components/layout/MobileSidebar.tsx` — added nav items
- `apps/web/src/components/timetable/TimetableGrid.tsx` — scroll container
- `apps/web/src/components/classbook/AttendanceGrid.tsx` — overflow-x-auto

## Self-Check: PASSED
