/**
 * Issue #188 — the admin timetable perspective dropdown must stay within the
 * viewport. With realistic data density (seed: 32 teachers + 12 classes + 25
 * rooms) the shadcn Select content used Tailwind-v3 `max-h-[--var]` syntax,
 * which Tailwind v4 compiles to invalid `max-height:--var` (no `var()` wrap) →
 * the cap was dropped → the 69-row list ran off the bottom of the screen and
 * was unreachable.
 *
 * This spec would FAIL without the fix: the unbounded list renders ~2200px tall
 * on the 800px desktop viewport.
 *
 * Read-only on the SEED school on purpose (D4 exception): the overflow only
 * reproduces with many entities, and a throwaway school has a single teacher.
 * No writes here, so there is no cross-spec race.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe('Issue #188 — Select dropdown stays within the viewport', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Viewport-bound assertion is run on the desktop project.',
  );

  test('PERSP-DROPDOWN-01: the perspective dropdown is height-bounded with the full seed roster', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/timetable');

    // The perspective selector trigger (admin/schulleitung only).
    const trigger = page.getByRole('combobox').first();
    await expect(trigger).toBeVisible();
    await trigger.click();

    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();

    // The roster is large enough that an unbounded list would overflow — assert
    // it is, so the height bound below is a meaningful check.
    expect(
      await listbox.getByRole('option').count(),
      'seed roster should yield many options',
    ).toBeGreaterThan(20);

    const box = await listbox.boundingBox();
    const vp = page.viewportSize();
    expect(box, 'dropdown bounding box').toBeTruthy();
    expect(vp, 'viewport size').toBeTruthy();

    // The max-height cap keeps the content within the viewport (and scrollable).
    // Pre-#188 this was ~2200px on an 800px viewport.
    expect(box!.height).toBeLessThanOrEqual(vp!.height);
    // And it must not run off the bottom edge (small tolerance for borders).
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp!.height + 2);
  });
});
