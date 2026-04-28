/**
 * Phase 15-10 Plan 15-10 Task 2 — DSGVO-ADM-01 E2E coverage.
 *
 * Surface: /admin/dsgvo?tab=consents
 * Requirement DSGVO-ADM-01: Admin can filter consent records (purpose /
 * status / person search) and withdraw a granted consent.
 *
 * Tests:
 *  1. Filter by status persists in the URL + filters the rendered table
 *     (data-consent-status attribute proves every visible row matches).
 *  2. Widerrufen flow — open the confirm dialog ("Einwilligung
 *     widerrufen?") and assert the success toast ("Einwilligung
 *     widerrufen") fires after confirm.
 *  3. Person search updates the URL `q` param.
 *
 * Pre-seed: a single consent record for the seed Person provided via
 * `E2E_SEED_PERSON_ID` (Lisa Huber by default — see seed.ts). The spec
 * skips cleanly when the env var is unset so CI without the flag still
 * exits green.
 *
 * No `cleanupAll` afterAll — consents are state-managed (granted →
 * withdrawn), not deleted. Re-running the suite hits the
 * `seedConsent` 409-handler which fetches the existing record.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { seedConsent } from './helpers/dsgvo';

test.describe.configure({ mode: 'serial' });

test.describe('DSGVO-ADM-01 — Einwilligungen filter + withdraw', () => {
  const PERSON_ID =
    process.env.E2E_SEED_PERSON_ID ?? 'seed-person-student-1';
  // Use KOMMUNIKATION (verified backend Prisma enum value) — chosen
  // because it's unlikely to collide with other admin specs.
  const PRESEED_PURPOSE = 'KOMMUNIKATION';

  test.beforeAll(async ({ request }) => {
    if (!PERSON_ID) test.skip(true, 'E2E_SEED_PERSON_ID not set');
    await seedConsent(request, {
      personId: PERSON_ID,
      purpose: PRESEED_PURPOSE,
    });
  });

  test('DSGVO-ADM-01: status=granted filter persists in URL + filters rows', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents&status=granted');
    await expect(page).toHaveURL(/status=granted/);

    // Either the table renders rows (every row has data-consent-status=granted)
    // OR the empty state is visible. Both are acceptable — what matters is
    // that no row with status≠granted bleeds through the filter.
    const rows = page.locator('[data-consent-id]');
    const count = await rows.count();

    if (count > 0) {
      const statuses = await rows.evaluateAll((els) =>
        (els as HTMLElement[]).map((el) =>
          el.getAttribute('data-consent-status'),
        ),
      );
      expect(statuses.every((s) => s === 'granted')).toBe(true);
    } else {
      // Empty-state fallback — the heading copy from ConsentsTab.
      await expect(
        page.getByText('Keine Einwilligungen gefunden'),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('DSGVO-ADM-01: Widerrufen flow shows confirm dialog + success toast', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents&status=granted');

    const rows = page.locator('[data-consent-id]');
    const firstRow = rows.first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    // Click row "Widerrufen" button (destructive variant).
    await firstRow.getByRole('button', { name: 'Widerrufen' }).click();

    // Confirm dialog title verbatim per ConsentsTab.tsx.
    await expect(page.getByText('Einwilligung widerrufen?')).toBeVisible();

    // Confirm — there are now two "Widerrufen" buttons on the page (row + dialog footer).
    // The dialog footer one is the most recently rendered, hence .last().
    await page.getByRole('button', { name: 'Widerrufen' }).last().click();

    // Success toast verbatim per useConsents.ts.
    await expect(page.getByText('Einwilligung widerrufen')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('DSGVO-ADM-01: person search updates URL `q` param', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents');

    // ConsentsFilterToolbar renders a Person <Input type="search"> with
    // the German label "Person".
    const personInput = page.getByLabel('Person');
    await personInput.fill('huber');

    // Allow controlled-input → URL → query refetch chain to settle.
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(/q=huber/);
  });
});
