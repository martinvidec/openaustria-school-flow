/**
 * Phase 10.5 — Admin Resources CRUD (mobile-375) smoke
 *
 * Covers Deliverable 2 mobile leg (CONTEXT.md D-07, D-22). Two smoke tests
 * at the mobile-375 project — one happy-path create, one delete — sufficient
 * to prove the full-screen Dialog + overflow-x-auto list render correctly
 * at 375x812. Edit and error-path tests stay desktop-only (admin-resources.spec.ts)
 * since their coverage value is viewport-independent.
 *
 * Tests:
 *   RES-CRUD-01.mobile — open the full-screen Add dialog at 375px, fill the
 *                        form (Name / Typ / Menge), submit, and assert the
 *                        green `Ressource gespeichert` toast + row appears
 *                        in the (horizontally scrolled) table.
 *   RES-CRUD-03.mobile — seed a resource via the admin API (fast path), open
 *                        the delete-confirm Dialog via the per-row trash
 *                        button, confirm, and assert the `Ressource geloescht`
 *                        toast + row disappears.
 *
 * Why only two tests:
 *   - Edit (RES-CRUD-02.mobile) duplicates the Add-dialog interaction on the
 *     same viewport — no new coverage.
 *   - Error-path (RES-CRUD-04.mobile) duplicates the sonner toast rendering,
 *     which is viewport-independent (position-top-center on all breakpoints
 *     per apps/web/src/routes/__root.tsx). Desktop coverage is canonical.
 *
 * Prerequisites: same as admin-resources.spec.ts
 *
 * Cleanup isolation: uses the `E2E-RES-MOBILE-*` prefix so desktop spec runs
 * never delete mobile-created rows and vice versa.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const SCHOOL = 'seed-school-bgbrg-musterstadt';

// Match desktop spec constants exactly (DO NOT re-discover — see
// 10.5-02-DISCOVERY.md). Duplication is preferred over cross-import because
// Playwright projects run in isolation and a shared-constants module would
// create a brittle cross-file coupling for what should remain two
// independently maintainable specs.
const ADD_BUTTON = 'Ressource hinzufuegen';
const SUBMIT_BUTTON = 'Speichern';
const NAME_LABEL = 'Name';
const TYPE_LABEL = 'Typ';
const QUANTITY_LABEL = 'Menge';
const TYPE_VALUE_BEAMER = 'Beamer';
const DELETE_CONFIRM_TITLE = 'Ressource loeschen';
const DELETE_CONFIRM_BUTTON = 'Loeschen';

const TOAST_CREATE_SUCCESS = 'Ressource gespeichert';
const TOAST_DELETE_SUCCESS = 'Ressource geloescht';

test.describe('Phase 10.5 — Admin Resources (mobile-375)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/resources');
    await expect(
      page.getByRole('heading', { name: 'Ressourcen', level: 1 }),
    ).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EResources(request, /^E2E-RES-MOBILE-/);
  });

  test('RES-CRUD-01.mobile: create resource at 375px -> green toast + row in list', async ({
    page,
  }) => {
    const name = `E2E-RES-MOBILE-01-${Date.now()}`;

    await page.getByRole('button', { name: ADD_BUTTON }).click();
    // The Add dialog renders full-screen on mobile via h-[100dvh] sm:h-auto
    // (resources.tsx:206); the title is the stable anchor that the dialog
    // actually mounted before we start filling inputs.
    await expect(
      page.getByRole('heading', { name: 'Ressource hinzufuegen' }),
    ).toBeVisible();

    await page.getByLabel(NAME_LABEL).fill(name);

    // Radix Select — tap the Typ combobox, then tap the Beamer option in
    // the portaled listbox. Option is viewport-independent.
    await page.getByLabel(TYPE_LABEL).click();
    await page.getByRole('option', { name: TYPE_VALUE_BEAMER }).click();

    await page.getByLabel(QUANTITY_LABEL).fill('1');
    await page.getByRole('button', { name: SUBMIT_BUTTON }).click();

    // VERBATIM from useResources.ts:42.
    await expect(page.getByText(TOAST_CREATE_SUCCESS)).toBeVisible();

    // Row appears — even though the table scrolls horizontally at 375px
    // (overflow-x-auto wrapper on resources.tsx:193), the <tr> itself is
    // still in the DOM with its accessible name composed from cell text.
    await expect(
      page.getByRole('row', { name: new RegExp(name) }),
    ).toBeVisible();
  });

  test('RES-CRUD-03.mobile: delete API-seeded resource via UI -> green toast + row gone', async ({
    page,
    request,
  }) => {
    const name = `E2E-RES-MOBILE-03-${Date.now()}`;

    // Seed via API — saves ~2s of UI interaction per test run and keeps the
    // mobile spec focused on the delete path.
    const created = await createResourceViaAPI(request, name);
    expect(created.id, 'API-seeded resource id').toBeTruthy();

    // Force the list to refetch so the just-created row is visible. The
    // simplest signal is a page reload; TanStack Query refetches on mount.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Ressourcen', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('row', { name: new RegExp(name) }),
    ).toBeVisible();

    // Open the delete-confirm dialog via the per-row trash button
    // (aria-label `${name} loeschen` — ResourceList.tsx:110).
    await page.getByRole('button', { name: `${name} loeschen` }).click();
    await expect(
      page.getByRole('heading', { name: DELETE_CONFIRM_TITLE }),
    ).toBeVisible();

    // Destructive confirm — `.last()` because the row icon button also
    // matches the name regex (see admin-resources.spec.ts:145 for the same
    // disambiguation rationale).
    await page
      .getByRole('button', { name: DELETE_CONFIRM_BUTTON })
      .last()
      .click();

    // VERBATIM from useResources.ts:99 (ASCII `oe`).
    await expect(page.getByText(TOAST_DELETE_SUCCESS)).toBeVisible();

    await expect(
      page.getByRole('row', { name: new RegExp(name) }),
    ).not.toBeVisible({ timeout: 5_000 });
  });
});

/**
 * Seed a resource directly through the admin API. Returns the created
 * resource's id + name so the caller can drive the subsequent UI delete.
 *
 * Uses the same verbatim fields as the UI happy-path (name, resourceType=Beamer,
 * quantity=1) so the UI renders an identical row regardless of whether the
 * seed came from the API or the Add dialog.
 */
async function createResourceViaAPI(
  request: APIRequestContext,
  name: string,
): Promise<{ id: string; name: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${API}/schools/${SCHOOL}/resources`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name,
      resourceType: 'Beamer',
      quantity: 1,
    },
  });
  expect(res.ok(), `POST /resources seed (${name})`).toBeTruthy();
  return (await res.json()) as { id: string; name: string };
}

/**
 * Best-effort API-level cleanup — see the desktop spec for the rationale.
 * Pattern is scoped to E2E-RES-MOBILE-* so desktop and mobile runs never
 * step on each other's data.
 */
async function cleanupE2EResources(
  request: APIRequestContext,
  namePattern: RegExp,
): Promise<void> {
  const token = await getAdminToken(request);
  const listRes = await request.get(`${API}/schools/${SCHOOL}/resources`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok()) return;
  const resources = (await listRes.json()) as Array<{
    id: string;
    name: string;
  }>;
  await Promise.all(
    resources
      .filter((r) => namePattern.test(r.name))
      .map((r) =>
        request.delete(`${API}/schools/${SCHOOL}/resources/${r.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
  );
}

