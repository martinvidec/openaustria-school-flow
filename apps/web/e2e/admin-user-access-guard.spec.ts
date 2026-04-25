/**
 * Phase 13 Plan 13-03 — Non-admin access guard (desktop)
 *
 * Regression-guards UI-SPEC §590: "Zugriff & Berechtigungen" sidebar
 * group is gated with `roles: ['admin']` (stricter than "Personal &
 * Fächer" which admits schulleitung). Schulleitung MUST NOT see the
 * group nor the user-management surface.
 *
 * Secondary check: direct navigation to /admin/users as schulleitung
 * either redirects away OR renders a 403-style block (accepted via
 * locator.or()).
 */
import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/login';

test.describe('Phase 13 — User-Mgmt Access Guard (desktop)', () => {
  test('USER-GUARD-01: schulleitung does NOT see "Zugriff & Berechtigungen" sidebar group', async ({
    page,
  }) => {
    await loginAsRole(page, 'schulleitung');

    // Land on a known authenticated route where the sidebar renders.
    // /admin/substitutions is schulleitung's entry point.
    await page.goto('/admin/substitutions');

    // Wait for the sidebar to hydrate.
    await expect(page.getByRole('navigation').first()).toBeVisible({
      timeout: 15_000,
    });

    // Group label MUST NOT be visible.
    await expect(page.getByText('Zugriff & Berechtigungen')).not.toBeVisible({
      timeout: 3_000,
    });

    // The User entry within that group is also absent. Use exact match
    // because 'User' is a common substring.
    await expect(
      page.getByRole('link', { name: /^User$/ }),
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test('USER-GUARD-02: schulleitung direct-nav to /admin/users renders block page', async ({
    page,
  }) => {
    await loginAsRole(page, 'schulleitung');
    await page.goto('/admin/users');

    // Give router/guard time to settle.
    await page.waitForTimeout(2_000);

    // Accept any of the three valid block strategies:
    //   (a) the router redirects schulleitung away,
    //   (b) a 403-style block page renders with UI-SPEC §217 copy,
    //   (c) the page renders but the title 'User & Berechtigungen'
    //       never appears within 5s.
    const isRedirected = !page.url().endsWith('/admin/users');
    const blockPageVisible = await page
      .getByText(/Aktion nicht erlaubt|nur für Administratoren/i)
      .first()
      .isVisible()
      .catch(() => false);
    const titleVisible = await page
      .getByRole('heading', { name: 'User & Berechtigungen' })
      .isVisible()
      .catch(() => false);

    // At least one block-strategy must hold.
    expect(
      isRedirected || blockPageVisible || !titleVisible,
      `schulleitung must be blocked from /admin/users (url=${page.url()}, blockPage=${blockPageVisible}, titleVisible=${titleVisible})`,
    ).toBe(true);

    // Regardless of which branch fires, the per-user-detail Tab "Rollen"
    // must NEVER appear (it's only rendered on the detail surface — if
    // schulleitung somehow reached the list, the detail wouldn't be loaded).
    await expect(page.getByRole('tab', { name: 'Rollen' })).not.toBeVisible({
      timeout: 2_000,
    });
  });
});
