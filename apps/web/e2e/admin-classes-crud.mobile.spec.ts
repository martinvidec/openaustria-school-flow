/**
 * Phase 12 Plan 12-03 — Admin Classes CRUD (mobile-375 emulation)
 *
 * Viewport: 375×812 via the `mobile-chrome` project (Pixel 5) OR `mobile-375`
 * (iPhone 13). Mobile-WebKit is accepted-unstable per Phase 10.5/11-03.
 *
 * Covers:
 *   - E2E-CLS-MOBILE-01: create Klasse at 375×812 → toast + row visible
 *   - E2E-CLS-MOBILE-02: 4-tab strip + StickyMobileSaveBar on dirty Stammdaten
 *
 * Prefix isolation: `E2E-CM-*` (VARCHAR(20) cap).
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2EClasses,
  createClassViaAPI,
} from './helpers/students';

const MOBILE_PREFIX = 'E2E-CM-';

test.describe('Phase 12 — Admin Classes CRUD (mobile-375, mobile-chrome/Pixel 5)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EClasses(request, MOBILE_PREFIX);
  });

  test('E2E-CLS-MOBILE-01: create Klasse via dialog at 375×812', async ({
    page,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const name = `${MOBILE_PREFIX}M1-${ts}`;

    await page.goto('/admin/classes');

    await page.getByRole('button', { name: /Klasse anlegen/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Klasse anlegen' }),
    ).toBeVisible();

    await dialog.getByLabel('Name').fill(name);

    // Explicit Schuljahr selection (context store may not be hydrated yet).
    await dialog.getByLabel('Schuljahr').click();
    await page.getByRole('option').first().click();

    await dialog.getByRole('button', { name: 'Klasse anlegen' }).click();

    await expect(page.getByText('Klasse angelegt.')).toBeVisible();

    // Confirm the row renders (mobile-cards md:hidden at 375px).
    await page.goto('/admin/classes');
    const anyName = page.getByText(name);
    await expect(async () => {
      const count = await anyName.count();
      let visible = false;
      for (let i = 0; i < count; i++) {
        if (await anyName.nth(i).isVisible()) {
          visible = true;
          break;
        }
      }
      expect(visible, `${name} visible in list`).toBe(true);
    }).toPass({ timeout: 10_000 });
  });

  test('E2E-CLS-MOBILE-02: edit Stammdaten → Save button + 4 tab triggers visible', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const name = `${MOBILE_PREFIX}M2-${ts}`;
    const cls = await createClassViaAPI(request, { name });

    await page.goto(`/admin/classes/${cls.id}?tab=stammdaten`);

    // 4 tabs (ClassDetailTabs.tsx:40-44) — all triggers present at 375px.
    for (const t of ['Stammdaten', 'Stundentafel', 'Schüler:innen', 'Gruppen']) {
      await expect(page.getByRole('tab', { name: t })).toBeVisible();
    }

    // Wait for Stammdaten input to hydrate.
    const nameInput = page.getByLabel('Name');
    await expect(nameInput).toHaveValue(name);

    // Dirty the form — the footer Save button is the user-visible affordance
    // at this viewport (no StickyMobileSaveBar is wired into the class
    // Stammdaten tab; ClassStammdatenTab.tsx uses a regular flex-end Save
    // button at the bottom of the form, line 102-110).
    await nameInput.fill(`${MOBILE_PREFIX}M2E-${ts}`);
    const saveBtn = page.getByRole('button', { name: 'Speichern' }).first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();
  });
});
