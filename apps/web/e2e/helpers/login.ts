/**
 * Phase 10.3 — shared Playwright login helpers (per-role).
 *
 * Extended in 10.3-01 from the admin-only 10.2-01 version:
 *   - `loginAsRole(page, role)` is the new generic entry point
 *   - `loginAsAdmin(page)` remains available as a thin wrapper so existing
 *     10.2-era specs (SCHOOL-01, ZEIT-*, YEAR-*, WOCH-01, SILENT-4XX-*,
 *     screenshots) keep importing the same symbol without edit.
 *   - `getRoleToken(request, role)` is the new generic direct-access-grant
 *     helper; `getAdminToken` stays as the admin wrapper.
 *
 * Credential source: process.env.E2E_<ROLE>_USER / _PASS with seed defaults
 * from apps/api/prisma/seed.ts (Keycloak realm-export.json + fixed UUIDs).
 *
 * Post-login navigation: the generic helper NO LONGER clicks the admin
 * sidebar "Schulverwaltung" link. All admin specs already call
 * page.goto('/admin/school/settings...') after login, and embedding an
 * admin-specific navigation inside a multi-role helper would leak into
 * schulleitung/lehrer/eltern/schueler smokes arriving in 10.3-02+.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export type Role = 'admin' | 'schulleitung' | 'lehrer' | 'eltern' | 'schueler';

type Credential = { user: string; pass: string };

/**
 * Seed defaults mirror apps/api/prisma/seed.ts and
 * docker/keycloak/realm-export.json. Override per-role via env vars:
 *   E2E_ADMIN_USER        / E2E_ADMIN_PASS
 *   E2E_SCHULLEITUNG_USER / E2E_SCHULLEITUNG_PASS
 *   E2E_LEHRER_USER       / E2E_LEHRER_PASS
 *   E2E_ELTERN_USER       / E2E_ELTERN_PASS
 *   E2E_SCHUELER_USER     / E2E_SCHUELER_PASS
 */
export const CREDENTIALS: Record<Role, Credential> = {
  admin: {
    user: process.env.E2E_ADMIN_USER ?? 'admin-user',
    pass: process.env.E2E_ADMIN_PASS ?? 'admin123',
  },
  schulleitung: {
    user: process.env.E2E_SCHULLEITUNG_USER ?? 'schulleitung-user',
    pass: process.env.E2E_SCHULLEITUNG_PASS ?? 'direktor123',
  },
  lehrer: {
    user: process.env.E2E_LEHRER_USER ?? 'lehrer-user',
    pass: process.env.E2E_LEHRER_PASS ?? 'lehrer123',
  },
  eltern: {
    user: process.env.E2E_ELTERN_USER ?? 'eltern-user',
    pass: process.env.E2E_ELTERN_PASS ?? 'eltern123',
  },
  schueler: {
    user: process.env.E2E_SCHUELER_USER ?? 'schueler-user',
    pass: process.env.E2E_SCHUELER_PASS ?? 'schueler123',
  },
};

/** Back-compat export so 10.2-era specs still compile without edit. */
export const ADMIN_USER = CREDENTIALS.admin.user;
export const ADMIN_PASS = CREDENTIALS.admin.pass;

/**
 * Log in as any seed role via the Keycloak login form.
 *
 * Lands the page on "/" after Keycloak returns. Callers decide where to go
 * next (e.g. page.goto('/admin/school/settings?tab=timegrid') for admin
 * specs, or page.goto('/timetable') for teacher specs).
 */
export async function loginAsRole(page: Page, role: Role): Promise<void> {
  const { user, pass } = CREDENTIALS[role];

  // Kick the SPA auth gate — any protected route works; "/" triggers the
  // same useAuth() -> keycloak.login() redirect as deep links.
  await page.goto('/');

  // Wait for the Keycloak redirect.
  await page
    .waitForURL(/realms\/schoolflow\/protocol\/openid-connect\/auth/, {
      timeout: 15_000,
    })
    .catch(() => {});

  const userField = page.locator('input[name="username"]').first();
  if (await userField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await userField.fill(user);
    await page.locator('input[name="password"]').first().fill(pass);
    await page
      .locator('input[type="submit"], button[type="submit"], button[name="login"]')
      .first()
      .click();
  }

  // Back on the SPA — wait for the authenticated layout to hydrate.
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  // The sidebar is the first reliable signal that useUserContext has
  // resolved; all authenticated routes render it. Using a role-agnostic
  // selector (the nav landmark) keeps the helper neutral across personas.
  await page.waitForSelector('nav, [role="navigation"]', { timeout: 30_000 }).catch(() => {});
}

/** Thin admin wrapper so pre-10.3 specs keep compiling unchanged. */
export async function loginAsAdmin(page: Page): Promise<void> {
  return loginAsRole(page, 'admin');
}

/**
 * Fetch a Keycloak access token via the password grant for API-level
 * fixture setup (seedOrphanYear etc.). Respects per-role env overrides.
 */
export async function getRoleToken(
  request: APIRequestContext,
  role: Role,
): Promise<string> {
  const { user, pass } = CREDENTIALS[role];
  const form = new URLSearchParams({
    grant_type: 'password',
    client_id: 'schoolflow-api',
    username: user,
    password: pass,
  });
  const res = await request.post(
    'http://localhost:8080/realms/schoolflow/protocol/openid-connect/token',
    {
      data: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );
  expect(res.ok(), `Keycloak token endpoint (${role})`).toBeTruthy();
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

/** Thin admin wrapper so pre-10.3 specs keep compiling unchanged. */
export async function getAdminToken(request: APIRequestContext): Promise<string> {
  return getRoleToken(request, 'admin');
}
