/**
 * Phase 12 Plan 12-03 — Admin Students CRUD (mobile-375 emulation)
 *
 * Viewport: 375×812 via the `mobile-chrome` project (Pixel 5) OR `mobile-375`
 * (iPhone 13). Per Phase 10.4-03 / 10.5-02 precedent, mobile-WebKit
 * Bus-Error-10 on darwin is accepted — Chromium-emulated Pixel 5 is the
 * verification baseline.
 *
 * Covers:
 *   - E2E-STD-MOBILE-01: create Schüler:in at 375px → toast + row visible
 *   - E2E-STD-MOBILE-02: edit Stammdaten → StickyMobileSaveBar visible
 *   - E2E-STD-MOBILE-03: 44px tap-target floor for row action dropdown
 *
 * Prefix isolation: `E2E-STD-MOBILE-*` distinct from desktop CRUD prefixes.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2EStudents,
  createStudentViaAPI,
} from './helpers/students';

const MOBILE_PREFIX = 'E2E-STD-MOBILE-';

test.describe('Phase 12 — Admin Students CRUD (mobile-375, mobile-chrome/Pixel 5)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EStudents(request, MOBILE_PREFIX);
  });

  test('E2E-STD-MOBILE-01: create Schüler:in via dialog at 375×812', async ({
    page,
  }) => {
    const vorname = `${MOBILE_PREFIX}01-${Date.now()}`;

    await page.goto('/admin/students');

    // Empty-state OR populated trigger — both render "Schüler:in anlegen".
    await page
      .getByRole('button', { name: /Schüler:in anlegen/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Schüler:in anlegen' }),
    ).toBeVisible();

    // Scope to the dialog — filter bar's Input also matches "E-Mail" pattern.
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Vorname').fill(vorname);
    await dialog.getByLabel('Nachname').fill('Mobil');

    await page
      .getByRole('button', { name: 'Schüler:in anlegen' })
      .last()
      .click();

    // Green success toast.
    await expect(page.getByText('Schüler:in angelegt.')).toBeVisible();

    // Back to list — confirm the mobile-cards (or table — both in DOM)
    // render the new row.
    await page.goto('/admin/students');
    const anyVorname = page.getByText(vorname);
    await expect(async () => {
      const count = await anyVorname.count();
      let visible = false;
      for (let i = 0; i < count; i++) {
        if (await anyVorname.nth(i).isVisible()) {
          visible = true;
          break;
        }
      }
      expect(visible, `${vorname} visible in list`).toBe(true);
    }).toPass({ timeout: 10_000 });
  });

  test('E2E-STD-MOBILE-02: edit Stammdaten → StickyMobileSaveBar visible', async ({
    page,
    request,
  }) => {
    const vorname = `${MOBILE_PREFIX}02-${Date.now()}`;
    const student = await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'MobilEdit',
    });

    await page.goto(`/admin/students/${student.id}?tab=stammdaten`);

    const nachname = page.getByLabel('Nachname');
    await expect(nachname).toHaveValue('MobilEdit');

    // Dirty the form.
    await nachname.fill('MobilGeändert');

    // StickyMobileSaveBar — StudentStammdatenTab.tsx:233-238. Same shared
    // component as Phase 11-03, accessible via role="region" aria-label="Speichern".
    const stickyBar = page.locator('[role="region"][aria-label="Speichern"]');
    await expect(stickyBar).toBeVisible();
  });

  test('E2E-STD-MOBILE-03: row-card checkbox hit-target ≥44px (MOBILE-ADM-02 parity)', async ({
    page,
    request,
  }) => {
    const vorname = `${MOBILE_PREFIX}03-${Date.now()}`;
    await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'MobilTap',
    });

    await page.goto('/admin/students');

    // Phase 17 Plan 17-04: StudentMobileCards + StudentListTable were merged
    // into a shared `<DataList>`-backed `StudentList`. DataList applies the
    // same `data-testid="student-row-${id}"` to BOTH the desktop `<tr>` AND
    // the mobile-card wrapper (DataList.tsx:105 + 148), so this spec uses
    // the unified `student-row-` prefix instead of the legacy `student-card-`
    // prefix. The mobile-card label remains the 44px hit target.
    const card = page
      .locator(`[data-testid^="student-row-"]`)
      .filter({ hasText: vorname })
      .first();
    await expect(card).toBeVisible();

    // The h-11 w-11 label wrapper around the Checkbox is the 44px hit target.
    const hitTarget = card.locator('label').first();
    await expect(hitTarget).toBeVisible();
    const box = await hitTarget.boundingBox();
    expect(box, 'checkbox label bounding box').not.toBeNull();
    // 1px subpixel tolerance mirrors the Phase 11 MOBILE-ADM-02 guardrail.
    expect(box!.height).toBeGreaterThanOrEqual(43.5);
    expect(box!.width).toBeGreaterThanOrEqual(43.5);
  });
});
