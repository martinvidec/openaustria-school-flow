/**
 * Regression spec for the useClasses() schoolId fix AND the useRooms()
 * pagination-params fix.
 *
 * Issue #165 (Phase 3.5/6 Batch A) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school with exactly one class
 * (overridden via `classNames: ['1A']` so the existing `/^\d+[A-Z]$/`
 * regex match + exact-name click stay intact) and one Room (from
 * `withTimetableStack: true`).
 *
 * Background — the bugs this guards:
 *   useClasses() in apps/web/src/hooks/useTimetable.ts previously fetched
 *   `/api/v1/classes` with no query string. The API requires `?schoolId=...`
 *   (ClassService.findAll throws NotFoundException → HTTP 404 without it),
 *   the TanStack Query error was swallowed by `{ data: classes = [] }` in
 *   the consumer, and PerspectiveSelector silently omits the Klassen
 *   SelectGroup when `classes.length === 0` (the group renders only behind
 *   `{classes.length > 0 && <SelectGroup>...}`). Net effect: admins lost
 *   the entire class perspective with no error toast or visible failure.
 *
 *   Full debug session: .planning/debug/resolved/useclasses-missing-schoolid.md
 *
 * Background — second guard added 2026-04-26:
 *   useRooms() in apps/web/src/hooks/useTimetable.ts had a structurally
 *   similar (but quantitative) bug — it fetched
 *   `/api/v1/schools/:schoolId/rooms` with no pagination params. The
 *   backend `PaginationQueryDto.limit` defaults to 20, so schools with >20
 *   rooms got silently truncated. Earlier, in 2026-04-02 (commit 1fb7abf),
 *   the unwrap+map shape of the same hook was fixed (returning the raw
 *   paginated envelope as `EntityOption[]` had broken iteration in
 *   PerspectiveSelector — the Räume group disappeared entirely). The
 *   present spec asserts the Räume group renders inside the open dropdown
 *   with at least one selectable option, guarding both fixes end-to-end:
 *     - if useRooms reverts to bare path → backend may truncate to 20 rows
 *       but the spec still has at least one option (throwaway-school's
 *       timetable stack self-provisions a Room → guaranteed presence).
 *     - if useRooms unwrap is reverted to `return res.json()` → iteration
 *       breaks and the Räume SelectGroup vanishes entirely → label
 *       expectation fails loudly.
 *
 * What this spec asserts:
 *   1. After navigating to /admin/timetable-edit and opening the
 *      perspective dropdown, the "Klassen" SelectLabel is visible AND
 *      the group contains at least one selectable option (proving the
 *      `/api/v1/classes?schoolId=...` request returned data and the
 *      length>0 conditional render fires).
 *   2. Picking a Klassen option mounts the timetable grid for that
 *      perspective (proves end-to-end wire-up: hook → selector → store
 *      → useTimetableView → grid).
 *   3. The "Raeume" SelectLabel (umlaut-less ASCII) is visible in the
 *      same open dropdown AND the Räume group contains at least one
 *      selectable option.
 *
 * Why a sibling spec (not extending admin-timetable-edit-dnd.spec.ts):
 *   The DnD spec deliberately drives via the teacher perspective so the
 *   three FIXes from commit de9ee2b stay isolated. Switching that spec to
 *   the class perspective would conflate two independent regression
 *   guards.
 *
 * Desktop-only via file naming (no `mobile` infix) — playwright.config.ts:42
 * routes `*.spec.ts` files to the desktop project.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Admin timetable-edit — Klassen + Räume perspectives render (useClasses schoolId fix + useRooms pagination fix)', () => {
  // Mobile projects run their own viewport-sized specs; this regression
  // guard only needs one platform and the dropdown interaction is identical
  // across viewports. Belt-and-braces guard against ad-hoc --project=mobile-*.
  test.skip(
    ({ isMobile }) => isMobile,
    'Klassen-perspective render check is identical across viewports — desktop only.',
  );

  let fixture: ThrowawaySchoolFixture;

  test.beforeEach(async ({ context, page }) => {
    // `classNames: ['1A']` keeps the regex /^\d+[A-Z]$/ matching and the
    // explicit-name click (line 156) working without renaming both. The
    // throwaway timetable stack guarantees one Room exists → the Räume
    // assertion holds.
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      classNames: ['1A'],
      withTimetableStack: true,
      namePrefix: 'E2E-PERSP',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
    }
  });

  test('PerspectiveSelector exposes the Klassen and Räume groups with at least one option each, and selecting a class renders the grid', async ({
    page,
  }) => {
    await page.goto('/admin/timetable-edit');

    // PerspectiveSelector renders a shadcn Select whose trigger has
    // role=combobox but no accessible name (Radix renders the placeholder
    // as inert text inside the trigger). The page only mounts ONE combobox
    // before the grid appears (DayWeekToggle is role=tablist, ABWeekTabs
    // is role=tablist). Same `.first()` pattern as the sibling DnD spec
    // and admin-user-overrides.spec.ts:59.
    const trigger = page.getByRole('combobox').first();
    await expect(trigger).toBeVisible();
    await trigger.click();

    // ── PRIMARY ASSERTION ────────────────────────────────────────────────
    // The Klassen SelectGroup is wrapped in `{classes.length > 0 && ...}`
    // (PerspectiveSelector.tsx:104). If useClasses returned [] (the bug
    // state), the SelectLabel "Klassen" would be absent from the DOM
    // entirely and this expectation would fail — which is the exact
    // regression we are guarding against.
    const dropdown = page.getByRole('listbox');
    await expect(dropdown).toBeVisible();

    const klassenLabel = dropdown.getByText('Klassen', { exact: true });
    await expect(
      klassenLabel,
      'Klassen SelectLabel must render inside the open dropdown — proves useClasses returned a non-empty array, which proves the request was made WITH ?schoolId=...',
    ).toBeVisible();

    // The group must contain at least one selectable option. Throwaway
    // creates exactly one class with the seed-style name "1A" (via
    // `classNames: ['1A']`); the regex `^\d+[A-Z]$` keeps the original
    // intent ("matches a seed-style class name") portable to future
    // multi-class throwaway extensions.
    const seededClass = dropdown
      .getByRole('option', { name: /^\d+[A-Z]$/ })
      .first();
    await expect(
      seededClass,
      'At least one Klassen option matching seed naming (e.g. "1A", "2B") must be selectable.',
    ).toBeVisible();

    // ── PRIMARY ASSERTION (Räume) ────────────────────────────────────────
    // The Raeume SelectGroup is wrapped in `{rooms.length > 0 && ...}`
    // (PerspectiveSelector.tsx:119). The throwaway timetable stack
    // provisions a Room → precondition guaranteed.
    //
    // NOTE: The label text is "Raeume" (umlaut-less ASCII), NOT "Räume" —
    // see PerspectiveSelector.tsx:121 SelectLabel content.
    const raeumeLabel = dropdown.getByText('Raeume', { exact: true });
    await expect(
      raeumeLabel,
      'Raeume SelectLabel must render inside the open dropdown — proves useRooms returned a non-empty array, which proves the GET /api/v1/schools/:schoolId/rooms request succeeded AND the response was correctly unwrapped to EntityOption[].',
    ).toBeVisible();

    // The group must contain at least one selectable option. Room names
    // follow no fixed naming convention; use the Radix listbox group
    // structure to find the group whose label is "Raeume" and assert it
    // contains at least one role=option child.
    const raeumeGroup = dropdown.locator('[role="group"]').filter({
      has: page.getByText('Raeume', { exact: true }),
    });
    await expect(
      raeumeGroup.getByRole('option').first(),
      'At least one Raeume option must be selectable inside the Raeume SelectGroup — the throwaway timetable stack self-provisions a Room, so this is guaranteed by the fixture contract.',
    ).toBeVisible();

    // ── BONUS ASSERTION ──────────────────────────────────────────────────
    // Click the "1A" option and verify the timetable grid mounts. This
    // proves the full wire-up: useClasses → selector value →
    // timetable-store → useTimetableView → TimetableGrid. Throwaway binds
    // its single lesson to this class so the grid both mounts and
    // surfaces the lesson, giving a stronger end-to-end signal than an
    // empty grid would.
    await page.getByRole('option', { name: '1A', exact: true }).click();

    await expect(
      page.getByRole('grid', { name: 'Stundenplan' }),
      'Selecting a Klassen option must mount the timetable grid for that perspective (full wire-up: hook → selector → store → view → grid).',
    ).toBeVisible({ timeout: 15_000 });
  });
});
