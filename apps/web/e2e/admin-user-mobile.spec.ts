/**
 * Phase 13 Plan 13-03 Task 9 — Mobile-375 Admin User Management
 * (CONTEXT D-16 E2E-USR-MOBILE-01, REQUIREMENTS MOBILE-ADM-01/02)
 *
 * Covers USER-01 (list @ 375px via UserMobileCards) and USER-05
 * (LinkPersonDialog @ 375px with 44px touch-targets per MOBILE-ADM-02).
 *
 * Runs under Playwright projects `mobile-375` (iPhone 13 / WebKit) AND
 * `mobile-chrome` (Pixel 5 / Chromium) — both at viewport 375×812. The plan
 * filename `admin-user-mobile.spec.ts` (hyphen) is honored verbatim; the
 * playwright.config testMatch was extended in this commit to accept BOTH
 * `*.mobile.spec.ts` (legacy) AND `*-mobile.spec.ts` (Phase 13 plan
 * filename) so this file routes to the mobile-375 / mobile-chrome projects
 * but is excluded from the desktop project.
 *
 * Verification surface (per 10.4-03 / 10.5-02 / 11-03 precedent): the
 * `mobile-chrome` project is the canonical verification surface on darwin
 * runners — `mobile-375` (WebKit) hits Bus-Error-10 in Playwright's vendored
 * WebKit binary on macOS arm64, which is a known platform issue independent
 * of this spec. The same UI surface, viewport, and touch-target invariants
 * are exercised under both projects.
 *
 * Touch-target floor is 44px per UI-SPEC §484-493 / MOBILE-ADM-02. The
 * Phase-13-owned interactive elements asserted here are `min-h-11` /
 * `min-w-11` (= 44px exact in Tailwind), so we use a strict `≥44` guard
 * rather than the 1px subpixel tolerance used elsewhere.
 *
 * Prerequisites: docker compose up -d postgres redis keycloak; API on :3000;
 * Vite on :5173; prisma:seed executed (5 seed users + seed school).
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { getSeedUserId, unlinkPersonViaAPI } from './helpers/users';

test.describe('Phase 13 — Admin User Mgmt @ mobile-375 (USER-01 + USER-05)', () => {
  // Belt-and-braces viewport pin in case the spec is invoked under a project
  // whose default viewport differs from 375×812.
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('USER-MOBILE-01: admin sees mobile user cards at 375px (desktop table is display:none) + 44px touch-targets', async ({
    page,
  }) => {
    await page.goto('/admin/users');
    await expect(
      page.getByRole('heading', { name: 'User & Berechtigungen' }),
    ).toBeVisible();

    // Phase 17 Plan D: UserList moved onto the shared <DataList> primitive,
    // which wraps desktop in `hidden sm:block` (data-testid="user-desktop-table")
    // and mobile in `sm:hidden` (data-testid="user-mobile-cards"). At 375px
    // the desktop wrapper is `display: none` and the mobile wrapper is the
    // visible card stack.
    const desktopTable = page.getByTestId('user-desktop-table');
    await expect(desktopTable).not.toBeVisible();

    const mobileCardsContainer = page.getByTestId('user-mobile-cards');
    await expect(mobileCardsContainer).toBeVisible();

    // At least one Card with the seed admin email is visible — scoped to
    // the mobile cards container (the desktop wrapper also contains this
    // text but is `display: none` at 375px).
    await expect(
      mobileCardsContainer.getByText('admin@schoolflow.dev').first(),
    ).toBeVisible();

    // Mobile menu trigger (hamburger) is visible — AppHeader.tsx exposes it
    // with verbatim aria-label="Navigation oeffnen" (sm:hidden). Touch-target
    // size on the hamburger is owned by Phase 09 (pre-existing AppHeader)
    // and out of scope for Phase 13-03. We assert visibility only — the
    // 44px contract for THIS plan's surface is enforced on Phase-13-owned
    // elements below (UserMobileCards row '…' button + LinkPersonDialog
    // controls in USER-MOBILE-02).
    const hamburger = page.getByRole('button', { name: 'Navigation oeffnen' });
    await expect(hamburger).toBeVisible();

    // 44px touch-target floor on the row's '…' DropdownMenuTrigger button —
    // UserMobileCards renders it with `min-h-11 min-w-11` (= 44×44 exact)
    // and aria-label "Aktionen". Multiple cards may render, pick the first.
    // MOBILE-ADM-02 invariant.
    const aktionenBtn = page.getByRole('button', { name: 'Aktionen' }).first();
    await expect(aktionenBtn).toBeVisible();
    const aktionenBox = await aktionenBtn.boundingBox();
    expect(aktionenBox, '"Aktionen" button bounding box').not.toBeNull();
    expect(aktionenBox!.height).toBeGreaterThanOrEqual(44);
    expect(aktionenBox!.width).toBeGreaterThanOrEqual(44);
  });

  test('USER-MOBILE-02: LinkPersonDialog opens at 375px with 44px touch-targets on dialog controls', async ({
    page,
    request,
  }) => {
    // Subject: schulleitung-user (unlinked in seed). Idempotent setup —
    // unlink defensively in case a prior run left it linked.
    const schulleitungId = await getSeedUserId(request, 'schulleitung');
    await unlinkPersonViaAPI(request, schulleitungId).catch(() => {});

    await page.goto(`/admin/users/${schulleitungId}?tab=overrides`);

    // On mobile (<768px) the user-detail tabs are replaced by a Select
    // dropdown (UserDetailTabs.tsx: TabsList is `hidden md:flex`, the
    // Select is `md:hidden`). Use the `?tab=overrides` URL search param
    // to land directly on the right tab — the route's onTabChange + the
    // Select reflect this. The PersonLinkSection is rendered inside the
    // overrides tab.

    // Wait for the Person-Verknüpfung section to hydrate.
    await expect(page.getByText('Person-Verknüpfung').first()).toBeVisible({
      timeout: 10_000,
    });
    // Unlinked precondition — the section shows "Nicht verknüpft" + the
    // primary CTA "Mit Person verknüpfen".
    await expect(page.getByText('Nicht verknüpft').first()).toBeVisible();

    // 44px touch-target on the primary CTA — PersonLinkSection.tsx gives
    // it `min-h-11 sm:min-h-9`, so at 375px the floor is 44px exact.
    // MOBILE-ADM-02 invariant.
    const linkBtn = page.getByRole('button', { name: 'Mit Person verknüpfen' });
    await expect(linkBtn).toBeVisible();
    const linkBox = await linkBtn.boundingBox();
    expect(linkBox, 'CTA bounding box').not.toBeNull();
    expect(linkBox!.height).toBeGreaterThanOrEqual(44);

    // Open the dialog.
    await linkBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // The dialog title is the verbatim UI-SPEC string.
    await expect(
      dialog.getByRole('heading', { name: 'Mit Person verknüpfen' }),
    ).toBeVisible();

    // The sheet/dialog occupies most of the 375px width — assert width
    // exceeds 320px (covers 90% of 375 with margins).
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox, 'dialog bounding box').not.toBeNull();
    expect(dialogBox!.width).toBeGreaterThan(320);

    // 44px touch-target on each Person-Type radio row — LinkPersonDialog
    // renders each <label> with `min-h-11` (44px exact). There are three:
    // TEACHER / STUDENT / PARENT.
    const teacherLabel = dialog.getByText('Lehrkraft', { exact: true });
    await expect(teacherLabel).toBeVisible();
    // Walk up to the wrapping <label>, which is the actual 44px tap target.
    const teacherRow = teacherLabel.locator(
      'xpath=ancestor::label[contains(@class,"min-h-11")][1]',
    );
    const teacherRowBox = await teacherRow.boundingBox();
    expect(teacherRowBox, 'Lehrkraft row bounding box').not.toBeNull();
    expect(teacherRowBox!.height).toBeGreaterThanOrEqual(44);

    // Close without committing — Abbrechen footer button.
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(dialog).not.toBeVisible();

    // Section reverts to the unlinked state.
    await expect(page.getByText('Nicht verknüpft').first()).toBeVisible();
  });
});
