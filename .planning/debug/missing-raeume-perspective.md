---
status: diagnosed
trigger: "Investigate why the admin perspective selector dropdown is missing Raeume as a group option"
created: 2026-04-02T00:00:00Z
updated: 2026-04-02T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED - useRooms hook does not unwrap paginated response, returns {data, meta} object instead of array
test: Compared useRooms with useTeachers/useClasses which both do `json.data ?? json`
expecting: useRooms returns non-array -> rooms.length is undefined (falsy) -> PerspectiveSelector skips rendering Raeume group
next_action: Return diagnosis

## Symptoms

expected: Admin/Schulleitung sees 3 groups in perspective selector dropdown - Lehrer, Klassen, Raeume
actual: Only Lehrer and Klassen groups appear, Raeume is missing
errors: No error messages - feature simply not showing
reproduction: Log in as admin, open perspective selector dropdown
started: Unknown

## Eliminated

- hypothesis: PerspectiveSelector component missing rooms rendering logic
  evidence: Component at PerspectiveSelector.tsx lines 115-128 correctly renders Raeume group when rooms.length > 0
  timestamp: 2026-04-02T00:00:30Z

- hypothesis: Rooms not passed to PerspectiveSelector from parent pages
  evidence: Both timetable/index.tsx (line 104, 127) and admin/timetable-edit.tsx (line 92, 264) correctly call useRooms and pass roomsList to PerspectiveSelector
  timestamp: 2026-04-02T00:00:35Z

- hypothesis: Backend room controller missing GET endpoint
  evidence: room.controller.ts line 48-57 has GET endpoint at api/v1/schools/:schoolId/rooms that calls roomService.findAll()
  timestamp: 2026-04-02T00:00:40Z

## Evidence

- timestamp: 2026-04-02T00:00:30Z
  checked: PerspectiveSelector.tsx component rendering logic
  found: Component correctly renders Raeume group at lines 119-128 when rooms.length > 0. The rooms prop is typed as EntityOption[] and used identically to teachers and classes.
  implication: Problem is not in the component itself

- timestamp: 2026-04-02T00:00:35Z
  checked: Parent pages that use PerspectiveSelector (timetable/index.tsx, admin/timetable-edit.tsx)
  found: Both pages call useRooms(isAdmin ? schoolId : undefined) and pass the result as rooms prop. Pattern is identical to useTeachers and useClasses.
  implication: Problem is in the useRooms hook or the API response format

- timestamp: 2026-04-02T00:00:40Z
  checked: useTeachers vs useClasses vs useRooms in hooks/useTimetable.ts
  found: CRITICAL DIFFERENCE - useTeachers (line 73-74) and useClasses (line 93-94) both unwrap paginated responses with `const json = await res.json(); const items = json.data ?? json;` then map to EntityOption[]. useRooms (lines 111-113) does `return res.json()` directly with NO unwrapping and NO mapping.
  implication: useRooms returns the raw paginated object {data: [...], meta: {...}} instead of EntityOption[]. This is not an array, so rooms.length is undefined (falsy), causing PerspectiveSelector to skip rendering the Raeume group.

- timestamp: 2026-04-02T00:00:45Z
  checked: Backend room.service.ts findAll method (lines 40-59)
  found: Returns PaginatedResponseDto with { data: Room[], meta: { page, limit, total, totalPages } }. Default pagination is page=1, limit=20.
  implication: Confirms the backend returns a paginated wrapper, not a plain array. The frontend must unwrap .data to get the room array.

## Resolution

root_cause: The `useRooms` hook in `apps/web/src/hooks/useTimetable.ts` (lines 107-117) returns `res.json()` directly without unwrapping the paginated response. The backend's `GET /api/v1/schools/:schoolId/rooms` returns `{ data: Room[], meta: {...} }` (a PaginatedResponseDto). Unlike `useTeachers` and `useClasses` which both do `const items = json.data ?? json` and then `.map()` to EntityOption[], `useRooms` skips both steps. This means `roomsList` in the parent components is `{ data: [...], meta: {...} }` (an object, not an array). When PerspectiveSelector checks `rooms.length > 0`, the object has no `.length` property, so it evaluates to `undefined` (falsy), and the Raeume group is never rendered.
fix:
verification:
files_changed: []
