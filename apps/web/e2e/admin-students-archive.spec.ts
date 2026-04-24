/**
 * Phase 12 Plan 12-03 — Admin Students Archive + Restore (STUDENT-03)
 *
 * Covers STUDENT-03 archive → filter-flip → restore round-trip:
 *   - E2E-STD-03-ARCHIVE: row-action 'Archivieren' opens WarnDialog
 *     "Schüler:in archivieren?" → Confirm → toast "Schüler:in archiviert." →
 *     row disappears from default (active) filter; flipping Status filter
 *     to "Archiviert" re-surfaces the row with the Archiviert badge.
 *   - E2E-STD-03-RESTORE: row-action 'Reaktivieren' → WarnDialog
 *     "Schüler:in reaktivieren?" → Confirm → toast "Schüler:in reaktiviert." →
 *     row returns to the default active list.
 *
 * DOM contract:
 *   - ArchiveStudentDialog.tsx — title "Schüler:in archivieren?" line 29
 *   - RestoreStudentDialog.tsx — title "Schüler:in reaktivieren?" line 29
 *   - useStudents.ts — toast copy "Schüler:in archiviert." line 248,
 *     "Schüler:in reaktiviert." line 269
 *   - StudentFilterBar.tsx — Status select aria-label "Status filtern" line 84
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2EStudents,
  createStudentViaAPI,
} from './helpers/students';

const PREFIX = 'E2E-STD-ARCH-';

test.describe('Phase 12 — Admin Students Archive + Restore (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EStudents(request, PREFIX);
  });

  test('E2E-STD-03-ARCHIVE: archive row → WarnDialog → row disappears from active filter', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}01-${Date.now()}`;
    await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'Archive',
    });

    await page.goto('/admin/students');

    const row = page.locator('tr').filter({ hasText: vorname });
    await expect(row).toBeVisible();

    // Row action dropdown → Archivieren.
    await row.getByRole('button', { name: 'Aktionen' }).click();
    await page.getByRole('menuitem', { name: 'Archivieren' }).click();

    // ArchiveStudentDialog mounts — verbatim title.
    await expect(
      page.getByText('Schüler:in archivieren?'),
    ).toBeVisible();

    // Destructive confirm. WarnDialog uses variant='destructive' for the
    // Archivieren button (ArchiveStudentDialog.tsx:39). .last() picks the
    // footer button over the already-clicked menuitem.
    await page
      .getByRole('button', { name: 'Archivieren' })
      .last()
      .click();

    // Green toast — verbatim from useStudents.ts:248.
    await expect(page.getByText('Schüler:in archiviert.')).toBeVisible();

    // Row disappears from default active filter.
    await expect(
      page.locator('tr').filter({ hasText: vorname }),
    ).toHaveCount(0, { timeout: 5_000 });

    // Navigate to the archived list via URL — row re-appears with badge.
    // Using the URL search param is more robust than clicking the filter
    // bar Select (which is hidden when the currently-filtered list is empty,
    // per students.index.tsx:165 `!isEmpty && <StudentFilterBar ... />`).
    await page.goto('/admin/students?archived=archived');

    const archivedRow = page.locator('tr').filter({ hasText: vorname });
    await expect(archivedRow).toBeVisible();
    // StudentListTable renders an "Archiviert" Badge in the Status column.
    await expect(archivedRow.getByText('Archiviert')).toBeVisible();
  });

  test('E2E-STD-03-RESTORE: restore archived student → row returns to active list', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}02-${Date.now()}`;
    const student = await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'Restore',
    });

    // Archive via API so we start in the archived state without exercising
    // the UI flow twice.
    const { getAdminToken } = await import('./helpers/login');
    const token = await getAdminToken(request);
    const archiveRes = await request.post(
      `http://localhost:3000/api/v1/students/${student.id}/archive`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(archiveRes.ok(), `POST /students/:id/archive`).toBeTruthy();

    // Go to the archived-filtered list.
    await page.goto('/admin/students?archived=archived');

    const row = page.locator('tr').filter({ hasText: vorname });
    await expect(row).toBeVisible();
    await expect(row.getByText('Archiviert')).toBeVisible();

    // Row action → Reaktivieren.
    await row.getByRole('button', { name: 'Aktionen' }).click();
    await page.getByRole('menuitem', { name: 'Reaktivieren' }).click();

    // RestoreStudentDialog — verbatim title.
    await expect(
      page.getByText('Schüler:in reaktivieren?'),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Reaktivieren' })
      .last()
      .click();

    // Green toast.
    await expect(page.getByText('Schüler:in reaktiviert.')).toBeVisible();

    // Row disappears from the archived-filtered list (and because the
    // filtered list is now empty, the filter bar hides per students.index.tsx).
    // Switch to the default (active) list via URL to re-verify.
    await page.goto('/admin/students');

    const activeRow = page.locator('tr').filter({ hasText: vorname });
    await expect(activeRow).toBeVisible();
    await expect(activeRow.getByText('Aktiv')).toBeVisible();
  });
});
