/**
 * Issue #82 — Timetable cell badges (Homework + Exam) regression-lock.
 *
 * Migrated to the throwaway-school architecture in #137 (Phase 3 pilot):
 *   - Per-spec School + active TimetableRun + Lesson + ClassSubject + Teacher
 *     are provisioned via `createThrowawaySchool({ withTimetableStack: true })`,
 *     so the chromium-only-skip race-defense ("Mutates Homework + Exam rows
 *     on the shared seed class — chromium is the sole writer") is GONE.
 *   - Cross-project parallel execution (chromium + firefox) is the success
 *     criterion: every worker writes Homework + Exam rows on its OWN throwaway
 *     classSubject, so race-on-shared-resource cannot recur.
 *   - Frontend school-context switch via `setCurrentSchoolInBrowser` after
 *     `loginAsRole(lehrer)` so `apiFetch` injects `X-School-Id: <throwaway>`
 *     on every subsequent request (see ADR docs/adr/0001-current-school-context.md).
 *
 * Asserts (unchanged from the pre-migration regression intent):
 *   1. Seeded TimetableLesson at MONDAY/period-1 (kc-lehrer Maria Mueller as
 *      teacher in the throwaway school).
 *   2. Seeded Homework + Exam against the throwaway classSubjectId via API.
 *   3. kc-lehrer logs in → /timetable defaults to teacher perspective for
 *      her throwaway-school teacherId.
 *   4. The seeded cell renders TimetableCellBadges with both icons —
 *      aria-label="Hausaufgabe: <title>" and "Pruefung: <title>".
 *   5. Click each badge → Popover opens with the seeded title visible.
 *
 * Cleanup: `fixture.cleanup()` does `prisma.school.delete()` which cascades
 * through Homework + Exam + TimetableLesson + TimetableRun + ClassSubject +
 * Teacher + Subject + Room + SchoolDay + TimeGrid + Person (post-#136
 * cascade audit: 25/25 School FKs are CASCADE). No per-row sweeps needed.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  HOMEWORK_TITLE_PREFIX,
  createHomeworkViaAPI,
  isoDaysFromNow as homeworkDateInDays,
} from './helpers/homework';
import {
  EXAMS_TITLE_PREFIX,
  createExamViaAPI,
  isoDaysFromNow as examDateInDays,
} from './helpers/exams';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #82 — Timetable cell badges (desktop, throwaway-school)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Cell-badge contract is identical across viewports — desktop only for the first lock.',
  );
  // No chromium-only-skip: #137 migration to throwaway-school eliminates the
  // shared-seed-class race that made the original spec a sole-writer.

  let fixture: ThrowawaySchoolFixture | undefined;
  let homeworkTitle: string;
  let examTitle: string;

  test.beforeEach(async ({ request }) => {
    fixture = await createThrowawaySchool({
      roles: { lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-CB',
    });
    const stack = fixture.timetable!;

    const ts = Date.now();
    homeworkTitle = `${HOMEWORK_TITLE_PREFIX}BADGE-${ts} — Kapitel 5 lesen`;
    examTitle = `${EXAMS_TITLE_PREFIX}BADGE-${ts} — Schularbeit 1`;

    await createHomeworkViaAPI(
      request,
      {
        title: homeworkTitle,
        description: 'Aufgaben 1-12 auf Seite 47',
        dueDate: homeworkDateInDays(2),
        classSubjectId: stack.classSubjectId,
      },
      fixture.schoolId,
    );
    await createExamViaAPI(
      request,
      {
        title: examTitle,
        date: examDateInDays(7),
        classSubjectId: stack.classSubjectId,
        classId: stack.classId,
      },
      fixture.schoolId,
    );
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('CB-BADGE-01: Lehrer sees Homework + Exam badges on the seeded cell, popovers open with seeded content', async ({
    page,
    context,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    // ── Issue #137 — Bind every HTTP request from this BrowserContext to
    // the throwaway school via the X-School-Id header. Includes the very
    // first /users/me that hydrates useSchoolContext, so the frontend
    // store starts (and stays) on the throwaway — no Prisma-ordering
    // race for the default membership.
    await useThrowawaySchoolHeader(context, fixture.schoolId);

    await loginAsRole(page, 'lehrer');
    await page.goto('/timetable');

    // Wait for the grid to mount. The kc-lehrer perspective lands on
    // perspective=teacher (Issue #86 lock); the seeded lesson should
    // surface as a single TimetableCell in the MONDAY/period-1 slot.
    await expect(
      page.getByRole('heading', { name: 'Stundenplan' }),
    ).toBeVisible();

    // HomeworkBadge ships with aria-label="Hausaufgabe: <title>"
    // (HomeworkBadge.tsx:43). The aria-label including the seeded
    // title is the deterministic discriminator — multiple badges from
    // sibling specs would surface their own labels but never with
    // OUR timestamp.
    const homeworkBadge = page.getByRole('button', {
      name: `Hausaufgabe: ${homeworkTitle}`,
    });
    await expect(
      homeworkBadge,
      'HomeworkBadge must render on the seeded cell carrying the seeded title in its aria-label',
    ).toBeVisible();

    const examBadge = page.getByRole('button', {
      name: `Pruefung: ${examTitle}`,
    });
    await expect(
      examBadge,
      'ExamBadge must render on the seeded cell carrying the seeded title in its aria-label',
    ).toBeVisible();

    // Click homework badge → Radix Popover opens with the seeded title.
    await homeworkBadge.click();
    await expect(
      page.getByRole('dialog').getByText(homeworkTitle),
      'homework popover must surface the seeded title verbatim',
    ).toBeVisible();
    // Close popover before triggering the next one — Radix renders one
    // PopoverContent at a time but explicit Escape avoids any focus-trap
    // ambiguity if a future Radix version stacks them.
    await page.keyboard.press('Escape');

    await examBadge.click();
    await expect(
      page.getByRole('dialog').getByText(examTitle),
      'exam popover must surface the seeded title verbatim',
    ).toBeVisible();
  });
});
