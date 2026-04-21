/**
 * Phase 10.3 Plan 02 — Per-role smoke (desktop).
 *
 * Proves that login + routing + primary-view rendering works for the 4
 * non-admin seed personas:
 *   - schulleitung  -> /admin/substitutions       (Vertretungsplanung)
 *   - lehrer        -> /timetable                 (teacher perspective auto-set)
 *   - eltern        -> /timetable                 (childClassId perspective auto-set)
 *   - schueler      -> /timetable                 (classId perspective auto-set)
 *
 * Admin smoke is NOT repeated here — admin coverage lives in Phase 10.2
 * specs (admin-school-settings.spec.ts, zeitraster.spec.ts, schuljahre.spec.ts,
 * wochentage.spec.ts, silent-4xx.spec.ts).
 *
 * Scope (from 10.3-02-PLAN.md):
 *   - READ-ONLY: no mutations, no form submits. Mutations belong to Tier 3
 *     per-surface hardening (Phase 10.4+).
 *   - One stable primary affordance asserted per test. For timetable routes
 *     we use role="grid" + aria-label="Stundenplan" (TimetableGrid root),
 *     falling back to "Kein Stundenplan vorhanden" empty-state when the
 *     seed DB has no lessons for the current perspective. Both outcomes
 *     prove the page mounted, data-layer ran, and role gating passed —
 *     which is the whole point of a smoke.
 *
 * Prerequisites (same as admin specs):
 *   - docker compose up -d postgres redis keycloak
 *   - API running on port 3000
 *   - Vite dev server on http://localhost:5173
 *   - prisma:seed executed (creates KC_LEHRER / KC_ELTERN / KC_SCHUELER /
 *     KC_SCHULLEITUNG persons + teacher/student/parent rows + realm users)
 */
import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/login';

test.describe('Phase 10.3 — Per-role smoke (desktop)', () => {
  test('SMOKE-SL-01: schulleitung opens Substitutions admin', async ({ page }) => {
    await loginAsRole(page, 'schulleitung');
    await page.goto('/admin/substitutions');

    // Primary affordance: h1 "Vertretungsplanung" rendered by the
    // /admin/substitutions route. Locating by role=heading (name exact)
    // avoids substring matches against sidebar link text.
    await expect(
      page.getByRole('heading', { name: 'Vertretungsplanung' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('SMOKE-LEHRER-01: lehrer opens timetable view', async ({ page }) => {
    await loginAsRole(page, 'lehrer');
    await page.goto('/timetable');

    // Primary affordance 1: level=1 h1 "Stundenplan" — rendered by the
    // route regardless of whether the grid or the empty-state card is
    // showing. Proves route mount + auth-gate pass.
    //
    // NOTE: shadcn/ui CardTitle is a <div> (not a heading element), so
    // the empty-state "Kein Stundenplan vorhanden" text does NOT have
    // role=heading — we assert on its visible text directly as the
    // fallback signal.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Stundenplan' }),
    ).toBeVisible({ timeout: 15_000 });

    // Primary affordance 2: TimetableGrid rendered (seeded lessons for
    // Maria Mueller) OR empty-state card rendered (no lessons yet).
    // Both prove role gate + data-fetch completed.
    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    const emptyText = page.getByText('Kein Stundenplan vorhanden');
    await expect(grid.or(emptyText).first()).toBeVisible({ timeout: 15_000 });
  });

  test('SMOKE-ELTERN-01: eltern opens child timetable', async ({ page }) => {
    await loginAsRole(page, 'eltern');
    await page.goto('/timetable');

    // Eltern's perspective auto-filters to childClassId (Lisa Huber -> 1A).
    await expect(
      page.getByRole('heading', { level: 1, name: 'Stundenplan' }),
    ).toBeVisible({ timeout: 15_000 });

    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    const emptyText = page.getByText('Kein Stundenplan vorhanden');
    await expect(grid.or(emptyText).first()).toBeVisible({ timeout: 15_000 });
  });

  test('SMOKE-SCHUELER-01: schueler opens personal timetable', async ({ page }) => {
    await loginAsRole(page, 'schueler');
    await page.goto('/timetable');

    // Schueler's perspective auto-filters to own classId (Max Huber -> 1A).
    await expect(
      page.getByRole('heading', { level: 1, name: 'Stundenplan' }),
    ).toBeVisible({ timeout: 15_000 });

    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    const emptyText = page.getByText('Kein Stundenplan vorhanden');
    await expect(grid.or(emptyText).first()).toBeVisible({ timeout: 15_000 });
  });
});
