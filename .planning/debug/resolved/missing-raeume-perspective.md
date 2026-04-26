---
status: resolved
trigger: "Investigate why the admin perspective selector dropdown is missing Raeume as a group option"
created: 2026-04-02T00:00:00Z
updated: 2026-04-26T10:30:00Z
resolved_at: 2026-04-26
resolution_commits:
  - 1fb7abf  # 2026-04-02: useRooms unwraps paginated response and maps to EntityOption[] (the actual fix)
  - <docs>   # 2026-04-26: archive + KB + memory housekeeping (this session)
---

## Current Focus

hypothesis: CONFIRMED — The original 2026-04-02 silent-omission bug for the Räume perspective was resolved THE SAME DAY as the diagnosis in commit 1fb7abf (2026-04-02 13:34 UTC+0200), only ~13 hours after this debug file was created. The diagnosis-resolution gap (`fix:` empty, `files_changed: []`) is a stale-file artifact: the prior session was likely spawned in `goal: find_root_cause_only` mode and returned the diagnosis to the caller, who then applied the fix without re-touching this file. The bug has not existed in the codebase since 2026-04-02.
test: Read current `useRooms` source + `git show 1fb7abf` + `git log 1fb7abf..HEAD -- apps/web/src/hooks/useTimetable.ts` to confirm the fix landed and was not reverted.
expecting: Current `useRooms` should already do `const json = await res.json(); const items = json.data ?? json; return items.map(...)`. CONFIRMED.
next_action: archive

## Symptoms

expected: Admin/Schulleitung sees 3 groups in perspective selector dropdown - Lehrer, Klassen, Raeume
actual: Only Lehrer and Klassen groups appeared, Raeume was missing
errors: No error messages - feature simply not showing (silent-omission pattern)
reproduction: Log in as admin, open perspective selector dropdown
started: Unknown — symptom observed and diagnosed 2026-04-02

## Eliminated

- hypothesis: PerspectiveSelector component missing rooms rendering logic
  evidence: Component at PerspectiveSelector.tsx lines 115-128 correctly renders Raeume group when rooms.length > 0
  timestamp: 2026-04-02T00:00:30Z

- hypothesis: Rooms not passed to PerspectiveSelector from parent pages
  evidence: Both timetable/index.tsx and admin/timetable-edit.tsx correctly call useRooms and pass roomsList to PerspectiveSelector
  timestamp: 2026-04-02T00:00:35Z

- hypothesis: Backend room controller missing GET endpoint
  evidence: room.controller.ts has GET endpoint at api/v1/schools/:schoolId/rooms that calls roomService.findAll()
  timestamp: 2026-04-02T00:00:40Z

