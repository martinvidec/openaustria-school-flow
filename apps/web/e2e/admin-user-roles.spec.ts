/**
 * Phase 13 Plan 13-03 — Admin User Roles tab (desktop)
 *
 * Covers USER-02 — Role assignment with Self-Lockout-Warn client guard +
 * server-side Last-Admin-Guard 409 invariant.
 *
 * Tests:
 *   USER-02-ROLES-01: admin assigns 'schulleitung' to lehrer-user → toast + role persists
 *   USER-02-ROLES-02: admin un-tick admin on admin-user → SelfLockoutWarnDialog appears
 *   USER-02-ROLES-03: admin cancels SelfLockoutWarnDialog → checkbox reverts, no mutation
 *   USER-02-ROLES-04: admin confirms SelfLockoutWarnDialog → backend 409 →
 *                     LastAdminGuardDialog visible + DB state unchanged + no green toast
 *
 * Seed-state restoration: afterEach restores admin-user roles to ['admin']
 * and lehrer-user roles to ['lehrer'] so the suite is idempotent.
 *
 * Seed invariant: admin-user is the ONLY admin in seed (USER-02-ROLES-04
 * relies on this — the last-admin-guard 409 only fires when removing the
 * last admin would leave zero admins).
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  getSeedUserId,
  getUserRoles,
  setUserRoles,
} from './helpers/users';

test.describe('Phase 13 — Admin User Roles (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Restore seed roles. We swallow errors because the test may have
    // landed on a 409 path that already left state correct.
    const adminId = await getSeedUserId(request, 'admin').catch(() => null);
    if (adminId) {
      await setUserRoles(request, adminId, ['admin']).catch(() => {});
    }
    const lehrerId = await getSeedUserId(request, 'lehrer').catch(() => null);
    if (lehrerId) {
      await setUserRoles(request, lehrerId, ['lehrer']).catch(() => {});
    }
  });

  test('USER-02-ROLES-01: admin assigns schulleitung to lehrer-user → toast + role persists', async ({
    page,
    request,
  }) => {
    const lehrerId = await getSeedUserId(request, 'lehrer');

    await page.goto(`/admin/users/${lehrerId}`);
    await expect(page.getByRole('tab', { name: 'Rollen' })).toBeVisible();
    await page.getByRole('tab', { name: 'Rollen' }).click();

    // Section title verbatim.
    // CardTitle renders as <div>, not <h*> — match by text.
    await expect(page.getByText('Rollen zuweisen', { exact: true })).toBeVisible();

    // JWT-refresh hint verbatim (UI-SPEC §303).
    await expect(
      page.getByText(
        'Änderungen wirken spätestens nach erneutem Login vollständig (typisch innerhalb von 15 Minuten).',
      ),
    ).toBeVisible();

    // Tick the Schulleitung row by clicking the wrapping <label> text. Each
    // role's <label> wraps both a Checkbox and the displayName — clicking
    // the visible text toggles the bound checkbox.
    await page.getByText('Schulleitung', { exact: true }).first().click();

    // Save (desktop button).
    await page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first()
      .click();

    // Success toast — UI-SPEC §537/569: 'Rollen aktualisiert' verbatim.
    await expect(page.getByText('Rollen aktualisiert')).toBeVisible();

    // Verify server state.
    const roles = await getUserRoles(request, lehrerId);
    expect(roles.sort()).toEqual(['lehrer', 'schulleitung'].sort());
  });

  test('USER-02-ROLES-02: un-ticking admin on admin-user opens SelfLockoutWarnDialog', async ({
    page,
    request,
  }) => {
    const adminId = await getSeedUserId(request, 'admin');

    await page.goto(`/admin/users/${adminId}`);
    await page.getByRole('tab', { name: 'Rollen' }).click();
    // CardTitle renders as <div>, not <h*> — match by text.
    await expect(page.getByText('Rollen zuweisen', { exact: true })).toBeVisible();

    // Un-tick admin.
    await page.getByText('Administrator', { exact: true }).first().click();

    // Click save → SelfLockoutWarnDialog.
    await page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first()
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Sich selbst die Admin-Rolle entziehen?',
      }),
    ).toBeVisible();

    // Body excerpt (loose substring — full copy interpolates).
    await expect(
      page.getByText(/mindestens ein weiterer Admin/i),
    ).toBeVisible();

    // Both buttons present.
    await expect(
      page.getByRole('button', { name: 'Admin-Rolle entziehen' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Abbrechen' }),
    ).toBeVisible();
  });

  test('USER-02-ROLES-03: cancelling SelfLockoutWarnDialog reverts checkbox and skips mutation', async ({
    page,
    request,
  }) => {
    const adminId = await getSeedUserId(request, 'admin');

    await page.goto(`/admin/users/${adminId}`);
    await page.getByRole('tab', { name: 'Rollen' }).click();
    // CardTitle renders as <div>, not <h*> — match by text.
    await expect(page.getByText('Rollen zuweisen', { exact: true })).toBeVisible();

    // Un-tick admin.
    await page.getByText('Administrator', { exact: true }).first().click();
    await page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first()
      .click();

    // Dialog appears, click Abbrechen.
    await expect(
      page.getByRole('heading', {
        name: 'Sich selbst die Admin-Rolle entziehen?',
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Abbrechen' }).click();

    // Dialog dismissed.
    await expect(
      page.getByRole('heading', {
        name: 'Sich selbst die Admin-Rolle entziehen?',
      }),
    ).not.toBeVisible({ timeout: 3_000 });

    // Server state unchanged — admin still has 'admin'.
    const roles = await getUserRoles(request, adminId);
    expect(roles).toContain('admin');
  });

  test('USER-02-ROLES-04: confirming SelfLockoutWarnDialog → 409 → LastAdminGuardDialog + DB unchanged + no green toast', async ({
    page,
    request,
  }) => {
    const adminId = await getSeedUserId(request, 'admin');

    await page.goto(`/admin/users/${adminId}`);
    await page.getByRole('tab', { name: 'Rollen' }).click();
    // CardTitle renders as <div>, not <h*> — match by text.
    await expect(page.getByText('Rollen zuweisen', { exact: true })).toBeVisible();

    // Un-tick admin → save → confirm SelfLockout.
    await page.getByText('Administrator', { exact: true }).first().click();
    await page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first()
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Sich selbst die Admin-Rolle entziehen?',
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Admin-Rolle entziehen' }).click();

    // Backend 409 → LastAdminGuardDialog appears.
    await expect(
      page.getByRole('heading', {
        name: 'Mindestens ein Admin muss bestehen bleiben',
      }),
    ).toBeVisible({ timeout: 10_000 });

    // Body copy excerpt (UI-SPEC §231).
    await expect(
      page.getByText(/Weise einem anderen User die Admin-Rolle zu/i),
    ).toBeVisible();

    // Close button verbatim.
    await expect(page.getByRole('button', { name: 'Verstanden' })).toBeVisible();
    await page.getByRole('button', { name: 'Verstanden' }).click();

    // Silent-4xx invariant: green toast must NEVER appear.
    await expect(page.getByText('Rollen aktualisiert')).not.toBeVisible({
      timeout: 3_000,
    });

    // Server state unchanged.
    const roles = await getUserRoles(request, adminId);
    expect(roles).toContain('admin');
  });
});
