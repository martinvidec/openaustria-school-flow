/**
 * Issue #83 — Excuses Klassenvorstand review flow.
 *
 * Second sub-spec of the Entschuldigungen coverage gap (after
 * excuses-parent-submit). Locks the Klassenvorstand-side review flow:
 *   1. Seed a PENDING AbsenceExcuse via the parent API
 *      (kc-eltern → Lisa Huber, today, KRANK, timestamped note).
 *   2. kc-lehrer (Maria Mueller, Klassenvorstand of 1A per the seed)
 *      logs in and opens /excuses → ExcuseReviewList renders the seeded
 *      excuse as the only PENDING card for her classes.
 *   3. Click "Akzeptieren" → review dialog opens with the ACCEPTED title.
 *   4. Click confirm (no review note required for ACCEPTED).
 *   5. Wait for "Entschuldigung akzeptiert" toast (wire-confirmed signal).
 *   6. The accepted card disappears from the PENDING list (useExcuses
 *      with filter=PENDING invalidates → refetch → empty state).
 *
 * Exercises PATCH /classbook/excuses/:id/review with status=ACCEPTED +
 * useReviewExcuse invalidation + ExcuseReviewList's PENDING filter +
 * the review-dialog Accept branch. The Reject branch (which requires a
 * non-empty review note) is deferred to a follow-up sub-spec.
 *
 * Chromium-only-skip per the race-family precedent — every spec writes
 * AbsenceExcuse rows for the same kc-eltern parent and kc-lehrer is the
 * sole Klassenvorstand of 1A. Cleanup sweeps by note-prefix so parallel
 * specs only delete their own rows.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  EXCUSES_NOTE_PREFIX,
  cleanupE2EExcuses,
  createExcuseAsParentViaAPI,
  todayISODate,
  type CreatedExcuse,
} from './helpers/excuses';
import { acquireAdvisoryLock, type AdvisoryLock } from './helpers/advisory-lock';

const SEED_STUDENT_LISA_HUBER_UUID = 'e0000000-0000-4000-8000-000000000001';
// Per #112 phase 4 wave 2c (#121): shared with excuses-parent-submit
// and excuses-attachments so cross-spec AND cross-project parallel
// runs serialize on the per-student row family.
const EXCUSES_STUDENT_LOCK_KEY = `excuses:${SEED_STUDENT_LISA_HUBER_UUID}`;

test.describe('Issue #83 — Excuses teacher review (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Review-list layout is identical across viewports — desktop only for the first lock.',
  );

  let lock: AdvisoryLock | undefined;
  let excuse: CreatedExcuse | undefined;
  let noteText: string;

  test.beforeEach(async ({ request }) => {
    lock = await acquireAdvisoryLock(EXCUSES_STUDENT_LOCK_KEY);
    const today = todayISODate();
    noteText = `${EXCUSES_NOTE_PREFIX}REVIEW-${Date.now()} — review-flow test`;
    excuse = await createExcuseAsParentViaAPI(request, {
      studentId: SEED_STUDENT_LISA_HUBER_UUID,
      startDate: today,
      endDate: today,
      reason: 'KRANK',
      note: noteText,
    });
    expect(
      excuse.status,
      'newly-created excuse must default to PENDING (excuse.service.ts)',
    ).toBe('PENDING');
  });

  test.afterEach(async () => {
    // Sweep only this spec's own E2E-EXC-REVIEW- rows. Sibling spec
    // excuses-parent-submit uses a different sub-prefix (E2E-EXC-PARENT-)
    // so the two cleanups don't deactivate each other's mid-test
    // fixtures — earlier race where a parent-submit afterEach swept
    // teacher-review's seeded excuse mid-flight and the PATCH /review
    // then 404'd silently (success toast never fired).
    await cleanupE2EExcuses(`${EXCUSES_NOTE_PREFIX}REVIEW-`);
    excuse = undefined;
    if (lock) {
      await lock.release();
      lock = undefined;
    }
  });

  test('EXC-TEACHER-01: kc-lehrer accepts a PENDING excuse → toast → card disappears from PENDING list', async ({
    page,
  }) => {
    if (!excuse) throw new Error('excuse not seeded');

    await loginAsRole(page, 'lehrer');
    await page.goto('/excuses');

    // Page chrome must mount — proves the route's role-branch picked
    // ExcuseReviewList (index.tsx:36–47) over ParentExcuseView.
    await expect(
      page.getByRole('heading', { name: 'Entschuldigungen pruefen', level: 1 }),
    ).toBeVisible();

    // Seeded excuse must be visible in the review list. The
    // timestamped note is the discriminator — Maria Mueller is the
    // Klassenvorstand of 1A and only sees PENDING excuses for her
    // classes (excuse.controller.ts:75 + getPendingExcusesForKlassen
    // vorstand). A backend bug that mis-scopes the query would either
    // hide our row or leak rows from other classes — either way the
    // discriminator catches it.
    await expect(
      page.getByText(noteText),
      'kc-lehrer (Klassenvorstand of 1A) must see the just-seeded PENDING excuse',
    ).toBeVisible();

    // Scope by the card containing OUR timestamped note — parallel
    // specs (excuses-parent-submit running concurrently on another
    // chromium worker) can write their own PENDING excuses for the
    // same Lisa-Huber student, surfacing extra Akzeptieren buttons on
    // this page. The ExcuseCard renders a Radix Card with an
    // aria-label "Entschuldigung fuer ..." (ExcuseCard.tsx:62) which
    // is the only stable container element we can hook into.
    const card = page
      .locator('[aria-label^="Entschuldigung fuer"]')
      .filter({ hasText: noteText });
    await expect(
      card,
      'review card containing the seeded excuse must surface in the list',
    ).toBeVisible();
    await card.getByRole('button', { name: 'Akzeptieren' }).click();

    // Review dialog opens with the ACCEPTED title (ExcuseReviewList
    // .tsx:135). No review-note required for ACCEPTED, so we go
    // straight to confirm.
    await expect(
      page.getByRole('heading', { name: 'Entschuldigung akzeptieren' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Akzeptieren', exact: true })
      .last()
      .click();

    await expect(
      page.getByText('Entschuldigung akzeptiert'),
      'success toast must appear after the PATCH /review commits',
    ).toBeVisible({ timeout: 5_000 });

    // useReviewExcuse invalidates useExcuses → refetch with status=PENDING
    // filter no longer includes our row → empty state appears OR the row
    // disappears. The negative-presence check is the regression-lock for
    // the invalidation: if `useExcuses` cache key drifts from the mutation's
    // invalidation pattern, the card would stick around stale.
    await expect(
      page.getByText(noteText),
      'accepted excuse must disappear from the PENDING review list after the toast',
    ).toHaveCount(0);
  });
});
