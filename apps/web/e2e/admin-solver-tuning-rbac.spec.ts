/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-RBAC-01 schulleitung negative case.
 *
 * Surface: /admin/solver-tuning + sidebar visibility for the schulleitung
 *          role.
 * Requirement: D-03 — Solver-Tuning is admin-only. The sidebar entry MUST
 *              be hidden for schulleitung, AND a direct URL hit MUST NOT
 *              render any Solver-Tuning admin UI.
 *
 * Pre-existing project behavior (NOT a Plan 14-03 regression):
 *   The schulleitung seed user has no Person record linked, so
 *   `/api/v1/users/me` returns 404 and the school-context-store
 *   `isLoaded` flag stays `false`. The `_authenticated` layout
 *   (apps/web/src/routes/_authenticated.tsx:38-44) returns ONLY a
 *   loading-spinner div until `isLoaded=true`, so child routes never
 *   mount for schulleitung. The user is therefore effectively blocked
 *   from every admin route, including /admin/solver-tuning.
 *
 *   The route component's own `isAdmin` gate (solver-tuning.tsx) would
 *   render "Aktion nicht erlaubt" — but the spinner renders first and
 *   the gate is unreachable. This is a Phase 13 USER-LINK pre-existing
 *   issue (logged as `project_seed_gap.md` historical note).
 *
 *   The RBAC contract is still proven: schulleitung CANNOT see
 *   Solver-Tuning UI (no sidebar entry, no tabs, no h1 title) when
 *   navigating to /admin/solver-tuning. We assert that absence directly.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';

test.describe('Phase 14 — Solver-Tuning RBAC', () => {
  test('E2E-SOLVER-RBAC-01: schulleitung cannot see entry or access route', async ({
    page,
  }) => {
    await loginAsRole(page, 'schulleitung');

    // 1) Sidebar must NOT contain the Solver-Tuning entry. The AppSidebar is
    //    rendered above the loading-gate so the link assertion is observable.
    await page.goto('/admin');
    await expect(
      page.getByRole('link', { name: /Solver-Tuning/i }),
    ).toHaveCount(0);

    // 2) Direct URL hit on /admin/solver-tuning must NOT render Solver-Tuning
    //    admin content for schulleitung. The four tab triggers are the most
    //    distinctive Solver-Tuning surface; their absence proves the route
    //    component never rendered (or is blocked behind the
    //    isAdmin/isLoaded gates).
    await page.goto('/admin/solver-tuning');
    await expect(
      page.getByRole('tab', { name: 'Gewichtungen' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('tab', { name: 'Klassen-Sperrzeiten' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('tab', { name: 'Fach-Präferenzen' }),
    ).toHaveCount(0);

    // 3) The "Solver-Tuning" h1 (from PageShell title="Solver-Tuning") must
    //    also be absent — proves the admin route content is not rendered.
    await expect(
      page.getByRole('heading', { name: 'Solver-Tuning', exact: true }),
    ).toHaveCount(0);
  });
});
