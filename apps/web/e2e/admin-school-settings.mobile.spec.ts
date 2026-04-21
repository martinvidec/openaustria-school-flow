/**
 * Phase 10 Admin Schulverwaltung — Mobile (375x812) E2E.
 *
 * Tests the md-breakpoint split: tab bar becomes a Select, PeriodsEditor
 * renders Cards instead of the table, and every visible interactive element
 * honours the 44px touch-target floor (UI-SPEC §10.5).
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe('Phase 10 — Admin School Settings (mobile 375)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('MOBILE-ADM-02 + D-12: tab bar becomes Select; PeriodsEditor renders Cards', async ({
    page,
  }) => {
    await page.goto('/admin/school/settings');

    const tabsList = page.locator('[role="tablist"]').first();
    await expect(tabsList).toHaveClass(/hidden md:flex/);

    const mobileSelect = page.locator('[role="combobox"]').first();
    await expect(mobileSelect).toBeVisible();

    await mobileSelect.click();
    await page.getByRole('option', { name: 'Zeitraster' }).click();
    await expect(page).toHaveURL(/tab=timegrid/);

    // Desktop table uses `.hidden.md:block` on its wrapper → hidden at <md.
    // Mobile cards container uses `.md:hidden.space-y-3`.
    const mobileCards = page.locator('div.md\\:hidden.space-y-3');
    await expect(mobileCards).toBeVisible();
  });

  test('MOBILE-ADM-02: 44px touch-target floor on all visible interactive elements', async ({
    page,
  }) => {
    await page.goto('/admin/school/settings?tab=timegrid');

    const interactives = page.locator(
      'button:visible, input:visible, [role="switch"]:visible, [role="combobox"]:visible',
    );
    const count = await interactives.count();
    const failures: Array<{ index: number; width: number; height: number; html: string }> = [];
    for (let i = 0; i < count; i++) {
      const el = interactives.nth(i);
      const box = await el.boundingBox();
      if (!box) continue;
      // 1px subpixel tolerance for rounded layouts.
      if (box.width < 43.5 || box.height < 43.5) {
        const html = (await el.evaluate((node) => (node as HTMLElement).outerHTML)).slice(0, 140);
        failures.push({ index: i, width: box.width, height: box.height, html });
      }
    }
    // Document any sub-44px elements so the UI reviewer can triage them.
    expect(failures, `Touch-target floor violations:\n${JSON.stringify(failures, null, 2)}`).toEqual([]);
  });

  test('Sticky mobile save bar appears when Stammdaten form is dirty', async ({ page }) => {
    await page.goto('/admin/school/settings');
    const nameInput = page.getByLabel('Schulname *');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(`Test Schule Mobile ${Date.now()}`);
    const stickyBar = page.locator('[role="region"][aria-label="Speichern"]');
    await expect(stickyBar).toBeVisible();
  });
});
