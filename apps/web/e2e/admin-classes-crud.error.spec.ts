/**
 * Phase 12 Plan 12-03 — Admin Classes CRUD (desktop error paths)
 *
 * Covers:
 *   - E2E-CLS-01-ERR: duplicate-name 409 on create → dialog stays open +
 *                     no green "Klasse angelegt." toast (SILENT-4XX).
 *   - E2E-CLS-02:     Orphan-Guard 409 — Class with active students blocks
 *                     delete; DeleteClassDialog transitions to BLOCKED state,
 *                     AffectedEntitiesList kind='class' shows
 *                     "Aktive Schüler:innen (N)" row.
 *
 * DOM contract:
 *   - DeleteClassDialog.tsx (blocked title line 75: "Klasse kann nicht gelöscht werden")
 *   - AffectedEntitiesList.tsx (kind='class' renders "Aktive Schüler:innen (N)" line 294)
 *   - useClasses.ts (toast "Klasse angelegt." line 210; 409 suppressed line 263)
 *
 * Prefix isolation: `E2E-CE-*` (VARCHAR(20) cap — short suffix).
 * Fixture-created rows: `E2E-CLS-WITH-STUDENTS-*`.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  STUDENT_SCHOOL_ID as SCHOOL_ID,
  cleanupE2EClasses,
  cleanupE2EStudents,
  createClassViaAPI,
} from './helpers/students';
import { seedClassWithActiveStudents } from './fixtures/class-with-students';

const PREFIX = 'E2E-CE-';

test.describe('Phase 12 — Admin Classes CRUD error paths (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Students first — Class DELETE would 409 on remaining orphaned rows.
    await cleanupE2EStudents(request, 'E2E-CLS-STUDENT-');
    await cleanupE2EClasses(request, PREFIX);
    await cleanupE2EClasses(request, 'E2E-CWS-');
  });

  test('E2E-CLS-01-ERR: duplicate class name 409 → inline error + no green toast (SILENT-4XX)', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const dupName = `${PREFIX}D-${ts}`; // 12 chars
    // Seed an existing Klasse that the UI will duplicate.
    const existing = await createClassViaAPI(request, { name: dupName });

    await page.goto('/admin/classes');

    await page.getByRole('button', { name: /Klasse anlegen/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Klasse anlegen' })).toBeVisible();

    await dialog.getByLabel('Name').fill(dupName);
    await dialog.getByLabel('Schuljahr').click();
    // Pick the exact year the existing class was created under so the
    // (schoolId+name+schoolYearId) unique constraint fires.
    await page.getByRole('option').first().click();

    // Submit — expect 409 from backend. useClasses wraps 409 -> toast.error
    // but does NOT surface green success.
    const postPromise = page.waitForResponse(
      (res) => res.url().endsWith('/classes') && res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByRole('button', { name: 'Klasse anlegen' }).click();
    const postRes = await postPromise;
    expect(postRes.status(), `POST /classes duplicate`).toBe(409);

    // CRITICAL SILENT-4XX invariant: green toast MUST NEVER fire.
    await expect(page.getByText('Klasse angelegt.')).not.toBeVisible({
      timeout: 3_000,
    });

    // Red/error toast surfaced via hook onError (useClasses.ts:213-214).
    // The hook emits the problem detail title/detail, which contains the
    // German "existiert bereits" substring from ClassService.create.
    await expect(page.getByText(/existiert bereits/i)).toBeVisible();

    // Close the dialog so the afterEach cleanup is clean.
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();

    // Book-keep — existing row is cleaned up in afterEach.
    void existing;
  });

  test('E2E-CLS-02: Orphan-Guard 409 — active students block class delete', async ({
    page,
    request,
  }) => {
    // Seed a Class with 2 active students via API — triggers the
    // `activeStudentCount >= 2` path of ClassService.remove Orphan-Guard.
    const fixture = await seedClassWithActiveStudents(request, SCHOOL_ID, 2);

    try {
      await page.goto('/admin/classes');

      // Find the row via its name. ClassListTable row is a <tr>.
      const row = page.locator('tr').filter({ hasText: fixture.className });
      await expect(row).toBeVisible();

      // Row dropdown → Löschen.
      await row.getByRole('button', { name: 'Aktionen' }).click();
      await page.getByRole('menuitem', { name: 'Löschen' }).click();

      // DeleteClassDialog happy-state → destructive Löschen → 409 →
      // dialog flips to BLOCKED state (title changes, AffectedEntitiesList renders).
      const postPromise = page.waitForResponse(
        (res) =>
          res.url().endsWith(`/classes/${fixture.classId}`) &&
          res.request().method() === 'DELETE',
        { timeout: 15_000 },
      );
      await page.getByRole('button', { name: 'Löschen' }).last().click();
      const postRes = await postPromise;
      expect(postRes.status(), `DELETE /classes/:id`).toBe(409);

      // Blocked-state title — verbatim from DeleteClassDialog.tsx:75.
      await expect(
        page.getByText('Klasse kann nicht gelöscht werden'),
      ).toBeVisible();

      // AffectedEntitiesList kind='class' renders "Aktive Schüler:innen (2)"
      // section because activeStudentCount = 2 (AffectedEntitiesList.tsx:294).
      await expect(page.getByText(/Aktive Schüler:innen/)).toBeVisible();

      // SILENT-4XX: green success MUST NEVER fire.
      await expect(page.getByText('Klasse gelöscht.')).not.toBeVisible({
        timeout: 3_000,
      });

      // Close the dialog.
      await page.getByRole('button', { name: 'Schließen' }).click();
    } finally {
      await fixture.cleanup();
    }
  });
});
