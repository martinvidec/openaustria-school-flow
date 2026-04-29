/**
 * Phase 16 Plan 05 Task 1 — Admin mobile sweep at 375px.
 *
 * Audit-first regression guard for MOBILE-ADM-01 + MOBILE-ADM-02 per
 * 16-CONTEXT D-16 ("Mobile-Viewport-Sweep über alle bestehenden
 * Admin-Formulare als initialer Audit-Schritt").
 *
 * For every admin route this spec asserts:
 *   1. No horizontal overflow of `document.body` at 375px viewport
 *   2. Every visible interactive element honours the 44px touch-target
 *      floor (min-height ≥ 43.5px to allow 0.5px subpixel rounding)
 *
 * The 16 ADMIN_ROUTES array is locked per Phase 16 RESEARCH Code Example 5.
 * It covers: dashboard, school-settings, subjects, teachers, classes,
 * students, users, solver, solver-tuning, dsgvo, audit-log, import,
 * resources, substitutions, timetable-edit, timetable-history.
 *
 * Initial-run policy (per plan 16-05 Task 1 instructions):
 *   - This spec WILL fail on routes whose tables have not yet been migrated
 *     (Plan 05 Tasks 2/3) or whose primitives haven't picked up the Plan 04
 *     touch-target floor lift. The failure list IS the audit output for
 *     Plan 07 (final mobile sweep) to triage.
 *   - Each FAILURE entry (route + violation count) is captured by the
 *     Playwright JSON reporter and surfaced in 16-05-SUMMARY.md.
 *
 * Run mode: `serial` to keep the same browser context across routes (faster
 * than re-logging-in for every route).
 *
 * Project routing: this file is `*.mobile.spec.ts` so it auto-routes to
 * the `mobile-375` (iPhone 13 viewport) AND `mobile-chrome` (Pixel 5)
 * projects per `playwright.config.ts:47-59`.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

const ADMIN_ROUTES = [
  '/admin',
  '/admin/school/settings',
  '/admin/subjects',
  '/admin/teachers',
  '/admin/classes',
  '/admin/students',
  '/admin/users',
  '/admin/solver',
  '/admin/solver-tuning',
  '/admin/dsgvo',
  '/admin/audit-log',
  '/admin/import',
  '/admin/resources',
  '/admin/substitutions',
  '/admin/timetable-edit',
  '/admin/timetable-history',
];

test.describe.configure({ mode: 'serial' });
test.describe('Phase 16 — Mobile sweep at 375px', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const route of ADMIN_ROUTES) {
    test(`${route} — 44px floor + no horizontal overflow`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const docOverflow = await page.evaluate(
        () => document.body.scrollWidth - window.innerWidth,
      );
      expect(
        docOverflow,
        `${route} has horizontal overflow (${docOverflow}px past viewport width)`,
      ).toBeLessThanOrEqual(0);

      const interactives = page.locator(
        'button:visible, input:visible, [role="switch"]:visible, [role="combobox"]:visible, [role="link"]:visible, a:visible',
      );
      const count = await interactives.count();
      const failures: Array<{ index: number; height: number; html: string }> = [];
      for (let i = 0; i < count; i++) {
        const box = await interactives.nth(i).boundingBox();
        if (!box) continue;
        if (box.height < 43.5) {
          const html = (
            await interactives.nth(i).evaluate((n) => (n as HTMLElement).outerHTML)
          ).slice(0, 120);
          failures.push({ index: i, height: box.height, html });
        }
      }
      expect(
        failures,
        `${route}: ${failures.length} sub-44px interactive(s)\n${JSON.stringify(failures, null, 2)}`,
      ).toEqual([]);
    });
  }
});
