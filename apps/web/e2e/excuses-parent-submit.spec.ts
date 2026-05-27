/**
 * Issue #83 — Excuses parent-submit flow.
 *
 * Issue #151 (Phase 3.5/4) — migrated to throwaway-school per CLAUDE.md D4.
 * The shared per-student `excuses:${SEED_STUDENT_LISA_HUBER_UUID}` advisory
 * lock is gone; each spec owns its own throwaway School with its own
 * Parent + Student + ParentStudent rows. `fixture.cleanup()` cascade-drops
 * every AbsenceExcuse via the School→Student→AbsenceExcuse FK chain.
 *
 * First sub-spec of the Entschuldigungen coverage gap. Locks the
 * Eltern-side submission flow on /excuses:
 *   1. eltern (the throwaway's Franz-Huber-equivalent) logs in.
 *   2. Page mounts the ParentExcuseView with the ExcuseForm.
 *   3. Form auto-fills today as Von + Bis (default) and the single linked
 *      child as the Kind field — rendered as a text label (not a Select)
 *      when children.length === 1 (ExcuseForm.tsx:137).
 *   4. Pick "Krank" as Grund, type a timestamped note, submit.
 *   5. Wait for the "Entschuldigung eingereicht" toast (wire-confirmed
 *      signal; without it the list assertion races the mutation).
 *   6. New excuse appears in "Eingereichte Entschuldigungen" with the
 *      timestamped note + a PENDING status badge.
 *
 * Exercises POST /classbook/excuses + useCreateExcuse invalidation +
 * GET /excuses refetch + ExcuseCard rendering.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import { EXCUSES_NOTE_PREFIX } from './helpers/excuses';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #83 — Excuses parent submit (throwaway-school, #151)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Form layout is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    // Lisa Huber as the single child + Franz-Huber-equivalent eltern parent
    // linked to her via ParentStudent. children.length === 1 keeps the
    // ExcuseForm in its text-label branch (instead of Select).
    fixture = await createThrowawaySchool({
      roles: { eltern: true },
      withClasses: 1,
      withStudents: [{ firstName: 'Lisa', lastName: 'Huber' }],
      withParentLinks: { eltern: { studentIndexes: [0] } },
      namePrefix: 'E2E-EXC-PARENT',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('EXC-PARENT-01: eltern submits an excuse → toast → row visible in submitted list with PENDING badge', async ({
    page,
    context,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'eltern');
    await page.goto('/excuses');

    // Page chrome must mount — proves the route loaded before we assert
    // on the form. The h1 is rendered verbatim by index.tsx:73.
    await expect(
      page.getByRole('heading', { name: 'Entschuldigungen', level: 1 }),
    ).toBeVisible();

    // Kind field renders as plain text when children.length === 1 —
    // Lisa Huber is the only linked child of the throwaway eltern. The
    // cross-tenant assertion here is that Lisa's name appears, not a
    // sibling-tenant child or an empty value.
    const kindLabel = page.getByText('Kind', { exact: true });
    await expect(
      kindLabel.locator('..').getByText('Lisa Huber'),
      'Kind field must render Lisa Huber for the throwaway-eltern per the seeded ParentStudent link',
    ).toBeVisible();

    // Grund select — pick "Krank" (KRANK enum). The form's submit is
    // gated on `studentId && reason` (ExcuseForm.tsx:97), so the
    // reason pick must succeed before Submit is enabled.
    await page.getByRole('combobox', { name: 'Grund' }).click();
    await page.getByRole('option', { name: 'Krank', exact: true }).click();

    // Timestamped note — keeps this run's row distinguishable in the list
    // assertion. EXCUSES_NOTE_PREFIX keeps mid-test debugging via psql
    // trivial; tenant isolation via the throwaway already prevents
    // cross-spec collisions.
    const note = `${EXCUSES_NOTE_PREFIX}PARENT-${Date.now()} — Lisa hat Fieber`;
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
