/**
 * Issue #85 — Teacher "Offene Anfragen" Section 1 (incoming offer).
 *
 * Fourth sub-spec of the Substitutions coverage gap. Locks the
 * substitute-teacher's view of an OFFERED substitution on
 * /teacher/substitutions Section 1 — the "Du vertrittst heute…" flow
 * the issue text calls out and PR #94 explicitly deferred.
 *
 *   1. Seed an active TimetableRun with kc-lehrer's lesson at
 *      MONDAY/period-1 + Anna Lehrerin's lesson at MONDAY/period-2
 *      (added via seedSecondTeacherLesson on the SAME run).
 *   2. POST an absence for Anna for next Monday → backend creates a
 *      PENDING Substitution with originalTeacher=Anna.
 *   3. POST /substitutions/:id/assign with candidateTeacherId =
 *      kc-lehrer.teacher.id → status flips to OFFERED.
 *   4. kc-lehrer logs in → /teacher/substitutions →
 *      `SubstituteOfferCard` renders the offer with
 *      "Vertretung fuer: Anna Lehrerin", an "Angeboten" badge, and
 *      Akzeptieren / Ablehnen CTAs.
 *
 * Why this slice was deferred from PR #94: the substitute-side view
 * requires a DIFFERENT teacher's lesson to be the absence target (so
 * kc-lehrer can be the substitute, not the absentee). The previous
 * `seedTimetableRun` fixture only seeded kc-lehrer's lesson, so an
 * absence against any other teacher would expand to zero rows. This
 * PR introduces `seedSecondTeacherLesson` to plug that gap on the
 * SAME TimetableRun (avoids the "multiple active runs" race the prod
 * `activateRun` transaction prevents).
 *
 * Why MONDAY/period-2 for Anna's lesson: kc-lehrer's seed lesson is
 * MONDAY/period-1, so kc-lehrer is FREE at period-2 — the Pitfall-2
 * conflict guard in `substitution.service.ts:91-108` accepts the
 * assign. A colliding slot would 409.
 *
 * Chromium-only-skip per the race-family precedent — shared seed-school
 * mutating specs collide on parallel browser projects.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  assignSubstituteViaAPI,
  createAbsenceViaAPI,
  listSubstitutionsViaAPI,
  nextMondayISODate,
  type CreatedAbsence,
} from './helpers/substitutions';
import {
  cleanupTimetableRun,
  purgeAbsenceViaPrisma,
  seedSecondTeacherLesson,
  seedTimetableRun,
  type SecondTeacherLessonFixture,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import {
  SEED_SCHOOL_UUID,
  SEED_TEACHER_KC_LEHRER_UUID,
} from './fixtures/seed-uuids';

test.describe('Issue #85 — Teacher Offene Anfragen Section 1 (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Section-1 rendering is desktop-only for the first lock; mobile is a follow-up if the SubstituteOfferCard layout drifts.',
  );

  let fixture: TimetableRunFixture | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let second: SecondTeacherLessonFixture | undefined;
  let absence: CreatedAbsence | undefined;
  // OFFERED substitutions are NOT cleaned up by `cancelAbsenceViaAPI`
  // (the API cancel-handler only deletes PENDING rows — see
  // teacher-absence.service.ts:253). Track the absence id so afterEach
  // hard-deletes via Prisma + cascade.
  let absenceIdForCleanup: string | undefined;

  test.beforeEach(async ({ request }) => {
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);
    second = await seedSecondTeacherLesson(fixture);

    const monday = nextMondayISODate();
    absence = await createAbsenceViaAPI(request, {
      teacherId: second.teacherId, // Anna — NOT kc-lehrer
      dateFrom: monday,
      dateTo: monday,
      reason: 'KRANK',
    });
    absenceIdForCleanup = absence.id;
    expect(
      absence.affectedLessonCount ?? 0,
      'absence-expansion must produce one substitution row for Anna\'s MONDAY/period-2 lesson',
    ).toBeGreaterThan(0);

    // Resolve the PENDING substitution id, then assign kc-lehrer as the
    // candidate substitute. Both happen as admin (the candidate has no
    // permission to assign themselves).
    const subs = await listSubstitutionsViaAPI(request);
    const pending = subs.find(
      (s) =>
        s.originalTeacherId === second!.teacherId &&
        s.dayOfWeek === 'MONDAY' &&
        s.periodNumber === 2 &&
        s.status === 'PENDING',
    );
    expect(
      pending,
      'admin substitutions list must contain the PENDING row for Anna\'s absence',
    ).toBeTruthy();
    await assignSubstituteViaAPI(
      request,
      pending!.id,
      SEED_TEACHER_KC_LEHRER_UUID,
    );
  });

  test.afterEach(async () => {
    if (absenceIdForCleanup) {
      await purgeAbsenceViaPrisma(absenceIdForCleanup);
      absenceIdForCleanup = undefined;
      absence = undefined;
    }
    if (fixture) {
      await cleanupTimetableRun(fixture);
      fixture = undefined;
      second = undefined;
    }
  });

  test('SUB-LEHRER-INCOMING-01: kc-lehrer sees Anna\'s absence as an OFFERED substitution in Section 1 with Accept/Decline CTAs', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    await loginAsRole(page, 'lehrer');
    await page.goto('/teacher/substitutions');

    // Section-1 page heading mounts.
    await expect(
      page.getByRole('heading', { name: 'Meine Vertretungen' }),
    ).toBeVisible();

    // Section-1 empty-state copy must NOT appear — our OFFERED row
    // should populate the section. (substitutions.tsx:48 — "Keine
    // offenen Vertretungsanfragen.")
    await expect(
      page.getByText('Keine offenen Vertretungsanfragen.'),
      'Section-1 empty state must not appear when an OFFERED substitution exists for the logged-in teacher',
    ).toHaveCount(0);

    // SubstituteOfferCard renders "Vertretung fuer: <strong>{name}</strong>"
    // (SubstituteOfferCard.tsx:117). Anna Lehrerin is the original
    // teacher of the absence we created above. `.first()` covers the
    // race-family case where another spec leaks an OFFERED row to
    // kc-lehrer with the same originalTeacher.
    await expect(
      page.getByText(/Vertretung fuer:\s*Anna Lehrerin/).first(),
      'card must show the absent teacher\'s name as the offer subject',
    ).toBeVisible();

    // "Angeboten" badge on the card proves the row's status flipped to
    // OFFERED (SubstituteOfferCard.tsx:121).
    await expect(
      page.getByText('Angeboten').first(),
      'OFFERED badge must render — guards against the row leaking as PENDING/CONFIRMED',
    ).toBeVisible();

    // Both CTAs render and are reachable from the card. (Accept opens
    // a confirm dialog; we only verify presence here — the
    // accept/decline mutation is a separate slice.)
    await expect(
      page.getByRole('button', { name: 'Akzeptieren' }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Ablehnen' }).first(),
    ).toBeVisible();
  });
});
