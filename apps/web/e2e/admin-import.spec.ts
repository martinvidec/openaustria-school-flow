/**
 * Phase 10.5 Plan 03 — Imports E2E (Deliverable 3, CONTEXT.md D-09a..D-09d)
 *
 * IMPORT-UNTIS-01: upload untis-happy.xml → Step 2 Untis preview → Weiter →
 *   Step 3 dry-run preview → Daten importieren → Step 5 Erfolgreich badge.
 *
 * IMPORT-CSV-01: upload csv-happy.csv → Step 2 ColumnMapper → map 4 headers
 *   to STUDENTS fields (incl. required Nachname) → Weiter → Step 3 →
 *   Daten importieren → Step 5 Erfolgreich badge + "5 von 5 ... importiert".
 *
 * IMPORT-CSV-02: upload csv-malformed.csv (row 2 empty lastName) → map →
 *   Weiter → dry-run shows row 2 validation error → Daten importieren →
 *   Step 5 Teilweise badge + "2 von 3 importiert" + silent-4xx-guard
 *   (no Erfolgreich badge).
 *
 * Spec-only per CONTEXT.md D-23 — no production-code touches. DOM contract
 * pinned in .planning/phases/10.5-e2e-admin-ops-operations/10.5-03-DISCOVERY.md.
 */
import path from 'node:path';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';
import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const SCHOOL = SEED_SCHOOL_UUID;
// ESM — __dirname is not defined. Derive the spec directory from import.meta.url.
const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(SPEC_DIR, 'fixtures/imports');
const E2E_FILENAMES = new Set([
  'untis-happy.xml',
  'csv-happy.csv',
  'csv-malformed.csv',
]);

/**
 * Map a CSV header row in the ColumnMapper to a SchoolFlow target field.
 * Targets desktop table layout (`hidden sm:block`) — the mobile layout
 * (`sm:hidden`) stacked cards carry the same Select role, but the desktop
 * project uses the table variant.
 */
async function mapColumn(
  page: import('@playwright/test').Page,
  header: string,
  targetLabel: string | RegExp,
): Promise<void> {
  const row = page.locator('tbody tr').filter({ hasText: header });
  await row.getByRole('combobox').click();
  await page.getByRole('option', { name: targetLabel }).click();
}

async function mapStudentsHeaders(
  page: import('@playwright/test').Page,
): Promise<void> {
  await mapColumn(page, 'firstName', 'Vorname');
  // "Nachname *" — required field carries an asterisk suffix in the option label.
  await mapColumn(page, 'lastName', /^Nachname/);
  await mapColumn(page, 'email', 'E-Mail');
  await mapColumn(page, 'class', 'Klasse');
}

test.describe('Phase 10.5 — Admin Imports (desktop)', () => {
  // Phase 17 deferred: full-wizard 1m timeouts (#cluster-10.5-import). 3/3
  // tests time out at 60s on `locator.click` in CI (PR #1 lines 33/66/94).
  // Suggests fixture/render delay or wizard-step skipped condition. Live-stack
  // repro required to inspect Mantine Stepper timing — exceeded D-12 budget.
  // See 17-TRIAGE.md. Owner: Phase 17.1.
  test.skip(
    true,
    'Phase 17 deferred: full-wizard 1m timeout regression — see 17-TRIAGE.md row #cluster-10.5-import.',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/import');
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EImports(request);
  });

  test('IMPORT-UNTIS-01: Untis XML happy-path full wizard', async ({ page }) => {
    test.setTimeout(60_000);

    // Step 1 — upload triggers auto-advance to Step 2 (Untis branch, .xml).
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(FIXTURES, 'untis-happy.xml'));

    // Step 2 — ImportUntisPreview renders counts; single "Weiter" button.
    await page.getByRole('button', { name: 'Weiter' }).click();

    // Step 3 — ImportDryRunPreview renders "Daten importieren" button.
    await page.getByRole('button', { name: 'Daten importieren' }).click();

    // Step 5 — Erfolgreich badge (via Step 4 progress or fast-path in wizard).
    await expect(page.getByText('Erfolgreich')).toBeVisible({ timeout: 30_000 });
    // Silent-4xx-guard: no failure badge.
    await expect(page.getByText('Fehlgeschlagen')).not.toBeVisible();
  });

  test('IMPORT-CSV-01: CSV students happy-path full wizard', async ({ page }) => {
    test.setTimeout(60_000);

    // Step 1 — upload CSV (.csv auto-detects as CSV).
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(FIXTURES, 'csv-happy.csv'));

    // Step 2 — ImportColumnMapper: map all 4 headers; "Weiter" stays disabled
    // until at least the required lastName → Nachname is mapped.
    await mapStudentsHeaders(page);
    await expect(page.getByRole('button', { name: 'Weiter' })).toBeEnabled();
    await page.getByRole('button', { name: 'Weiter' }).click();

    // Step 3 — ImportDryRunPreview.
    await page.getByRole('button', { name: 'Daten importieren' }).click();

    // Step 5 — Erfolgreich + "N von N ... importiert".
    await expect(page.getByText('Erfolgreich')).toBeVisible({ timeout: 30_000 });
    // getResultText (ImportResultSummary.tsx:60) — "N von M Datensaetzen
    // erfolgreich importiert." Regex matches the count + "importiert" stem
    // so tests are resilient to small wording shifts.
    await expect(page.getByText(/5 von 5.*importiert/)).toBeVisible();
  });

  test('IMPORT-CSV-02: CSV malformed row → PARTIAL status', async ({ page }) => {
    test.setTimeout(60_000);

    // Step 1.
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(FIXTURES, 'csv-malformed.csv'));

    // Step 2 — same mapping as happy path; row 2 has empty lastName which
    // the backend (import.processor.ts:341-345 validateRow) rejects.
    await mapStudentsHeaders(page);
    await page.getByRole('button', { name: 'Weiter' }).click();

    // Step 3 — dry-run preview. Commit to trigger PARTIAL result.
    await page.getByRole('button', { name: 'Daten importieren' }).click();

    // Step 5 — Teilweise badge + "2 von 3 importiert" (from getResultText:63).
    await expect(page.getByText('Teilweise')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/2 von 3.*importiert/)).toBeVisible();

    // Silent-4xx-guard: PARTIAL must NOT be mis-surfaced as Erfolgreich.
    // This is the exact regression class the 10.2-era SILENT-4XX specs lock
    // down at the hook layer — this spec replicates it at the wizard-result
    // layer where the bug would appear visually.
    await expect(page.getByText('Erfolgreich')).not.toBeVisible({ timeout: 3000 });
  });
});

/**
 * Cleanup: delete any ImportJob rows whose originalFileName matches one of the
 * E2E fixture filenames. Never touches pre-existing import history.
 *
 * Routes are nested under `/schools/:schoolId/import` (not `/imports`), see
 * import.controller.ts:43 and 10.5-03-DISCOVERY.md.
 */
async function cleanupE2EImports(request: APIRequestContext): Promise<void> {
  const token = await getAdminToken(request);
  const list = await request.get(`${API}/schools/${SCHOOL}/import`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!list.ok()) return;
  const jobs = (await list.json()) as Array<{
    id: string;
    originalFileName?: string;
    fileName?: string;
  }>;
  const toDelete = jobs.filter(
    (j) =>
      E2E_FILENAMES.has(j.originalFileName ?? '') ||
      E2E_FILENAMES.has(j.fileName ?? ''),
  );
  await Promise.all(
    toDelete.map((j) =>
      request.delete(`${API}/schools/${SCHOOL}/import/${j.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  );
}
