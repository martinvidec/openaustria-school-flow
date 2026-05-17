/**
 * Issue #82 — Timetable cell badges (Homework + Exam) regression-lock.
 *
 * Third sub-spec of the Hausaufgaben/Klausuren coverage gap (closes #82
 * alongside #99 + #100). Locks the cross-surface render contract that
 * homework and exam badges land on the right timetable cell when the
 * Lehrer opens /timetable:
 *
 *   1. Seed a TimetableRun fixture (MONDAY/period-1 lesson for class 1A,
 *      teacher = kc-lehrer Maria Mueller).
 *   2. Seed ONE Homework and ONE Exam against the fixture's
 *      classSubjectId via API.
 *   3. kc-lehrer logs in → /timetable defaults to perspective=teacher
 *      for her own teacherId.
 *   4. The seeded cell renders TimetableCellBadges with both icons —
 *      aria-label="Hausaufgabe: <title>" and "Pruefung: <title>"
 *      identify them deterministically.
 *   5. Click each badge → Popover opens with the seeded title visible.
 *
 * Exercises the renderCellWithBadges path in /timetable/index.tsx, the
 * useHomework + useExams aggregation, and the badge Popover trigger.
 * Bug-class guard: if HomeworkBadge stops accepting its homework prop
 * or the badge container drops aria-label, this spec turns red loudly.
 *
 * Chromium-only-skip per the race-family precedent — every spec on
 * this surface writes Homework / Exam rows on the shared seed class.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  HOMEWORK_TITLE_PREFIX,
  cleanupE2EHomework,
  createHomeworkViaAPI,
  isoDaysFromNow as homeworkDateInDays,
} from './helpers/homework';
import {
  EXAMS_TITLE_PREFIX,
  cleanupE2EExams,
  createExamViaAPI,
  isoDaysFromNow as examDateInDays,
} from './helpers/exams';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const SEED_CLASS_1A_ID = 'seed-class-1a';

test.describe('Issue #82 — Timetable cell badges (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Cell-badge contract is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates Homework + Exam rows on the shared seed class — chromium is the sole writer.',
  );

  let fixture: TimetableRunFixture | undefined;
  let homeworkTitle: string;
  let examTitle: string;

  test.beforeEach(async ({ page, request }) => {
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);

    const ts = Date.now();
    homeworkTitle = `${HOMEWORK_TITLE_PREFIX}BADGE-${ts} — Kapitel 5 lesen`;
    examTitle = `${EXAMS_TITLE_PREFIX}BADGE-${ts} — Schularbeit 1`;

    await createHomeworkViaAPI(request, {
      title: homeworkTitle,
      description: 'Aufgaben 1–12 auf Seite 47',
      dueDate: homeworkDateInDays(2),
      classSubjectId: fixture.classSubjectId,
    });
    await createExamViaAPI(request, {
      title: examTitle,
      date: examDateInDays(7),
      classSubjectId: fixture.classSubjectId,
      classId: SEED_CLASS_1A_ID,
    });

    await loginAsRole(page, 'lehrer');
  });

  test.afterEach(async ({ request }) => {
    // Sweep by BADGE- sub-prefix so parallel specs (classbook-homework,
    // classbook-exams) only delete their own rows. Pattern lifted from
    // the recent excuses cross-spec cleanup-race fix.
    await cleanupE2EHomework(request, `${HOMEWORK_TITLE_PREFIX}BADGE-`);
    await cleanupE2EExams(request, `${EXAMS_TITLE_PREFIX}BADGE-`);
    if (fixture) {
      await cleanupTimetableRun(fixture);
      fixture = undefined;
    }
  });

  test('CB-BADGE-01: Lehrer sees Homework + Exam badges on the seeded cell, popovers open with seeded content', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

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
