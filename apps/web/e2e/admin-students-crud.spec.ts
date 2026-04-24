/**
 * Phase 12 Plan 12-03 — Admin Students CRUD (desktop happy path)
 *
 * Covers STUDENT-01 + STUDENT-02 create/edit happy path:
 *   - E2E-STD-01: create a Schüler:in via StudentCreateDialog
 *   - E2E-STD-01-EDIT: edit Stammdaten on the detail page → success toast
 *
 * DOM contract verified against:
 *   - apps/web/src/routes/_authenticated/admin/students.index.tsx
 *   - apps/web/src/components/admin/student/StudentCreateDialog.tsx
 *   - apps/web/src/components/admin/student/StudentListTable.tsx
 *   - apps/web/src/components/admin/student/StudentStammdatenTab.tsx
 *   - apps/web/src/hooks/useStudents.ts  (toast copy)
 *
 * Toast copy (useStudents.ts):
 *   - create success: 'Schüler:in angelegt.'
 *   - update success: 'Änderungen gespeichert.'
 *
 * Prefix isolation (UI-SPEC §9.3):
 *   - Desktop rows use firstName prefix `E2E-STD-CRUD-`
 *   - afterEach: API-level DELETE where firstName startsWith `E2E-STD-CRUD-`
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2EStudents,
  createStudentViaAPI,
} from './helpers/students';

// Distinct prefix so parallel specs (error, mobile, archive, parents, move)
// don't sweep each other's rows via their own afterEach cleanup.
const PREFIX = 'E2E-STD-CRUD-';

test.describe('Phase 12 — Admin Students CRUD (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EStudents(request, PREFIX);
  });

  test('E2E-STD-01: create Schüler:in via StudentCreateDialog → toast + row visible', async ({
    page,
  }) => {
    const vorname = `${PREFIX}01-${Date.now()}`;

    await page.goto('/admin/students');

    // Header may show empty-state hero OR the populated action button —
    // both render "Schüler:in anlegen" (students.index.tsx:160,183).
    await page
      .getByRole('button', { name: /Schüler:in anlegen/ })
      .first()
      .click();

    // Dialog mounts — anchor on the Dialog title.
    await expect(
      page.getByRole('heading', { name: 'Schüler:in anlegen' }),
    ).toBeVisible();

    // StudentStammdatenTab uses <Label htmlFor> so getByLabel works.
    await page.getByLabel('Vorname').fill(vorname);
    await page.getByLabel('Nachname').fill('Mustermann');

    // Submit: footer button text is the `submitLabel` prop =
    // "Schüler:in anlegen" (StudentCreateDialog.tsx:69). Use .last() to
    // disambiguate from the page-header trigger.
    await page
      .getByRole('button', { name: 'Schüler:in anlegen' })
      .last()
      .click();

    // Green success toast — verbatim from useStudents.ts:203.
    await expect(page.getByText('Schüler:in angelegt.')).toBeVisible();

    // The dialog navigates to the detail page on success
    // (StudentCreateDialog.tsx:44-48). Go back to the list and confirm the
    // row renders — proves the POST persisted AND invalidateQueries refetched.
    await page.goto('/admin/students');
    // `.first()` because the desktop table AND mobile cards both render at
    // any viewport (the `hidden md:block` / `md:hidden` split is visual only).
    await expect(page.getByText(vorname).first()).toBeVisible();
  });

  test('E2E-STD-01-EDIT: edit Stammdaten on detail page → "Änderungen gespeichert."', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}02-${Date.now()}`;

    // API-seed so this test is independent of the create happy path.
    const student = await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'Muster',
    });

    await page.goto(`/admin/students/${student.id}?tab=stammdaten`);

    // Wait for the detail-page form to hydrate — Nachname input seeded with
    // "Muster" once the useStudent query resolves.
    const nachname = page.getByLabel('Nachname');
    await expect(nachname).toHaveValue('Muster');

    // Dirty the form — replace "Muster" with a new value.
    await nachname.fill('Geändert');

    // Desktop footer Save button is rendered behind `hidden md:flex`
    // (StudentStammdatenTab.tsx:227-231). The submitLabel defaults to
    // "Speichern" (line 49). Use .first() to disambiguate from the
    // StickyMobileSaveBar (off-viewport at desktop but in the DOM).
    await page.getByRole('button', { name: 'Speichern' }).first().click();

    // Green success toast — verbatim from useStudents.ts:227.
    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();
  });
});
