/**
 * Phase 16 Plan 16-07 Task 1 — Per-role login-redirect E2E.
 *
 * Verifies the role-aware redirect declared in `apps/web/src/routes/index.tsx`
 * (Plan 16-03 Task 1, decision D-02 + Pitfall #1):
 *   - admin             → /admin
 *   - schulleitung      → /timetable
 *   - lehrer            → /timetable
 *   - eltern            → /timetable
 *   - schueler          → /timetable
 *
 * The test re-navigates to `/` AFTER `loginAsRole` to deliberately exercise
 * the index-route `beforeLoad` redirect from the root URL. The helper itself
 * triggers the SPA auth gate with `page.goto('/')`, so on a fresh keycloak
 * session the page is already on the role's landing route after the helper
 * resolves. The explicit re-`goto('/')` after that point is the regression
 * confirmation: visiting `/` again under an authenticated session must still
 * resolve to the role-aware destination.
 *
 * The URL regex `/\/admin($|\?|#)/` and `/\/timetable($|\?|#)/` matches the
 * URL stem so future search params (e.g. TanStack Router default tab) do not
 * desync the assertion. Per `playwright.config.ts:33-43`, this `*.spec.ts`
 * file is picked up by the `desktop` (1280×800) project only.
 *
 * Threat model link: T-16-4 (Elevation of Privilege via mis-configured
 * beforeLoad redirect). This spec is the BEAUTOMATED behavioural assertion
 * that closes the threat-register row.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';

test.describe('Phase 16 — Login redirect role-aware (D-02 / ADMIN-01 + T-16-4)', () => {
  test('admin lands on /admin', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/');
    await expect(page).toHaveURL(/\/admin($|\?|#)/);
  });

  test('schulleitung lands on /timetable', async ({ page }) => {
    await loginAsRole(page, 'schulleitung');
    await page.goto('/');
    await expect(page).toHaveURL(/\/timetable($|\?|#)/);
  });

  test('lehrer lands on /timetable', async ({ page }) => {
    await loginAsRole(page, 'lehrer');
    await page.goto('/');
    await expect(page).toHaveURL(/\/timetable($|\?|#)/);
  });

  test('eltern lands on /timetable', async ({ page }) => {
    await loginAsRole(page, 'eltern');
    await page.goto('/');
    await expect(page).toHaveURL(/\/timetable($|\?|#)/);
  });

  test('schueler lands on /timetable', async ({ page }) => {
    await loginAsRole(page, 'schueler');
    await page.goto('/');
    await expect(page).toHaveURL(/\/timetable($|\?|#)/);
  });
});
