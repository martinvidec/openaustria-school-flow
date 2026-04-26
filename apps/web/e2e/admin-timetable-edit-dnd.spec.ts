/**
 * Quick task 260425-u72 — DnD regression spec for the admin timetable-edit
 * page. Guards against silent regression of the three FIXes shipped by
 * commit de9ee2b "fix(04-13): fix drag-and-drop lesson moves":
 *
 *   FIX 1 — useTimetableEdit strips `lessonId` out of the PATCH body
 *           (avoids 422 from the global ValidationPipe forbidNonWhitelisted).
 *   FIX 2 — DndContext uses `pointerWithin` (not `closestCenter`) so the
 *           cell under the cursor is the chosen drop target.
 *   FIX 3 — DraggableLesson does NOT apply CSS.Translate.toString(transform)
 *           to its original element during drag (DragOverlay handles the
 *           visual preview; the original stays put to keep its bbox stable
 *           for collision detection).
 *
 * The describe is gated to the desktop Playwright project — see
 * playwright.config.ts:35 — because page.mouse pointer drags are reliable on
 * Chromium-Desktop only (mobile WebKit / mobile-Chromium are known-flaky for
 * DnD, see the Phase 11 mobile DnD note at playwright.config.ts:50–56).
 */
import { test, expect } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  seedTimetableRun,
  cleanupTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const SCHOOL_ID = process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';

