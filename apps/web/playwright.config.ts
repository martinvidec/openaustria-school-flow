import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 10 Playwright config.
 *
 * Prerequisites for `pnpm exec playwright test`:
 *   - docker compose up -d postgres redis keycloak
 *   - pnpm --filter @schoolflow/api dev
 *   - pnpm --filter @schoolflow/web dev   # serves on localhost:5173
 *   - seed admin + sample school (prisma:seed)
 *
 * The `fixtures/orphan-year.ts` helper connects directly to the dev DB via
 * Prisma, so `DATABASE_URL` must be set in the Playwright runner env (easiest:
 * source it from apps/api/.env).
 *
 * 10.3-01: globalSetup health-checks API + Vite (fail fast with a readable
 * message instead of a Keycloak redirect loop). globalTeardown is reserved
 * for future multi-role fixture cleanup. Trace retains on failure;
 * screenshots are captured only on failure so CI artifacts stay lean.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/helpers/global-setup.ts',
  globalTeardown: './e2e/helpers/global-teardown.ts',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testMatch: /.*\.spec\.ts$/,
      testIgnore: /.*\.mobile\.spec\.ts$/,
    },
    {
      name: 'mobile-375',
      use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } },
      testMatch: /.*\.mobile\.spec\.ts$/,
    },
  ],
});
