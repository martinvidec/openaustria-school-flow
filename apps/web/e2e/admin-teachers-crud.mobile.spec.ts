/**
 * Phase 11 Plan 11-03 — Admin Teachers CRUD (mobile-375 emulation)
 *
 * Viewport: 375×812 via the `mobile-chrome` project (Pixel 5) OR `mobile-375`
 * (iPhone 13). Per Phase 10.4-03/10.5-02 precedent, mobile-WebKit Bus-Error-10
 * on darwin is accepted — Chromium-emulated Pixel 5 is the verification
 * surface. Running the whole file via `--project=mobile-chrome` exercises the
 * Pixel 5 emulation explicitly.
 *
 * Covers:
 *   - TEACHER-CRUD-01.m: create via TeacherCreateDialog at 375px
 *   - TEACHER-CRUD-02.m: edit Stammdaten → StickyMobileSaveBar visible
 *   - TEACHER-VERF-01.m: Verfügbarkeits mobile Day-Picker + 44px toggle rows
 *
 * Prefix isolation (UI-SPEC §9.3):
 *   - Mobile rows use firstName prefix `E2E-TEA-MOBILE-`
 *   - afterEach: API-level DELETE where firstName startsWith `E2E-TEA-MOBILE-`
 *   - This DISTINCT prefix prevents mobile cleanup from stepping on desktop
 *     rows and vice versa (same rationale as admin-resources.mobile.spec.ts).
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  TEACHER_API as API,
  TEACHER_SCHOOL_ID as SCHOOL_ID,
  cleanupE2ETeachers,
} from './helpers/teachers';

const MOBILE_PREFIX = 'E2E-TEA-MOBILE-';

test.describe('Phase 11 — Admin Teachers CRUD (mobile-375, mobile-chrome/Pixel 5)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2ETeachers(request, MOBILE_PREFIX);
  });

  test('TEACHER-CRUD-01.m: create Lehrperson via dialog at 375×812', async ({
    page,
  }) => {
    const vorname = `${MOBILE_PREFIX}01-${Date.now()}`;

    await page.goto('/admin/teachers');

    // Empty-state or populated-state trigger — both render a button whose
    // accessible name contains "Lehrperson anlegen" (teachers.index.tsx:61,77).
    await page
      .getByRole('button', { name: /Lehrperson anlegen/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Lehrperson anlegen' }),
    ).toBeVisible();

    await page.getByLabel('Vorname').fill(vorname);
    await page.getByLabel('Nachname').fill('Mobil');
    await page.getByLabel('E-Mail').fill(`${vorname.toLowerCase()}@schule.at`);

    // Submit via the footer "Lehrperson anlegen" button — on mobile the
    // StickyMobileSaveBar is also rendered but only in the detail-page
    // Stammdaten tab, not inside the Create dialog.
    await page
      .getByRole('button', { name: 'Lehrperson anlegen' })
      .last()
      .click();

    await expect(page.getByText('Lehrperson angelegt.')).toBeVisible();

    // Back to the list — the new row is visible as a TeacherMobileCards
    // entry at the 375×812 viewport. Both the desktop table AND the mobile
    // cards are in the DOM (split via `hidden md:block` / `md:hidden`); at
    // mobile viewport the desktop table is `display: none`. Use `locator.or`
    // to match whichever one is actually visible — this makes the assertion
    // resilient to the viewport edge case where both render.
    await page.goto('/admin/teachers');
    const anyVorname = page.getByText(vorname);
    // Strict-mode-safe visibility: at least one match is visible.
    await expect(async () => {
      const count = await anyVorname.count();
      let anyVisible = false;
      for (let i = 0; i < count; i++) {
        if (await anyVorname.nth(i).isVisible()) {
          anyVisible = true;
          break;
        }
      }
      expect(anyVisible, `${vorname} visible in list`).toBe(true);
    }).toPass({ timeout: 10_000 });
  });

  test('TEACHER-CRUD-02.m: edit Stammdaten → StickyMobileSaveBar visible', async ({
    page,
    request,
  }) => {
    const vorname = `${MOBILE_PREFIX}02-${Date.now()}`;
    const teacher = await createTeacherMobile(request, vorname);

    await page.goto(`/admin/teachers/${teacher.id}?tab=stammdaten`);

    const nachname = page.getByLabel('Nachname');
    // Wait for hydration — the input should already carry the seed value.
    await expect(nachname).toHaveValue('MobilEdit');

    // Dirty the form.
    await nachname.fill('MobilGeändert');

    // StickyMobileSaveBar — StammdatenTab.tsx:159-164 renders a
    // region-landmark at the bottom of the dirty form. The underlying
    // component (apps/web/src/components/admin/shared/StickyMobileSaveBar)
    // uses role="region" aria-label="Speichern" — same pattern asserted by
    // admin-school-settings.mobile.spec.ts:65-67.
    const stickyBar = page.locator('[role="region"][aria-label="Speichern"]');
    await expect(stickyBar).toBeVisible();
  });

  test('TEACHER-VERF-01.m: Verfügbarkeit mobile Day-Picker + 44px toggle rows', async ({
    page,
    request,
  }) => {
    const vorname = `${MOBILE_PREFIX}03-${Date.now()}`;
    const teacher = await createTeacherMobile(request, vorname);

    await page.goto(`/admin/teachers/${teacher.id}?tab=verfuegbarkeit`);

    // Day-Picker — VerfuegbarkeitsMobileList.tsx:76 renders a
    // SelectTrigger with id="mobile-day-picker" at h-11 width-full.
    const dayPicker = page.locator('#mobile-day-picker');
    await expect(dayPicker).toBeVisible();

    // Toggle rows — VerfuegbarkeitsMobileList.tsx:92 renders each
    // "N. Stunde" row in a `div` with class `h-11 px-3 rounded-md border`.
    // We target that row container via the Toggle button's accessible name
    // ("1. Stunde freigeben|blockieren" — line 97), then walk up to the
    // enclosing 44px-high container. Matching on the `text=` alone returns
    // the <span> with class `text-sm` which has natural text-line height of
    // ~20px, not the row container.
    const firstToggle = page.getByRole('button', {
      name: /^1\. Stunde (freigeben|blockieren)$/,
    });
    await expect(firstToggle).toBeVisible();
    const toggleBox = await firstToggle.boundingBox();
    expect(toggleBox, 'toggle button bounding box').not.toBeNull();
    // Toggle button itself is h-11 w-11 (VerfuegbarkeitsMobileList.tsx:98).
    // 1px subpixel tolerance, same guardrail as MOBILE-ADM-02 at
    // admin-school-settings.mobile.spec.ts:52.
    expect(toggleBox!.height).toBeGreaterThanOrEqual(43.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

async function createTeacherMobile(
  request: APIRequestContext,
  firstName: string,
): Promise<{ id: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${API}/teachers`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      schoolId: SCHOOL_ID,
      firstName,
      lastName: 'MobilEdit',
      email: `${firstName.toLowerCase()}@schule.at`,
    },
  });
  expect(res.ok(), `POST /teachers seed (${firstName})`).toBeTruthy();
  const body = (await res.json()) as {
    id?: string;
    teacher?: { id: string };
  };
  const id = body.teacher?.id ?? body.id;
  expect(id, 'teacher id').toBeTruthy();
  return { id: id! };
}
