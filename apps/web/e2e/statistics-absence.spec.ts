/**
 * Issue #87 — Absence-Statistics (Abwesenheitsstatistik) coverage.
 *
 * Migrated to the throwaway-school architecture in #138 wave 1: per-spec
 * School + Class + Students + ClassBookEntry + AttendanceRecord rows
 * provisioned via `createThrowawaySchool({ withStudents, withClassbookEntry })`,
 * so the chromium-only-skip race-defense ("Mutates ClassBookEntry +
 * AttendanceRecord on the shared seed class 1A — chromium is the sole
 * writer") is GONE.
 *
 * Surface: /statistics/absence — renders AbsenceStatisticsPanel which
 * auto-selects the first class by yearLevel+name asc. With a throwaway
 * school there's only the throwaway class, so the auto-select picks it
 * deterministically.
 *
 * Test-Strategie — single end-to-end aggregation lock:
 *
 *   STATS-AGG-3STUDENTS: seed exactly ONE ClassBookEntry on a fixed date
 *   (STATS_FIXTURE_DATE) with three AttendanceRecords:
 *     - Lisa Huber    → PRESENT
 *     - Felix Bauer   → ABSENT
 *     - Sophie Wagner → LATE, lateMinutes=20 (counts as 1 Verspaetet AND
 *                          1 Verspaetet>15Min per D-04 Schulunterrichts-
 *                          gesetz, AND in absenceRate)
 *
 *   Admin opens /statistics/absence, the page auto-selects the throwaway
 *   class (only one available), the spec sets BOTH date inputs to the
 *   fixture date, and asserts:
 *     - Felix Bauer  → 100.0%
 *     - Lisa Huber   →   0.0%
 *     - Sophie Wagner→ 100.0%
 *
 * Why these names match the pre-migration seed names: keeps the assertions
 * byte-identical to the original spec, minimizing diff for code review.
 * The throwaway provisions Persons with these names, so the textual
 * assertions still hit.
 *
 * Why a fixed date instead of today: pins the API filter to a single day,
 * so the test only sees its own entry — bulletproof against parallel
 * specs writing attendance on other dates (even though the throwaway
 * already isolates per-school).
 *
 * Cleanup: `fixture.cleanup()` drops the throwaway school via
 * prisma.school.delete cascade — Person/Student/ClassBookEntry/
 * AttendanceRecord all dissolve in the FK chain (post-#136+#137 cascade
 * audit).
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

export const STATS_FIXTURE_DATE = '2026-03-15';

test.describe('Issue #87 — Absence-Statistics (desktop, throwaway-school)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Statistics table is wider than mobile viewport (horizontal scroll required) — mobile coverage would belong to its own *.mobile.spec.ts that asserts the sticky-name-column behaviour.',
  );
  // No chromium-only-skip: #138 wave 1 migration to throwaway-school
  // eliminates the shared-seed-class race that made the original spec
  // a sole-writer.

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withClasses: 1,
      withTimetableStack: true,
      withStudents: [
        { firstName: 'Lisa', lastName: 'Huber' },
        { firstName: 'Felix', lastName: 'Bauer' },
        { firstName: 'Sophie', lastName: 'Wagner' },
      ],
      withClassbookEntry: {
        date: STATS_FIXTURE_DATE,
        period: 5,
        attendance: [
          { studentIndex: 0, status: 'PRESENT' }, // Lisa
          { studentIndex: 1, status: 'ABSENT' }, // Felix
          { studentIndex: 2, status: 'LATE', lateMinutes: 20 }, // Sophie
        ],
      },
      namePrefix: 'E2E-SA',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('STATS-AGG-3STUDENTS: aggregated Fehlquote per student matches the seeded PRESENT/ABSENT/LATE>15 attendance', async ({
    page,
    context,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    await useThrowawaySchoolHeader(context, fixture.schoolId);

    await loginAsRole(page, 'admin');
    await page.goto('/statistics/absence');

    await expect(
      page.getByRole('heading', { name: 'Abwesenheitsstatistik' }),
    ).toBeVisible();

    // The Zeitraum is two raw `<input type="date">` elements; the page
    // doesn't label them individually (one shared "Zeitraum" label).
    // Pin both to the fixture date to isolate from semester-wide noise.
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
    await dateInputs.nth(0).fill(STATS_FIXTURE_DATE);
    await dateInputs.nth(1).fill(STATS_FIXTURE_DATE);

    // Wait for the table to render with the seeded data.
    // The page auto-selects classes[0] on mount; the throwaway school has
    // exactly one class so the selection is deterministic. The date-input
    // changes invalidate the query and trigger a refetch.
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Each student row is keyed by studentId; we assert content by name.
    // Sort order is lastName-asc per statistics.service.ts:188, so the
    // visible order is Bauer → Huber → Wagner.
    const felixRow = page.locator('tr', { hasText: 'Felix Bauer' });
    const lisaRow = page.locator('tr', { hasText: 'Lisa Huber' });
    const sophieRow = page.locator('tr', { hasText: 'Sophie Wagner' });

    await expect(felixRow).toBeVisible();
    await expect(lisaRow).toBeVisible();
    await expect(sophieRow).toBeVisible();

    // ── Felix Bauer: ABSENT → 100.0% Fehlquote ────────────────────────
    await expect(
      felixRow.getByText('100.0%', { exact: true }),
      'Felix Bauer is ABSENT for 1 of 1 lesson → Fehlquote 100.0% (absentUnexcused / totalLessons * 100, statistics.service.ts:170)',
    ).toBeVisible();

    // ── Lisa Huber: PRESENT → 0.0% Fehlquote ──────────────────────────
    await expect(
      lisaRow.getByText('0.0%', { exact: true }),
      'Lisa Huber is PRESENT for 1 of 1 lesson → Fehlquote 0.0%',
    ).toBeVisible();

    // ── Sophie Wagner: LATE 20min → 100.0% Fehlquote ──────────────────
    // D-04 Schulunterrichtsgesetz: lateMinutes > 15 counts in
    // lateOver15MinCount AND in absenceRate. statistics.service.ts:171
    // puts (absentUnexcused + absentExcused + lateOver15Min) / totalLessons
    // into absenceRate → (0 + 0 + 1) / 1 = 100.0%.
    await expect(
      sophieRow.getByText('100.0%', { exact: true }),
      'Sophie Wagner is LATE with lateMinutes=20 → lateOver15MinCount=1 → Fehlquote 100.0% (D-04 Schulunterrichtsgesetz rule)',
    ).toBeVisible();

    // ── D-04 deeper lock: Sophie's "Verspaetet >15 Min." column = 1 ──
    // The lateOver15MinCount cell is the column that the D-04 rule
    // most directly drives, and AbsenceStatisticsPanel.tsx:262 applies
    // the orange highlight when the value > 0. A future refactor that
    // collapsed lateOver15MinCount into a generic "late" counter
    // would break the rule silently — this assertion catches it.
    const sophieCells = sophieRow.locator('td');
    // Columns (AbsenceStatisticsPanel.tsx:108):
    //   0 studentName, 1 totalLessons, 2 presentCount, 3 absentUnexcused,
    //   4 absentExcused, 5 lateCount, 6 lateOver15MinCount, 7 absenceRate
    await expect(sophieCells.nth(5)).toHaveText('1');
    await expect(sophieCells.nth(6)).toHaveText('1');
  });
});
