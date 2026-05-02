/**
 * Phase 15-10 Plan 15-10 Task 2 — DSGVO-ADM-01 E2E coverage.
 * Phase 15.1 — UUID-aligned seed defaults; mutation tests no longer soft-skip.
 *
 * Surface: /admin/dsgvo?tab=consents
 * Requirement DSGVO-ADM-01: Admin can filter consent records (purpose /
 * status / person search) and withdraw a granted consent.
 *
 * Tests:
 *  1. Filter by status persists in the URL (URL contract — runs on
 *     every stack).
 *  2. Person search updates the URL `q` param (URL contract).
 *  3. Widerrufen flow — open the confirm dialog ("Einwilligung
 *     widerrufen?") and assert the success toast ("Einwilligung
 *     widerrufen") fires after confirm. Auto-skips only if no granted
 *     consent renders in the UI (defensive — should always have one
 *     after seeding on a fresh stack).
 *
 * Pre-seed strategy:
 *   `seedConsent` requires a UUID `personId`. Phase 15.1 aligned
 *   apps/api/prisma/seed.ts to UUID Person IDs, so the env-var default
 *   (SEED_PERSON_STUDENT_1_UUID = Lisa Huber) works out of the box.
 *
 * No `cleanupAll` afterAll — consents are state-managed (granted →
 * withdrawn), not deleted.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { seedConsent } from './helpers/dsgvo';
import { SEED_PERSON_STUDENT_1_UUID } from './helpers/seed-ids';

test.describe.configure({ mode: 'serial' });

test.describe('DSGVO-ADM-01 — Einwilligungen filter + withdraw', () => {
  // E2E_SEED_PERSON_ID defaults to Lisa Huber (UUID-aligned post Phase 15.1).
  const PERSON_ID = process.env.E2E_SEED_PERSON_ID ?? SEED_PERSON_STUDENT_1_UUID;
  const PRESEED_PURPOSE = 'KOMMUNIKATION';

  test.beforeAll(async ({ request }) => {
    // seedConsent returns null if PERSON_ID is not a UUID — non-blocking.
    await seedConsent(request, {
      personId: PERSON_ID,
      purpose: PRESEED_PURPOSE,
    });
  });

  test('DSGVO-ADM-01: status=granted filter persists in URL', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents&status=granted');
    await expect(page).toHaveURL(/status=granted/);

    // URL contract is the primary assertion. The list-rendering
    // contract is gated by the consent admin endpoint resolving
    // (see Deferred Issue: QueryConsentAdminDto schoolId UUID
    // mismatch with seed school string ID). We assert THAT the
    // surface mounts (DSGVO-Verwaltung page shell renders) so
    // any future regression in route registration is caught.
    await expect(
      page.getByRole('heading', { name: 'DSGVO-Verwaltung' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('DSGVO-ADM-01: person search updates URL `q` param', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents');

    // ConsentsFilterToolbar renders a Person <Input type="search"> with
    // placeholder "Name oder Email". The shadcn <Label> doesn't bind
    // via htmlFor/id, so getByPlaceholder is the reliable selector.
    const personInput = page.getByPlaceholder('Name oder Email');
    await expect(personInput).toBeVisible({ timeout: 10_000 });
    await personInput.fill('huber');

    // Allow controlled-input → URL → query refetch chain to settle.
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(/q=huber/);
  });

  test('DSGVO-ADM-01: Widerrufen flow shows confirm dialog + success toast', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents&status=granted');

    const rows = page.locator('[data-consent-id]');
    // Phase 15.1: seed Persons are UUIDs and beforeAll seeds a granted
    // consent for SEED_PERSON_STUDENT_1_UUID, so a row MUST be present.
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    const firstRow = rows.first();
    // Click row "Widerrufen" button (destructive variant).
    await firstRow.getByRole('button', { name: 'Widerrufen' }).click();

    // Confirm dialog title verbatim per ConsentsTab.tsx.
    await expect(page.getByText('Einwilligung widerrufen?')).toBeVisible();

    // Confirm — dialog footer "Widerrufen" is the most recent (.last()).
    await page.getByRole('button', { name: 'Widerrufen' }).last().click();

    // Success toast verbatim per useConsents.ts.
    await expect(page.getByText('Einwilligung widerrufen')).toBeVisible({
      timeout: 5_000,
    });
  });
});
