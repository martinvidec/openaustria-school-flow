/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-04 / 05 / 06 class restrictions.
 *
 * Surface: /admin/solver-tuning?tab=restrictions (Tab 3 "Klassen-Sperrzeiten").
 * Backend: POST/PUT/PATCH/DELETE /api/v1/schools/:schoolId/constraint-templates
 *          (templateType=NO_LESSONS_AFTER).
 * UI:      ClassRestrictionsTab + ClassRestrictionsTable rows carry
 *          `data-template-type="NO_LESSONS_AFTER"` + `data-row-id`.
 *          AddEditClassRestrictionDialog uses ClassAutocomplete (combobox)
 *          + maxPeriod NumberInput + isActive Switch.
 *
 * Requirements:
 *  - SOLVER-04 happy path (E2E-SOLVER-04)
 *  - SOLVER-04 silent-4xx-invariante / cross-reference 422 (E2E-SOLVER-05)
 *  - SOLVER-04 multi-row strictest-wins banner (E2E-SOLVER-06)
 */
import { test, expect } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  CONSTRAINT_API,
  CONSTRAINT_SCHOOL_ID,
  cleanupConstraintTemplatesViaAPI,
  cleanupConstraintWeightOverridesViaAPI,
  createConstraintTemplateViaAPI,
} from './helpers/constraints';

// Seed class IDs from apps/api/prisma/seed.ts (lines 572 / 584).
const SEED_CLASS_1A = 'seed-class-1a';

test.describe('Phase 14 — Solver-Tuning Class Restrictions (Tab 3)', () => {
  test.beforeEach(async ({ page, request }) => {
    await cleanupConstraintTemplatesViaAPI(request);
    await cleanupConstraintWeightOverridesViaAPI(request);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupConstraintTemplatesViaAPI(request);
    await cleanupConstraintWeightOverridesViaAPI(request);
  });

  test('E2E-SOLVER-04: class restriction CRUD happy path', async ({ page }) => {
    await page.goto('/admin/solver-tuning?tab=restrictions');

    // Add — open dialog via the "Sperrzeit hinzufügen" CTA. Empty-state shows
    // a "Sperrzeit anlegen" button instead; both reach the same dialog.
    const addBtn = page.getByRole('button', {
      name: /Sperrzeit (hinzufügen|anlegen)/,
    });
    await addBtn.first().click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Klassen-Sperrzeit anlegen' }),
    ).toBeVisible();

    // ClassAutocomplete is a combobox button + popover with Command list.
    await dialog.getByRole('combobox', { name: 'Klasse auswählen' }).click();
    await page.getByPlaceholder('Klassen-Name (min. 2 Zeichen) …').fill('1A');
    // Wait for the option to appear and click it.
    const option = page.getByRole('option').first();
    await option.waitFor({ state: 'visible', timeout: 5_000 });
    await option.click();

    await dialog.getByLabel('Sperrt ab Periode').fill('5');

    const postPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-templates') &&
        r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByRole('button', { name: 'Anlegen' }).click();
    const postRes = await postPromise;
    expect(
      postRes.status(),
      `POST /constraint-templates must succeed → got ${postRes.status()}`,
    ).toBeLessThan(300);

    // Row appears with display copy "Bis Periode 5 erlaubt". The component
    // renders BOTH the desktop <tr> AND the mobile-card <div> in the DOM
    // (responsive `sm:hidden` toggles visibility), so the same text appears
    // twice. We .first() to dodge strict-mode violations.
    await expect(
      page.locator('tr[data-template-type="NO_LESSONS_AFTER"]').first(),
    ).toBeVisible();
    await expect(page.getByText('Bis Periode 5 erlaubt').first()).toBeVisible();

    // Edit — change maxPeriod from 5 → 4.
    await page.getByRole('button', { name: 'Eintrag bearbeiten' }).first().click();
    const editDialog = page.getByRole('dialog');
    await expect(
      editDialog.getByRole('heading', { name: 'Klassen-Sperrzeit bearbeiten' }),
    ).toBeVisible();

    const editPeriod = editDialog.getByLabel('Sperrt ab Periode');
    await editPeriod.fill('4');
    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-templates/') &&
        r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await editDialog.getByRole('button', { name: 'Speichern' }).click();
    const putRes = await putPromise;
    expect(putRes.status(), 'PUT must succeed').toBeLessThan(300);

    await expect(page.getByText('Bis Periode 4 erlaubt').first()).toBeVisible();

    // Delete — open WarnDialog and confirm.
    await page.getByRole('button', { name: 'Eintrag löschen' }).first().click();
    const warn = page.getByRole('dialog');
    await expect(
      warn.getByRole('heading', { name: 'Sperrzeit löschen?' }),
    ).toBeVisible();
    const delPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-templates/') &&
        r.request().method() === 'DELETE',
      { timeout: 15_000 },
    );
    await warn.getByRole('button', { name: 'Löschen' }).click();
    await delPromise;

    // Row removed. (Counts both desktop+mobile DOM nodes — both should be 0.)
    await expect(page.getByText('Bis Periode 4 erlaubt')).toHaveCount(0);
  });

  test('E2E-SOLVER-05: cross-reference 422 surfaces correct problem+json', async ({
    request,
  }) => {
    const token = await getAdminToken(request);

    // 1) period out of range (TimeGrid maxPeriodNumber is 8 in seed).
    const r1 = await request.post(
      `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-templates`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          templateType: 'NO_LESSONS_AFTER',
          params: { classId: SEED_CLASS_1A, maxPeriod: 99 },
          isActive: true,
        },
      },
    );
    expect(r1.status(), 'maxPeriod=99 must be 422').toBe(422);
    const b1 = (await r1.json()) as { type?: string };
    expect(b1.type).toContain('period-out-of-range');

    // 2) foreign / non-existent classId.
    const r2 = await request.post(
      `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-templates`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          templateType: 'NO_LESSONS_AFTER',
          params: {
            classId: '00000000-0000-0000-0000-000000000000',
            maxPeriod: 5,
          },
          isActive: true,
        },
      },
    );
    expect(r2.status(), 'foreign classId must be 422').toBe(422);
    const b2 = (await r2.json()) as { type?: string };
    expect(b2.type).toContain('cross-reference-missing');
  });

  test('E2E-SOLVER-06: duplicate restrictions show strictest-wins banner', async ({
    page,
    request,
  }) => {
    // Seed 2 active restrictions on the same class via API (bypasses dialog).
    await createConstraintTemplateViaAPI(request, 'NO_LESSONS_AFTER', {
      classId: SEED_CLASS_1A,
      maxPeriod: 5,
    });
    await createConstraintTemplateViaAPI(request, 'NO_LESSONS_AFTER', {
      classId: SEED_CLASS_1A,
      maxPeriod: 4,
    });

    await page.goto('/admin/solver-tuning?tab=restrictions');

    // Both rows visible.
    await expect(
      page.locator('tr[data-template-type="NO_LESSONS_AFTER"]'),
    ).toHaveCount(2);

    // MultiRowConflictBanner copy: "Mehrfache Einträge für Klasse 1A vorhanden"
    // + "Solver verwendet die strengste Sperrzeit (Periode 4)" (strictest-wins).
    await expect(page.getByText(/Mehrfache Einträge für Klasse 1A/)).toBeVisible();
    await expect(
      page.getByText(/strengste Sperrzeit \(Periode 4\)/),
    ).toBeVisible();
  });
});
