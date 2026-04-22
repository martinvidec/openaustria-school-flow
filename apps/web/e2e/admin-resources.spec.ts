/**
 * Phase 10.5 — Admin Resources CRUD (desktop)
 *
 * Covers Deliverable 2 (CONTEXT.md D-07..D-08, RESEARCH.md Pattern 1 Happy +
 * Pattern 2 mocked-422) — full CRUD lifecycle against /admin/resources plus
 * one mocked error-path that asserts the silent-4xx guardrail.
 *
 * Tests:
 *   RES-CRUD-01 — create a resource via the Add dialog, assert green toast
 *                 `Ressource gespeichert` (useResources.ts:42) and that the
 *                 new row renders in the list.
 *   RES-CRUD-02 — edit an existing resource's quantity, assert the same
 *                 green toast `Ressource gespeichert` (useResources.ts:73,
 *                 intentionally identical to create) and the new quantity
 *                 renders in the row.
 *   RES-CRUD-03 — delete a resource through the two-step confirm dialog,
 *                 assert `Ressource geloescht` toast (ASCII `oe` per
 *                 useResources.ts:99) and the row disappears.
 *   RES-CRUD-04 — mock POST /resources to return HTTP 422 via page.route()
 *                 (pattern from silent-4xx.spec.ts) and assert the red error
 *                 toast `Erstellen fehlgeschlagen` (useResources.ts:37) is
 *                 visible AND the green `Ressource gespeichert` toast NEVER
 *                 fires — the silent-4xx invariant from Phase 10.2.
 *
 * DOM contract: .planning/phases/10.5-e2e-admin-ops-operations/10.5-02-DISCOVERY.md
 *   — all button/label strings verified against
 *     apps/web/src/routes/_authenticated/admin/resources.tsx and
 *     apps/web/src/components/rooms/ResourceList.tsx.
 *
 * Selectors: strict role + accessible-name only (D-16 — no test-id attributes).
 *
 * Prerequisites (mirrors the other Phase 10.2+ admin specs):
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed (admin + sample school `seed-school-bgbrg-musterstadt`)
 *   - Playwright runner shell has DATABASE_URL exported (though this spec
 *     does not touch the DB directly — API-only cleanup suffices).
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const SCHOOL = 'seed-school-bgbrg-musterstadt';

// Verbatim strings from 10.5-02-DISCOVERY.md (DO NOT drift).
const ADD_BUTTON = 'Ressource hinzufuegen';   // resources.tsx:147 (ASCII `ue`)
const SUBMIT_BUTTON = 'Speichern';             // resources.tsx:315
const CANCEL_BUTTON = 'Abbrechen';             // resources.tsx:312
const NAME_LABEL = 'Name';                     // resources.tsx:218
const TYPE_LABEL = 'Typ';                      // resources.tsx:237
const QUANTITY_LABEL = 'Menge';                // resources.tsx:266
const TYPE_VALUE_BEAMER = 'Beamer';            // RESOURCE_TYPES option — CONTEXT.md D-07 target
const DELETE_CONFIRM_TITLE = 'Ressource loeschen'; // ResourceList.tsx:129 (ASCII `oe`)
const DELETE_CONFIRM_BUTTON = 'Loeschen';      // ResourceList.tsx:150 (ASCII `oe`)

// Verbatim toast strings from useResources.ts (line numbers from DISCOVERY.md).
const TOAST_CREATE_SUCCESS = 'Ressource gespeichert';      // useResources.ts:42
const TOAST_UPDATE_SUCCESS = 'Ressource gespeichert';      // useResources.ts:73 (same string)
const TOAST_DELETE_SUCCESS = 'Ressource geloescht';        // useResources.ts:99 (ASCII `oe`)
const TOAST_CREATE_ERROR = 'Erstellen fehlgeschlagen';     // useResources.ts:37

test.describe('Phase 10.5 — Admin Resources CRUD (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/resources');
    // Anchor — the page's h1 is "Ressourcen" (resources.tsx:143). This ensures
    // useResources has started fetching before we begin interacting.
    await expect(
      page.getByRole('heading', { name: 'Ressourcen', level: 1 }),
    ).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    // API-level cleanup — removes ONLY this spec's E2E-RES-* rows, leaves
    // pre-existing seed data untouched. Harmless no-op for the error-path
    // test (RES-CRUD-04) which never persists a row.
    await cleanupE2EResources(request, /^E2E-RES-/);
  });

  test('RES-CRUD-01: create resource via Add dialog -> green toast + row in list', async ({
    page,
  }) => {
    const name = `E2E-RES-01-${Date.now()}`;

    await createResourceViaUI(page, name, TYPE_VALUE_BEAMER, '2');

    // VERBATIM from useResources.ts:42 — useCreateResource.onSuccess.
    await expect(page.getByText(TOAST_CREATE_SUCCESS)).toBeVisible();

    // Row appears in the list — <tr> accessible name includes all cell text.
    await expect(page.getByRole('row', { name: new RegExp(name) })).toBeVisible();
  });

  test('RES-CRUD-02: edit resource quantity -> green toast + new quantity in row', async ({
    page,
  }) => {
    const name = `E2E-RES-02-${Date.now()}`;

    // Seed via the same UI path as RES-CRUD-01 so edit has something to work on.
    await createResourceViaUI(page, name, TYPE_VALUE_BEAMER, '2');
    await expect(page.getByText(TOAST_CREATE_SUCCESS)).toBeVisible();

    // Open the edit dialog for this row. The per-row icon button has
    // aria-label `{name} bearbeiten` (ResourceList.tsx:102) which is unique.
    await page.getByRole('button', { name: `${name} bearbeiten` }).click();
    // Confirm we're in Edit mode — DialogTitle flips to "Ressource bearbeiten"
    // (resources.tsx:210) when editingResource is set.
    await expect(
      page.getByRole('heading', { name: 'Ressource bearbeiten' }),
    ).toBeVisible();

    // Change quantity 2 -> 5. The input is controlled so fill() replaces.
    await page.getByLabel(QUANTITY_LABEL).fill('5');
    await page.getByRole('button', { name: SUBMIT_BUTTON }).click();

    // Same green toast as create — useUpdateResource.onSuccess fires the
    // identical string 'Ressource gespeichert' (useResources.ts:73).
    await expect(page.getByText(TOAST_UPDATE_SUCCESS)).toBeVisible();

    // New quantity renders in the row. Scope the cell match so a stray `5`
    // elsewhere on the page (e.g. another resource's quantity) cannot
    // false-positive. The row's accessible name already contains the
    // unique name substring.
    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row).toContainText('5');
  });

  test('RES-CRUD-03: delete resource via confirm dialog -> green toast + row gone', async ({
    page,
  }) => {
    const name = `E2E-RES-03-${Date.now()}`;

    // Seed via UI.
    await createResourceViaUI(page, name, TYPE_VALUE_BEAMER, '1');
    await expect(page.getByText(TOAST_CREATE_SUCCESS)).toBeVisible();

    // Open the delete confirm dialog. The per-row icon button has
    // aria-label `{name} loeschen` (ResourceList.tsx:110 — ASCII `oe`).
    await page.getByRole('button', { name: `${name} loeschen` }).click();

    // Assert the confirm dialog opened — prevents clicking the row's own
    // `loeschen` icon a second time if the dialog failed to mount.
    await expect(
      page.getByRole('heading', { name: DELETE_CONFIRM_TITLE }),
    ).toBeVisible();

    // Click the destructive `Loeschen` button INSIDE the confirm dialog.
    // The row's icon button is also named `... loeschen` (via aria-label
    // substring), so scope with .last() — the dialog's textual button
    // renders later in the DOM, mirroring schuljahre.spec.ts:125.
    await page.getByRole('button', { name: DELETE_CONFIRM_BUTTON }).last().click();

    // VERBATIM from useResources.ts:99 — note ASCII `oe`, do NOT rewrite to `ö`.
    await expect(page.getByText(TOAST_DELETE_SUCCESS)).toBeVisible();

    // Row is gone. The invalidateQueries in useDeleteResource.onSuccess
    // refetches the list; the row disappears within the default expect timeout.
    await expect(
      page.getByRole('row', { name: new RegExp(name) }),
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('RES-CRUD-04: error path — mocked 422 on POST /resources -> red toast + silent-4xx guard', async ({
    page,
  }) => {
    // Mock POST /api/v1/schools/:schoolId/resources to return 422.
    // The pattern mirrors silent-4xx.spec.ts — we only intercept POST so
    // the initial GET that hydrated the list still went through cleanly.
    await page.route(`**/api/v1/schools/*/resources`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 422,
            message: ['quantity must be a positive number'],
            error: 'Unprocessable Entity',
          }),
        });
        return;
      }
      await route.continue();
    });

    const name = `E2E-RES-04-${Date.now()}`;
    await page.getByRole('button', { name: ADD_BUTTON }).click();
    await expect(
      page.getByRole('heading', { name: 'Ressource hinzufuegen' }),
    ).toBeVisible();
    await page.getByLabel(NAME_LABEL).fill(name);
    await selectType(page, TYPE_VALUE_BEAMER);
    await page.getByLabel(QUANTITY_LABEL).fill('1');
    await page.getByRole('button', { name: SUBMIT_BUTTON }).click();

    // Red toast — useResources.ts:37 throws `new Error('Erstellen fehlgeschlagen')`
    // and :45 surfaces it via `toast.error(error.message)`.
    await expect(page.getByText(TOAST_CREATE_ERROR)).toBeVisible();

    // CRITICAL silent-4xx guard — the green success toast MUST NEVER fire
    // on a failed POST. This is the exact UAT bug class from Phase 10.
    await expect(page.getByText(TOAST_CREATE_SUCCESS)).not.toBeVisible({
      timeout: 3_000,
    });

    // And the list must not contain the row — the mock made sure no row
    // was persisted, so a re-render would not add it either. Tight timeout
    // because no network call is expected to have succeeded.
    await expect(
      page.getByRole('row', { name: new RegExp(name) }),
    ).not.toBeVisible({ timeout: 3_000 });
  });
});

/**
 * Fill the Add dialog and submit. Shared by RES-CRUD-01/02/03 so the spec
 * does not re-invent the form-interaction sequence three times.
 *
 * The caller asserts the success toast afterwards so this helper stays
 * reusable in RES-CRUD-04 (which expects the error toast instead).
 */
async function createResourceViaUI(
  page: Page,
  name: string,
  type: string,
  qty: string,
): Promise<void> {
  await page.getByRole('button', { name: ADD_BUTTON }).click();
  await expect(
    page.getByRole('heading', { name: 'Ressource hinzufuegen' }),
  ).toBeVisible();
  await page.getByLabel(NAME_LABEL).fill(name);
  await selectType(page, type);
  await page.getByLabel(QUANTITY_LABEL).fill(qty);
  await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
}

/**
 * Select a resourceType value in the shadcn <Select>. The trigger button is
 * labelled `Typ` (label[for=resource-type]) — clicking it opens a Radix
 * portal with the four RESOURCE_TYPES options.
 */
async function selectType(page: Page, value: string): Promise<void> {
  await page.getByLabel(TYPE_LABEL).click();
  await page.getByRole('option', { name: value }).click();
}

/**
 * Best-effort API-level cleanup: iterates the resources endpoint and deletes
 * every row whose name matches the given prefix RegExp. Stays safe against
 * an API that is partially down (listRes.ok() check + awaited Promise.all
 * without throwing). Leaves pre-existing seed resources untouched.
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
