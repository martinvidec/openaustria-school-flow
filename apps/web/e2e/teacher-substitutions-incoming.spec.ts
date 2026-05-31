/**
 * Issue #85 — Teacher "Offene Anfragen" Section 1 (incoming offer).
 *
 * Issue #168 (Phase 3.5/6 Batch D) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school. The throwaway timetable
 * stack + `withSecondTeacherLesson: true` provide both kc-lehrer's lesson
 * at MONDAY/period-1 and the second lehrer's lesson at MONDAY/period-2
 * (the substitute-source slot the original spec needed).
 *
 * Locks the substitute-teacher's view of an OFFERED substitution on
 * /teacher/substitutions Section 1 — the "Du vertrittst heute…" flow
 * the issue text calls out and PR #94 explicitly deferred.
 *
 *   1. Throwaway TimetableRun + kc-lehrer's lesson at MONDAY/period-1 +
 *      a second lehrer's lesson at MONDAY/period-2 (via
 *      `withSecondTeacherLesson: true`).
 *   2. POST an absence for the SECOND lehrer for next Monday → backend
 *      creates a PENDING Substitution with originalTeacher = second lehrer.
 *   3. POST /substitutions/:id/assign with candidateTeacherId =
 *      kc-lehrer.teacher.id → status flips to OFFERED.
 *   4. kc-lehrer logs in → /teacher/substitutions →
 *      `SubstituteOfferCard` renders the offer with
 *      "Vertretung fuer: <second-lehrer-name>", an "Angeboten" badge,
 *      and Akzeptieren / Ablehnen CTAs.
 *
 * Why MONDAY/period-2 for the second lehrer's lesson: kc-lehrer's
 * throwaway lesson is at MONDAY/period-1, so kc-lehrer is FREE at
 * period-2 — the Pitfall-2 conflict guard in
 * `substitution.service.ts:91-108` accepts the assign. A colliding
 * slot would 409.
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
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #85 — Teacher Offene Anfragen Section 1 (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Section-1 rendering is desktop-only for the first lock; mobile is a follow-up if the SubstituteOfferCard layout drifts.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;
  let absence: CreatedAbsence | undefined;

  test.beforeEach(async ({ context, request }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      withSecondTeacherLesson: true,
      namePrefix: 'E2E-SUB-INCOMING',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);

    const stack = fixture.timetable!;
    const second = fixture.secondTeacher!;

    const monday = nextMondayISODate();
    absence = await createAbsenceViaAPI(
      request,
      {
        teacherId: second.teacherId, // second lehrer — NOT kc-lehrer
        dateFrom: monday,
        dateTo: monday,
        reason: 'KRANK',
      },
      fixture.schoolId,
    );
    expect(
      absence.affectedLessonCount ?? 0,
      "absence-expansion must produce one substitution row for the second lehrer's MONDAY/period-2 lesson",
    ).toBeGreaterThan(0);

    // Resolve the PENDING substitution id, then assign kc-lehrer (the
    // throwaway primary teacher) as the candidate substitute.
    const subs = await listSubstitutionsViaAPI(request, fixture.schoolId);
    const pending = subs.find(
      (s) =>
        s.originalTeacherId === second.teacherId &&
        s.dayOfWeek === 'MONDAY' &&
        s.periodNumber === 2 &&
        s.status === 'PENDING',
    );
    expect(
      pending,
      "admin substitutions list must contain the PENDING row for the second lehrer's absence",
    ).toBeTruthy();
    await assignSubstituteViaAPI(
      request,
      pending!.id,
      stack.teacherId,
      fixture.schoolId,
    );
  });

  test.afterEach(async () => {
    // Throwaway-school cleanup cascades the OFFERED Substitution +
    // TeacherAbsence along with the school — purgeAbsenceViaPrisma is
    // no longer needed.
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
      absence = undefined;
    }
  });

  test("SUB-LEHRER-INCOMING-01: kc-lehrer sees the second lehrer's absence as an OFFERED substitution in Section 1 with Accept/Decline CTAs", async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const second = fixture.secondTeacher!;
    // SubstituteOfferCard renders the second teacher's name in
    // "{firstName} {lastName}" order; `teacherFullName` is the throwaway
    // fixture's matching alias to that exact format.
    const expectedName = second.teacherFullName;

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
    // (SubstituteOfferCard.tsx:117). Per-school isolation removes the
    // need for `.first()` race-guards.
    await expect(
      page.getByText(
        new RegExp(`Vertretung fuer:\\s*${expectedName.replace(/ /g, '\\s+')}`),
      ),
      "card must show the absent teacher's name as the offer subject",
    ).toBeVisible();

    // "Angeboten" badge on the card proves the row's status flipped to
    // OFFERED (SubstituteOfferCard.tsx:121).
    await expect(
      page.getByText('Angeboten'),
      'OFFERED badge must render — guards against the row leaking as PENDING/CONFIRMED',
    ).toBeVisible();

    // Both CTAs render and are reachable from the card. (Accept opens
    // a confirm dialog; we only verify presence here — the
    // accept/decline mutation is a separate slice.)
    await expect(
      page.getByRole('button', { name: 'Akzeptieren' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Ablehnen' }),
    ).toBeVisible();
  });
});
