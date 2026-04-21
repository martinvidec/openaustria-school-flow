/**
 * Phase 10.3 — Playwright globalTeardown.
 *
 * Reserved for future multi-role fixture cleanup (e.g. draining BullMQ
 * queues or resetting E2E-scratch rows after 10.3-02 per-role smokes).
 * Kept as an explicit no-op today so the hook is wired and documented;
 * future phases can fill it in without touching playwright.config.ts.
 */
import type { FullConfig } from '@playwright/test';

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // Intentional no-op — cleanup hook reserved for 10.3-02+.
}
