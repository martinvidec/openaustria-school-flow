/**
 * AUDIT-VIEW-03 — `/admin/audit-log` CSV-Export contract.
 *
 * Phase 15 Plan 15-11 Task 4.
 *
 * Asserts the programmatically-verifiable parts of the export contract that
 * plan 15-02 ships server-side and plan 15-09 wires up via
 * `useAuditCsvExport`:
 *   - `page.waitForEvent('download')` fires when the admin clicks
 *     `CSV exportieren`.
 *   - `download.suggestedFilename()` matches `^audit-log-YYYY-MM-DD\.csv$`
 *     (server-generated UTC date; no user-controlled segments per
 *     T-15-02-05).
 *   - First 3 bytes of the saved file are the UTF-8 BOM (0xEF 0xBB 0xBF).
 *     This is the DACH/Excel auto-detection signal (D-25 / 15-02 contract).
 *   - The first line after the BOM uses semicolon (`;`) as field separator.
 *     Comma-separated would break Excel's German-locale auto-import.
 *
 * Manual verification deferred to UAT (UI-SPEC § Manual-Only Verifications):
 *   - Open the downloaded CSV in Excel/LibreOffice with German locale and
 *     confirm columns auto-split (no Import-Wizard prompt).
 *
 * Pattern reference: this is the first Playwright download spec in the
 * repo, so the pattern is documented in-line — read with `download.path()`
 * + `fs.readFileSync` to inspect the raw byte stream.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loginAsAdmin } from './helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('AUDIT-VIEW-03 — CSV-Export contract', () => {
  test('download triggers + filename + UTF-8 BOM + semicolon delimiter', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/audit-log');

    // Wait for the toolbar to hydrate.
    await expect(
      page.getByRole('button', { name: 'CSV exportieren' }),
    ).toBeVisible({ timeout: 10_000 });

    // Set up the download listener BEFORE the click — Playwright records
    // the event from the moment waitForEvent is called.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV exportieren' }).click();
    const download = await downloadPromise;

    // Filename pattern: server-generated `audit-log-YYYY-MM-DD.csv` per
    // audit.controller.ts line 79 (Date.toISOString().slice(0,10)).
    expect(download.suggestedFilename()).toMatch(
      /^audit-log-\d{4}-\d{2}-\d{2}\.csv$/,
    );

    // download.path() returns the temp file Playwright wrote during the
    // download lifecycle. Null only if the browser blocked the save —
    // shouldn't happen in our headless config but assert anyway.
    const path = await download.path();
    expect(path, 'download.path() — Playwright should save the blob').not.toBeNull();
    const buf = readFileSync(path!);

    // UTF-8 BOM: 0xEF 0xBB 0xBF (D-25 / plan 15-02 contract).
    expect(buf.length).toBeGreaterThanOrEqual(3);
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);

    // Decode UTF-8 and strip the BOM (some Node setTimeout configurations
    // surface the BOM as the U+FEFF char; normalize before line-splitting).
    const text = buf.toString('utf-8').replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0];

    // Semicolon delimiter (DACH/Excel default — D-25). Comma would break
    // Excel's German-locale auto-import.
    expect(firstLine).toContain(';');
    expect(firstLine).not.toMatch(/^[^;]+,[^;]+,/); // no comma-separated header

    // The header row mentions at least one expected column. plan 15-02
    // ships German headers (Zeitpunkt, Aktion, Ressource, ...) but the
    // contract permits column renames at the executor's discretion, so
    // assert flexibly.
    expect(firstLine.toLowerCase()).toMatch(
      /aktion|action|ressource|resource|zeitpunkt|created|userid|benutzer/,
    );
  });
});
