/**
 * Issue #83 — Excuses parent-submit flow.
 *
 * First sub-spec of the Entschuldigungen coverage gap. Locks the
 * Eltern-side submission flow on /excuses:
 *   1. kc-eltern (Franz Huber, parent of Lisa Huber in 1A) logs in.
 *   2. Page mounts the ParentExcuseView with the ExcuseForm.
 *   3. Form auto-fills today as Von + Bis (default) and Lisa Huber as
 *      the only child (the Kind field renders as a text label, not a
 *      Select, when children.length === 1 — ExcuseForm.tsx:137).
 *   4. Pick "Krank" as Grund, type a timestamped note, submit.
 *   5. Wait for the "Entschuldigung eingereicht" toast (wire-confirmed
 *      signal; without it the list assertion races the mutation).
 *   6. New excuse appears in "Eingereichte Entschuldigungen" with the
 *      timestamped note + a PENDING status badge.
 *
 * Exercises POST /classbook/excuses + useCreateExcuse invalidation +
 * GET /excuses refetch + ExcuseCard rendering. Teacher-review and
 * attachment upload are deferred to follow-up sub-specs.
 *
 * Chromium-only-skip per the race-family precedent — every spec writes
 * AbsenceExcuse rows for the same kc-eltern parent. The cleanup sweep
 * is scoped to a note-prefix so parallel specs only delete their own.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import { EXCUSES_NOTE_PREFIX, cleanupE2EExcuses } from './helpers/excuses';

test.describe('Issue #83 — Excuses parent submit (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Form layout is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'AbsenceExcuse rows for kc-eltern accumulate on parallel projects — chromium is the sole writer.',
  );

  test.afterEach(async () => {
    // Sweep ALL E2E-EXC- excuses, not just the one created here. A
    // killed previous run could leave parallel siblings behind, and
    // those would clutter the list assertion below the next time the
    // spec runs against an unclean DB.
    await cleanupE2EExcuses();
  });

  test('EXC-PARENT-01: eltern submits an excuse → toast → row visible in submitted list with PENDING badge', async ({
    page,
  }) => {
    await loginAsRole(page, 'eltern');
    await page.goto('/excuses');

    // Page chrome must mount — proves the route loaded before we assert
    // on the form. The h1 is rendered verbatim by index.tsx:73.
    await expect(
      page.getByRole('heading', { name: 'Entschuldigungen', level: 1 }),
    ).toBeVisible();

    // Kind field renders as plain text when children.length === 1 —
    // Lisa Huber is the only seed child of Franz Huber (kc-eltern).
    // The cross-tenant assertion here is that Lisa's name appears, not
    // a sibling-tenant child or an empty value.
    await expect(
      page.getByText('Lisa Huber'),
      'Kind field must render Lisa Huber for Franz Huber (kc-eltern) per the seed ParentStudent link',
    ).toBeVisible();

    // Grund select — pick "Krank" (KRANK enum). The form's submit is
    // gated on `studentId && reason` (ExcuseForm.tsx:97), so the
    // reason pick must succeed before Submit is enabled.
    await page.getByRole('combobox', { name: 'Grund' }).click();
    await page.getByRole('option', { name: 'Krank', exact: true }).click();

    // Timestamped note — keeps this run's row distinguishable from
    // sibling specs' rows in the list assertion. EXCUSES_NOTE_PREFIX
    // is what the cleanup sweep uses, so this stamp doubles as the
    // cleanup discriminator.
    const note = `${EXCUSES_NOTE_PREFIX}${Date.now()} — Lisa hat Fieber`;
    await page.getByLabel(/Anmerkung/).fill(note);

    await page
      .getByRole('button', { name: 'Entschuldigung einreichen' })
      .click();

    await expect(
      page.getByText('Entschuldigung eingereicht'),
      'success toast must appear after the POST commits',
    ).toBeVisible({ timeout: 5_000 });

    // After the toast, useCreateExcuse invalidates useExcuses → refetch
    // lands → the new excuse renders as an ExcuseCard below the form.
    // The cross-cutting regression-lock is the timestamped note + the
    // PENDING status — both are pulled from the API response, so a
    // backend bug that drops the note or mis-defaults the status would
    // be visible here.
    await expect(
      page.getByText(note),
      'newly-created excuse must surface in "Eingereichte Entschuldigungen" with the timestamped note',
    ).toBeVisible();
    await expect(
      page.getByText('Ausstehend').first(),
      'newly-created excuse must render the PENDING status label (ExcuseCard renders "Ausstehend" for status=PENDING)',
    ).toBeVisible();
  });
});
