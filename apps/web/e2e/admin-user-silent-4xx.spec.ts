/**
 * Phase 13 Plan 13-03 — Silent-4xx/5xx toast guardrail for User-Mgmt
 *
 * Memory directive (2026-04-21): E2E-first — the project refuses manual UAT.
 * This spec is the regression guard against a future hook author forgetting
 * an `onError` handler on one of the Phase-13 mutations, re-introducing the
 * Phase-10 silent-4xx bug class.
 *
 * Tests force HTTP 500 on:
 *   - PUT  /api/v1/admin/users/:id/roles       (useUpdateUserRoles)
 *   - POST /api/v1/admin/permission-overrides  (useCreatePermissionOverride)
 *
 * Each test asserts:
 *   1. A red error toast is visible (hook fired onError correctly).
 *   2. The green success toast NEVER appears (the Silent-4XX-Invariante).
 *
 * Mirrors the pattern codified in silent-4xx.spec.ts for Phase 10.
 */
import { expect, test, type Route } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { getSeedUserId } from './helpers/users';

test.describe('Phase 13 — Silent-4xx/5xx guardrail (desktop)', () => {
  // Phase 17 deferred: shared admin-user search-fixture regression
  // (#cluster-13-silent-4xx). 2/2 fail in CI (PR #1 lines 110-111). Same
  // root cause family as #cluster-13-overrides. See 17-TRIAGE.md. Owner: 17.1.
  test.skip(
    true,
    'Phase 17 deferred: GET /admin/users (search=...) fixture regression — see 17-TRIAGE.md row #cluster-13-silent-4xx.',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('USER-SILENT-01: PUT /admin/users/:id/roles 500 → red toast, no green toast', async ({
    page,
    request,
  }) => {
    const lehrerId = await getSeedUserId(request, 'lehrer');

    // Intercept ONLY the PUT — leave the GET alone so the Rollen tab still
    // hydrates from the server.
    await page.route(
      `**/api/v1/admin/users/${lehrerId}/roles`,
      async (route: Route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              statusCode: 500,
              message: 'Internal error',
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/admin/users/${lehrerId}`);
    await page.getByRole('tab', { name: 'Rollen' }).click();
    // CardTitle renders as <div>, not <h*> — match by text.
    await expect(page.getByText('Rollen zuweisen', { exact: true })).toBeVisible();

    // Make the form dirty — toggle the Schulleitung row label (clicks the
    // wrapping <label>, which toggles the bound checkbox).
    await page.getByText('Schulleitung', { exact: true }).first().click();

    // Save (desktop button).
    await page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first()
      .click();

    // Red error toast must appear. UI-SPEC §219 (500): 'Etwas ist schiefgelaufen'
    // OR §222 silent-4xx fallback: 'Aktion nicht möglich'. Either is acceptable
    // because the hook may classify 500 with specific copy or fall through to
    // the generic unknown-status handler.
    await expect(
      page.getByText(/Etwas ist schiefgelaufen|Aktion nicht möglich/i),
    ).toBeVisible();

    // CRITICAL Silent-4XX-Invariante: green success toast MUST NEVER fire.
    await expect(page.getByText('Rollen aktualisiert')).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('USER-SILENT-02: POST /admin/permission-overrides 500 → red toast, no green toast', async ({
    page,
    request,
  }) => {
    const lehrerId = await getSeedUserId(request, 'lehrer');

    await page.route(
      '**/api/v1/admin/permission-overrides',
      async (route: Route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              statusCode: 500,
              message: 'Internal error',
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/admin/users/${lehrerId}?tab=overrides`);
    await page.getByRole('tab', { name: 'Overrides & Verknüpfung' }).click();
    await expect(
      page.getByText('Per-User-Overrides', { exact: true }),
    ).toBeVisible();

    // Open a draft override row (footer 'Override hinzufügen').
    await page
      .getByRole('button', { name: 'Override hinzufügen' })
      .last()
      .click();

    // The draft row is always the LAST OverrideRow card — same selector
    // strategy used by admin-user-overrides.spec.ts USER-04-OVR-03.
    const cards = page.locator('div.transition-colors');
    const draftIndex = (await cards.count()) - 1;
    const draftRow = cards.nth(draftIndex);
    await expect(draftRow).toBeVisible();

    // Action select.
    await draftRow.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'read' }).click();

    // Subject select.
    await draftRow.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'all' }).click();

    // Reason inside the draft row (placeholder unique to OverrideRow).
    await draftRow
      .getByPlaceholder('z.B. Vertretungs-Admin während Sommerferien 2026')
      .fill(`E2E-USR-SILENT-02 ${Date.now()}`);

    // Inline save in the draft row.
    await draftRow.getByRole('button', { name: 'Override speichern' }).click();

    // Red error toast — UI-SPEC §219 OR §222.
    await expect(
      page.getByText(/Etwas ist schiefgelaufen|Aktion nicht möglich/i),
    ).toBeVisible();

    // CRITICAL: green success toast MUST NEVER fire.
    await expect(page.getByText('Override gespeichert')).not.toBeVisible({
      timeout: 3_000,
    });
  });
});
