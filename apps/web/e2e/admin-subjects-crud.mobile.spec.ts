/**
 * Phase 11 Plan 11-03 — Admin Subjects CRUD (mobile-375 emulation)
 *
 * Viewport: 375×812 via the `mobile-chrome` project (Pixel 5). Accepts the
 * Phase 10.4-03/10.5-02 precedent — mobile-WebKit Bus-Error-10 is accepted
 * as environmental; Chromium-emulated Pixel 5 is the verification surface.
 *
 * Covers:
 *   - SUBJECT-CRUD-01.m: create via SubjectFormDialog at 375×812
 *   - SUBJECT-CRUD-02.m: edit via SubjectFormDialog at 375×812
 *
 * Prefix isolation: `E2E-SUB-MOBILE-*`.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2ESubjects,
  createSubjectViaAPI,
} from './helpers/subjects';

const MOBILE_PREFIX = 'E2E-SUB-MOBILE-';

test.describe('Phase 11 — Admin Subjects CRUD (mobile-375, mobile-chrome/Pixel 5)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2ESubjects(request, MOBILE_PREFIX);
  });

  test('SUBJECT-CRUD-01.m: create via dialog at 375×812 → toast + row', async ({
    page,
  }) => {
    const ts = Date.now();
    const name = `${MOBILE_PREFIX}${ts}`;
    const shortName = `m${ts % 100}`;

    await page.goto('/admin/subjects');

    await page
      .getByRole('button', { name: /Fach anlegen/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Fach anlegen' }),
    ).toBeVisible();

    await page.getByTestId('subject-name-input').fill(name);
    await page.getByTestId('subject-shortname-input').fill(shortName);
    // Blur to trigger auto-uppercase (SubjectFormDialog.tsx:84).
    await page.getByTestId('subject-shortname-input').blur();

    await page.getByTestId('subject-submit').click();

    await expect(page.getByText('Fach angelegt.')).toBeVisible();

    // Back on /admin/subjects — on mobile, SubjectMobileCards renders
    // (the desktop SubjectTable is `.hidden.md:block` → display:none).
    // Use the any-visible pattern from the teacher mobile spec so either
    // card OR table match is accepted when the viewport straddles the md
    // breakpoint.
    await page.goto('/admin/subjects');
    const anyName = page.getByText(name);
    await expect(async () => {
      const count = await anyName.count();
      let anyVisible = false;
      for (let i = 0; i < count; i++) {
        if (await anyName.nth(i).isVisible()) {
          anyVisible = true;
          break;
        }
      }
      expect(anyVisible, `${name} visible in list`).toBe(true);
    }).toPass({ timeout: 10_000 });
  });

  test('SUBJECT-CRUD-02.m: edit via dialog at 375×812 → toast', async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const seed = await createSubjectViaAPI(request, {
      name: `${MOBILE_PREFIX}SEED-${ts}`,
      shortName: `S${ts % 100}`,
    });

    await page.goto('/admin/subjects');

    // Mobile cards carry data-testid="subject-mobile-cards" on the
    // container; each card's whole body is clickable via onClick that
    // calls onEdit(s). Tap the card that contains the seed name.
    const mobileCards = page.getByTestId('subject-mobile-cards');
    await expect(mobileCards).toBeVisible();

    // Tap the card containing the seed's name.
    await mobileCards
      .locator('[class*="cursor-pointer"]', { hasText: seed.name })
      .first()
      .click();

    await expect(
      page.getByRole('heading', { name: 'Fach bearbeiten' }),
    ).toBeVisible();

    const newName = `${MOBILE_PREFIX}EDIT-${ts}`;
    await page.getByTestId('subject-name-input').fill(newName);
    await page.getByTestId('subject-submit').click();

    await expect(page.getByText('Fach aktualisiert.')).toBeVisible();
  });
});
