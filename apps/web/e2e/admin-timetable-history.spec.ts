/**
 * Issue #87 — Admin Aenderungsverlauf (Timetable Edit History) coverage.
 *
 * Migrated to the throwaway-school architecture in #138 wave 2: per-spec
 * School + active TimetableRun + TimetableLesson + TimetableLessonEdit are
 * provisioned via `createThrowawaySchool({ withTimetableStack: true,
 * withTimetableEdit: { ... } })`, so the chromium-only-skip race-defense
 * ("Mutates active TimetableRun on shared seed school — chromium is the
 * sole writer") is GONE.
 *
 * Surface: /admin/timetable-history renders the EditHistoryPanel for the
 * active TimetableRun. The fixture pins a single "move" edit row from
 * MONDAY/1 → TUESDAY/2 so the page must render:
 *   - heading "Aenderungsverlauf" + card title "Manuelle Aenderungen…"
 *   - the seeded edit row with badge "Verschoben" + description
 *     "MONDAY 1. Std. -> TUESDAY 2. Std." (per EditHistoryPanel.tsx:100)
 *   - the "Rueckgaengig" button (revert dialog covered by TT-HIST-REVERT-DIALOG)
 *
 * The throwaway class is explicitly named "1A" via the fixture's
 * `classNames` option so the PerspectiveSelector assertion text stays
 * byte-identical to the legacy seed-school path (minimal review diff).
 *
 * Cleanup: `fixture.cleanup()` deletes the TimetableLessonEdit explicitly
 * first (no FK cascade — schema audit in #138 wave 2 documented this gap),
 * then the TimetableRun (CASCADE on runId frees the room FK), then the
 * School (cascade does the rest).
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #87 — Admin timetable-history (desktop, throwaway-school)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Aenderungsverlauf is an admin-desktop surface. Mobile coverage of the EditHistoryPanel would belong to its own *.mobile.spec.ts.',
  );
  // No chromium-only-skip: #138 wave 2 migration to throwaway-school
  // eliminates the active-TimetableRun-singleton race on the seed school.

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withClasses: 1,
      classNames: ['1A'],
      withTimetableStack: true,
      withTimetableEdit: {
        previousState: { dayOfWeek: 'MONDAY', periodNumber: 1 },
        newState: { dayOfWeek: 'TUESDAY', periodNumber: 2 },
      },
      namePrefix: 'E2E-TH',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('TT-HIST-RENDER: seeded "Verschoben" edit row + description show up on /admin/timetable-history', async ({
    page,
    context,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    // ── Step 1: prime the timetable store with a perspective ────────────
    // /admin/timetable-history reads `perspective` + `perspectiveId` from
    // the zustand timetable-store and is empty-state until they are set.
    // Admin auto-perspective is not auto-set; we mimic the same flow the
    // admin-timetable-edit-perspective spec uses to drive the
    // PerspectiveSelector to class 1A (the throwaway class name).
    await page.goto('/timetable');
    const perspectiveTrigger = page.getByRole('combobox').first();
    await expect(perspectiveTrigger).toBeVisible();
    await perspectiveTrigger.click();
    await page.getByRole('option', { name: '1A', exact: true }).click();
    await expect(
      page.getByRole('grid', { name: 'Stundenplan' }),
      'Class 1A perspective must mount the timetable grid before navigating to /admin/timetable-history (otherwise the page has no runId to fetch edit-history for)',
    ).toBeVisible({ timeout: 15_000 });

    // ── Step 2: navigate to the Aenderungsverlauf page via SPA router ──
    // CRITICAL: `page.goto('/admin/timetable-history')` triggers a full
    // page reload which destroys the in-memory zustand timetable-store
    // (perspective + perspectiveId), and the page lands in the
    // "Kein Stundenplan vorhanden" empty-state because `useTimetableView`
    // is disabled when perspectiveId is null. Clicking the sidebar link
    // routes via TanStack Router's history-API navigation — the store
    // survives, the view query runs with our seeded perspective, and
    // the page renders the EditHistoryPanel.
    await page.getByRole('link', { name: 'Aenderungsverlauf' }).click();

    await expect(
      page.getByRole('heading', { name: 'Aenderungsverlauf' }),
    ).toBeVisible();
    await expect(
      page.getByText('Manuelle Aenderungen am Stundenplan'),
    ).toBeVisible();

    // ── Step 3: assert the seeded edit row content ──────────────────────
    // Badge label "Verschoben" comes from ACTION_LABELS['move'] in
    // EditHistoryPanel.tsx:23.
    await expect(
      page.getByText('Verschoben', { exact: true }),
      'Badge label for action "move" must read "Verschoben" (ACTION_LABELS.move in EditHistoryPanel.tsx:23)',
    ).toBeVisible();

    // Description is built from previousState/newState in
    // EditHistoryPanel.tsx:100 — "MONDAY 1. Std. -> TUESDAY 2. Std."
    // The strings are emitted verbatim from the JSON columns; matching
    // the literal text catches any future change that would silently
    // re-format the diff string.
    await expect(
      page.getByText('MONDAY 1. Std. -> TUESDAY 2. Std.', { exact: true }),
      'Move description must read "${prevDay} ${prevPeriod}. Std. -> ${newDay} ${newPeriod}. Std." (EditHistoryPanel.tsx:101)',
    ).toBeVisible();

    // Revert button must be present on the row.
    await expect(
      page.getByRole('button', { name: 'Rueckgaengig' }),
    ).toBeVisible();
  });

  test('TT-HIST-REVERT-DIALOG: "Rueckgaengig" opens the confirmation dialog with destructive copy and Abbrechen closes it', async ({
    page,
    context,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');
    await page.goto('/timetable');
    const perspectiveTrigger = page.getByRole('combobox').first();
    await expect(perspectiveTrigger).toBeVisible();
    await perspectiveTrigger.click();
    await page.getByRole('option', { name: '1A', exact: true }).click();
    await expect(page.getByRole('grid', { name: 'Stundenplan' })).toBeVisible({
      timeout: 15_000,
    });

    // SPA-link navigation, NOT page.goto: see TT-HIST-RENDER for the
    // zustand-store-survival rationale.
    await page.getByRole('link', { name: 'Aenderungsverlauf' }).click();

    // Wait for the edit row to mount before clicking — the Rueckgaengig
    // button is one-per-row.
    await expect(page.getByText('Verschoben', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Rueckgaengig' }).click();

    // Dialog must surface with the EditHistoryPanel.tsx:150 title + the
    // destructive-copy paragraph (UI-SPEC: "Alle spaeter vorgenommenen
    // Aenderungen gehen verloren.").
    await expect(
      page.getByRole('dialog'),
      'Clicking "Rueckgaengig" must open the confirmation Radix Dialog',
    ).toBeVisible();
    await expect(
      page.getByText('Aenderung rueckgaengig machen', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/spaeter vorgenommenen Aenderungen gehen verloren/),
      'Destructive-copy paragraph must reference the data-loss consequence (UI-SPEC destructive copy guard)',
    ).toBeVisible();

    // "Abbrechen" closes the dialog without firing the revert mutation —
    // the edit row therefore stays in the DB and fixture.cleanup() can
    // still find it in afterEach.
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Sanity: the row is still there.
    await expect(page.getByText('Verschoben', { exact: true })).toBeVisible();
  });
});
