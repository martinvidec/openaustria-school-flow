/**
 * Phase 10.2 — Schuljahre edit/delete/activate (desktop)
 *
 * Scope of this file:
 *   - YEAR-02: delete a dependent-free year, assert success toast + year disappears
 *   - YEAR-03: switch active year between two coexisting years, assert toast +
 *              single-active invariant
 *
 * Deferred:
 *   YEAR-01 (edit school year) is deferred — the edit UI does not exist in v1.1
 *   Phase 10. The backend PATCH /api/v1/schools/:schoolId/school-years/:yearId
 *   endpoint is ready (apps/api/src/modules/school/school-year.controller.ts:40),
 *   and useUpdateSchoolYear is defined (apps/web/src/hooks/useSchoolYears.ts:43)
 *   but has zero call sites in apps/web/src. No EditSchoolYearDialog.tsx and no
 *   `bearbeiten` button on SchoolYearCard.tsx.
 *   See .planning/phases/10.2-e2e-admin-console-gap-closure/deferred-items.md
 *   entry #1 for the full triage note and recommended follow-up plan.
 *
 * Prerequisites (same as admin-school-settings.spec.ts):
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed (admin + sample school + 1 active + 1 inactive year)
 *   - DATABASE_URL exported in the runner shell
 */
import { expect, test } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';

const API_BASE = 'http://localhost:3000/api/v1';

