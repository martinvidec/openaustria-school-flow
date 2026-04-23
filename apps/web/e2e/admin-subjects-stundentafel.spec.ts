/**
 * Phase 11 Plan 11-03 — Stundentafel-Vorlagen section read-only E2E.
 *
 * SUBJECT-03 canonical (D-10): /admin/subjects renders a read-only section
 * below the Subject list sourcing AUSTRIAN_STUNDENTAFELN from
 * @schoolflow/shared. Per-Schultyp Tabs; each tab body is a merged table
 * "Fach | Kürzel | Jg. 1 | Jg. 2 | Jg. 3 | Jg. 4" plus a totals footer
 * "Wochenstunden gesamt pro Jahrgang: a · b · c · d".
 *
 * This spec is pure read-only — no afterEach cleanup required because no
 * mutation occurs.
 *
 * DOM contract: verified against
 *   - apps/web/src/components/admin/subject/StundentafelVorlagenSection.tsx
 *   - packages/shared/src/stundentafel/austrian-stundentafeln.ts (2 schooltypes:
 *     AHS_UNTER + MS at the time of writing).
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';

test.describe('Phase 11 — Stundentafel-Vorlagen section (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/subjects');
  });

  test('STUNDENTAFEL-01: section renders with heading', async ({ page }) => {
    const section = page.getByTestId('stundentafel-vorlagen');
    await expect(section).toBeVisible();
    await expect(
      section.getByRole('heading', { name: 'Stundentafel-Vorlagen' }),
    ).toBeVisible();
  });

  test('STUNDENTAFEL-02: ≥2 Schultyp tabs rendered', async ({ page }) => {
    const section = page.getByTestId('stundentafel-vorlagen');
    const tabs = section.getByRole('tab');
    // AUSTRIAN_STUNDENTAFELN currently covers AHS_UNTER + MS — at least 2
    // tabs must render.
    await expect(tabs).toHaveCount(2, { timeout: 5_000 });
    // At least one tab label matches the AHS Unterstufe label (from the
    // LEGACY_SCHOOL_TYPES_LABELS lookup — shared constants/school-types.ts).
    await expect(
      section.getByRole('tab', { name: /AHS Unterstufe/ }),
    ).toBeVisible();
  });

  test('STUNDENTAFEL-03: AHS_UNTER table has Jg.1-4 columns + nonzero totals', async ({
    page,
  }) => {
    const section = page.getByTestId('stundentafel-vorlagen');
    // Activate the AHS tab explicitly (defaultValue is the first sorted
    // schoolType — "AHS_UNTER" comes first alphabetically so this is a
    // no-op, but we make it explicit to avoid depending on sort order).
    await section.getByRole('tab', { name: /AHS Unterstufe/ }).click();

    // Column headers "Fach | Kürzel | Jg. 1 | Jg. 2 | Jg. 3 | Jg. 4" —
    // StundentafelVorlagenSection.tsx:95-100.
    for (const header of ['Fach', 'Kürzel', 'Jg. 1', 'Jg. 2', 'Jg. 3', 'Jg. 4']) {
      await expect(
        section.getByRole('columnheader', { name: header }),
      ).toBeVisible();
    }

    // Totals footer — "Wochenstunden gesamt pro Jahrgang: a · b · c · d"
    // with non-zero totals (line 126). Both desktop and mobile variants
    // render the same text; use .first() to pick the desktop one
    // (StundentafelVorlagenSection.tsx:126-128).
    const totalsFooter = section
      .getByText(/Wochenstunden gesamt pro Jahrgang:/)
      .first();
    await expect(totalsFooter).toBeVisible();
    // Extract the numbers after the colon — they MUST contain at least
    // one digit 1-9 (no Schultyp ships a row of all zeros).
    const txt = (await totalsFooter.textContent()) ?? '';
    expect(txt, 'totals contain at least one nonzero digit').toMatch(/[1-9]/);
  });

  test('STUNDENTAFEL-04: section is read-only (no mutation affordances)', async ({
    page,
  }) => {
    const section = page.getByTestId('stundentafel-vorlagen');
    await expect(section).toBeVisible();

    // The ONLY interactive affordances inside the section should be the
    // Tabs triggers themselves (role="tab"). Specifically:
    //   - No <input> elements (read-only, not an edit form)
    //   - No action buttons (the "Zur Klassenverwaltung →" arrow is a
    //     disabled <span>, not a button — line 130).
    await expect(section.locator('input')).toHaveCount(0);
    // No buttons inside the section. Tab triggers use role="tab" not role="button"
    // in Radix Tabs implementation, so counting role="button" should be 0.
    await expect(section.getByRole('button')).toHaveCount(0);
  });
});
