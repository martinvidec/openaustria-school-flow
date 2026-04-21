/**
 * Phase 10.2 — Mobile UAT screenshot capture (375px) [SCREENSHOT]
 *
 * Matching pair to `screenshots.spec.ts`. Produces the Phase-10 mobile
 * overview PNG under
 * `.planning/phases/10-schulstammdaten-zeitraster/uat-screenshots/MOBILE-OVERVIEW.png`.
 *
 * Why a separate file: the `mobile-375` Playwright project uses the iPhone 13
 * device preset (WebKit + correct userAgent + touch), which is what the
 * existing admin-school-settings.mobile.spec.ts relies on for deterministic
 * hydration at 375px. Inlining a `test.use({ ...devices['iPhone 13'] })`
 * inside a describe group is rejected by Playwright (cannot override
 * defaultBrowserType inside describe scope). Splitting the mobile case
 * into a `.mobile.spec.ts` file routes it cleanly into the existing
 * mobile-375 project via `playwright.config.ts` testMatch rules.
 *
 * Regenerate command (from repo root):
 *   cd apps/web && pnpm exec playwright test --grep SCREENSHOT
 *
 * Note: on macOS <14.7 the frozen WebKit build can segfault (Phase 10.2-01
 * deferred-item #1). On CI (ubuntu-latest) it runs clean. If a local run
 * cannot execute this spec, CI will still produce the MOBILE-OVERVIEW PNG
 * on every PR.
 */
import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginAsAdmin } from './helpers/login';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(
  SPEC_DIR,
  '..',
  '..',
  '..',
  '.planning',
  'phases',
  '10-schulstammdaten-zeitraster',
  'uat-screenshots',
);

test.describe('Phase 10.2 — UAT mobile overview screenshot [SCREENSHOT]', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('SCREENSHOT MOBILE-OVERVIEW: admin landing at 375px shows Select tab switcher', async ({
    page,
  }) => {
    await page.goto('/admin/school/settings');

    // At <md the tab bar (role=tablist) carries `hidden md:flex` — it is
    // always present in the DOM but never visible at 375px. The Select-
    // based tab switcher (role=combobox) is the mobile equivalent and is
    // the reliable hydration signal at this viewport.
    const mobileSelect = page.locator('[role="combobox"]').first();
    await expect(mobileSelect).toBeVisible();
    // Brief settle so any final layout shift from reading the school
    // context (name, badges) finishes before we capture.
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'MOBILE-OVERVIEW.png'),
      fullPage: true,
    });
  });
});