interface SchoolYear {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Best-effort cleanup of any throwaway E2E-* school years that may still be
 * around after a flaky run. Uses the admin token + direct API calls so we
 * don't depend on UI state. DELETE is allowed only on non-active years — if
 * the year happens to be active the DELETE 409's and we swallow it (the next
 * run's YEAR-03 cleanup will fix it by activating one of the real years).
 */
async function cleanupThrowawayYears(
  request: import('@playwright/test').APIRequestContext,
  schoolId: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const listRes = await request.get(`${API_BASE}/schools/${schoolId}/school-years`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok()) return;
  const years = (await listRes.json()) as SchoolYear[];
  // Re-activate a real (non-E2E) year first so the E2E-* rows are deletable.
  const realInactive = years.find((y) => !y.name.startsWith('E2E-') && !y.isActive);
  const activeE2E = years.find((y) => y.name.startsWith('E2E-') && y.isActive);
  if (activeE2E && realInactive) {
    await request.post(
      `${API_BASE}/schools/${schoolId}/school-years/${realInactive.id}/activate`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
  const throwaways = years.filter((y) => y.name.startsWith('E2E-'));
  for (const y of throwaways) {
    await request.delete(
      `${API_BASE}/schools/${schoolId}/school-years/${y.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}

test.describe('Phase 10.2 — Schuljahre edit/delete/activate (desktop)', () => {
  let schoolId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get(`${API_BASE}/schools`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), 'schools list').toBeTruthy();
    const schools = (await res.json()) as Array<{ id: string }>;
    expect(schools.length).toBeGreaterThan(0);
    schoolId = schools[0].id;
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupThrowawayYears(request, schoolId);
  });

  test('YEAR-02: delete a dependent-free year, assert success toast + year disappears', async ({
    page,
  }) => {
    await page.goto('/admin/school/settings?tab=years');
    // Wait for the tab shell to hydrate — the Schuljahre heading is the
    // stable signal that the list has rendered.
    await expect(page.getByRole('heading', { name: 'Schuljahre' })).toBeVisible();

    // Create a throwaway year with a unique name — crucially no holidays /
    // autonomous days / lessons so the orphan-guard does NOT block delete.
    const name = `E2E-DELETE-YEAR-${Date.now()}`;
    await page.getByRole('button', { name: /Neues Schuljahr anlegen/ }).click();
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Start').fill('2099-09-01');
    await page.getByLabel('Semesterwechsel').fill('2100-02-01');
    await page.getByLabel('Ende').fill('2100-06-30');
    // isActive left false — we need the year NOT active so DELETE is allowed.
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page.getByText('Schuljahr angelegt.')).toBeVisible();

    // Locate the new year's card and click the scoped delete button. The
    // trash-icon button on SchoolYearCard.tsx carries aria-label
    // `Schuljahr <name> loeschen`. That label alone is unambiguous so we
    // don't need to narrow via the card ancestor — but SCHOOL-05's pattern
    // using xpath ancestor is equally valid.
    await page
      .getByRole('button', { name: `Schuljahr ${name} loeschen` })
      .click();

    // Confirm inside the destructive dialog. The dialog's destructive button
    // is labelled `Loeschen` — use `.last()` like SCHOOL-05 since there may
    // also be a row-level trash button still matching the name.
    await page.getByRole('button', { name: 'Loeschen' }).last().click();

    // Success toast from useDeleteSchoolYear.onSuccess (useSchoolYears.ts:113).
    await expect(page.getByText('Schuljahr geloescht.')).toBeVisible();

    // Year label must disappear from the list.
    await expect(page.getByText(name, { exact: true })).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test('YEAR-03: activate-switch — clicking Aktivieren on an inactive year demotes the previous active year (single-active invariant)', async ({
    page,
    request,
  }) => {
    // NOTE on test shape:
    //   The plan draft suggested creating two years (one via dialog with
    //   `Als aktives Schuljahr setzen` ON, one inactive) and then activating
    //   the second. We deliberately do NOT create a year with
    //   isActive:true here because
    //     POST /api/v1/schools/:schoolId/school-years with isActive:true
    //   currently returns HTTP 500 when another active year already exists —
    //   SchoolYearService.create inserts the row without an atomic demote,
    //   so Prisma's partial-unique index school_years_active_per_school
    //   fires a unique-constraint violation. This bug is orthogonal to the
    //   activate-switch path the admin actually uses and is logged in
    //   deferred-items.md entry #2.
    //
    //   The admin's daily workflow (per plan key_link) is:
    //     `POST /school-years/:yearId/activate  via  admin clicks
    //      Als aktiv setzen on a non-active year`
    //   which is exactly what this test exercises — and which goes through
    //   SchoolYearService.activate, the code path that *does* run the
    //   atomic demote inside a $transaction.

    await page.goto('/admin/school/settings?tab=years');
    await expect(page.getByRole('heading', { name: 'Schuljahre' })).toBeVisible();

    const ts = Date.now();
    const name = `E2E-SWITCH-${ts}`;

    // Create a throwaway year (inactive). The seed already has one active
    // (`2025/2026`) and one inactive (`2027/2028`) — adding a third inactive
    // gives us a deterministic target to activate without colliding with
    // user-visible years.
    await page.getByRole('button', { name: /Neues Schuljahr anlegen/ }).click();
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Start').fill('2099-09-01');
    await page.getByLabel('Semesterwechsel').fill('2100-02-01');
    await page.getByLabel('Ende').fill('2100-06-30');
    // isActive left OFF — avoids the create-as-active 500 (see note above).
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page.getByText('Schuljahr angelegt.')).toBeVisible();

    // Pre-flight: confirm the seed has exactly one active year and our new
    // year is inactive. If this invariant is broken the whole test is moot.
    const token = await getAdminToken(request);
    const preRes = await request.get(
      `${API_BASE}/schools/${schoolId}/school-years`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const preYears = (await preRes.json()) as SchoolYear[];
    const preActive = preYears.filter((y) => y.isActive);
    expect(preActive.length, 'exactly one active year at start').toBe(1);
    const preActiveName = preActive[0].name;
    expect(preYears.find((y) => y.name === name)?.isActive).toBe(false);

    // Click `Aktivieren` on the throwaway year's card. SchoolYearCard.tsx:66
    // sets aria-label `Schuljahr <name> aktivieren` — unique per card.
    await page
      .getByRole('button', { name: `Schuljahr ${name} aktivieren` })
      .click();

    // ActivateSchoolYearDialog.tsx:41 confirm button label is `Aktivieren`.
    // The card also renders an `Aktivieren` button, so scope via `.last()`
    // — the dialog button renders after the card button in the DOM order.
    await page.getByRole('button', { name: 'Aktivieren' }).last().click();

    // Success toast from useActivateSchoolYear.onSuccess (useSchoolYears.ts:80).
    await expect(page.getByText('Aktives Schuljahr gewechselt.')).toBeVisible();

    // InfoBanner at top of tab updates to reflect the new active year.
    // SchoolYearsTab.tsx:74 renders `<strong>{name}</strong> ist aktiv seit
    // <date>`. Scope the match to the new year's name to prove the banner
    // swapped, not just that *some* banner is visible.
    await expect(
      page.locator('text=ist aktiv seit').locator('..'),
    ).toContainText(name);

    // Single-active invariant (verified at the API layer — DOM-level
    // counting is brittle because SchoolYearCard also uses `Aktiv` as a
    // substring inside the `Aktivieren` button on inactive cards; exact=true
    // only disambiguates the badge from the button when no `Aktivieren`
    // button carries the exact word "Aktiv" alone — which is fragile across
    // icon/text refactors).
    const postRes = await request.get(
      `${API_BASE}/schools/${schoolId}/school-years`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const postYears = (await postRes.json()) as SchoolYear[];
    const postActive = postYears.filter((y) => y.isActive);
    expect(postActive.length, 'exactly one active year after switch').toBe(1);
    expect(postActive[0].name, 'switched to new year').toBe(name);
    expect(
      postYears.find((y) => y.name === preActiveName)?.isActive,
      `previous active year ${preActiveName} demoted`,
    ).toBe(false);

    // Restore seed order: flip back to the original active year so the
    // next test run / manual UAT starts in a known state. afterEach would
    // do this anyway via cleanupThrowawayYears, but doing it explicitly
    // here makes the single-test re-run story clean.
    const originalActive = postYears.find((y) => y.name === preActiveName);
    if (originalActive) {
      await request.post(
        `${API_BASE}/schools/${schoolId}/school-years/${originalActive.id}/activate`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    }
  });
});
