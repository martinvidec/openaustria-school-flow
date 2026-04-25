/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-MOBILE-01 mobile parity at 375.
 *
 * Surface: /admin/solver-tuning?tab=weights at 375×812.
 * Requirement: D-04 + MOBILE-ADM-01/02 — admin Solver-Tuning works on the
 * 375px viewport with horizontally-scrollable tab-bar, ≥44px slider thumb
 * tap-zone, sticky save bar on dirty, and ToggleGroup sub-tab fallback in
 * Tab 4.
 *
 * Project routing: per playwright.config.ts:42, this file matches the
 * `(-mobile.spec.ts)` glob and runs in the `mobile-375` (iPhone 13) and
 * `mobile-chrome` (Pixel 5) projects. The `mobile-375`/iPhone-13 path is
 * accepted-unstable on darwin per Phase 10.4-03 / 11-03 / 12-03 precedent
 * (Bus-Error-10), so we skip on webkit and rely on Chromium emulation for
 * the verifiable green bar.
 *
 * The desktop project ignores `*-mobile.spec.ts` per playwright.config.ts —
 * Task 1 list-discovery via `--project=desktop --list` will therefore show
 * 12 tests (12 SOLVER + 1 RBAC, minus this mobile spec). Mobile coverage is
 * proven via `--project=mobile-chrome admin-solver-tuning-mobile`.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupConstraintTemplatesViaAPI,
  cleanupConstraintWeightOverridesViaAPI,
} from './helpers/constraints';

// 375×812 — set explicitly so the spec is robust even when run in a project
// whose default device is wider (e.g. ad-hoc runs).
test.use({ viewport: { width: 375, height: 812 } });

// Phase 10.4-03 precedent: WebKit (iPhone 13) hits Bus-Error-10 on darwin
// runners. Mobile coverage is via Chromium-Pixel-5 emulation only.
test.skip(
  ({ browserName }) => browserName === 'webkit',
  'Mobile WebKit Bus-Error-10 (Phase 10.4-03 precedent)',
);

const CONSTRAINT_NAME = 'No same subject doubling';

test.describe('Phase 14 — Solver-Tuning Mobile (375)', () => {
  test.beforeEach(async ({ page, request }) => {
    await cleanupConstraintTemplatesViaAPI(request);
    await cleanupConstraintWeightOverridesViaAPI(request);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupConstraintTemplatesViaAPI(request);
    await cleanupConstraintWeightOverridesViaAPI(request);
  });

  test('E2E-SOLVER-MOBILE-01: tab-bar scroll + slider tap-zone + StickyMobileSaveBar + Sub-Tab ToggleGroup', async ({
    page,
  }) => {
    await page.goto('/admin/solver-tuning?tab=weights');

    // 1) Tab-bar is the inner Solver-Tuning tablist (the page also has a
    //    `nav` landmark via the sidebar). The Solver-Tuning tablist has the
    //    "Constraints" / "Gewichtungen" / "Klassen-Sperrzeiten" /
    //    "Fach-Präferenzen" triggers — pick it explicitly via that scope.
    const tabList = page
      .getByRole('tablist')
      .filter({ has: page.getByRole('tab', { name: 'Gewichtungen' }) })
      .first();
    await expect(tabList).toBeVisible();
    const overflow = await tabList.evaluate((el) => getComputedStyle(el).overflowX);
    // SolverTuningTabs uses `overflow-x-auto` (Tailwind utility → 'auto').
    expect(['auto', 'scroll']).toContain(overflow);

    // 2) Slider thumb tap-zone ≥ 44px high. Radix Slider thumb has
    //    role="slider"; ConstraintWeightSliderRow's slider class adds extra
    //    height in custom-state (via ring) but the bare thumb is what we
    //    care about for touch ergonomics.
    const thumb = page.getByRole('slider').first();
    await thumb.scrollIntoViewIfNeeded();
    const box = await thumb.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    // 3) StickyMobileSaveBar appears on dirty. Selector: role=region with
    //    aria-label="Speichern" (StickyMobileSaveBar.tsx:15-16).
    const row = page.locator(`[data-constraint-name="${CONSTRAINT_NAME}"]`);
    await row.getByLabel(/^Gewichtung für /).fill('50');
    const stickyBar = page.getByRole('region', { name: 'Speichern' });
    await expect(stickyBar).toBeVisible();

    // 4) Sub-Tab ToggleGroup in Tab 4 ("Fach-Präferenzen"). The dirty Tab 2
    //    state from step 3 above intercepts the tab switch with an
    //    UnsavedChangesDialog ("Aenderungen verwerfen?"). Click "Verwerfen"
    //    so the switch can proceed.
    await page.getByRole('tab', { name: 'Fach-Präferenzen' }).click();
    const verwerfenBtn = page
      .getByRole('dialog')
      .getByRole('button', { name: /Verwerfen|Aenderungen verwerfen/ });
    if (await verwerfenBtn.isVisible().catch(() => false)) {
      await verwerfenBtn.click();
    }

    // The mobile branch (<sm) renders a Radix ToggleGroup with two items:
    // "Vormittags-Präferenzen" + "Bevorzugte Slots". Both labels also
    // appear in the desktop Tabs trigger (rendered hidden in DOM via
    // sm:block), so we use `.first()` and rely on Playwright's visibility
    // check. Radix ToggleGroup type='single' uses role='radio' for items
    // (role='group' on the root is the new ARIA naming spec).
    const morningToggle = page
      .getByRole('radio', { name: /Vormittags-Präferenzen/ })
      .first();
    const slotToggle = page
      .getByRole('radio', { name: /Bevorzugte Slots/ })
      .first();
    await expect(morningToggle).toBeVisible();
    await expect(slotToggle).toBeVisible();
  });
});
