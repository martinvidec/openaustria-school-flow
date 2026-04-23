/**
 * Phase 11 Plan 11-03 — Admin Teachers CRUD (desktop happy path)
 *
 * Covers TEACHER-CRUD-01/02/03:
 *   - TEACHER-CRUD-01: create a Lehrperson via TeacherCreateDialog
 *   - TEACHER-CRUD-02: edit Stammdaten on the detail page
 *   - TEACHER-CRUD-03: archive ACTIVE→ARCHIVED, then delete
 *
 * DOM contract: verified against
 *   - apps/web/src/routes/_authenticated/admin/teachers.index.tsx
 *   - apps/web/src/components/admin/teacher/TeacherCreateDialog.tsx
 *   - apps/web/src/components/admin/teacher/TeacherListTable.tsx
 *   - apps/web/src/components/admin/teacher/StammdatenTab.tsx
 *   - apps/web/src/components/admin/teacher/ArchiveTeacherDialog.tsx
 *   - apps/web/src/components/admin/teacher/DeleteTeacherDialog.tsx
 *
 * Toast copy (useTeachers.ts):
 *   - success create: 'Lehrperson angelegt.' (line 225)
 *   - success update: 'Änderungen gespeichert.' (line 251)
 *   - success delete: 'Lehrperson gelöscht.' (line 272)
 *
 * Prefix isolation (UI-SPEC §9.3):
 *   - Desktop rows use firstName prefix `E2E-TEA-`
 *   - Mobile rows use `E2E-TEA-MOBILE-` (in the sibling mobile spec)
 *   - afterEach: API-level DELETE where firstName startsWith `E2E-TEA-`
 *
 * Prerequisites: identical to other Phase 10+ admin specs
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed (admin user + `seed-school-bgbrg-musterstadt`)
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2ETeachers,
  createTeacherViaAPI,
} from './helpers/teachers';

// Distinct prefix so parallel specs (error, werteinheiten) don't sweep
// this spec's rows via their own afterEach cleanup.
const PREFIX = 'E2E-TEA-CRUD-';

test.describe('Phase 11 — Admin Teachers CRUD (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2ETeachers(request, PREFIX);
  });

  test('TEACHER-CRUD-01: create Lehrperson via TeacherCreateDialog → toast + row visible', async ({
    page,
  }) => {
    const vorname = `${PREFIX}01-${Date.now()}`;

    await page.goto('/admin/teachers');

    // Header may show empty-state hero ("Erste Lehrperson anlegen") OR the
    // action button ("Lehrperson anlegen"). Both buttons have the visible text
    // substring "Lehrperson anlegen" — we use .first() to pick the trigger
    // regardless of the branch.
    await page
      .getByRole('button', { name: /Lehrperson anlegen/ })
      .first()
      .click();

    // Dialog mounts — anchor on the Dialog title.
    await expect(
      page.getByRole('heading', { name: 'Lehrperson anlegen' }),
    ).toBeVisible();

    await page.getByLabel('Vorname').fill(vorname);
    await page.getByLabel('Nachname').fill('Huber');
    await page.getByLabel('E-Mail').fill(`${vorname.toLowerCase()}@schule.at`);

    // The Create dialog footer button text is the `submitLabel` prop —
    // "Lehrperson anlegen". Use .last() to pick the footer submit button over
    // the page-header trigger (same accessible-name, stricter disambiguation
    // mirrors schuljahre.spec.ts:125 and admin-resources.spec.ts:145).
    await page
      .getByRole('button', { name: 'Lehrperson anlegen' })
      .last()
      .click();

    // Green success toast — verbatim from useTeachers.ts:225.
    await expect(page.getByText('Lehrperson angelegt.')).toBeVisible();

    // The dialog navigates to the new teacher's detail page on success
    // (TeacherCreateDialog.tsx:41). Navigate back to the list and assert the
    // row renders — proves the POST persisted AND invalidateQueries refetched.
    await page.goto('/admin/teachers');
    // Use .first() because both the desktop table AND mobile cards render at
    // the same viewport — the `hidden md:block` / `md:hidden` Tailwind split
    // is purely visual, both are in the DOM.
    await expect(page.getByText(vorname).first()).toBeVisible();
  });

  test('TEACHER-CRUD-02: edit Stammdaten on detail page → "Änderungen gespeichert."', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}02-${Date.now()}`;

    // API-seed a teacher so this test is independent of -01.
    const teacher = await createTeacherViaAPI(request, {
      firstName: vorname,
      lastName: 'Muster',
      email: `${vorname.toLowerCase()}@schule.at`,
    });

    await page.goto(`/admin/teachers/${teacher.id}?tab=stammdaten`);

    // Wait for the detail-page form to hydrate. StammdatenTab seeds its state
    // from props so the Nachname input should already show "Muster" once the
    // useTeacher query resolves.
    const nachname = page.getByLabel('Nachname');
    await expect(nachname).toHaveValue('Muster');

    // Dirty the form — replace "Muster" with a new value.
    await nachname.fill('Geändert');

    // Save button in the hidden-until-md desktop footer. Use .first() to
    // disambiguate from the StickyMobileSaveBar (off-viewport at desktop but
    // still in the DOM).
    await page.getByRole('button', { name: 'Speichern' }).first().click();

    // Green success toast — verbatim from useTeachers.ts:251.
    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();
  });

  test('TEACHER-CRUD-03: archive ACTIVE → ARCHIVED, then delete', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}03-${Date.now()}`;

    // API-seed so we're not coupled to -01's outcome.
    const teacher = await createTeacherViaAPI(request, {
      firstName: vorname,
      lastName: 'X',
      email: `${vorname.toLowerCase()}@schule.at`,
    });

    await page.goto('/admin/teachers');

    // Find the row for this teacher (contains vorname substring) and open
    // its action dropdown. TeacherListTable.tsx:81 renders a ghost button
    // with aria-label="Aktionen".
    const row = page.locator('tr').filter({ hasText: vorname });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Aktionen' }).click();

    // Archivieren menuitem → WarnDialog opens → confirm.
    await page.getByRole('menuitem', { name: 'Archivieren' }).click();
    // WarnDialog renders a button with the verbatim "Archivieren" label
    // (ArchiveTeacherDialog.tsx:36). Use .last() to distinguish from the
    // already-clicked menuitem which stays in the accessibility tree briefly.
    await page
      .getByRole('button', { name: 'Archivieren' })
      .last()
      .click();

    // Status flips from "Aktiv" → "Archiviert" in the row (TeacherListTable:58-63).
    // This is the proof that the update landed server-side.
    await expect(row.getByText('Archiviert')).toBeVisible();

    // Now Löschen. Reopen dropdown + click menuitem.
    await row.getByRole('button', { name: 'Aktionen' }).click();
    await page.getByRole('menuitem', { name: 'Löschen' }).click();

    // DeleteTeacherDialog (happy state) → destructive "Löschen" footer button.
    await page
      .getByRole('button', { name: 'Löschen' })
      .last()
      .click();

    // Green success toast — verbatim from useTeachers.ts:272.
    await expect(page.getByText('Lehrperson gelöscht.')).toBeVisible();

    // Row disappears after invalidateQueries refetch. Use `.first()` — like
    // TEACHER-CRUD-01, both the desktop table and the mobile cards render
    // simultaneously in the DOM, so an exact-count check hits strict mode.
    await expect(page.getByText(vorname).first()).not.toBeVisible({
      timeout: 5_000,
    });

    // Track cleanup: API call above created the teacher under the E2E-TEA-
    // prefix, so the afterEach hook also catches this case (belt + braces if
    // the UI delete failed silently, preventing suite-level leakage).
    void teacher;
  });
});
