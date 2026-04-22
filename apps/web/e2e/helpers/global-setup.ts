/**
 * Phase 10.3 — Playwright globalSetup.
 *
 * Runs once before any worker spins up. Health-checks the dev stack so
 * Playwright fails fast with a clear message instead of the opaque
 * Keycloak redirect loop that happens when Vite or the API is down.
 *
 * Intentionally silent on success — CI logs stay readable.
 */
import type { FullConfig } from '@playwright/test';

async function healthCheck(url: string, label: string, timeoutMs = 5_000): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    // 401 is acceptable for authenticated roots (means server IS up, just
    // refusing anonymous access). Anything else non-2xx is a hard fail.
    if (!res.ok && res.status !== 401) {
      throw new Error(`${label} returned ${res.status}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${label} health-check failed at ${url}: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1/health';
  const webUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
  // Timefold sidecar precheck — added by Phase 10.5 Plan 04 (D-11).
  // Pinned URL: port 8081 (application.properties:6 + docker-compose.yml:86),
  // path /health (Docker healthcheck parity via HealthResource.java:12).
  // Quarkus SmallRye also serves a health endpoint but /health is the canonical
  // fingerprint the Docker healthcheck probes.
  // See 10.5-04-DISCOVERY.md for the URL pin — RESEARCH.md Pitfall 1 corrects
  // CONTEXT.md D-11 (which mis-documented the port as Keycloak's).
  // Override via E2E_SOLVER_URL env for CI / remote sidecars.
  const solverUrl = process.env.E2E_SOLVER_URL ?? 'http://localhost:8081/health';

  await Promise.all([
    healthCheck(apiUrl, 'API'),
    healthCheck(webUrl, 'Web/Vite'),
    healthCheck(solverUrl, '[E2E-PRECHECK] Timefold sidecar'),
  ]);
}
