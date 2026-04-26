---
phase: quick/260426-eyf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/hooks/useTimetable.ts
  - apps/web/src/hooks/__tests__/useTimetable.spec.ts
  - apps/web/e2e/admin-timetable-edit-perspective.spec.ts
autonomous: true
requirements:
  - QUICK-260426-eyf-1  # useRooms sends pagination params (page=1, limit=500)
  - QUICK-260426-eyf-2  # useRooms unit-test regression guard (3-test pattern)
  - QUICK-260426-eyf-3  # E2E assertion for Räume group in PerspectiveSelector

must_haves:
  truths:
    - "useRooms requests /api/v1/schools/<schoolId>/rooms?page=1&limit=500 — never the bare path."
    - "Reverting useRooms to the bare path fails the new unit test loudly (URL match), not silently in production."
    - "useRooms unwraps the paginated { data, meta } envelope to EntityOption[] and the spec proves it."
    - "useRooms does not fire when schoolId is undefined (enabled=false guard tested)."
    - "admin-timetable-edit-perspective.spec.ts asserts the Räume SelectGroup label is visible inside the open Radix dropdown."
    - "The Räume group contains at least one selectable option (proves useRooms returned a non-empty array end-to-end)."
  artifacts:
    - path: "apps/web/src/hooks/useTimetable.ts"
      provides: "useRooms with URLSearchParams({ page: '1', limit: '500' })"
      contains: "URLSearchParams"
    - path: "apps/web/src/hooks/__tests__/useTimetable.spec.ts"
      provides: "describe('useRooms — pagination params regression guard', ...) with 3 tests"
      contains: "useRooms"
    - path: "apps/web/e2e/admin-timetable-edit-perspective.spec.ts"
      provides: "Räume group visibility + at-least-one-option assertion"
      contains: "Raeume"
  key_links:
    - from: "apps/web/src/hooks/useTimetable.ts (useRooms)"
      to: "GET /api/v1/schools/:schoolId/rooms?page=1&limit=500"
      via: "apiFetch + URLSearchParams"
      pattern: "limit=.?500"
    - from: "apps/web/e2e/admin-timetable-edit-perspective.spec.ts"
      to: "PerspectiveSelector Räume SelectGroup"
      via: "page.getByRole('listbox').getByText('Raeume')"
      pattern: "Raeume"
---

<objective>
Close the three deferred hardening items from the resolved debug session
`missing-raeume-perspective` (resolved 2026-04-02 in commit `1fb7abf`,
archived 2026-04-26):

1. useRooms must send `?page=1&limit=500` so schools with >20 rooms do not get
   silently truncated by the backend's `PaginationQueryDto.limit` default of 20.
2. Add a unit-test regression guard for useRooms mirroring the 3-test pattern
   used for useClasses (commit `d76b5a3`) and useTeachers (commit `3e9de88`).
3. Extend `admin-timetable-edit-perspective.spec.ts` (created 2026-04-26 in
   commit `3045920`) with an assertion that the Räume group renders with at
   least one selectable option — symmetric to the existing Klassen assertion.

Purpose: Lock the already-resolved Räume perspective bug down with the same
defense-in-depth (unit + E2E) the sister hooks now have, so a future revert
of useRooms fails CI loudly instead of silently dropping the Räume group from
production again.

Output: Hardened useRooms hook, 3 new unit tests, 1 new E2E assertion block
inside the existing admin-timetable-edit-perspective spec.

Strict scope (per task_context):
- Do NOT touch useTeachers, useClasses, or any backend code.
- Do NOT extend or rewrite seedTimetableRun — it already self-provisions a Room
  (per quick-task `260425-u72` SUMMARY).
- This is a mechanical mirror of the canonical patterns established today.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/debug/resolved/missing-raeume-perspective.md
@apps/web/src/hooks/useTimetable.ts
@apps/web/src/hooks/__tests__/useTimetable.spec.ts
@apps/web/e2e/admin-timetable-edit-perspective.spec.ts
@apps/web/src/components/timetable/PerspectiveSelector.tsx
@apps/api/src/modules/room/room.controller.ts

<canonical_pattern_commits>
The executor should `git show <hash>` these to copy the exact pattern shape:

- `d76b5a3` — useClasses: pagination params + 3-test unit spec (canonical for hook+test)
- `3e9de88` — useTeachers: same pattern, defense-in-depth schoolId param
- `3045920` — admin-timetable-edit-perspective.spec.ts: canonical E2E shape for
  the Klassen group assertion (the new Räume block mirrors this exactly)
