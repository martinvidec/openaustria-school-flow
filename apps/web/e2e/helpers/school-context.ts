/**
 * Issue #137 — Browser-side helper for the throwaway-school pilot.
 *
 * Sets `useSchoolContext.currentSchoolId` from a Playwright spec by reaching
 * into `window.__schoolContextStore` (exposed in dev/test bundles only —
 * see `apps/web/src/stores/school-context-store.ts`).
 *
 * Why needed: with #133 (composite unique) + #135 (X-School-Id interceptor)
 * + #136 (throwaway fixture) in place, the only remaining gap for a UI spec
 * driving the throwaway school is making `apiFetch` send `X-School-Id: <throwaway>`.
 * `apiFetch` reads from the Zustand store; calling `setCurrentSchool` on the
 * store updates every subsequent request without touching production code
 * paths.
 *
 * Call this AFTER `loginAsRole` (so `/users/me` has populated the store
 * with the user's `availableSchools`) and BEFORE the first assertion that
 * depends on throwaway-scoped data.
 */
import type { BrowserContext, Page } from '@playwright/test';

interface SchoolContextStoreWindow {
  __schoolContextStore?: {
    getState: () => { setCurrentSchool: (id: string) => void };
  };
}

/**
 * Set `X-School-Id` on every `/api/**` request the browser context makes,
 * INCLUDING the initial `/users/me` that hydrates `useSchoolContext`.
 *
 * Uses `context.route` (not `setExtraHTTPHeaders`) so the header is added
 * ONLY to backend API calls — Keycloak's login redirects and CORS preflight
 * stay untouched. Adding `X-School-Id` to KC POSTs trips its CORS allowlist
 * and aborts the login flow with a closed-page error.
 *
 * The backend `CurrentSchoolInterceptor` reads the header, validates it
 * against the user's Person memberships, and returns the requested school
 * as `schoolId` from `/users/me`. The frontend store then persists that as
 * `currentSchoolId`, so subsequent `apiFetch` calls also send the same
 * header — without any in-page Zustand manipulation.
 *
 * Survives `page.goto` and `page.reload` because the route handler lives
 * on the BrowserContext, not in the page's JS heap.
 *
 * Call BEFORE the first `loginAsRole` / `page.goto` of the test.
 */
export async function useThrowawaySchoolHeader(
  context: BrowserContext,
  schoolId: string,
): Promise<void> {
  await context.route('**/api/**', async (route) => {
    const headers = { ...route.request().headers(), 'x-school-id': schoolId };
    await route.continue({ headers });
  });
}

/**
 * In-page Zustand setter — for the rare case a spec needs to switch
 * school context AFTER initial hydration (e.g., proving a hypothetical
 * Schools-Switch UI works). For initial throwaway binding, prefer
 * `useThrowawaySchoolHeader` which doesn't lose its setting across
 * `page.goto` / `page.reload`.
 */
export async function setCurrentSchoolInBrowser(
  page: Page,
  schoolId: string,
): Promise<void> {
  await page.evaluate((id) => {
    const w = window as unknown as SchoolContextStoreWindow;
    if (!w.__schoolContextStore) {
      throw new Error(
        '__schoolContextStore not exposed on window — dev/test bundle expected (apps/web/src/stores/school-context-store.ts)',
      );
    }
    w.__schoolContextStore.getState().setCurrentSchool(id);
  }, schoolId);
}
