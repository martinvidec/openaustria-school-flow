/**
 * Phase 11 Plan 11-03 — Admin Subjects CRUD (desktop error paths)
 *
 * Covers SUBJECT-CRUD-04 (Orphan-Guard 409 = canonical SUBJECT-05) +
 * SUBJECT-CRUD-05 (Kürzel uniqueness, implementation constraint).
 *
 * SUBJECT-CRUD-04: uses fixtures/subject-with-refs.ts to create a Subject
 *   attached to a SchoolClass via ClassSubject. Delete flow then 409s and
 *   DeleteSubjectDialog transitions to blocked state with AffectedEntitiesList
 *   rendering affectedClasses / affectedTeachers / scalar counts. Silent-4xx
 *   invariant asserts no green toast fires on 409.
 *
 * SUBJECT-CRUD-05: API-seeds a Subject with Kürzel "DUP", then the UI tries
 *   to create a second Subject with the same Kürzel. The hook's onError
 *   suppresses the toast for 409 (useSubjects.ts:163-167) so the dialog
 *   stays open with the inline error "Dieses Kürzel ist bereits vergeben."
 *
 * DOM contract verified against the Plan 11-02 components; testids on
 *   SubjectFormDialog (subject-name-input, subject-shortname-input,
 *   subject-shortname-error, subject-submit).
 *
 * Prefix isolation: `E2E-SUB-ERR-*`, cleaned up via afterEach. Fixture-
 * created rows also get their own `E2E-SUB-WITH-REFS-*` prefix swept.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  SUBJECT_SCHOOL_ID as SCHOOL_ID,
  cleanupE2ESubjects,
  createSubjectViaAPI,
} from './helpers/subjects';
import { seedSubjectWithClassRef } from './fixtures/subject-with-refs';

const PREFIX = 'E2E-SUB-ERR-';

test.describe('Phase 11 — Admin Subjects CRUD error paths (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Sweep both our test-specific prefix AND the fixture's `E2E-SUB-WITH-REFS-`
    // prefix in case SUBJECT-CRUD-04's fixture cleanup failed silently (e.g.
    // if the test bailed before reaching the finally block).
    await cleanupE2ESubjects(request, PREFIX);
    await cleanupE2ESubjects(request, 'E2E-SUB-WITH-REFS-');
  });

  test('SUBJECT-CRUD-04: Orphan-Guard 409 — ClassSubject blocks delete (SUBJECT-05)', async ({
    page,
    request,
  }) => {
    const fixture = await seedSubjectWithClassRef(request, SCHOOL_ID);

    try {
      await page.goto('/admin/subjects');

      // Row dropdown → Löschen. (Plan 11-03 Rule-1 removed the tr row-click
      // handler so there is no more edit/delete dialog race on this path.)
      // `:visible` filters to the active layout variant (#13).
      const fixtureShort = `EWR${Number(fixture.subjectName.split('-').pop()) % 100000}`;
      const row = page.locator(`[data-testid="subject-row-${fixtureShort}"]:visible`);
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: 'Aktionen' }).click();
      await page.getByRole('menuitem', { name: 'Löschen' }).click();

      // DeleteSubjectDialog opens in happy state → click destructive Löschen.
      // Server returns 409 with extensions.affectedEntities → dialog
      // transitions to blocked-state (red AlertTriangle + AffectedEntitiesList).
      await page.getByTestId('subject-delete-confirm').click();

      // Blocked-state title — verbatim from DeleteSubjectDialog.tsx:88.
      // Text also appears in the red toast, so `.first()` resolves the
      // strict-mode ambiguity.
      await expect(
        page.getByText('Fach kann nicht gelöscht werden').first(),
      ).toBeVisible();

      // AffectedEntitiesList (kind="subject") renders a
      // "Klassen-Fach-Zuordnungen (N)" section when affectedClasses.length > 0
      // (AffectedEntitiesList.tsx:156).
      await expect(
        page.getByText(/Klassen-Fach-Zuordnungen/),
      ).toBeVisible();

      // Blocked-state footer has a single Schließen button
      // (DeleteSubjectDialog.tsx:115).
      await expect(
        page.getByRole('button', { name: 'Schließen' }),
      ).toBeVisible();

      // CRITICAL silent-4xx invariant — the green "Fach gelöscht." toast
      // MUST NEVER fire on a 409. (useSubjects.ts:228-232 explicitly
      // swallows the 409 to avoid double-reporting.)
      await expect(
        page.getByText('Fach gelöscht.'),
      ).not.toBeVisible({ timeout: 3_000 });

      // Close before afterEach so the modal doesn't linger.
      await page.getByRole('button', { name: 'Schließen' }).click();
    } finally {
      // Always clean up (fixture.cleanup removes ClassSubject first, then
      // the Subject row — order matters to avoid 409 recursion on teardown).
      await fixture.cleanup();
    }
  });

  test('SUBJECT-CRUD-05: duplicate Kürzel on create → inline error + no toast', async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    // Short but unique inside this spec run.
    const dupeShort = `DUP${ts % 100}`;

    // Seed a subject with the Kürzel we're about to duplicate via UI.
    await createSubjectViaAPI(request, {
      name: `${PREFIX}seed-${ts}`,
      shortName: dupeShort,
    });

    await page.goto('/admin/subjects');

    await page
      .getByRole('button', { name: /Fach anlegen/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Fach anlegen' }),
    ).toBeVisible();

    const name2 = `${PREFIX}dupe-${ts}`;
    await page.getByTestId('subject-name-input').fill(name2);
    const shortInput = page.getByTestId('subject-shortname-input');
    await shortInput.fill(dupeShort);
    await shortInput.blur();

    await page.getByTestId('subject-submit').click();

    // Inline 409 error — SubjectFormDialog.tsx:113 calls
    // setShortNameServerError on 409 and renders it at
    // data-testid="subject-shortname-error" (line 181).
    await expect(page.getByTestId('subject-shortname-error')).toBeVisible();
    await expect(
      page.getByText('Dieses Kürzel ist bereits vergeben.'),
    ).toBeVisible();

    // Dialog STAYS open — the green toast MUST NEVER fire on 409
    // (useSubjects.ts:163-167 explicitly swallows the toast).
    await expect(
      page.getByRole('heading', { name: 'Fach anlegen' }),
    ).toBeVisible();
    await expect(page.getByText('Fach angelegt.')).not.toBeVisible({
      timeout: 2_000,
    });

    // Close the dialog so afterEach is clean.
    await page.getByRole('button', { name: 'Abbrechen' }).click();
  });
});