- hypothesis (2026-04-26 verification): Bug still present after the today-fixed sister hooks (useClasses d76b5a3, useTeachers d7e1c9d/3e9de88, Subject 6cf3c94) suggested useRooms might be the next instance of the pattern family
  evidence: Current `useRooms` source already implements the unwrap+map fix; `git show 1fb7abf` confirms the diff applied 2026-04-02 13:34. Fix has not been reverted (no commits 1fb7abf..HEAD touched this hook except today's d76b5a3+3e9de88 which only modified useClasses+useTeachers, leaving useRooms intact).
  timestamp: 2026-04-26T10:25:00Z

- hypothesis (2026-04-26 verification): Backend route may have changed to a query-param style introducing a Category C tenant-isolation leak
  evidence: room.controller.ts:31 still has `@Controller('schools/:schoolId/rooms')` and `findAll(@Param('schoolId') schoolId, @Query() pagination)` — Category A SAFE per useteachers-tenant-isolation-leak audit taxonomy. URL-path tenant scoping is enforced by Nest's routing layer; `schoolId` cannot be undefined when the route matches. No leak vector.
  timestamp: 2026-04-26T10:26:00Z

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
  found: CRITICAL DIFFERENCE - useTeachers and useClasses both unwrapped paginated responses with `const json = await res.json(); const items = json.data ?? json;` then mapped to EntityOption[]. useRooms did `return res.json()` directly with NO unwrapping and NO mapping.
  implication: useRooms returned the raw paginated object {data: [...], meta: {...}} instead of EntityOption[]. Not an array, so rooms.length is undefined (falsy) → PerspectiveSelector skipped rendering Raeume group.

- timestamp: 2026-04-02T00:00:45Z
  checked: Backend room.service.ts findAll method
  found: Returns PaginatedResponseDto with { data: Room[], meta: { page, limit, total, totalPages } }. Default pagination is page=1, limit=20.
  implication: Confirms the backend returns a paginated wrapper, not a plain array. The frontend must unwrap .data to get the room array.

- timestamp: 2026-04-26T10:25:00Z
  checked: Current `useRooms` in apps/web/src/hooks/useTimetable.ts (lines 136-151) + git history
  found: `useRooms` already implements `const json = await res.json(); const items = json.data ?? json; return items.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name }))`. Commit `1fb7abf fix(04-13): fix apiFetch Content-Type on body-less requests and useRooms pagination unwrap` (2026-04-02 13:34 UTC+0200) introduced exactly the unwrap+map fix the diagnosis prescribed. The same commit applied symmetric fixes to useTeachers + useClasses (which were later revisited in d76b5a3/3e9de88 to add the missing schoolId query param after the Category-C tenant-isolation pattern was discovered — useRooms did not need that step because its route is Category A URL-path scoped).
  implication: Bug has not existed in the codebase since 2026-04-02. The debug file's empty Resolution.fix and Resolution.files_changed are stale artifacts of a diagnose-only session whose returned diagnosis was applied without updating this file.

- timestamp: 2026-04-26T10:26:00Z
  checked: room.controller.ts current route topology
  found: `@Controller('schools/:schoolId/rooms')` with `findAll(@Param('schoolId') schoolId, @Query() pagination)`. Category A SAFE per the useteachers-tenant-isolation-leak audit taxonomy: URL-path `:schoolId` is enforced by Nest's routing layer, so the parameter cannot be undefined when the route matches.
  implication: No tenant-isolation backend guard required. Mechanism does not match the silent-permissiveness pattern from useTeachers/Subject — useRooms is a pure unwrap-shape bug, not a leak risk.

- timestamp: 2026-04-26T10:28:00Z
  checked: Existing unit-test suite — `pnpm --filter @schoolflow/web exec vitest run src/hooks/__tests__/useTimetable.spec.ts`
  found: 6 tests passed (useClasses + useTeachers regression guards). Spec file lines 25-27 explicitly disclaims `useRooms` coverage: "useRooms is NOT covered — its endpoint uses `:schoolId` as a URL path segment, so the route itself enforces the scope and the leak vector does not apply." No test regression triggered by today's verification work.
  implication: Suite remains green. The intentional non-coverage of useRooms is consistent with the Category-A safety reasoning (no tenant leak vector) — adding a unit test now would be a hardening-only addition, out of scope for this session per the strict-scope directive.

## Resolution

root_cause: The `useRooms` hook in `apps/web/src/hooks/useTimetable.ts` returned `res.json()` directly without unwrapping the paginated response. The backend's `GET /api/v1/schools/:schoolId/rooms` returns `{ data: Room[], meta: {...} }` (a PaginatedResponseDto). Unlike `useTeachers` and `useClasses` which both did `const items = json.data ?? json` and then `.map()` to EntityOption[], `useRooms` skipped both steps. This meant `roomsList` in the parent components was `{ data: [...], meta: {...} }` (an object, not an array). When PerspectiveSelector checked `rooms.length > 0`, the object had no `.length` property, so it evaluated to `undefined` (falsy), and the Raeume group was never rendered. **Silent-omission pattern** — same family as `useclasses-missing-schoolid` (data-shape mismatch upstream + `length > 0 && <render>` guard downstream → UI element vanishes with no error toast or log signal).
fix: Unwrap the paginated `{data, meta}` envelope and map to `EntityOption[]` — `const json = await res.json(); const items = json.data ?? json; return items.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name }));`. Shipped 2026-04-02 13:34 in commit `1fb7abf fix(04-13): fix apiFetch Content-Type on body-less requests and useRooms pagination unwrap`. The same commit also fixed an unrelated `apiFetch` Content-Type bug. **No backend changes required** — the route `@Controller('schools/:schoolId/rooms')` is Category A SAFE (URL-path tenant scoping), so the silent-permissiveness vector that drove the useTeachers + Subject backend guards does not apply here.
verification:
  - Code inspection (2026-04-26): current `useRooms` source matches the prescribed fix recipe verbatim.
  - Git history (2026-04-26): `git show 1fb7abf` confirms the diff applied unwrap+map to useRooms; `git log 1fb7abf..HEAD -- apps/web/src/hooks/useTimetable.ts` shows the fix has not been reverted (subsequent commits d76b5a3 + 3e9de88 modified only useClasses + useTeachers).
  - Sister hook verification (2026-04-26): three related hooks (useClasses, useTeachers, useSubjects) were resolved earlier today against the same `useTimetable.ts` and `subject.service.ts` surface. The audit taxonomy from `useteachers-tenant-isolation-leak` classifies the room route as Category A SAFE — no leak guard needed.
  - Unit tests (2026-04-26): existing 6 useTimetable tests pass. useRooms is intentionally not covered (route is URL-path scoped, no leak vector).
files_changed:
  - apps/web/src/hooks/useTimetable.ts  # in commit 1fb7abf, 2026-04-02
