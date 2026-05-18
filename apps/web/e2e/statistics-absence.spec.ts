/**
 * Issue #87 — Absence-Statistics (Abwesenheitsstatistik) coverage.
 *
 * Surface: /statistics/absence (apps/web/src/routes/_authenticated/
 * statistics/absence.tsx, 50 LoC) → renders AbsenceStatisticsPanel.
 * Today only `roles-smoke.spec.ts` proves the page renders ohne crash;
 * there is no assertion that the per-student aggregation MATCHES the
 * underlying attendance data — exactly the kind of silent drift that
 * the statistics service's status-→-counter switch (statistics.service.
 * ts:144) and the D-04 Schulunterrichtsgesetz rule "Verspaetet >15 Min
 * zaehlt als abwesend" could quietly break.
 *
 * Test-Strategie — single end-to-end aggregation lock:
 *
 *   STATS-AGG-3STUDENTS: seed exactly ONE ClassBookEntry on a fixed
 *   date (STATS_FIXTURE_DATE = 2026-03-15) with three AttendanceRecords:
 *     - Lisa Huber    → PRESENT
 *     - Felix Bauer   → ABSENT
 *     - Sophie Wagner → LATE, lateMinutes=20 (counts as 1 Verspaetet
 *                          AND 1 Verspaetet>15Min per D-04)
 *
 *   Admin opens /statistics/absence, the page auto-selects class 1A
 *   (the first class by yearLevel+name asc), the spec sets BOTH date
 *   inputs to the fixture date so the API filter narrows to our entry
 *   only, and the spec then asserts the three Fehlquote values:
 *     - Felix Bauer  → 100.0%
 *     - Lisa Huber   →   0.0%
 *     - Sophie Wagner→ 100.0% (the >15min late + the absent share the
 *                              "counts as absent" semantics in absenceRate)
 *
 * Why a fixed date instead of "today": the page's default date range
 * is the current Austrian school semester (statistics.service.ts:15
 * getSemesterDateRange), which spans ~5 months. Without a fixed date
 * input override, any leftover attendance noise from other classbook
 * specs in the same semester would pollute the counts and make the
 * assertions race-prone. The spec pins BOTH date inputs to
 * STATS_FIXTURE_DATE so the API call passes startDate=endDate=
 * 2026-03-15 and the backend filter `gte/lte` returns only the
 * fixture's entry. The fixture also uses a unique periodNumber (5,
 * not the period=1 that seedTimetableRun() uses) so the
 * ClassBookEntry.@@unique constraint can't collide with the
 * classbook-related fixtures.
 *
 * Why Prisma-direct fixture: the path to create a ClassBookEntry via
 * API is `GET /classbook/by-timetable-lesson/:id` which upserts an
 * entry from a TimetableLesson — but it pins the entry's date to
 * the lesson's date (today) and the period to the lesson's period.
 * That doesn't give us deterministic control over the (classSubjectId,
 * date, period, weekType) tuple the statistics service aggregates on,
 * and would require seeding additional TimetableLessons for each
 * spec iteration. Direct Prisma insert hits the same uniqueness
 * constraint without the extra round-trips.
 *
 * Race-Family-Achtung: chromium-only-skip + per-test seed/cleanup.
 * The fixture deletes the ClassBookEntry in afterEach, which cascades
 * to the AttendanceRecord rows via `AttendanceRecord.classBookEntry`
 * onDelete: Cascade (schema.prisma:961).
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  cleanupAbsenceStats,
  seedAbsenceStats,
  STATS_FIXTURE_DATE,
  type AbsenceStatsFixture,
} from './fixtures/absence-stats';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

test.describe('Issue #87 — Absence-Statistics (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Statistics table is wider than mobile viewport (horizontal scroll required) — mobile coverage would belong to its own *.mobile.spec.ts that asserts the sticky-name-column behaviour.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates ClassBookEntry + AttendanceRecord rows on the shared seed class 1A — chromium is the sole writer (race-family precedent).',
  );

  let fixture: AbsenceStatsFixture | undefined;

  test.beforeEach(async () => {
    fixture = await seedAbsenceStats(SEED_SCHOOL_UUID);
  });

  test.afterEach(async () => {
    if (!fixture) return;
    await cleanupAbsenceStats(fixture);
    fixture = undefined;
  });

  test('STATS-AGG-3STUDENTS: aggregated Fehlquote per student matches the seeded PRESENT/ABSENT/LATE>15 attendance', async ({
    page,
  }) => {
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
    // The page auto-selects classes[0] on mount (1A by yearLevel+name asc),
    // so by the time we land here the API request for statistics has
    // already been kicked off for 1A. The date-input changes invalidate
    // the query and trigger a refetch.
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
    // formatPercentage = `${value.toFixed(1)}%` ⇒ JS .toFixed uses dot,
    // not the German comma decimal separator (AbsenceStatisticsPanel.
    // tsx:49). The literal "100.0%" string therefore matches exactly.
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
    // lateOver15MinCount AND in absenceRate.
    // statistics.service.ts:171 puts (absentUnexcused + absentExcused +
    // lateOver15Min) / totalLessons into absenceRate → (0 + 0 + 1) / 1 =
    // 100.0%.
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