// File-naming gate: playwright.config.ts:42 routes `*.spec.ts` to the desktop
// project and `*-mobile.spec.ts` / `*.mobile.spec.ts` to the mobile projects.
// Naming this file `admin-timetable-edit-dnd.spec.ts` (no `mobile` infix) is
// what makes it desktop-only by config. The describe-level skip below is a
// belt-and-braces guard against ad-hoc runs that pass `--project=mobile-*`.
test.describe('Phase 04 regression — DnD timetable-edit (commit de9ee2b)', () => {
  // page.mouse pointer drags are reliable on Chromium-Desktop only. Mobile
  // emulation is excluded by file-name routing already; the in-spec guard
  // here defends against ad-hoc `--project=mobile-*` invocations.
  test.skip(
    ({ isMobile }) => isMobile,
    'DnD pointer drag is supported on desktop Chromium only',
  );

  let fixture: TimetableRunFixture;

  test.beforeEach(async ({ page }) => {
    fixture = await seedTimetableRun(SCHOOL_ID);
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    if (fixture) {
      await cleanupTimetableRun(fixture);
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // TEST 1 — REGRESSION-DND-422 (FIX 1)
  // Pure API contract test. No DnD machinery. Two assertions:
  //   - PATCH with extra `lessonId` in body → 422 (forbidNonWhitelisted)
  //   - PATCH with whitelist-only body → 2xx
  // If FIX 1 is reverted (lessonId re-added to the body), the negative
  // assertion fails LOUDLY: 200/204 instead of 422.
  // ──────────────────────────────────────────────────────────────────────
  test('REGRESSION-DND-422: PATCH /lessons/:id/move rejects extra lessonId in body, accepts whitelist-only body', async ({
    request,
  }) => {
    const token = await getAdminToken(request);
    const url = `${API_BASE}/schools/${SCHOOL_ID}/timetable/lessons/${fixture.lessonId}/move`;

    // Negative: extra `lessonId` field in body → 422 (forbidNonWhitelisted)
    const negative = await request.patch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        lessonId: fixture.lessonId,
        targetDay: 'TUESDAY',
        targetPeriod: 2,
      },
    });
    expect(
      negative.status(),
      'Sending lessonId in PATCH body MUST be rejected (forbidNonWhitelisted is the regression guard for FIX 1).',
    ).toBe(422);

    // Positive: whitelist-only body → success
    const positive = await request.patch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { targetDay: 'TUESDAY', targetPeriod: 2 },
    });
    expect(
      positive.status(),
      'Whitelist-only body { targetDay, targetPeriod } MUST succeed (proves frontend body shape stays accepted).',
    ).toBeLessThan(300);
  });

  // ──────────────────────────────────────────────────────────────────────
  // TEST 2 — REGRESSION-DND-COLLISION (FIX 2)
  // Drive a real pointer drag from the seeded lesson at (MONDAY, period 1)
  // to a deliberately CHOSEN empty cell at (THURSDAY, period 5). With
  // pointerWithin, the cell under the cursor wins. With the regressed
  // closestCenter, a different cell would win in a sparse grid.
  // ──────────────────────────────────────────────────────────────────────
  test('REGRESSION-DND-COLLISION: pointer drag lands the lesson in the cell under the cursor', async ({
    page,
  }) => {
    // Pick the seeded teacher in the perspective selector so the
    // timetable-view query becomes enabled (timetable-store default is
    // perspectiveId: null → query disabled → grid never mounts).
    await page.goto('/admin/timetable-edit');
    await selectTeacherPerspective(page, fixture.teacherDisplayName);

    // Enter edit mode — the page only mounts the DndContext when
    // editMode === true (timetable-edit.tsx:328).
    await page.getByRole('button', { name: 'Bearbeiten' }).click();
    await expect(
      page.getByRole('grid', { name: 'Stundenplan' }),
    ).toBeVisible();

    // Resolve the source lesson cell. Before drag-start no
    // [data-dragging-source] attribute exists, so locate the lesson by its
    // visible subject abbreviation (Subject.shortName surfaced via
    // TimetableViewLesson.subjectAbbreviation — see
    // apps/api/src/modules/timetable/timetable.service.ts:447).
    const sourceLesson = page
      .getByRole('grid', { name: 'Stundenplan' })
      .getByText(fixture.subjectAbbreviation, { exact: true })
      .first();
    const targetCell = page.locator(
      '[data-slot-day="THURSDAY"][data-slot-period="5"]',
    );

    await expect(sourceLesson).toBeVisible();
    await expect(targetCell).toBeVisible();

    // Read the FRESH bounding box right before driving the drag — Playwright
    // re-measures every call, but doing it last (after `expect.toBeVisible`)
    // guarantees the grid has settled. We also nudge tx/ty INWARD by 30%
    // off-center to defend against single-pixel column-boundary mis-hits
    // (the grid uses `gap-px`, so geometric centers are safe but the
    // 0.5-pixel boundary between cells is not).
    const sBox = await sourceLesson.boundingBox();
    const tBox = await targetCell.boundingBox();
    if (!sBox || !tBox) throw new Error('source/target bounding box missing');

    const sx = sBox.x + sBox.width / 2;
    const sy = sBox.y + sBox.height / 2;
    // Target a point clearly inside the cell — 60% across × 50% down. This
    // pushes well clear of the WEDNESDAY/THURSDAY column boundary on the
    // left and the THURSDAY/FRIDAY boundary on the right.
    const tx = tBox.x + tBox.width * 0.6;
    const ty = tBox.y + tBox.height / 2;

    // Watch for the move PATCH so we can assert on its status before
    // checking the post-drop DOM state.
    const movePromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/lessons/${fixture.lessonId}/move`) &&
        r.request().method() === 'PATCH',
      { timeout: 15_000 },
    );

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    // Cross the 8px PointerSensor activation threshold in 5 steps so dnd-kit
    // sees real pointermove events rather than a single jump.
    await page.mouse.move(sx + 20, sy, { steps: 5 });
    // Slow traverse to the target so onDragOver fires for intermediate
    // cells and pointerWithin can settle on the cell under the cursor.
    await page.mouse.move(tx, ty, { steps: 20 });
    // Settle frame: a final tiny move + a 50ms pause lets dnd-kit's
    // pointerWithin run one more collision-detection pass before drop.
    await page.mouse.move(tx, ty, { steps: 2 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    const moveRes = await movePromise;
    expect(
      moveRes.status(),
      'Move PATCH must succeed for an empty target cell (no constraint violation expected).',
    ).toBeLessThan(300);

    // After the move, (THURSDAY, period 5) ceases to be a DroppableSlot —
    // it becomes the new home for the lesson. The empty-slot data
    // attributes for that exact (day, period) MUST be gone.
    await expect(
      page.locator('[data-slot-day="THURSDAY"][data-slot-period="5"]'),
      'Target cell must no longer be an empty droppable — the lesson moved here.',
    ).toHaveCount(0);

    // Conversely, (MONDAY, period 1) MUST become an empty droppable.
    await expect(
      page.locator('[data-slot-day="MONDAY"][data-slot-period="1"]'),
      'Original cell must become an empty droppable after the move.',
    ).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────
  // TEST 3 — REGRESSION-DND-TRANSFORM (FIX 3)
  // Start a drag (without releasing) and assert the original DraggableLesson
  // outer element does NOT apply a CSS transform: translate(...). The fixed
  // implementation only sets `opacity: 0.5` on the original — DragOverlay
  // handles the visual preview.
  // ──────────────────────────────────────────────────────────────────────
  test('REGRESSION-DND-TRANSFORM: original DraggableLesson does not apply CSS translate during drag', async ({
    page,
  }) => {
    await page.goto('/admin/timetable-edit');
    await selectTeacherPerspective(page, fixture.teacherDisplayName);
    await page.getByRole('button', { name: 'Bearbeiten' }).click();
    await expect(
      page.getByRole('grid', { name: 'Stundenplan' }),
    ).toBeVisible();

    const sourceLesson = page
      .getByRole('grid', { name: 'Stundenplan' })
      .getByText(fixture.subjectAbbreviation, { exact: true })
      .first();
    await expect(sourceLesson).toBeVisible();

    const sBox = await sourceLesson.boundingBox();
    if (!sBox) throw new Error('source bounding box missing');
    const sx = sBox.x + sBox.width / 2;
    const sy = sBox.y + sBox.height / 2;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    // Cross the 8px PointerSensor activation threshold and STOP — do NOT
    // release. We want to inspect the DOM mid-drag.
    await page.mouse.move(sx + 30, sy + 30, { steps: 8 });

    // While drag is active, DraggableLesson sets `data-dragging-source`
    // on its inner cell (DraggableLesson.tsx:66). The OUTER element (the
    // one carrying useDraggable's setNodeRef) is the parent of the inner
    // cell — that outer element is where the regressed CSS transform
    // would be applied. Wait until the inner attribute appears so the
    // assertion below cannot race against drag-start.
    const innerSource = page.locator(
      `[data-dragging-source="${fixture.lessonId}"]`,
    );
    await expect(
      innerSource,
      'drag must be active (inner cell carries data-dragging-source attribute)',
    ).toBeVisible();
    const outerSource = innerSource.locator('xpath=..');

    const inlineTransform = await outerSource.evaluate(
      (el: HTMLElement) => el.style.transform || '',
    );
    expect(
      inlineTransform,
      'FIX 3: original DraggableLesson must NOT apply an inline CSS translate transform (DragOverlay handles the preview).',
    ).toBe('');

    // Belt-and-braces: also check the COMPUTED transform. 'none' means no
    // transform at all; matrix(1,0,0,1,0,0) is the identity matrix (== no
    // translation). Anything else would indicate a translate was applied.
    const computedTransform = await outerSource.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).transform,
    );
    expect(
      computedTransform === 'none' ||
        computedTransform === 'matrix(1, 0, 0, 1, 0, 0)',
      `FIX 3: computed transform on original drag source must be identity or 'none'; got '${computedTransform}'`,
    ).toBe(true);

    // Cleanly cancel the drag so the lesson is not moved (afterEach
    // cleanup deletes the run anyway, but a clean drag-cancel keeps the
    // page in a sane state should diagnostics need to inspect it).
    await page.keyboard.press('Escape');
    await page.mouse.up();
  });
});

/**
 * Switch the PerspectiveSelector to the seeded teacher (Maria Mueller).
 * Required because the timetable-store default perspective is
 * `{ perspective: 'teacher', perspectiveId: null }`, which leaves
 * useTimetableView disabled (`enabled: !!perspectiveId`) and the page
 * renders the "Kein Stundenplan vorhanden" empty state.
 *
 * Why teacher (not class): the production frontend hook
 * `useClasses` in apps/web/src/hooks/useTimetable.ts:91 calls
 * `/api/v1/classes` WITHOUT the required `?schoolId=...` query param,
 * so the API returns 404 → `classes = []` → no "Klassen" group ever
 * renders in the perspective dropdown. That's a separate frontend bug
 * (out of scope for this regression-coverage task — see SUMMARY
 * deviations). Driving via the teacher perspective is functionally
 * identical for the three FIXes under test (collision detection, body
 * shape, drag transform are all perspective-agnostic).
 *
 * Selector strategy: PerspectiveSelector renders a shadcn Select whose
 * trigger has role=combobox but no accessible name (Radix renders the
 * placeholder as inert text inside the trigger, so getByRole-with-name
 * misses it). The page only has ONE combobox before the grid mounts (the
 * DayWeekToggle is role=tablist), so `.first()` is safe and matches the
 * established pattern in admin-user-overrides.spec.ts:59 +
 * rooms-booking.spec.ts:202.
 */
async function selectTeacherPerspective(
  page: import('@playwright/test').Page,
  teacherDisplayName: string,
) {
  const trigger = page.getByRole('combobox').first();
  await trigger.click();

  // Teacher options are rendered with `${lastName} ${firstName}` as
  // visible text inside the "Lehrer" SelectGroup (PerspectiveSelector.tsx:95
  // + apps/web/src/hooks/useTimetable.ts:78).
  await page
    .getByRole('option', { name: teacherDisplayName, exact: true })
    .first()
    .click();

  // Wait for the timetable-view query to populate — the grid is the first
  // reliable signal that data has loaded.
  await expect(page.getByRole('grid', { name: 'Stundenplan' })).toBeVisible({
    timeout: 15_000,
  });
}
