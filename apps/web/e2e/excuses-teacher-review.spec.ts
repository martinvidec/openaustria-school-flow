/**
 * Issue #83 — Excuses Klassenvorstand review flow.
 *
 * Issue #151 (Phase 3.5/4) — migrated to throwaway-school per CLAUDE.md D4.
 * The shared per-student advisory lock is gone; each spec owns its own
 * throwaway School with its own Student + ParentStudent + Klassenvorstand
 * assignment.
 *
 * Locks the Klassenvorstand-side review flow:
 *   1. Seed a PENDING AbsenceExcuse via the parent API (the throwaway-
 *      eltern → its linked Student, today, KRANK, timestamped note).
 *   2. The throwaway-lehrer (Klassenvorstand of class[0]) logs in and
 *      opens /excuses → ExcuseReviewList renders the seeded excuse as
 *      the only PENDING card for her class.
 *   3. Click "Akzeptieren" → review dialog opens with the ACCEPTED title.
 *   4. Click confirm (no review note required for ACCEPTED).
 *   5. Wait for "Entschuldigung akzeptiert" toast.
 *   6. The accepted card disappears from the PENDING list.
 *
 * Exercises PATCH /classbook/excuses/:id/review with status=ACCEPTED +
 * useReviewExcuse invalidation + ExcuseReviewList's PENDING filter +
 * the review-dialog Accept branch.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  EXCUSES_NOTE_PREFIX,
  createExcuseAsParentViaAPI,
  todayISODate,
  type CreatedExcuse,
} from './helpers/excuses';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #83 — Excuses teacher review (throwaway-school, #151)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Review-list layout is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;
  let excuse: CreatedExcuse | undefined;
  let noteText: string;

  test.beforeEach(async ({ request }) => {
    fixture = await createThrowawaySchool({
      roles: { lehrer: true, eltern: true },
      withClasses: 1,
      withTimetableStack: true, // provisions the lehrer Teacher row
      withKlassenvorstand: 'lehrer', // pins lehrer as KV of class[0]
      withStudents: [{ firstName: 'Lisa', lastName: 'Huber' }],
      withParentLinks: { eltern: { studentIndexes: [0] } },
      namePrefix: 'E2E-EXC-REVIEW',
    });

    const today = todayISODate();
    noteText = `${EXCUSES_NOTE_PREFIX}REVIEW-${Date.now()} — review-flow test`;
    excuse = await createExcuseAsParentViaAPI(request, {
      studentId: fixture.studentIds[0],
      startDate: today,
      endDate: today,
      reason: 'KRANK',
      note: noteText,
      schoolId: fixture.schoolId,
    });
    expect(
      excuse.status,
      'newly-created excuse must default to PENDING (excuse.service.ts)',
    ).toBe('PENDING');
  });

  test.afterEach(async () => {
    excuse = undefined;
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('EXC-TEACHER-01: kc-lehrer accepts a PENDING excuse → toast → card disappears from PENDING list', async ({
    page,
    context,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    if (!excuse) throw new Error('excuse not seeded');

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'lehrer');
    await page.goto('/excuses');

    // Page chrome must mount — proves the route's role-branch picked
    // ExcuseReviewList (index.tsx:36–47) over ParentExcuseView.
    await expect(
      page.getByRole('heading', { name: 'Entschuldigungen pruefen', level: 1 }),
    ).toBeVisible();

    // Seeded excuse must be visible in the review list. The
    // timestamped note is the discriminator — kc-lehrer is the
    // Klassenvorstand of class[0] (via withKlassenvorstand) and only
    // sees PENDING excuses for her classes (excuse.controller.ts:75 +
    // getPendingExcusesForKlassenvorstand).
    await expect(
      page.getByText(noteText),
      'kc-lehrer (Klassenvorstand of throwaway class[0]) must see the just-seeded PENDING excuse',
    ).toBeVisible();

    // Scope by the card containing OUR timestamped note. With one
    // student in the throwaway there is only one PENDING card on this
    // page, but the locator stays robust for future fixtures that
    // provision multiple students.
    const card = page
      .locator('[aria-label^="Entschuldigung fuer"]')
      .filter({ hasText: noteText });
    await expect(
      card,
      'review card containing the seeded excuse must surface in the list',
    ).toBeVisible();
    await card.getByRole('button', { name: 'Akzeptieren' }).click();

    // Review dialog opens with the ACCEPTED title (ExcuseReviewList
    // .tsx:135). No review-note required for ACCEPTED.
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
    // filter no longer includes our row → card disappears.
    await expect(
      page.getByText(noteText),
      'accepted excuse must disappear from the PENDING review list after the toast',
    ).toHaveCount(0);
  });
});
