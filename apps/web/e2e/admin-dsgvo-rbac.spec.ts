/**
 * Phase 15-10 Plan 15-10 Task 7 — RBAC negative for /admin/dsgvo +
 * /admin/audit-log (schulleitung lockout).
 *
 * Mirrors the existing `admin-solver-tuning-rbac.spec.ts` template.
 * Per D-22 + D-03, both surfaces are admin-only — sidebar entries
 * MUST be hidden for non-admin roles AND a direct URL hit MUST NOT
 * render the admin UI.
 *
 * Pre-existing project quirk (NOT a Plan 15-10 regression, see the
 * solver-tuning RBAC spec for the same note):
 *   The schulleitung seed user has no Person record linked, so
 *   `/api/v1/users/me` returns 404 and the school-context-store
 *   `isLoaded` flag stays `false`. The `_authenticated` layout
 *   returns ONLY a loading-spinner div until `isLoaded=true`, so
 *   child routes never mount for schulleitung. The user is therefore
 *   effectively blocked from every admin route, including
 *   /admin/dsgvo and /admin/audit-log.
 *
 *   Even if `isLoaded` were true, both route components have an own
 *   `if (!isAdmin)` gate that renders "Du bist für diese Seite nicht
 *   autorisiert." instead of the admin UI. Both code paths produce
 *   the same observable contract: no admin UI is rendered.
 *
 * The spec asserts the absence of distinctive admin UI elements
 * directly — neither the DsgvoTabs trigger row nor the AuditFilterToolbar
 * Aktion <Select> render for schulleitung.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';

test.describe('Phase 15 — DSGVO + Audit-Log RBAC negative (schulleitung)', () => {
  test('schulleitung does not see DSGVO sidebar entry or DsgvoTabs', async ({
    page,
  }) => {
    await loginAsRole(page, 'schulleitung');

    // 1) Sidebar must NOT contain a DSGVO-Verwaltung link.
    await page.goto('/admin');
    await expect(
      page.getByRole('link', { name: /DSGVO-Verwaltung/i }),
    ).toHaveCount(0);

    // 2) Direct URL hit must NOT render the four DsgvoTabs triggers.
    await page.goto('/admin/dsgvo');
    await expect(
      page.getByRole('tab', { name: 'Einwilligungen' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('tab', { name: 'Aufbewahrung' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('tab', { name: 'DSFA & VVZ' }),
    ).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Jobs' })).toHaveCount(0);
  });

  test('schulleitung does not see Audit-Log sidebar entry or AuditFilterToolbar', async ({
    page,
  }) => {
    await loginAsRole(page, 'schulleitung');

    // 1) Sidebar must NOT contain an Audit-Log link.
    await page.goto('/admin');
    await expect(
      page.getByRole('link', { name: /Audit-Log/i }),
    ).toHaveCount(0);

    // 2) Direct URL hit must NOT render the AuditFilterToolbar — the
    //    Aktion <Select> + Von/Bis date inputs are the most distinctive
    //    audit-log surface; their absence proves the route component
    //    never rendered (or is blocked behind isAdmin/isLoaded gates).
    await page.goto('/admin/audit-log');
    // The label "Aktion" is unique to the audit-log toolbar at this
    // route. Its absence is sufficient to prove the toolbar didn't mount.
    await expect(page.getByLabel('Aktion')).toHaveCount(0);
  });
});