- `1fb7abf` — useRooms: the original 2026-04-02 unwrap+map fix that this plan
  hardens (do NOT revert any of its changes — only ADD pagination params)
</canonical_pattern_commits>

<interfaces>
<!-- Key contracts the executor must respect — extracted directly from the
     files in <context> so no codebase exploration is needed. -->

From apps/web/src/hooks/useTimetable.ts (the EntityOption shape — keep stable):
```typescript
interface EntityOption {
  id: string;
  name: string;
}
```

Current useRooms (lines 136-151 of useTimetable.ts) — what to harden:
```typescript
export function useRooms(schoolId: string | undefined) {
  return useQuery<EntityOption[]>({
    queryKey: ['rooms', schoolId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/rooms`);
      if (!res.ok) throw new Error('Failed to load rooms');
      const json = await res.json();
      const items = json.data ?? json;
      return items.map((r: { id: string; name: string }) => ({
        id: r.id,
        name: r.name,
      }));
    },
    enabled: !!schoolId,
  });
}
```

Canonical post-hardening shape (mirror of useClasses URL-building, but note
schoolId stays in the URL PATH — this is Category A per today's audit
taxonomy in `.planning/debug/resolved/useteachers-tenant-isolation-leak.md`):
```typescript
const params = new URLSearchParams({ page: '1', limit: '500' });
const res = await apiFetch(`/api/v1/schools/${schoolId}/rooms?${params.toString()}`);
```

From apps/api/src/modules/room/room.controller.ts (lines 31, 48-57) — confirms
the route shape and that PaginationQueryDto is consumed via @Query():
```typescript
@Controller('schools/:schoolId/rooms')
// ...
@Get()
async findAll(
  @Param('schoolId') schoolId: string,
  @Query() pagination: PaginationQueryDto,
) {
  return this.roomService.findAll(schoolId, pagination);
}
```

Backend default: `PaginationQueryDto.limit` defaults to 20 → schools with
>20 rooms silently truncated without `?limit=500`.

From apps/web/src/components/timetable/PerspectiveSelector.tsx
(lines 119-128) — the Räume SelectGroup rendering predicate the E2E
asserts against:
```tsx
{rooms.length > 0 && (
  <SelectGroup>
    <SelectLabel>Raeume</SelectLabel>
    {rooms.map((room) => (
      <SelectItem key={room.id} value={`room:${room.id}`}>
        {room.name}
      </SelectItem>
    ))}
  </SelectGroup>
)}
```
NOTE: The label is the umlaut-less form `Raeume` (NOT `Räume`) — match exactly
in the E2E spec. The existing Klassen block uses `getByText('Klassen', { exact: true })`.

From apps/web/src/hooks/__tests__/useTimetable.spec.ts (lines 42, 51-101) —
the canonical 3-test shape per hook to mirror:
```typescript
import { useClasses, useTeachers } from '../useTimetable';
// ...
describe('<hookName> — <guard purpose>', () => {
  it('sends ?<expected params> on the GET request', async () => { ... });
  it('maps the paginated { data, meta } envelope to EntityOption[]', async () => { ... });
  it('does not fire the request when schoolId is undefined', async () => { ... });
});
```
The mock harness (apiFetchMock + wrapper) at lines 34-49 is shared — reuse it,
do NOT duplicate.

From apps/web/e2e/admin-timetable-edit-perspective.spec.ts (lines 105-125) —
the canonical Klassen assertion shape to mirror for Räume:
```typescript
const dropdown = page.getByRole('listbox');
await expect(dropdown).toBeVisible();

const klassenLabel = dropdown.getByText('Klassen', { exact: true });
await expect(klassenLabel, '...').toBeVisible();

