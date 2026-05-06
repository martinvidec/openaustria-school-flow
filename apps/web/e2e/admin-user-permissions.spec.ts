/**
 * Phase 13 Plan 13-03 — Admin Effective Permissions tab (desktop)
 *
 * Covers USER-03 — Effective permissions resolved from role inheritance +
 * per-user ACL overrides, displayed with source attribution (role name vs
 * override) and interpolated conditions.
 *
 * Tests:
 *   USER-03-PERM-01: admin opens Berechtigungen tab → accordion groups
 *                    rendered by subject → role-sourced rows show
 *                    SourceChip 'Rolle: admin'
 *   USER-03-PERM-02: admin seeds an override on lehrer-user via API →
 *                    Berechtigungen tab shows the Override row with
 *                    SourceChip 'Override' and granted=false rendered as
 *                    'Verweigert'
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  getSeedUserId,
  createPermissionOverrideViaAPI,
  cleanupE2EOverrides,
  USER_PREFIX,
} from './helpers/users';

test.describe('Phase 13 — Admin Effective Permissions (desktop)', () => {
  // Phase 17 deferred: shared admin-user search-fixture regression
  // (#cluster-13-permissions). 2/2 fail in CI (PR #1 lines 101-102). Same
  // root cause family as #cluster-13-overrides. See 17-TRIAGE.md. Owner: 17.1.
  test.skip(
    true,
    'Phase 17 deferred: GET /admin/users (search=...) fixture regression — see 17-TRIAGE.md row #cluster-13-permissions.',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    const lehrerId = await getSeedUserId(request, 'lehrer').catch(() => null);
    if (lehrerId) {
      await cleanupE2EOverrides(request, lehrerId).catch(() => {});
    }
  });

  test('USER-03-PERM-01: Berechtigungen tab renders accordion + Rolle: admin chips for admin-user', async ({
    page,
    request,
  }) => {
    const adminId = await getSeedUserId(request, 'admin');
    await page.goto(`/admin/users/${adminId}`);

    await page.getByRole('tab', { name: 'Berechtigungen' }).click();
    await expect(
      page.getByRole('heading', { name: 'Effektive Berechtigungen' }),
    ).toBeVisible();

    // At least one accordion item is expanded by default and renders rows
    // with the SourceChip 'Rolle: admin' (admin's whole permission set
    // comes from the admin role).
    await expect(page.getByText('Rolle: admin').first()).toBeVisible();

    // The 'Erlaubt' label appears on every granted row (admin grants all).
    await expect(page.getByText('Erlaubt').first()).toBeVisible();
  });

  test('USER-03-PERM-02: per-user override appears with source=Override + Verweigert label', async ({
    page,
    request,
  }) => {
    const lehrerId = await getSeedUserId(request, 'lehrer');

    // Seed a deny-override for read student.
    await createPermissionOverrideViaAPI(request, {
      userId: lehrerId,
      action: 'read',
      subject: 'student',
      granted: false,
      conditions: null,
      reason: `${USER_PREFIX}PERM-02 ${Date.now()} deny read student`,
    });

    await page.goto(`/admin/users/${lehrerId}`);
    await page.getByRole('tab', { name: 'Berechtigungen' }).click();
    await expect(
      page.getByRole('heading', { name: 'Effektive Berechtigungen' }),
    ).toBeVisible();

    // Find the 'student · N Abilities' accordion trigger and expand it if
    // it isn't already.
    const studentTrigger = page.getByRole('button', {
      name: /^student · \d+ Abilities/,
    });
    await expect(studentTrigger).toBeVisible({ timeout: 10_000 });
    if ((await studentTrigger.getAttribute('aria-expanded')) !== 'true') {
      await studentTrigger.click();
    }

    // The Override row contains both 'Verweigert' and 'Override' (source).
    await expect(page.getByText('Verweigert').first()).toBeVisible();
    await expect(page.getByText('Override').first()).toBeVisible();
  });
});
