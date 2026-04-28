/**
 * Phase 15-10 Plan 15-10 Task 6 — DSGVO-ADM-06 E2E coverage.
 *
 * Surface: ConsentsTab → row "Löschen anstoßen" → 2-step
 * RequestDeletionDialog (Sicherheitsabfrage → Bestätigung).
 * Requirement DSGVO-ADM-06: 2-step confirmation with email-token
 * STRICT-EQUAL match (case-sensitive, no trim, no normalisation).
 *
 * Tests:
 *  1. Dialog flow — Step 1 title + warning copy + "Weiter" advance,
 *     Step 2 title + token input + mismatched email keeps submit
 *     disabled.
 *  2. Strict-equal contract — submit stays disabled for case-different
 *     email; ENABLES only on the exact email string.
 *  3. (OPT-IN — `E2E_DELETION_LIVE=true`) Actually fire the POST
 *     and assert the success toast. This test is GATED because
 *     a successful run IRREVERSIBLY deletes a Person from the DB.
 *     The seed person must be a throwaway in a freshly-reset DB.
 *
 * All three tests need an enabled "Löschen anstoßen" row button —
 * which requires a granted consent record to render in the
 * ConsentsTab table. Without one (the default state in CI without
 * a UUID-keyed seed), the spec auto-skips.
 *
 * The `E2E_SEED_PERSON_EMAIL` env supplies the real email to type.
 * For the seed default (apps/api/prisma/seed.ts), Lisa Huber has
 * `lisa.huber@schueler.bgbrg-musterstadt.at`.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('DSGVO-ADM-06 — Art. 17 2-step + email-token strict-equal', () => {
  const PERSON_EMAIL =
    process.env.E2E_SEED_PERSON_EMAIL ??
    'lisa.huber@schueler.bgbrg-musterstadt.at';

  /**
   * Open the deletion dialog from the first consent row whose
   * "Löschen anstoßen" button is enabled. Returns false (caller
   * should skip) if no enabled row exists.
   */
  async function openDeletionDialogForFirstRow(
    page: import('@playwright/test').Page,
  ): Promise<boolean> {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents');

    // Wait briefly for the consent admin query to settle.
    await page.waitForTimeout(1_500);

    const triggers = page.getByRole('button', { name: 'Löschen anstoßen' });
    const triggerCount = await triggers.count();
    for (let i = 0; i < triggerCount; i++) {
      const t = triggers.nth(i);
      if (await t.isEnabled()) {
        await t.click();
        return true;
      }
    }
    return false;
  }

  test('DSGVO-ADM-06: Step 1 → Weiter → Step 2 token mismatch keeps submit disabled', async ({
    page,
  }) => {
    const opened = await openDeletionDialogForFirstRow(page);
    if (!opened) {
      test.skip(
        true,
        'No enabled "Löschen anstoßen" row — set E2E_SEED_PERSON_ID to a UUID-keyed Person and ensure QueryConsentAdminDto schoolId UUID validation matches the seed school. See Deferred Issues.',
      );
    }

    // Step 1 — Sicherheitsabfrage (verbatim title from RequestDeletionDialog.tsx).
    await expect(
      page.getByText('User endgültig löschen — Sicherheitsabfrage'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Weiter' }).click();

    // Step 2 — Bestätigung erforderlich.
    await expect(page.getByText('Bestätigung erforderlich')).toBeVisible();
    const tokenInput = page.getByLabel('Email-Adresse zur Bestätigung');
    await tokenInput.fill('wrong@example.com');

    const submit = page.getByRole('button', { name: 'Endgültig löschen' });
    await expect(submit).toBeDisabled();

    // Inline error verbatim per RequestDeletionDialog.tsx.
    await expect(
      page.getByText('Email-Adresse stimmt nicht überein.'),
    ).toBeVisible();

    // Cancel — return to Step 1 then Escape.
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(
      page.getByText('User endgültig löschen — Sicherheitsabfrage'),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('DSGVO-ADM-06: strict-equal — case-different keeps submit disabled, exact match enables', async ({
    page,
  }) => {
    const opened = await openDeletionDialogForFirstRow(page);
    if (!opened) test.skip();

    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByText('Bestätigung erforderlich')).toBeVisible();

    const tokenInput = page.getByLabel('Email-Adresse zur Bestätigung');
    const submit = page.getByRole('button', { name: 'Endgültig löschen' });

    // Case-different version. Strict-equal contract (no .toLowerCase,
    // no .trim) means uppercase MUST stay disabled when source email
    // is lowercase — which it is for all seed persons.
    const upper = PERSON_EMAIL.toUpperCase();
    if (upper !== PERSON_EMAIL) {
      await tokenInput.fill(upper);
      await expect(submit).toBeDisabled();
    }

    // Exact-match — should enable.
    await tokenInput.fill(PERSON_EMAIL);
    await expect(submit).toBeEnabled();

    // Cancel without submitting (no backend mutation).
    await page.keyboard.press('Escape');
  });

  test('DSGVO-ADM-06: live submit fires POST + success toast (E2E_DELETION_LIVE gated)', async ({
    page,
  }) => {
    if (process.env.E2E_DELETION_LIVE !== 'true') {
      test.skip(
        true,
        'E2E_DELETION_LIVE!="true" — skipping live deletion (irreversible). ' +
          'Run on a freshly-reset DB only.',
      );
    }
    const opened = await openDeletionDialogForFirstRow(page);
    if (!opened) test.skip();

    await page.getByRole('button', { name: 'Weiter' }).click();
    await page
      .getByLabel('Email-Adresse zur Bestätigung')
      .fill(PERSON_EMAIL);

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/dsgvo/deletion') &&
          r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Endgültig löschen' }).click(),
    ]);
    expect([200, 201, 202, 204, 409]).toContain(response.status());

    await expect(page.getByText('Löschauftrag angestoßen')).toBeVisible({
      timeout: 5_000,
    });

    await expect(page.getByText('Bestätigung erforderlich')).toBeHidden({
      timeout: 5_000,
    });
  });
});
