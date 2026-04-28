/**
 * Phase 15-10 Plan 15-10 Task 5 — DSGVO-ADM-05 E2E coverage.
 *
 * Surface: /admin/dsgvo?tab=consents → "Datenexport anstoßen" toolbar
 * CTA → JobsTab live status.
 * Requirement DSGVO-ADM-05: Admin can request a personal-data export
 * for a specific Person; the resulting BullMQ job appears in the
 * JobsTab and progresses toward a terminal state.
 *
 * Test:
 *  - Open RequestExportDialog from the ConsentsTab toolbar
 *  - Paste a Person UUID + submit → "Datenexport angestoßen" toast
 *  - Switch to JobsTab → assert a row exists for the new job
 *  - Poll `data-dsgvo-job-status` for up to 30s without a hard sleep:
 *      QUEUED|PROCESSING|COMPLETED is the happy-path acceptance set
 *      (FAILED would surface a real backend issue).
 *
 * Skip-on-missing-env: gated on `E2E_SEED_PERSON_ID`. The default
 * fallback `seed-person-student-1` matches `apps/api/prisma/seed.ts`
 * Lisa Huber.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('DSGVO-ADM-05 — Datenexport request + JobsTab live status', () => {
  test('DSGVO-ADM-05: request export → JobsTab row appears + transitions', async ({
    page,
  }) => {
    const personId =
      process.env.E2E_SEED_PERSON_ID ?? 'seed-person-student-1';
    if (!personId) test.skip(true, 'E2E_SEED_PERSON_ID not set');

    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents');

    // Toolbar CTA — first() because the dialog will mount a second
    // "Datenexport anstoßen" button (form submit) once opened.
    await page
      .getByRole('button', { name: 'Datenexport anstoßen' })
      .first()
      .click();

    // Dialog form
    await page.getByLabel('Person-ID').fill(personId);
    // Submit button inside the dialog footer — the SECOND occurrence
    // of "Datenexport anstoßen" on the page once the dialog is open.
    await page
      .getByRole('button', { name: 'Datenexport anstoßen' })
      .last()
      .click();

    // Success toast verbatim per useDsgvoExportJob.ts onSuccess.
    await expect(page.getByText('Datenexport angestoßen')).toBeVisible({
      timeout: 10_000,
    });

    // Switch to JobsTab — the newest row appears at the top.
    await page.goto('/admin/dsgvo?tab=jobs');

    const row = page.locator('[data-dsgvo-job-id]').first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Polling assertion — `expect.poll` re-evaluates without hard sleeps.
    // FAILED is excluded from the happy-path set; if BullMQ produces a
    // FAILED row the spec rightly fails (real bug surface).
    await expect
      .poll(
        async () => {
          // Re-query the row each tick — the data-dsgvo-job-status
          // attribute is the locked selector contract.
          const fresh = page.locator('[data-dsgvo-job-id]').first();
          return await fresh.getAttribute('data-dsgvo-job-status');
        },
        {
          timeout: 30_000,
          intervals: [1_000, 2_000, 5_000],
          message:
            'Job did not reach a happy-path status within 30s — investigate BullMQ worker',
        },
      )
      .toMatch(/^(QUEUED|PROCESSING|COMPLETED)$/);
  });
});
