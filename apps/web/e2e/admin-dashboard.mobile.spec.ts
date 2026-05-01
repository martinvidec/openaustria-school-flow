/**
 * Phase 16 Plan 16-07 Task 3 — Admin Dashboard mobile-375 E2E.
 *
 * Closes MOBILE-ADM-01 / MOBILE-ADM-02 / MOBILE-ADM-03 for the /admin
 * surface at the iPhone-13 (375 × 812) and Pixel-5 (mobile-chrome) viewport
 * pair. Per `playwright.config.ts:47-59`, this `*.mobile.spec.ts` file is
 * routed to BOTH `mobile-375` and `mobile-chrome` projects.
 *
 * Test coverage:
 *   1. ADMIN-01 + MOBILE-ADM-03 — 10 rows render at 375px without
 *      horizontal overflow
 *   2. MOBILE-ADM-02 — every checklist row honours the 44px touch-target
 *      floor (h ≥ 43.5px tolerance for subpixel rounding)
 *   3. UI-SPEC § Status badge icon-adjunct — at <sm the labelled badge
 *      collapses to icon-only (ChecklistItem.tsx:90-95 hidden sm:inline-flex
 *      vs sm:hidden split)
 *   4. MOBILE-ADM-03 — opening the MobileSidebar drawer reveals the
 *      Dashboard, DSGVO-Verwaltung, and Audit-Log entries (Plan 16-03 Task 1
 *      Phase 15 gap closure). The hamburger trigger is `aria-label="Navigation
 *      oeffnen"` on the AppHeader (AppHeader.tsx:21).
 *
 * Project routing: `*.mobile.spec.ts` → `mobile-375` (iPhone 13) +
 * `mobile-chrome` (Pixel 5) per `playwright.config.ts:47-59`.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe('Phase 16 — Admin Dashboard (mobile 375)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ADMIN-01 + MOBILE-ADM-03 — render at 375px without horizontal overflow
  test('renders 10 rows at 375px without horizontal overflow', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page.locator('[data-checklist-item]')).toHaveCount(10);

    const overflow = await page.evaluate(
      () => document.body.scrollWidth - window.innerWidth,
    );
    expect(
      overflow,
      `No horizontal overflow at 375px (${overflow}px past viewport)`,
    ).toBeLessThanOrEqual(0);
  });

  // MOBILE-ADM-02 — 44px floor on every checklist row
  test('every checklist row is >= 44px touch target', async ({ page }) => {
    await page.goto('/admin');
    const items = page.locator('[data-checklist-item]');
    await expect(items).toHaveCount(10);

    const count = await items.count();
    const failures: Array<{ index: number; key: string | null; height: number }> = [];
    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox();
      if (!box) continue;
      if (box.height < 43.5) {
        const key = await items.nth(i).getAttribute('data-checklist-item');
        failures.push({ index: i, key, height: box.height });
      }
    }
    expect(
      failures,
      `Sub-44px checklist rows:\n${JSON.stringify(failures, null, 2)}`,
    ).toEqual([]);
  });

  // UI-SPEC § icon-adjunct rule — at <sm the labelled badge collapses to icon
  test('status badge collapses to icon-only at <sm (text hidden + icon visible)', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page.locator('[data-checklist-item]').first()).toBeVisible();

    // ChecklistItem.tsx:90-99 — labelled <Badge> has `hidden sm:inline-flex`,
    // adjunct StatusIcon has `sm:hidden` + aria-label set to the same German
    // status copy ("Erledigt" / "Unvollständig" / "Fehlt"). At 375px
    // (< sm-breakpoint 640px) the text badge MUST NOT be visible AND the icon
    // adjunct MUST be visible. Phase 16 GAP-CLOSURE (16-VERIFICATION
    // human_needed item 2) extended the assertion to lock both directions of
    // the responsive collapse, not just the text-hidden side.
    const firstRow = page.locator('[data-checklist-item]').first();
    const textBadge = firstRow.getByText(/^(Erledigt|Unvollständig|Fehlt)$/);
    await expect(textBadge).toBeHidden();

    // Adjunct icon: `<StatusIcon aria-label="Erledigt|Unvollständig|Fehlt" />`
    // (ChecklistItem.tsx:96-99). Locate via aria-label scoped to the first row
    // so the assertion survives status changes on subsequent runs.
    const adjunctIcon = firstRow.getByLabel(/^(Erledigt|Unvollständig|Fehlt)$/);
    await expect(adjunctIcon).toBeVisible();

    // Defensive lock on the responsive class: the icon SVG MUST carry
    // `sm:hidden` so the desktop-text/icon split survives Tailwind purges.
    await expect(adjunctIcon).toHaveClass(/sm:hidden/);
  });

  // MOBILE-ADM-03 — MobileSidebar drawer parity (Phase 15 gap closure)
  test('MobileSidebar drawer contains Dashboard, DSGVO, Audit-Log entries', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page.locator('[data-checklist-item]').first()).toBeVisible();

    // AppHeader.tsx:16-23 — the hamburger button is the only `sm:hidden`
    // ghost-variant button at the top-left with the literal aria-label
    // "Navigation oeffnen". Use it directly so the locator survives any
    // future header layout shuffle.
    await page.getByRole('button', { name: 'Navigation oeffnen' }).click();

    // The drawer animates in from the left. Once the Dashboard link is
    // visible the rest of the drawer has rendered.
    await expect(
      page.getByRole('link', { name: /^Dashboard$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /^DSGVO-Verwaltung$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /^Audit-Log$/i }),
    ).toBeVisible();
  });
});
