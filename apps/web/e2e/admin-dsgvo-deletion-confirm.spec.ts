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
 *     Step 2 title + token input.
 *  2. Strict-equal contract — submit stays disabled for:
 *      - mismatched email
 *      - case-different email (.toUpperCase() of the real email)
 *     and ENABLES only on the exact email string.
 *  3. (OPT-IN — `E2E_DELETION_LIVE=true`) Actually fire the POST
 *     and assert the success toast. This test is GATED because
 *     a successful run IRREVERSIBLY deletes a Person from the DB.
 *     The seed person must be a throwaway in a freshly-reset DB.
 *
 * Without `E2E_DELETION_LIVE=true` the live-deletion test is
 * skipped — tests 1 + 2 still run and exercise the strict-equal
 * UI contract without any backend mutation (we Cancel the dialog
 * before submitting).
 *
 * The `E2E_SEED_PERSON_EMAIL` env supplies the real email to type.
 * For the seed default (apps/api/prisma/seed.ts), Lisa Huber has
 * `lisa.huber@schueler.bgbrg-musterstadt.at`.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('DSGVO-ADM-06 — Art. 17 2-step + email-token strict-equal', () => {
  // Default email matches the seed Lisa Huber person used by the
  // consent + export specs. Override per-environment via env var.
  const PERSON_EMAIL =
    process.env.E2E_SEED_PERSON_EMAIL ??
    'lisa.huber@schueler.bgbrg-musterstadt.at';

  /**
   * Open the deletion dialog from the first consent row whose
   * "Löschen anstoßen" button is enabled (i.e. has a person attached).
   */
  async function openDeletionDialogForFirstRow(page: import('@playwright/test').Page) {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents');

    const rows = page.locator('[data-consent-id]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // Find the first enabled "Löschen anstoßen" button — the row's
    // button is disabled when the consent has no associated person.
    const triggers = page.getByRole('button', { name: 'Löschen anstoßen' });
    const triggerCount = await triggers.count();
    for (let i = 0; i < triggerCount; i++) {
      const t = triggers.nth(i);
      if (await t.isEnabled()) {
        await t.click();
        return;
      }
    }
    throw new Error(
      'No enabled "Löschen anstoßen" button found — every consent row has c.person == null?',
    );
  }

  test('DSGVO-ADM-06: Step 1 → Weiter → Step 2 token mismatch keeps submit disabled', async ({
    page,
  }) => {
    await openDeletionDialogForFirstRow(page);

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

    // Cancel via "Zurück" → close to leave no side effects.
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(
      page.getByText('User endgültig löschen — Sicherheitsabfrage'),
    ).toBeVisible();
    // Close dialog by clicking outside or pressing Escape.
    await page.keyboard.press('Escape');
  });

  test('DSGVO-ADM-06: strict-equal — case-different keeps submit disabled, exact match enables', async ({
    page,
  }) => {
    await openDeletionDialogForFirstRow(page);
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByText('Bestätigung erforderlich')).toBeVisible();

    const tokenInput = page.getByLabel('Email-Adresse zur Bestätigung');
    const submit = page.getByRole('button', { name: 'Endgültig löschen' });

    // Case-different version. The strict-equal contract (no
    // .toLowerCase, no .trim) means uppercase MUST stay disabled
    // when the source email is lowercase — which it is for all
    // seed persons.
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
    await openDeletionDialogForFirstRow(page);
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
    // 200/201/202 happy-path; 409 acceptable if a previous run already deleted.
    expect([200, 201, 202, 204, 409]).toContain(response.status());

    await expect(page.getByText('Löschauftrag angestoßen')).toBeVisible({
      timeout: 5_000,
    });

    // Dialog closes — "Bestätigung erforderlich" no longer in DOM.
    await expect(page.getByText('Bestätigung erforderlich')).toBeHidden({
      timeout: 5_000,
    });
  });
});