const seededClass = dropdown.getByRole('option', { name: /^\d+[A-Z]$/ }).first();
await expect(seededClass, '...').toBeVisible();
```
For Räume the seed-name pattern is NOT a regex like `1A` — the
`seedTimetableRun` fixture self-provisions a Room with an arbitrary name. The
spec must NOT assume a naming convention. Use a positive-existence assertion
("at least one option in the Räume group") via `dropdown.locator('[role="group"]')`
filtered by the Raeume label OR a generic "any option after the Raeume label" —
see Task 2 action for the exact recipe.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Harden useRooms with pagination params + 3-test regression guard (atomic commit)</name>
  <files>
    apps/web/src/hooks/useTimetable.ts,
    apps/web/src/hooks/__tests__/useTimetable.spec.ts
  </files>
  <behavior>
    Unit-spec contract for the new `describe('useRooms — pagination params regression guard', ...)` block — write THESE TESTS FIRST (RED), then make them GREEN by editing useRooms:

    Test 1 (URL contains expected params):
      - Mock apiFetchMock to resolve with `{ ok: true, json: async () => ({ data: [], meta: { total: 0, page: 1, limit: 500, totalPages: 0 } }) }`.
      - renderHook(() => useRooms('school-1')).
      - waitFor isSuccess.
      - Assert apiFetchMock called exactly once.
      - Assert calledUrl matches `/^\/api\/v1\/schools\/school-1\/rooms\?/`.
      - Assert calledUrl contains 'page=1' AND 'limit=500'.
      - Assert calledUrl does NOT contain 'schoolId=' (this is Category A — schoolId is in the URL path, NOT a query param). This explicitly distinguishes useRooms from useClasses/useTeachers in the audit taxonomy and prevents a future drive-by "consistency" PR from incorrectly adding `schoolId=` as a query param.

    Test 2 (paginated envelope unwraps to EntityOption[]):
      - Mock apiFetchMock to resolve with paginated payload: `{ data: [{ id: 'r1', name: 'Raum 101' }, { id: 'r2', name: 'Turnhalle' }], meta: { total: 2, page: 1, limit: 500, totalPages: 1 } }`.
      - renderHook(() => useRooms('school-1')).
      - waitFor isSuccess.
      - Assert result.current.data deep-equals `[{ id: 'r1', name: 'Raum 101' }, { id: 'r2', name: 'Turnhalle' }]`.
      - This locks the unwrap+map from commit 1fb7abf so a future revert fails loudly.

    Test 3 (no fetch when schoolId is undefined):
      - renderHook(() => useRooms(undefined)).
      - Assert result.current.fetchStatus === 'idle'.
      - Assert apiFetchMock NOT called.
  </behavior>
  <action>
    RED-GREEN-REFACTOR cycle. Single atomic commit at the end.

    STEP 1 (RED) — Add the unit tests in apps/web/src/hooks/__tests__/useTimetable.spec.ts:
      a. Update the import on line 42 from `import { useClasses, useTeachers } from '../useTimetable';` to `import { useClasses, useRooms, useTeachers } from '../useTimetable';`.
      b. Update the file-header docstring (lines 25-27) — REMOVE the explicit disclaimer "useRooms is NOT covered — its endpoint uses `:schoolId` as a URL path segment...". Replace with a short paragraph noting useRooms IS now covered for a DIFFERENT reason: the backend `PaginationQueryDto.limit` defaults to 20, which silently truncates schools with >20 rooms. The unit test guards the `?page=1&limit=500` params (Category A — schoolId stays in URL path; the param guard is a quantity guard, NOT a tenant-isolation guard).
      c. After the closing `});` of the `describe('useTeachers — ...')` block, append a new `describe('useRooms — pagination params regression guard', () => { ... })` block with a `beforeEach(() => { vi.clearAllMocks(); })` and the 3 tests specified in <behavior>.
      d. Reuse the existing `apiFetchMock` and `wrapper` from the top of the file — do NOT redefine them.
      e. Run `pnpm --filter @schoolflow/web exec vitest run src/hooks/__tests__/useTimetable.spec.ts` and confirm Test 1 + Test 2 FAIL (because useRooms still hits the bare path). Test 3 should already pass (the `enabled: !!schoolId` guard already exists).

    STEP 2 (GREEN) — Edit apps/web/src/hooks/useTimetable.ts useRooms function (lines 136-151):
      a. Inside the queryFn, BEFORE the apiFetch call, add:
         ```typescript
         const params = new URLSearchParams({ page: '1', limit: '500' });
         ```
      b. Change the apiFetch URL from
         `` `/api/v1/schools/${schoolId}/rooms` ``
         to
         `` `/api/v1/schools/${schoolId}/rooms?${params.toString()}` ``.
      c. Update the JSDoc above useRooms (currently a one-liner on line 134) to a multi-paragraph block matching the style of useClasses/useTeachers JSDocs. Document:
         - The route is Category A SAFE (URL-path tenant scoping) per the `useteachers-tenant-isolation-leak` audit taxonomy — no defense-in-depth schoolId query param needed.
         - WHY pagination params are sent: backend `PaginationQueryDto.limit` defaults to 20; without `?limit=500` schools with >20 rooms are silently truncated and the Räume dropdown looks incomplete.
         - Reference the canonical commits: original unwrap+map fix `1fb7abf` (2026-04-02) + this hardening (current commit hash will be unknown at write-time — refer to it as "this hardening pass" or omit the hash).
      d. Do NOT touch the unwrap+map block (`const items = json.data ?? json; return items.map(...)`) — it is the canonical fix from 1fb7abf and must remain byte-identical.
      e. Run `pnpm --filter @schoolflow/web exec vitest run src/hooks/__tests__/useTimetable.spec.ts` and confirm ALL 9 tests pass (3 useClasses + 3 useTeachers + 3 useRooms).

    STEP 3 (REFACTOR — only if needed):
      a. If TypeScript or ESLint surfaces any issues from the JSDoc or new code, fix them. Otherwise skip.

    STEP 4 (commit):
      Single conventional commit covering both files:
      ```
      fix(web): useRooms sends pagination params + unit test regression guard

      Closes deferred item 1+2 from .planning/debug/resolved/missing-raeume-perspective.md
      (resolved 2026-04-02 in 1fb7abf, hardened 2026-04-26).

      - useRooms now sends ?page=1&limit=500 (was bare path → backend default
        limit=20 silently truncated schools with >20 rooms).
      - Unit-spec mirrors the 3-test pattern from d76b5a3 (useClasses) and
        3e9de88 (useTeachers): URL params guard, paginated envelope unwrap,
        no-fetch-when-undefined.
      - Category A route — schoolId stays in URL path, NOT a query param.
        Test 1 explicitly asserts schoolId= is NOT in the query string to
        prevent a future drive-by "consistency" PR from re-introducing it.
      ```
  </action>
  <verify>
    <automated>cd apps/web &amp;&amp; pnpm exec vitest run src/hooks/__tests__/useTimetable.spec.ts</automated>
  </verify>
  <done>
    - apps/web/src/hooks/useTimetable.ts useRooms uses URLSearchParams and the URL contains `?page=1&limit=500`.
    - apps/web/src/hooks/__tests__/useTimetable.spec.ts has a new `describe('useRooms — ...')` block with exactly 3 tests, all passing.
    - All 9 tests in the file pass (3 useClasses + 3 useTeachers + 3 useRooms).
    - File-header docstring updated — disclaimer about useRooms-non-coverage removed and replaced with the pagination-quantity rationale.
    - useRooms JSDoc updated to multi-paragraph block matching sister hooks.
    - useRooms unwrap+map block (json.data ?? json + .map) unchanged from commit 1fb7abf.
    - Single conventional commit `fix(web): useRooms sends pagination params + unit test regression guard` lands the change.
  </done>
</task>

<task type="auto">
  <name>Task 2: Extend admin-timetable-edit-perspective spec with Räume group assertion (E2E commit)</name>
  <files>apps/web/e2e/admin-timetable-edit-perspective.spec.ts</files>
  <action>
    Add a Räume-group assertion block inside the EXISTING `test('PerspectiveSelector exposes the Klassen group ...', ...)` test, immediately after the existing Klassen block (after line 125 `await expect(seededClass, ...).toBeVisible();`) and BEFORE the BONUS ASSERTION block (the click-and-verify-grid section, currently at lines 127-145). Do NOT add a new top-level `test.describe` or `test()` — extend the existing test in-place because:
      1. The fixture (`seedTimetableRun`) and login setup are already running for this test.
      2. Adding a sibling test would double the per-spec setup cost (login + fixture seed).
      3. The dropdown is already open at this point in the test — perfect for an additional same-dropdown assertion.

    Update the test name to reflect both groups: change
      `'PerspectiveSelector exposes the Klassen group with at least one selectable class, and selecting one renders the grid'`
    to
      `'PerspectiveSelector exposes the Klassen and Räume groups with at least one option each, and selecting a class renders the grid'`.

    Update the test.describe block name (line 48) from
      `'Admin timetable-edit — Klassen perspective renders (useClasses schoolId fix)'`
    to
      `'Admin timetable-edit — Klassen + Räume perspectives render (useClasses schoolId fix + useRooms pagination fix)'`.

    Update the file header docstring:
      - Add a "Background — second guard added 2026-04-26" paragraph noting the Räume-group assertion guards the deferred items from `.planning/debug/resolved/missing-raeume-perspective.md` (originally fixed 2026-04-02 in commit 1fb7abf, hardened with pagination params today).
      - Update the "What this spec asserts" section to include a third bullet about the Räume group.

    Insert this assertion block (mirror of the Klassen block at lines 105-125) — exact placement: AFTER the Klassen `await expect(seededClass, ...).toBeVisible();` and BEFORE the `// ── BONUS ASSERTION ─...` comment:

    ```typescript
    // ── PRIMARY ASSERTION (Räume) ────────────────────────────────────────
    // The Raeume SelectGroup is wrapped in `{rooms.length > 0 && ...}`
    // (PerspectiveSelector.tsx:119). If useRooms returned [] (the bug
    // state — either the original 2026-04-02 unwrap-shape bug or the new
    // pagination-truncation bug for schools with >20 rooms), the
    // SelectLabel "Raeume" would be absent from the DOM entirely and this
    // expectation would fail.
    //
    // The seedTimetableRun fixture self-provisions at least one Room
    // when the seed school has none (per quick-task 260425-u72 SUMMARY)
    // → precondition is guaranteed.
    //
    // NOTE: The label text is "Raeume" (umlaut-less ASCII), NOT "Räume" —
    // see PerspectiveSelector.tsx:121 SelectLabel content.
    const raeumeLabel = dropdown.getByText('Raeume', { exact: true });
    await expect(
      raeumeLabel,
      'Raeume SelectLabel must render inside the open dropdown — proves useRooms returned a non-empty array, which proves the GET /api/v1/schools/:schoolId/rooms request succeeded AND the response was correctly unwrapped to EntityOption[].',
    ).toBeVisible();

    // The group must contain at least one selectable option. Unlike the
    // Klassen group, Room names follow no fixed naming convention (the
    // seedTimetableRun fixture creates a Room with an arbitrary name when
    // the seed school has none). We cannot use a regex like /^\d+[A-Z]$/.
    //
    // Strategy: use the Radix listbox group structure. Each SelectGroup
    // renders as role=group with the SelectLabel as the first child div.
    // Find the group whose label is "Raeume" and assert it contains at
    // least one role=option child. Locator chain:
    //   listbox > group:has(div:text-is("Raeume")) > [role="option"]
    const raeumeGroup = dropdown.locator('[role="group"]').filter({
      has: page.getByText('Raeume', { exact: true }),
    });
    await expect(
      raeumeGroup.getByRole('option').first(),
      'At least one Raeume option must be selectable inside the Raeume SelectGroup — the seedTimetableRun fixture self-provisions a Room, so this is guaranteed by the fixture contract.',
    ).toBeVisible();
    ```

    Do NOT change the BONUS ASSERTION block — it intentionally clicks a Klassen option (1A) to verify the full wire-up and produces the strongest end-to-end signal because the fixture's lesson is bound to seed-class-1a. Adding a parallel "click a Räume option" would not strengthen the signal and would risk flakiness if the seed-class-1a lesson is not rendered for the room perspective.

    Run the spec to confirm it passes:
    ```
    pnpm --filter @schoolflow/web exec playwright test e2e/admin-timetable-edit-perspective.spec.ts --project=desktop-chromium
    ```

    If the API/web stack is not already running (Playwright config typically starts it via webServer), run `pnpm --filter @schoolflow/web exec playwright test --list` first to confirm the spec is discovered.

    Single conventional commit:
    ```
    test(web): extend admin-timetable-edit-perspective spec with Räume assertion

    Closes deferred item 3 from .planning/debug/resolved/missing-raeume-perspective.md.

    - Adds Räume SelectGroup label visibility + at-least-one-option assertion
      inside the existing Klassen-perspective test (avoids doubling fixture
      setup cost — same dropdown, same login, same seed run).
    - Mirrors the Klassen assertion shape from commit 3045920 but uses a
      group-filter locator instead of a name-regex (Room names follow no
      fixed convention; the seedTimetableRun fixture self-provisions a
      Room — quick-task 260425-u72).
    - Test name + describe name + file docstring updated to reflect both
      perspectives are now under regression guard.
    - Per E2E-first directive (memory: feedback_e2e_first_no_uat) this is
      the headline regression guard for the useRooms hardening; the unit
      test from the previous commit is structural insurance.
    ```
  </action>
  <verify>
    <automated>cd apps/web &amp;&amp; pnpm exec playwright test e2e/admin-timetable-edit-perspective.spec.ts --project=desktop-chromium</automated>
  </verify>
  <done>
    - admin-timetable-edit-perspective.spec.ts contains a Räume-group assertion block immediately after the Klassen block, inside the SAME `test()` (not a sibling test).
    - The new block asserts (a) the SelectLabel "Raeume" (umlaut-less) is visible inside the open dropdown, AND (b) the Räume group contains at least one selectable option (via group-filter locator, not name-regex).
    - Test name, describe name, and file docstring updated to reference both Klassen and Räume.
    - Existing Klassen assertion block + BONUS click-and-verify-grid block are unchanged.
    - The spec passes on desktop-chromium (verified via `playwright test`).
    - Single conventional commit `test(web): extend admin-timetable-edit-perspective spec with Räume assertion` lands the change.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → /api/v1/schools/:schoolId/rooms | Authenticated admin request; tenant scoping enforced by URL-path `:schoolId` |
