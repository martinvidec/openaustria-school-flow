/**
 * Regression spec for the useClasses() schoolId fix AND the useRooms()
 * pagination-params fix.
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
 *   Knowledge-base entry pattern: .planning/debug/knowledge-base.md
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
 *       but the spec still has at least one option (the seedTimetableRun
 *       fixture self-provisions a Room → guaranteed presence). The
 *       quantitative regression is locked by the unit test from the same
 *       commit (Vitest, "useRooms — pagination params regression guard").
 *     - if useRooms unwrap is reverted to `return res.json()` → iteration
 *       breaks and the Räume SelectGroup vanishes entirely → label
 *       expectation fails loudly.
 *
 *   Closes deferred items 1-3 from
 *   `.planning/debug/resolved/missing-raeume-perspective.md`.
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
 *      selectable option (proves the `/api/v1/schools/:schoolId/rooms`
 *      request returned data, the response was correctly unwrapped to
 *      `EntityOption[]`, and the length>0 conditional render fires).
 *
 * Why a sibling spec (not extending admin-timetable-edit-dnd.spec.ts):
 *   The DnD spec deliberately drives via the teacher perspective so the
 *   three FIXes from commit de9ee2b stay isolated from any other concern
 *   (collisionDetection, body shape, transform — perspective-agnostic).
 *   Switching that spec to the class perspective would conflate two
 *   independent regression guards. The teacher-perspective workaround in
 *   the timetable-run fixture is retained for that spec.
 *
 * Desktop-only via file naming (no `mobile` infix) — playwright.config.ts:42
 * routes `*.spec.ts` files to the desktop project.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  seedTimetableRun,
  cleanupTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';

const SCHOOL_ID = process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';

test.describe('Admin timetable-edit — Klassen + Räume perspectives render (useClasses schoolId fix + useRooms pagination fix)', () => {
  // Mobile projects run their own viewport-sized specs; this regression
  // guard only needs one platform and the dropdown interaction is identical
  // across viewports. Belt-and-braces guard against ad-hoc --project=mobile-*.
  test.skip(
    ({ isMobile }) => isMobile,
    'Klassen-perspective render check is identical across viewports — desktop only.',
  );

  let fixture: TimetableRunFixture;

  test.beforeEach(async ({ page }) => {
    // The fixture seeds a TimetableRun + a single lesson for class 1A. We do
    // NOT depend on the lesson here — what matters is that the seed school
    // has at least one Class row (1A, 1B, 2A, ... seeded by prisma:seed)
    // and that the page can mount. Reusing seedTimetableRun keeps the test
    // surface aligned with the sibling DnD spec (same setup, same teardown,
    // same school) so future fixture changes flow uniformly through both.
    fixture = await seedTimetableRun(SCHOOL_ID);
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    if (fixture) {
      await cleanupTimetableRun(fixture);
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
    //
    // Scope to the open Radix Select dropdown via [role="listbox"]; the
    // sidebar nav also contains the word "Klassen" (link to the admin
    // Klassen page) which would trip strict-mode if we matched globally.
    // Radix renders the open dropdown content as role=listbox containing
    // role=group children — that's the SelectGroup. The SelectLabel is
    // emitted as a `<div>` (NOT a role=label or role=option), so we match
    // it positionally inside the listbox.
    const dropdown = page.getByRole('listbox');
    await expect(dropdown).toBeVisible();

    const klassenLabel = dropdown.getByText('Klassen', { exact: true });
    await expect(
      klassenLabel,
      'Klassen SelectLabel must render inside the open dropdown — proves useClasses returned a non-empty array, which proves the request was made WITH ?schoolId=...',
    ).toBeVisible();

    // The group must contain at least one selectable option. Use the seed
    // class naming convention (1A, 1B, 2A, ...) to identify a Klassen
    // option positively. The seed creates these via apps/api/prisma/seed.ts;
    // teacher/room options never match this pattern (teachers are
    // "Lastname Firstname", rooms are arbitrary strings).
    const seededClass = dropdown
      .getByRole('option', { name: /^\d+[A-Z]$/ })
      .first();
    await expect(
      seededClass,
      'At least one Klassen option matching seed naming (e.g. "1A", "2B") must be selectable.',
    ).toBeVisible();

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

    // ── BONUS ASSERTION ──────────────────────────────────────────────────
    // Click the first seeded class option and verify the timetable grid
    // mounts. This proves the full wire-up: useClasses → selector value →
    // timetable-store → useTimetableView → TimetableGrid. The sibling DnD
    // spec proves the same pipeline via the teacher perspective; doing it
    // here for class perspective closes the symmetry.
    //
    // Pick the option for class 1A by name. The seed creates 1A as the
    // first class row, and the timetable-run fixture binds its single
    // lesson to seed-class-1a — so the grid will both mount and surface
    // that lesson, giving us a stronger end-to-end signal than an empty
    // grid would. Use exact match because "1A" is a substring of "11A"
    // etc. in larger school setups.
    await page.getByRole('option', { name: '1A', exact: true }).click();

    await expect(
      page.getByRole('grid', { name: 'Stundenplan' }),
      'Selecting a Klassen option must mount the timetable grid for that perspective (full wire-up: hook → selector → store → view → grid).',
    ).toBeVisible({ timeout: 15_000 });
  });
});
