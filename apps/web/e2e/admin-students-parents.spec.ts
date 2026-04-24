/**
 * Phase 12 Plan 12-03 — Admin Students Parent Link (STUDENT-04)
 *
 * Covers STUDENT-04 Parent-Link 3 flows:
 *   - E2E-STD-04-SEARCH:   search existing Parent by email → select → link
 *   - E2E-STD-04-CREATE:   type unknown email → CommandEmpty with inline-create
 *                          CTA → create Parent + link atomically
 *   - E2E-STD-04-UNLINK:   remove link → Parent record preserved in API
 *
 * DOM contract:
 *   - ParentSearchPopover.tsx — CTA "Erziehungsberechtigte:n verknüpfen" line 56,
 *     CommandEmpty text "Keine Treffer. Neu:e Erziehungsberechtigte:n anlegen?" line 96,
 *     inline-create button "Neu anlegen" line 104
 *   - InlineCreateParentForm.tsx — labels Vorname/Nachname/E-Mail/Telefon,
 *     submit "Anlegen & verknüpfen"
 *   - StudentParentsTab.tsx — WarnDialog title "Verknüpfung entfernen?" line 77,
 *     destructive button "Entfernen" line 86
 *   - useParents.ts — toast "Verknüpfung angelegt." line 155,
 *     "Verknüpfung entfernt." line 177
 */
import { expect, test } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  STUDENT_SCHOOL_ID as SCHOOL_ID,
  cleanupE2EStudents,
  cleanupE2EParents,
  createStudentViaAPI,
} from './helpers/students';
import { seedExistingParent } from './fixtures/parent-existing';

const PREFIX = 'E2E-STD-PARENT-';

test.describe('Phase 12 — Admin Students Parent Link (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EStudents(request, PREFIX);
    // Sweep both parent prefixes — seedExistingParent uses E2E-PARENT-EXISTING
    // and InlineCreateParentForm writes whatever the user entered.
    await cleanupE2EParents(request, 'E2E-PARENT-EXISTING');
    await cleanupE2EParents(request, PREFIX);
  });

  test('E2E-STD-04-SEARCH: search existing parent by email → link appears', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}search-${Date.now()}`;
    const parent = await seedExistingParent(request, SCHOOL_ID);
    const student = await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'ParentSearch',
    });

    await page.goto(`/admin/students/${student.id}?tab=parents`);

    // Open ParentSearchPopover (CTA is always visible on the tab).
    await page
      .getByRole('button', { name: /Erziehungsberechtigte:n verknüpfen/ })
      .click();

    // CommandInput focused; type the seeded parent's email.
    await page.getByRole('combobox', { name: 'E-Mail-Suche' }).fill(parent.email);

    // Wait for the debounced (300ms) query + fetch to settle.
    // Parent hit renders as a CommandItem showing firstName / lastName / email.
    const hit = page.getByRole('option', { name: new RegExp(parent.email) });
    await expect(hit).toBeVisible({ timeout: 10_000 });

    await hit.click();

    // Verknüpfung angelegt toast.
    await expect(page.getByText('Verknüpfung angelegt.')).toBeVisible();

    // Row appears in the Parents-Tab list.
    const linkRow = page.locator(`[data-testid="parent-link-${parent.parentId}"]`);
    await expect(linkRow).toBeVisible();
    await expect(linkRow).toContainText(parent.email);
  });

  test('E2E-STD-04-CREATE: unknown email → inline-create Parent + link atomically', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}create-${Date.now()}`;
    const student = await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'ParentCreate',
    });

    await page.goto(`/admin/students/${student.id}?tab=parents`);

    await page
      .getByRole('button', { name: /Erziehungsberechtigte:n verknüpfen/ })
      .click();

    // Type an email that we know doesn't exist.
    const unknownEmail = `e2e-unknown-${Date.now()}@example.test`;
    await page.getByRole('combobox', { name: 'E-Mail-Suche' }).fill(unknownEmail);

    // CommandEmpty shows the verbatim hint (ParentSearchPopover.tsx:96).
    await expect(
      page.getByText('Keine Treffer. Neu:e Erziehungsberechtigte:n anlegen?'),
    ).toBeVisible({ timeout: 10_000 });

    // Click the inline-create CTA.
    await page.getByRole('button', { name: 'Neu anlegen' }).click();

    // InlineCreateParentForm renders — fill and submit. The form pre-fills
    // email from the search query (InlineCreateParentForm.tsx:29).
    const form = page.locator('form[aria-label="Erziehungsberechtigte:n anlegen"]');
    await expect(form).toBeVisible();
    await form.getByLabel('Vorname').fill(`${PREFIX}V-${Date.now()}`);
    await form.getByLabel('Nachname').fill('NeuAngelegt');
    // Email already pre-filled — assert and continue.
    await expect(form.getByLabel('E-Mail')).toHaveValue(unknownEmail);

    await form.getByRole('button', { name: 'Anlegen & verknüpfen' }).click();

    // Hook emits TWO toasts: "Erziehungsberechtigte:r angelegt." + "Verknüpfung angelegt."
    // Any of them is acceptable proof — use the link toast as the primary gate.
    await expect(page.getByText('Verknüpfung angelegt.')).toBeVisible();

    // Parent appears in the Parents-Tab list (match by email).
    const newLink = page.locator('[data-testid^="parent-link-"]').filter({
      hasText: unknownEmail,
    });
    await expect(newLink).toBeVisible();
  });

  test('E2E-STD-04-UNLINK: remove link → parent preserved in API (GET still returns parent)', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}unlink-${Date.now()}`;
    const parent = await seedExistingParent(request, SCHOOL_ID);
    const student = await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'ParentUnlink',
    });

    // Link via API so we start in the linked state.
    const token = await getAdminToken(request);
    const linkRes = await request.post(
      `http://localhost:3000/api/v1/students/${student.id}/parents`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { parentId: parent.parentId },
      },
    );
    expect(linkRes.ok(), `POST /students/:id/parents`).toBeTruthy();

    await page.goto(`/admin/students/${student.id}?tab=parents`);

    const linkRow = page.locator(`[data-testid="parent-link-${parent.parentId}"]`);
    await expect(linkRow).toBeVisible();

    // Click the Unlink icon — aria-label includes the parent's name
    // (StudentParentsTab.tsx:61).
    await linkRow
      .getByRole('button', { name: /Verknüpfung zu .+ entfernen/ })
      .click();

    // WarnDialog — verbatim title.
    await expect(page.getByText('Verknüpfung entfernen?')).toBeVisible();
    await page.getByRole('button', { name: 'Entfernen' }).last().click();

    // Toast.
    await expect(page.getByText('Verknüpfung entfernt.')).toBeVisible();

    // Row disappears from the list.
    await expect(
      page.locator(`[data-testid="parent-link-${parent.parentId}"]`),
    ).toHaveCount(0, { timeout: 5_000 });

    // Parent preservation — API GET /parents?email=<seededEmail> still returns
    // the row. The unlink does NOT cascade-delete the Parent itself.
    const apiRes = await request.get(
      `http://localhost:3000/api/v1/parents?schoolId=${encodeURIComponent(SCHOOL_ID)}&email=${encodeURIComponent(parent.email)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(apiRes.ok(), `GET /parents?email=<seeded>`).toBeTruthy();
    const body = (await apiRes.json()) as {
      data?: Array<{ id: string }>;
    };
    const ids = (body.data ?? []).map((p) => p.id);
    expect(ids, `seeded parent preserved after unlink`).toContain(parent.parentId);
  });
});