| Test runner → mocked apiFetch | In-process Vitest mock; no network |
| Playwright browser → live API | Authenticated as seeded admin via loginAsAdmin |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260426-eyf-01 | Information Disclosure | useRooms cross-tenant leak | accept | Route is Category A SAFE — `:schoolId` is a URL path segment, Nest's routing layer enforces it. Cannot be undefined when route matches. Documented in `.planning/debug/resolved/useteachers-tenant-isolation-leak.md` audit taxonomy. Test 1 explicitly asserts `schoolId=` is NOT a query param so a future "consistency" PR cannot accidentally weaken this. |
| T-260426-eyf-02 | Denial of Service (data-shape) | useRooms truncation for >20-room schools | mitigate | Hardening sends `?page=1&limit=500`. Unit Test 1 guards both params; reverting fails CI loudly. |
| T-260426-eyf-03 | Tampering | Future revert of unwrap+map (1fb7abf) | mitigate | Unit Test 2 deep-equals the EntityOption[] mapping; reverting to `return res.json()` fails loudly. |
| T-260426-eyf-04 | Repudiation | Silent UI omission of Räume group | mitigate | E2E asserts the Raeume SelectLabel + at-least-one-option are visible in the live dropdown. Either backend, hook, or component regression breaks the assertion. |
</threat_model>

