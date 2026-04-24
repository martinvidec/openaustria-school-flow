/**
 * Phase 12 Plan 12-03 — Admin Classes CRUD (desktop happy path)
 *
 * Covers CLASS-01 + CLASS-02 create/edit happy path:
 *   - E2E-CLS-01: create a Klasse via ClassCreateDialog
 *   - E2E-CLS-01-EDIT: edit Stammdaten name → success toast +
 *                       SolverReRunBanner visible
 *
 * DOM contract verified against:
 *   - apps/web/src/routes/_authenticated/admin/classes.index.tsx
 *   - apps/web/src/components/admin/class/ClassCreateDialog.tsx
 *   - apps/web/src/components/admin/class/ClassListTable.tsx
 *   - apps/web/src/components/admin/class/ClassStammdatenTab.tsx
 *   - apps/web/src/components/admin/class/SolverReRunBanner.tsx
 *
 * Toast copy (useClasses.ts):
 *   - create success: 'Klasse angelegt.' line 210
 *   - update success: 'Änderungen gespeichert.' line 240
 *
 * Prefix isolation: `E2E-CL-CRUD-` (short enough for VARCHAR(20) name column).
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2EClasses,
  createClassViaAPI,
} from './helpers/students';

// VARCHAR(20) limit → keep full name short enough.
// `E2E-CC-C1-<6digits>` = 15 chars.
const PREFIX = 'E2E-CC-';

test.describe('Phase 12 — Admin Classes CRUD (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EClasses(request, PREFIX);
  });

  test('E2E-CLS-01: create Klasse via ClassCreateDialog → toast + row visible', async ({
    page,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const name = `${PREFIX}C1-${ts}`;

    await page.goto('/admin/classes');

    // Populated-state OR empty-state trigger — both text "Klasse anlegen".
    await page
      .getByRole('button', { name: /Klasse anlegen/ })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Klasse anlegen' }),
    ).toBeVisible();

    // Name field — autoFocus, so just type.
    await dialog.getByLabel('Name').fill(name);

    // Jahrgangsstufe — Radix Select. Leave default (1. Klasse) which is pre-selected.

    // Schuljahr — the dialog's defaultSchoolYearId only populates when the
    // school-context-store has `activeSchoolYearId`. In a fresh E2E session
    // that field may not be hydrated yet, surfacing an "Ungültige Schuljahr-ID"
    // inline error. Click the Schuljahr Select and pick the first visible
    // option so the test is deterministic regardless of context timing.
    await dialog.getByLabel('Schuljahr').click();
    // The first option in SelectContent corresponds to the topmost school year.
    await page.getByRole('option').first().click();

    // Submit — footer button with same text as the header trigger.
    const postPromise = page.waitForResponse(
      (res) => res.url().endsWith('/classes') && res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByRole('button', { name: 'Klasse anlegen' }).click();
    const postRes = await postPromise;
    if (postRes.status() !== 201) {
      const body = await postRes.text().catch(() => '<no body>');
      const reqBody = postRes.request().postData();
      throw new Error(
        `POST /classes failed ${postRes.status()} — request=${reqBody}, response=${body}`,
      );
    }

    // Green toast — verbatim from useClasses.ts:210.
    await expect(page.getByText('Klasse angelegt.')).toBeVisible();

    // Row visible in list with the class name. Use .first() because the
    // table row + mobile card both render the name at wide viewports.
    await expect(page.getByText(name).first()).toBeVisible();
  });

  test('E2E-CLS-01-EDIT: edit Stammdaten → toast + SolverReRunBanner visible', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const originalName = `${PREFIX}C2-${ts}`;
    const cls = await createClassViaAPI(request, { name: originalName });

    await page.goto(`/admin/classes/${cls.id}?tab=stammdaten`);

    // Wait for Stammdaten input to hydrate.
    const nameInput = page.getByLabel('Name');
    await expect(nameInput).toHaveValue(originalName);

    // Dirty the form.
    const editedName = `${PREFIX}E2-${ts}`;
    await nameInput.fill(editedName);

    // Footer Speichern button.
    await page.getByRole('button', { name: 'Speichern' }).first().click();

    // Green toast from useClasses.ts:240.
    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();

    // SolverReRunBanner surfaces after savedOnce && !dirty
    // (ClassStammdatenTab.tsx:112). Verbatim text from SolverReRunBanner.tsx:17.
    await expect(
      page.getByText('Änderungen wirken sich erst beim nächsten Stundenplan-Lauf aus.'),
    ).toBeVisible();
  });
});
