/**
 * Phase 11 Plan 11-03 — Admin Subjects CRUD (desktop happy path)
 *
 * Covers SUBJECT-CRUD-01/02/03:
 *   - SUBJECT-CRUD-01: create with Name + Kürzel via SubjectFormDialog
 *   - SUBJECT-CRUD-02: edit Name + Kürzel → "Fach aktualisiert."
 *   - SUBJECT-CRUD-03: delete subject without refs → "Fach gelöscht."
 *
 * DOM contract: verified against
 *   - apps/web/src/routes/_authenticated/admin/subjects.index.tsx
 *   - apps/web/src/components/admin/subject/SubjectFormDialog.tsx
 *   - apps/web/src/components/admin/subject/SubjectTable.tsx
 *   - apps/web/src/components/admin/subject/DeleteSubjectDialog.tsx
 *
 * Toast copy (useSubjects.ts):
 *   - create success: 'Fach angelegt.' (line 158)
 *   - update success: 'Fach aktualisiert.' (line 197)
 *   - delete success: 'Fach gelöscht.' (line 225)
 *
 * Prefix isolation: `E2E-SUB-CRUD-*`, cleaned up via afterEach.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2ESubjects,
  createSubjectViaAPI,
} from './helpers/subjects';

// Distinct prefix so parallel specs (error / mobile / stundentafel) don't
// sweep this spec's rows during their afterEach cleanup.
const PREFIX = 'E2E-SUB-CRUD-';

test.describe('Phase 11 — Admin Subjects CRUD (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2ESubjects(request, PREFIX);
  });

  test('SUBJECT-CRUD-01: create via SubjectFormDialog → toast + row visible', async ({
    page,
  }) => {
    const ts = Date.now();
    const name = `${PREFIX}${ts}`;
    // Kürzel maxLength 8 — pick something unique + upper-cased on blur.
    const shortName = `e${ts % 100}`;

    await page.goto('/admin/subjects');

    // Trigger button — teachers.index.tsx:72 in populated state shows
    // `+ Fach anlegen`, subjects.index.tsx:85 in empty state shows
    // `Erstes Fach anlegen`. Both match /Fach anlegen/.
    await page
      .getByRole('button', { name: /Fach anlegen/ })
      .first()
      .click();

    // Dialog — SubjectFormDialog title "Fach anlegen".
    await expect(
      page.getByRole('heading', { name: 'Fach anlegen' }),
    ).toBeVisible();

    await page.getByTestId('subject-name-input').fill(name);
    const shortInput = page.getByTestId('subject-shortname-input');
    await shortInput.fill(shortName);
    // Auto-uppercase on blur — SubjectFormDialog.tsx:84.
    await shortInput.blur();
    await expect(shortInput).toHaveValue(shortName.toUpperCase());

    await page.getByTestId('subject-submit').click();

    // Green toast — verbatim from useSubjects.ts:158.
    await expect(page.getByText('Fach angelegt.')).toBeVisible();

    // Row visible in the list — SubjectTable row carries the name text cell.
    await expect(page.getByText(name).first()).toBeVisible();
  });

  test('SUBJECT-CRUD-02: edit Name + Kürzel → "Fach aktualisiert."', async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const seed = await createSubjectViaAPI(request, {
      name: `${PREFIX}${ts}`,
      shortName: `E${ts % 100}`,
    });

    await page.goto('/admin/subjects');

    // Open the edit dialog via the row's Aktionen dropdown → Bearbeiten
    // menuitem. (The tr's row-click handler was removed in Plan 11-03 Rule-1
    // to avoid the edit/dropdown race with the Delete flow.)
    const row = page.locator(`[data-testid="subject-row-${seed.shortName}"]`);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Aktionen' }).click();
    await page.getByRole('menuitem', { name: 'Bearbeiten' }).click();

    // Edit-mode dialog — SubjectFormDialog.tsx:119 flips the title to
    // "Fach bearbeiten".
    await expect(
      page.getByRole('heading', { name: 'Fach bearbeiten' }),
    ).toBeVisible();

    // Change the Name. Keep the Kürzel the same so we don't hit the 409
    // uniqueness error path (covered by the error spec).
    const newName = `${PREFIX}EDIT-${ts}`;
    const nameInput = page.getByTestId('subject-name-input');
    await nameInput.fill(newName);

    // Submit — edit-mode submit label is "Speichern".
    await page.getByTestId('subject-submit').click();

    // Green toast — verbatim from useSubjects.ts:197.
    await expect(page.getByText('Fach aktualisiert.')).toBeVisible();
  });

  test('SUBJECT-CRUD-03: delete subject without refs → "Fach gelöscht."', async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const seed = await createSubjectViaAPI(request, {
      name: `${PREFIX}DEL-${ts}`,
      shortName: `D${ts % 100}`,
    });

    await page.goto('/admin/subjects');

    // Row-level dropdown → Löschen menuitem. (Plan 11-03 Rule-1 removed
    // the tr's row-click-to-edit handler so the dropdown path is the only
    // way into destructive actions — no more edit/delete dialog race.)
    const row = page.locator(`[data-testid="subject-row-${seed.shortName}"]`);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Aktionen' }).click();
    await page.getByRole('menuitem', { name: 'Löschen' }).click();

    // DeleteSubjectDialog (happy state, amber) — click destructive Löschen.
    // data-testid="subject-delete-confirm" targets the footer button
    // unambiguously (DeleteSubjectDialog.tsx:125).
    await page.getByTestId('subject-delete-confirm').click();

    // Green toast — verbatim from useSubjects.ts:225.
    await expect(page.getByText('Fach gelöscht.')).toBeVisible();
  });
});
