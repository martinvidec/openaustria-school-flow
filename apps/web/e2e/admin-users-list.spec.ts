/**
 * Phase 13 Plan 13-03 — Admin User Directory list (desktop)
 *
 * Covers USER-01 — Keycloak user directory hydrated with DB role list +
 * person-link reverse-lookup. Verifies filter-bar, list-render, row-click,
 * and the Sperren/Reaktivieren row actions.
 *
 * Prefix isolation: this spec uses the schulleitung seed user as the
 * subject of the Sperren/Reaktivieren flow (it is NOT the logged-in
 * admin, and disabling it will not lock us out). afterEach restores the
 * enabled state so the suite is idempotent.
 *
 * DOM note: both UserListTable (desktop) AND UserMobileCards render
 * simultaneously at every viewport (Tailwind hidden/visible classes only
 * affect display, not the DOM tree). All text-based locators therefore
 * use `.first()` to satisfy strict mode.
 *
 * Prerequisites:
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed (5 seed users, 5 roles, seed school)
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { loginAsAdmin, getAdminToken } from './helpers/login';
import { USER_API, getSeedUserId } from './helpers/users';

test.describe('Phase 13 — Admin User Directory (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Best-effort: re-enable schulleitung-user so the Sperren/Reaktivieren
    // tests are independent across reruns.
    await restoreUserEnabled(request, 'schulleitung');
  });

  test('USER-01-LIST-01: list loads with title + 6 column headers + at least one seed row', async ({
    page,
  }) => {
    await page.goto('/admin/users');

    await expect(
      page.getByRole('heading', { name: 'User & Berechtigungen' }),
    ).toBeVisible();

    // 6 declared headers per UI-SPEC §253-265.
    for (const name of [
      'Nachname',
      'Vorname',
      'E-Mail',
      'Rollen',
      'Verknüpft mit',
      'Status',
    ]) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }

    // At least one seed row visible. Use email (deterministic seed value);
    // .first() because table + mobile cards render simultaneously.
    await expect(page.getByText('admin@schoolflow.dev').first()).toBeVisible();
  });

  test('USER-01-LIST-02: search filter narrows results to schulleitung-user', async ({
    page,
  }) => {
    await page.goto('/admin/users');
    // Wait for the table to fully hydrate before typing — otherwise the
    // initial useUsers result re-renders and clobbers our debounce.
    await expect(page.getByText('admin@schoolflow.dev').first()).toBeVisible();

    await page.getByPlaceholder('Name oder E-Mail …').first().fill('schulleitung');
    // 300ms debounce + network refetch.
    await page.waitForTimeout(700);

    // schulleitung row visible (uses email "direktor@schoolflow.dev").
    await expect(
      page.getByText('direktor@schoolflow.dev').first(),
    ).toBeVisible();
    // admin-user must NOT appear (search="schulleitung" excludes it).
    await expect(page.getByText('admin@schoolflow.dev')).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('USER-01-LIST-03: Rolle filter shows only users with the selected role (Lehrer)', async ({
    page,
  }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('lehrer@schoolflow.dev').first()).toBeVisible();

    // Open the Rolle multi-select. The trigger button shows the verbatim
    // placeholder "Alle Rollen" while no role is selected.
    await page.getByRole('button', { name: 'Alle Rollen' }).click();

    // The popover renders a listbox with checkbox-rows (label = displayName).
    await page
      .getByRole('listbox', { name: 'Rollen filtern' })
      .getByText('Lehrer', { exact: true })
      .click();

    // Close popover.
    await page.keyboard.press('Escape');
    // Wait for query refetch.
    await page.waitForTimeout(500);

    // lehrer-user row remains; admin row excluded.
    await expect(page.getByText('lehrer@schoolflow.dev').first()).toBeVisible();
    await expect(page.getByText('admin@schoolflow.dev')).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('USER-01-LIST-04: Sperren row-action → WarnDialog → confirm → Status badge flips to Deaktiviert', async ({
    page,
  }) => {
    await page.goto('/admin/users');

    // Locate the schulleitung row (uses email as the unique identifier
    // visible in both desktop and mobile views — but we narrow to the
    // desktop <tr> only).
    const row = page
      .locator('tr')
      .filter({ hasText: 'direktor@schoolflow.dev' });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Aktionen' }).click();
    await page.getByRole('menuitem', { name: 'Sperren' }).click();

    // DisableUserDialog opens.
    await expect(
      page.getByRole('heading', { name: 'User sperren?' }),
    ).toBeVisible();

    // Destructive confirm (footer).
    await page.getByRole('button', { name: 'Sperren' }).last().click();

    // Toast — UI-SPEC pins 'User gesperrt'.
    await expect(page.getByText('User gesperrt')).toBeVisible();

    // Status cell flips to Deaktiviert (after invalidate refetch).
    await expect(row.getByText('Deaktiviert')).toBeVisible({ timeout: 5_000 });
  });

  test('USER-01-LIST-05: Reaktivieren row-action → status flips back to Aktiv', async ({
    page,
    request,
  }) => {
    // Set state via API so the test is independent of -04.
    const token = await getAdminToken(request);
    const schulleitungId = await getSeedUserId(request, 'schulleitung');
    await request.put(
      `${USER_API}/admin/users/${schulleitungId}/enabled`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { enabled: false },
      },
    );

    await page.goto('/admin/users');

    const row = page
      .locator('tr')
      .filter({ hasText: 'direktor@schoolflow.dev' });
    await expect(row).toBeVisible();
    // Confirm precondition rendered.
    await expect(row.getByText('Deaktiviert')).toBeVisible();

    await row.getByRole('button', { name: 'Aktionen' }).click();
    await page.getByRole('menuitem', { name: 'Reaktivieren' }).click();

    await expect(
      page.getByRole('heading', { name: 'User reaktivieren?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Reaktivieren' }).last().click();

    await expect(page.getByText('User reaktiviert')).toBeVisible();
    await expect(row.getByText('Aktiv')).toBeVisible({ timeout: 5_000 });
  });
});

async function restoreUserEnabled(
  request: APIRequestContext,
  role: 'admin' | 'schulleitung' | 'lehrer' | 'eltern' | 'schueler',
): Promise<void> {
  try {
    const token = await getAdminToken(request);
    const userId = await getSeedUserId(request, role);
    await request.put(`${USER_API}/admin/users/${userId}/enabled`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { enabled: true },
    });
  } catch {
    /* best-effort */
  }
}
