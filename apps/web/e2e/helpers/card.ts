/**
 * Phase 10.4 harness hardening — getByCardTitle helper.
 *
 * Why this helper exists:
 *   shadcn's CardTitle component (apps/web/src/components/ui/card.tsx:32-45)
 *   renders as a plain <div> with the class bundle
 *   `text-2xl font-semibold leading-none tracking-tight`, NOT as an <h1>/
 *   <h2>/<h3>. Playwright's `getByRole('heading', { name })` therefore never
 *   matches CardTitle text — a trap the repo has stepped into twice (10.2-03
 *   era + 10.3-02 Task 1 Rule-1 auto-fix).
 *
 * This helper codifies the `getByText`-with-class-scope workaround in one
 * place so future specs don't re-litigate it.
 *
 * ADR (Phase 10.4-01): chose helper (Option 4a) over h3 promotion
 * (Option 4b) because:
 *   - Non-invasive: no production-code change, no CardTitle audit needed.
 *   - Low diff: ~15 LoC helper vs. 30-usage visual regression sweep.
 *   - Matches 10.3-02 precedent: the existing `getByText` workaround becomes
 *     a reusable, self-documenting helper.
 *
 * Usage:
 *   import { getByCardTitle } from './helpers/card';
 *
 *   // Page-scoped
 *   await expect(getByCardTitle(page, 'Kein Stundenplan vorhanden')).toBeVisible();
 *
 *   // Scoped under an ancestor locator
 *   const card = page.locator('.rounded-lg.border.bg-card').first();
 *   await expect(getByCardTitle(card, /Schuljahr/)).toBeVisible();
 */
import type { Locator, Page } from '@playwright/test';

/**
 * Locate a shadcn CardTitle element by its visible text.
 *
 * Targets the stable Tailwind class bundle on CardTitle:
 *   `.text-2xl.font-semibold.leading-none.tracking-tight`
 * VERIFIED against apps/web/src/components/ui/card.tsx (2026-04-22).
 *
 * @param scope - Page or Locator to scope the search under
 * @param name  - Exact string or RegExp to match the title's visible text
 * @returns     - Playwright Locator matching the CardTitle div (may be strict-mode
 *                checked like any other Playwright locator)
 */
export function getByCardTitle(scope: Page | Locator, name: string | RegExp): Locator {
  return scope.locator('.text-2xl.font-semibold.leading-none.tracking-tight', {
    hasText: name,
  });
}
