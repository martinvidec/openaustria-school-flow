/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-RBAC-01 schulleitung negative case.
 *
 * Surface: /admin/solver-tuning + sidebar visibility for the schulleitung
 *          role.
 * Requirement: D-03 — Solver-Tuning is admin-only (sidebar entry hidden +
 *              route-component gate). Schulleitung must NOT reach the
 *              tuning surface.
 *
 * Mitigation T-14-08 (spoofing schulleitung direct URL access): the
 * solver-tuning route component (apps/web/src/routes/_authenticated/admin/
 * solver-tuning.tsx) checks `useAuth().user.roles.includes('admin')` and
 * renders a "Aktion nicht erlaubt" PageShell when the gate fails — does
 * NOT redirect away from the URL. So we assert the page shows the
 * permission-denied content rather than asserting a URL change.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';

test.describe('Phase 14 — Solver-Tuning RBAC', () => {
  test('E2E-SOLVER-RBAC-01: schulleitung cannot see entry or access route', async ({
    page,
  }) => {
    await loginAsRole(page, 'schulleitung');

    // Sidebar must NOT contain the Solver-Tuning entry. Schulleitung lands
    // on / (home) after login; the AppSidebar is rendered for every
    // authenticated route.
    await page.goto('/admin');
    await expect(
      page.getByRole('link', { name: /Solver-Tuning/i }),
    ).toHaveCount(0);

    // Direct navigation must surface the admin-gate "Aktion nicht erlaubt"
    // page from solver-tuning.tsx (no redirect — the component renders the
    // gate inline so the URL stays put).
    await page.goto('/admin/solver-tuning');
    await expect(
      page.getByRole('heading', { name: 'Aktion nicht erlaubt' }),
    ).toBeVisible();
    await expect(
      page.getByText('Diese Funktion ist nur für Administratoren verfügbar.'),
    ).toBeVisible();

    // Sanity: the protected admin tab structure must NOT be visible — i.e.
    // no "Gewichtungen" tab trigger.
    await expect(
      page.getByRole('tab', { name: 'Gewichtungen' }),
    ).toHaveCount(0);
  });
});
