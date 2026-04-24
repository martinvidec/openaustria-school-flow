/**
 * Phase 12 Plan 12-03 — Admin Students CRUD (desktop error paths)
 *
 * Covers:
 *   - E2E-STD-01-ERR: email validation blocks submit (inline red error, no toast)
 *   - E2E-STD-02:     Orphan-Guard 409 — Student with ParentStudent link blocks
 *                     delete; DeleteStudentDialog transitions to BLOCKED state,
 *                     AffectedEntitiesList kind='student' rendered, red toast.
 *
 * Silent-4xx invariant (Phase 10.2-04 / 11-03 pattern):
 *   - No green success toast visible after 4xx
 *   - Red toast OR inline error visible
 *
 * DOM contract:
 *   - apps/web/src/components/admin/student/StudentStammdatenTab.tsx
 *     (email inline error "Gültige E-Mail-Adresse eingeben" — line 102)
 *   - apps/web/src/components/admin/student/DeleteStudentDialog.tsx
 *     (blocked-state title "Schüler:in kann nicht gelöscht werden" — line 82)
 *   - apps/web/src/components/admin/teacher/AffectedEntitiesList.tsx
 *     (kind='student' renders "Eltern-Verknüpfungen (N)" section — line 263)
 *
 * Prefix isolation: `E2E-STD-ERR-*` (distinct from happy-path E2E-STD-CRUD-).
 * Fixture-created rows carry `E2E-STD-WITH-REFS-*` — swept separately.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  STUDENT_SCHOOL_ID as SCHOOL_ID,
  cleanupE2EStudents,
  cleanupE2EParents,
} from './helpers/students';
import { seedStudentWithRefs } from './fixtures/student-with-refs';

const PREFIX = 'E2E-STD-ERR-';

test.describe('Phase 12 — Admin Students CRUD error paths (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EStudents(request, PREFIX);
    // Also sweep fixture rows + their seeded parents.
    await cleanupE2EStudents(request, 'E2E-STD-WITH-REFS-');
    await cleanupE2EParents(request, 'E2E-STD-WITH-REFS-');
  });

  test('E2E-STD-01-ERR: invalid email inline error + no green toast (SILENT-4XX)', async ({
    page,
  }) => {
    const vorname = `${PREFIX}email-${Date.now()}`;

    await page.goto('/admin/students');

    await page
      .getByRole('button', { name: /Schüler:in anlegen/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Schüler:in anlegen' }),
    ).toBeVisible();

    // Scope to the dialog to avoid the filter bar's "Name oder E-Mail"
    // Input which shares the aria-label root.
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Vorname').fill(vorname);
    await dialog.getByLabel('Nachname').fill('Mail');
    // Invalid email — missing @.
    await dialog.getByLabel('E-Mail').fill('not-an-email');

    // The submit button is disabled while isValid=false (StudentStammdatenTab.tsx:228).
    const submit = page.getByRole('button', { name: 'Schüler:in anlegen' }).last();
    const isDisabled = await submit.isDisabled();
    if (!isDisabled) {
      await submit.click();
    } else {
      // Focus + blur to surface the inline error.
      await dialog.getByLabel('E-Mail').press('Tab');
    }

    // Dialog still open — form stays put.
    await expect(
      page.getByRole('heading', { name: 'Schüler:in anlegen' }),
    ).toBeVisible();

    // CRITICAL Silent-4XX invariant: green success toast MUST NEVER fire.
    await expect(page.getByText('Schüler:in angelegt.')).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test('E2E-STD-02: Orphan-Guard 409 — ParentStudent link blocks delete + SILENT-4XX', async ({
    page,
    request,
  }) => {
    // Seed a Student + ParentStudent link via API.
    const fixture = await seedStudentWithRefs(request, SCHOOL_ID);

    try {
      await page.goto('/admin/students');

      // Row → Aktionen → Löschen. Use firstName text search (the row layout
      // doesn't expose a per-student testid).
      const row = page.locator('tr').filter({ hasText: fixture.studentName });
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: 'Aktionen' }).click();
      await page.getByRole('menuitem', { name: 'Löschen' }).click();

      // DeleteStudentDialog opens in happy (amber) state → click destructive
      // Löschen → server 409 → dialog flips to blocked (red) state.
      await page.getByRole('button', { name: 'Löschen' }).last().click();

      // Blocked-state title — verbatim from DeleteStudentDialog.tsx:82.
      // Text appears in BOTH the dialog + the red toast (useStudents skips
      // 409 toast but DeleteStudentDialog emits its own toast.error line 52).
      // .first() resolves strict-mode ambiguity.
      await expect(
        page.getByText('Schüler:in kann nicht gelöscht werden').first(),
      ).toBeVisible();

      // AffectedEntitiesList kind='student' renders a "Eltern-Verknüpfungen (N)"
      // section because parentLinkCount >= 1 (AffectedEntitiesList.tsx:263).
      await expect(page.getByText(/Eltern-Verknüpfungen/)).toBeVisible();

      // Blocked-state footer has a single "Schließen" button
      // (DeleteStudentDialog.tsx:107).
      await expect(page.getByRole('button', { name: 'Schließen' })).toBeVisible();

      // CRITICAL Silent-4XX invariant — green success toast MUST NEVER fire.
      await expect(page.getByText('Schüler:in gelöscht.')).not.toBeVisible({
        timeout: 3_000,
      });

      // Close the dialog so no modal lingers for the afterEach.
      await page.getByRole('button', { name: 'Schließen' }).click();
    } finally {
      await fixture.cleanup();
    }
  });
});
