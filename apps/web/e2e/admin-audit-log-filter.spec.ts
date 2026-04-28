/**
 * AUDIT-VIEW-01 — `/admin/audit-log` filter toolbar URL deep-link contract.
 *
 * Phase 15 Plan 15-11 Task 2.
 *
 * Asserts that the 6-field filter toolbar shipped by 15-09 round-trips
 * through TanStack Router's search params:
 *   - Setting a field via the toolbar updates the URL.
 *   - Visible row[data-audit-action] values stay consistent with the filter.
 *   - "Filter zurücksetzen" clears every search-param except `page`.
 *
 * Selectors come from plan 15-09's `AuditTable.tsx` (data-audit-id /
 * data-audit-action) and `AuditFilterToolbar.tsx` (German labels via Label).
 *
 * Workers=1 — `playwright.config.ts` doesn't pin a workers count, but
 * `test.describe.configure({ mode: 'serial' })` keeps the three tests in
 * this file from racing each other when the runner picks workers > 1.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('AUDIT-VIEW-01 — Audit-Log filter toolbar URL deep-link', () => {
  test('filter by Aktion=update updates URL and visible rows', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/audit-log');

    // Wait for table or empty-state to render so we know the page hydrated.
    await expect(
      page.getByRole('button', { name: 'Filter zurücksetzen' }),
    ).toBeVisible({ timeout: 10_000 });

    // Open the Aktion Select (Radix pattern — labelled trigger).
    await page.getByLabel('Aktion').click();
    await page.getByRole('option', { name: 'Aktualisieren' }).click();

    // URL is the source of truth (D-26 carry-forward).
    await expect(page).toHaveURL(/[?&]action=update/);

    // After filtering: every visible row carries data-audit-action="update",
    // OR the empty-state "Keine Audit-Einträge gefunden" appears.
    const rows = page.locator('[data-audit-id]');
    // Allow the table to settle before counting.
    await page.waitForLoadState('networkidle').catch(() => {});
    const count = await rows.count();
    if (count > 0) {
      const actions = await rows.evaluateAll((els) =>
        (els as HTMLElement[]).map((e) =>
          e.getAttribute('data-audit-action'),
        ),
      );
      expect(actions.every((a) => a === 'update')).toBe(true);
    } else {
      await expect(
        page.getByText(/Keine Audit-Einträge gefunden|Audit-Log noch leer/),
      ).toBeVisible();
    }
  });

  test('Von+Bis date filter persists in URL', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/audit-log');

    await expect(page.getByLabel('Von')).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Von').fill('2026-01-01');
    await expect(page).toHaveURL(/[?&]startDate=2026-01-01/);

    await page.getByLabel('Bis').fill('2026-12-31');
    await expect(page).toHaveURL(/[?&]endDate=2026-12-31/);
    await expect(page).toHaveURL(/[?&]startDate=2026-01-01/);
  });

  test('Filter zurücksetzen clears all 6 filter params', async ({ page }) => {
    await loginAsAdmin(page);
    // Pre-load every URL-syncable filter so the reset has something to clear.
    // userId is a plain max(64) string post-15-09 (see audit-log.tsx line 26),
    // so a non-UUID value is permitted.
    await page.goto(
      '/admin/audit-log?action=update&startDate=2026-01-01&endDate=2026-12-31&resource=consent&category=MUTATION&userId=test-user-id',
    );

    const reset = page.getByRole('button', { name: 'Filter zurücksetzen' });
    await expect(reset).toBeVisible({ timeout: 10_000 });
    await reset.click();

    // Wait for the navigation to settle.
    await expect(page).toHaveURL(/\/admin\/audit-log/);

    const url = new URL(page.url());
    expect(url.searchParams.has('action')).toBe(false);
    expect(url.searchParams.has('startDate')).toBe(false);
    expect(url.searchParams.has('endDate')).toBe(false);
    expect(url.searchParams.has('resource')).toBe(false);
    expect(url.searchParams.has('category')).toBe(false);
    expect(url.searchParams.has('userId')).toBe(false);
  });
});
