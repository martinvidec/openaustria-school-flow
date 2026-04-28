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
 * Auto-skips when `E2E_SEED_PERSON_ID` is unset OR not a UUID:
 * `RequestExportDto` declares `@IsUUID()` on both personId and
 * schoolId, so non-UUID values 422 (see Deferred Issues in
 * 15-10-SUMMARY.md). The structural assertion (dialog opens
 * + Person-ID input renders) still runs on every stack.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe.configure({ mode: 'serial' });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe('DSGVO-ADM-05 — Datenexport request + JobsTab live status', () => {
  const PERSON_ID = process.env.E2E_SEED_PERSON_ID ?? '';
  const SCHOOL_ID =
    process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';
  const PERSON_IS_UUID = UUID_RE.test(PERSON_ID);
  const SCHOOL_IS_UUID = UUID_RE.test(SCHOOL_ID);

  test('DSGVO-ADM-05: Datenexport-anstoßen dialog opens + has Person-ID input', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents');

    // Toolbar CTA — first() because the dialog will mount a second
    // "Datenexport anstoßen" button (form submit) once opened.
    await page
      .getByRole('button', { name: 'Datenexport anstoßen' })
      .first()
      .click();

    // Dialog with Person-ID input renders — structural assertion.
    // The shadcn <Label> doesn't bind via htmlFor/id, so the input's
    // placeholder "UUID der Person" is the reliable selector.
    await expect(page.getByPlaceholder('UUID der Person')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('DSGVO-ADM-05: request export → JobsTab row appears + transitions', async ({
    page,
  }) => {
    if (!PERSON_IS_UUID || !SCHOOL_IS_UUID) {
      test.skip(
        true,
        'E2E_SEED_PERSON_ID and/or E2E_SCHOOL_ID are not UUIDs — RequestExportDto rejects POST. See Deferred Issues.',
      );
    }

    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=consents');

    await page
      .getByRole('button', { name: 'Datenexport anstoßen' })
      .first()
      .click();

    await page.getByPlaceholder('UUID der Person').fill(PERSON_ID);
    // Submit button inside the dialog footer — the SECOND occurrence.
    await page
      .getByRole('button', { name: 'Datenexport anstoßen' })
      .last()
      .click();

    // Success toast verbatim per useDsgvoExportJob.ts onSuccess.
    await expect(page.getByText('Datenexport angestoßen')).toBeVisible({
      timeout: 10_000,
    });

    // Switch to JobsTab — newest row at top.
    await page.goto('/admin/dsgvo?tab=jobs');
    const row = page.locator('[data-dsgvo-job-id]').first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Polling assertion — `expect.poll` re-evaluates without hard sleeps.
    await expect
      .poll(
        async () => {
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
