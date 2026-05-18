/**
 * Issue #87 — Admin Aenderungsverlauf (Timetable Edit History) coverage.
 *
 * Surface: /admin/timetable-history (apps/web/src/routes/_authenticated/
 * admin/timetable-history.tsx, 104 LoC). Renders the EditHistoryPanel for
 * the active TimetableRun. Today only `roles-smoke.spec.ts` proves the
 * page rendert ohne Crash — there is no assertion that an actual edit
 * shows up with the right action badge + description + revert
 * confirmation copy.
 *
 * Test-Strategie:
 *
 *   TT-HIST-RENDER: seed a TimetableRun + TimetableLesson + one
 *   TimetableLessonEdit row of action "move" (MONDAY/1 → TUESDAY/2),
 *   admin selects class 1A perspective on /timetable so the
 *   useTimetableStore has a perspective set, then navigates to
 *   /admin/timetable-history. The page must render:
 *     - heading "Aenderungsverlauf" + card title "Manuelle Aenderungen…"
 *     - the seeded edit row with badge "Verschoben", description
 *       "MONDAY 1. Std. -> TUESDAY 2. Std." (per EditHistoryPanel.tsx:100)
 *     - the "Rueckgaengig" button
 *
 *   TT-HIST-REVERT-DIALOG: clicking "Rueckgaengig" must open the
 *   confirmation dialog with title "Aenderung rueckgaengig machen" and
 *   the destructive-copy paragraph that references "spaeter vorgenommenen
 *   Aenderungen gehen verloren". "Abbrechen" closes the dialog without
 *   touching the edit row (cleanup must still find it).
 *
 * Why we don't actually revert: revert mutates the underlying
 * TimetableLesson back to the previousState (timetable-edit.service.ts:
 * revertToEdit), which would race the seedTimetableRun() lesson
 * coordinates with sibling specs. The confirmation-dialog open is the
 * regression we want to lock — the actual mutation path is covered by
 * the dnd / edit-perspective specs.
 *
 * Why Prisma-direct seeding: TimetableLessonEdit is an audit-log row
 * with no API for direct creation (only PATCH /move plants edit rows as
 * a side-effect, and driving a real move via UI would mutate the lesson
 * grid — much wider blast radius). The `seedTimetableEdit()` helper
 * uses the same `createRequire(Prisma client)` bridge as
 * `seedTimetableRun()`. See fixtures/timetable-run.ts:seedTimetableEdit
 * for the rationale.
 *
 * Race-Family-Achtung: chromium-only-skip + per-test seeding (same
 * precedent as the #86 non-admin-view specs). The TimetableLessonEdit
 * FK has no onDelete: Cascade on `run_id`, so cleanup MUST drop the
 * edit row before the run row — `cleanupTimetableEdit` first, then
 * `cleanupTimetableRun`. Reversed order leaks edit rows that subsequent
 * runs see as ghost history.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  cleanupTimetableEdit,
  cleanupTimetableRun,
  seedTimetableEdit,
  seedTimetableRun,
  type TimetableEditFixture,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

test.describe('Issue #87 — Admin timetable-history (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Aenderungsverlauf is an admin-desktop surface. Mobile coverage of the EditHistoryPanel would belong to its own *.mobile.spec.ts.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates active TimetableRun on shared seed school — chromium is the sole writer (race-family precedent).',
  );

  let run: TimetableRunFixture | undefined;
  let edit: TimetableEditFixture | undefined;

  test.beforeEach(async () => {
    run = await seedTimetableRun(SEED_SCHOOL_UUID);
    edit = await seedTimetableEdit(run.runId, run.lessonId);
  });

  test.afterEach(async () => {
    // CRITICAL ORDER: TimetableLessonEdit.run_id has NO onDelete: Cascade
    // (schema.prisma:799–808). Dropping the run first would leave the
    // edit row dangling — Postgres allows it (no FK constraint), but the
    // ghost row pollutes subsequent test fixtures' history-length
    // assertions. Drop the edit FIRST, then the run.
    if (edit) {
      await cleanupTimetableEdit(edit);
      edit = undefined;
    }
    if (run) {
      await cleanupTimetableRun(run);
      run = undefined;
    }
  });

  test('TT-HIST-RENDER: seeded "Verschoben" edit row + description show up on /admin/timetable-history', async ({
    page,
  }) => {
    await loginAsRole(page, 'admin');

    // ── Step 1: prime the timetable store with a perspective ────────────
    // /admin/timetable-history reads `perspective` + `perspectiveId` from
    // the zustand timetable-store and is empty-state until they are set.
    // Admin auto-perspective is not auto-set; we mimic the same flow the
    // admin-timetable-edit-perspective spec uses to drive the
    // PerspectiveSelector to class 1A.
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
    // the page renders the EditHistoryPanel. Observed 2026-05-18:
    // page.goto produced the empty-state regardless of how /timetable
    // primed the store.
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
  }) => {
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
    // the edit row therefore stays in the DB and cleanupTimetableEdit
    // can still find it in afterEach.
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Sanity: the row is still there.
    await expect(page.getByText('Verschoben', { exact: true })).toBeVisible();
  });
});