<verification>
End-to-end check after BOTH commits land:

```bash
# 1. Unit specs (3 useClasses + 3 useTeachers + 3 useRooms = 9 tests)
cd apps/web && pnpm exec vitest run src/hooks/__tests__/useTimetable.spec.ts

# 2. E2E spec (Klassen + Räume groups + grid mount)
cd apps/web && pnpm exec playwright test e2e/admin-timetable-edit-perspective.spec.ts --project=desktop-chromium

# 3. Lint + type-check the modified files
cd apps/web && pnpm exec tsc --noEmit
cd apps/web && pnpm exec eslint src/hooks/useTimetable.ts src/hooks/__tests__/useTimetable.spec.ts e2e/admin-timetable-edit-perspective.spec.ts
```

All three commands must succeed with zero errors. The Vitest run must show 9 passed tests in the useTimetable.spec.ts file.
</verification>

<success_criteria>
- useRooms in apps/web/src/hooks/useTimetable.ts requests `/api/v1/schools/<schoolId>/rooms?page=1&limit=500` (verified by both unit test and live E2E network).
- useRooms unwrap+map from commit 1fb7abf is unchanged.
- 3 new unit tests for useRooms pass and would fail if useRooms reverted to the bare path or unwrapped incorrectly.
- The admin-timetable-edit-perspective spec asserts the Räume SelectLabel is visible inside the open dropdown AND the group contains at least one selectable option.
- All existing assertions in the spec still pass (Klassen group + grid-mount BONUS).
- Two conventional commits land:
  - `fix(web): useRooms sends pagination params + unit test regression guard`
  - `test(web): extend admin-timetable-edit-perspective spec with Räume assertion`
- No backend code, no useTeachers, no useClasses, and no fixture code is modified.
- Type-check and ESLint pass on the three modified files.
</success_criteria>

<output>
After completion, create `.planning/quick/260426-eyf-harden-userooms-pagination-params-unit-t/260426-eyf-SUMMARY.md` documenting:
- The two commits landed (with hashes).
- The 3 unit tests added.
- The Räume E2E assertion shape used (group-filter locator vs. name-regex — and WHY).
- Confirmation that the three deferred items from `.planning/debug/resolved/missing-raeume-perspective.md` are now closed.
- A note that this completes the "perspective-list hooks" hardening trifecta started today: useClasses (d76b5a3), useTeachers (3e9de88), useRooms (this task).
</output>
