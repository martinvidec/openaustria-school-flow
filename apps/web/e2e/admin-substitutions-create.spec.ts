/**
 * Issue #85 — Admin "Neue Abwesenheit erfassen" UI flow.
 *
 * Third sub-spec of the Substitutions coverage gap. Locks the admin-side
 * UI for creating an absence end-to-end:
 *
 *   1. Seed an active TimetableRun with one lesson at MONDAY/period-1
 *      for kc-lehrer (Maria Mueller).
 *   2. Admin opens /admin/substitutions?tab=absences, clicks "Neue
 *      Abwesenheit erfassen", picks Maria Mueller + date range +
 *      KRANK reason, submits.
 *   3. Toast "Abwesenheit erfasst. 1 Stunden betroffen." confirms the
 *      backend expansion produced exactly one row, and the AbsenceList
 *      below the form re-renders with the new row.
 *   4. Switch to "Offene Vertretungen" tab — the auto-generated
 *      substitution surfaces.
 *
 * Why this slice: SUB-ADMIN-01 (PR #92) drove the absence creation via
 * the API helper and only locked the list-side rendering. This one
 * exercises the actual `<AbsenceForm>` ↔ `useCreateAbsence` ↔
 * `POST /absences` path through the UI, which is the production-user
 * flow and the only place the date inputs, the teacher Select, and the
 * affectedLessonCount toast are wired together.
 *
 * Chromium-only-skip per the race-family precedent — shared seed-school
 * mutating specs collide on parallel browser projects (TimetableRun is
 * the canonical race surface).
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  nextMondayISODate,
  listSubstitutionsViaAPI,
} from './helpers/substitutions';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  purgeAbsenceViaPrisma,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

test.describe('Issue #85 — Admin Neue Abwesenheit erfassen UI flow (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'AbsenceForm is desktop-prioritised — mobile flow is a follow-up slice once the form layout is mobile-audited.',
  );

  let fixture: TimetableRunFixture | undefined;
  // The UI flow leaves the absence row created via POST /absences on
  // the server. afterEach tracks it by id (resolved post-submit via the
  // admin GET /substitutions list) so the cleanup hard-deletes it
  // through Prisma (cascades the auto-generated PENDING substitution).
  let absenceId: string | undefined;

  test.beforeEach(async ({ page }) => {
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    if (absenceId) {
      await purgeAbsenceViaPrisma(absenceId);
      absenceId = undefined;
    }
    if (fixture) {
      await cleanupTimetableRun(fixture);
      fixture = undefined;
    }
  });

  test('SUB-ADMIN-CREATE-01: admin creates an absence via the UI form → toast + AbsenceList + Offene Vertretungen row', async ({
    page,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    const monday = nextMondayISODate();

    await page.goto('/admin/substitutions?tab=absences');
    await expect(
      page.getByRole('heading', { name: 'Vertretungsplanung' }),
    ).toBeVisible();

    // Open the form. Button copy is verbatim from substitutions.tsx:142.
    await page
      .getByRole('button', { name: 'Neue Abwesenheit erfassen' })
      .click();

    // Teacher Select — Radix Select renders option labels as
    // "{lastName}, {firstName}" (AbsenceForm.tsx:152). The seed
    // teacher is Maria Mueller.
    await page.getByRole('combobox', { name: 'Lehrer/in' }).click();
    await page
      .getByRole('option', { name: 'Mueller, Maria' })
      .click();

    // Date range — both inputs default to today but the fixture lesson
    // is on MONDAY, so override to the next Monday to guarantee the
    // expansion algorithm picks up exactly one lesson.
    await page.fill('input#absence-date-from', monday);
    await page.fill('input#absence-date-to', monday);

    // Reason defaults to KRANK already (AbsenceForm.tsx:67) — leaving
    // it as-is intentionally to lock the default for downstream
    // analytics specs.

    await page
      .getByRole('button', { name: 'Abwesenheit erfassen' })
      .click();

    // Submission toast — exact text from AbsenceForm.tsx:115. "1" is
    // load-bearing: it proves the backend treated the absence as
    // covering exactly the one seed lesson, not zero (would-fail check
    // below) and not many (which would mean cross-fixture leakage).
    await expect(
      page.getByText('Abwesenheit erfasst. 1 Stunden betroffen.'),
    ).toBeVisible();

    // AbsenceList below the form re-renders with the new row. The
    // teacherName field is "{firstName} {lastName}" (space-separated)
    // from teacher-absence.service.ts:268, NOT the comma form the
    // dropdown option uses. `.first()` because parallel-spec absences
    // for Maria Mueller on the same Monday show up alongside ours in
    // the shared tenant — assertion intent ("the row landed in the
    // list") is preserved.
    await expect(
      page
        .locator('table')
        .getByText(/Maria\s+Mueller/)
        .first(),
    ).toBeVisible();

    // Resolve the absence id via the admin substitutions API so
    // afterEach can hard-delete it. We match by (originalTeacherId,
    // dayOfWeek=MONDAY, periodNumber=1, status=PENDING) — the only
    // substitution our spec could have produced given the fixture.
    const subs = await listSubstitutionsViaAPI(request);
    const ours = subs.find(
      (s) =>
        s.originalTeacherId === fixture!.teacherId &&
        s.dayOfWeek === 'MONDAY' &&
        s.periodNumber === 1 &&
        s.status === 'PENDING',
    );
    expect(
      ours,
      'admin substitutions list must contain the auto-generated row for our absence',
    ).toBeTruthy();
    absenceId = ours!.absenceId;

    // Switch tabs and verify the substitution surfaces in
    // OpenSubstitutionsPanel. This validates the end-to-end loop:
    // UI form → POST /absences → backend expansion → useSubstitutions
    // refetch → panel render.
    await page.getByRole('tab', { name: 'Offene Vertretungen' }).click();
    await expect(
      page.getByText(/Vertretung fuer:\s*Maria Mueller/).first(),
      'newly created absence must produce a substitution row in the open panel',
    ).toBeVisible();
  });
});
