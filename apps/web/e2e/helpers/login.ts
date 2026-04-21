/**
 * Phase 10.2 — shared Playwright login helpers.
 *
 * Extracted from admin-school-settings.spec.ts so future specs
 * (zeitraster, schuljahre, optionen, …) can re-use the Keycloak
 * redirect dance and direct-access-grant token flow without duplicating
 * ~40 lines of auth boilerplate per file.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin-user';
export const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'admin123';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin/school/settings');
  // The SPA auth gate calls keycloak.login() which redirects to
  // http://localhost:8080/realms/schoolflow/protocol/openid-connect/auth?...
  // Wait for that redirect to complete, then fill the Keycloak login form.
  await page
    .waitForURL(/realms\/schoolflow\/protocol\/openid-connect\/auth/, {
      timeout: 15_000,
    })
    .catch(() => {});

  const userField = page.locator('input[name="username"]').first();
  if (await userField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await userField.fill(ADMIN_USER);
    await page.locator('input[name="password"]').first().fill(ADMIN_PASS);
    await page
      .locator('input[type="submit"], button[type="submit"], button[name="login"]')
      .first()
      .click();
  }

  // After Keycloak returns us to the SPA, the authenticated layout may show a
  // spinner until useUserContext hydrates. Wait for the sidebar to render,
  // then navigate explicitly to the settings route (the redirect sometimes
  // drops us on '/' instead of the originally-requested href). Finally, click
  // the Schulverwaltung sidebar link as a deterministic path to the page.
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  // Sidebar is the first reliable signal that the authenticated layout is up.
  await page
    .waitForSelector('a[href="/admin/school/settings"]', { timeout: 30_000 })
    .catch(() => {});
  if (!page.url().includes('/admin/school/settings')) {
    await page.getByRole('link', { name: 'Schulverwaltung' }).click();
  }
  // Wait until the tab shell has fully hydrated — schoolContext isLoaded
  // + TabsList rendered.
  await page
    .waitForSelector('[role="tablist"]', { timeout: 30_000 })
    .catch(() => {});
}

export async function getAdminToken(request: APIRequestContext): Promise<string> {
  const form = new URLSearchParams({
    grant_type: 'password',
    client_id: 'schoolflow-api',
    username: ADMIN_USER,
    password: ADMIN_PASS,
  });
  const res = await request.post(
    'http://localhost:8080/realms/schoolflow/protocol/openid-connect/token',
    {
      data: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );
  expect(res.ok(), 'Keycloak token endpoint').toBeTruthy();
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}
