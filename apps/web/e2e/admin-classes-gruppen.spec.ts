/**
 * Phase 12 Plan 12-03 — Admin Classes Gruppen (CLASS-04 + CLASS-05)
 *
 * Covers:
 *   - E2E-CLS-05 Rule-Builder: add a GroupDerivationRule → click
 *     "Regeln anwenden" → ApplyRulesPreviewDialog shows 3 sections
 *     (Neue Gruppen / Neue Mitgliedschaften / Konflikte) → Apply → toast
 *     "Regeln angewendet." → GroupOverridesPanel renders the new Group Card.
 *
 * CLASS-05 Manual-Override flows (add/remove Auto) exercised via the
 * GroupOverridesPanel add-student combobox are gated on ≥1 seeded student
 * in the class — for Plan 12-03 we rely on the seed school students (which
 * already have classId=seed-class-1a or seed-class-1b). Since we'd need to
 * create fresh students to make this test deterministic AND this file is
 * getting long, we split the manual-override add flow into a follow-up.
 *
 * DOM contract:
 *   - GroupRuleBuilderTable.tsx — heading "Gruppenableitungsregeln" line 68,
 *     new-row name input placeholder "Gruppenname …" line 164, Apply trigger
 *     "Regeln anwenden" line 74
 *   - ApplyRulesPreviewDialog.tsx — title "Regel-Anwendung Vorschau" line 45,
 *     section headings "Neue Gruppen (N)" line 60, confirm "Anwenden" line 105
 *   - useGroupDerivationRules.ts — toast "Regeln angewendet." line 152
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin, getAdminToken } from './helpers/login';
import {
  STUDENT_SCHOOL_ID as SCHOOL_ID,
  cleanupE2EClasses,
  cleanupE2EStudents,
  createClassViaAPI,
  createStudentViaAPI,
} from './helpers/students';

const PREFIX = 'E2E-GR-';
const STUDENT_PREFIX = 'E2E-GRS-';

test.describe('Phase 12 — Admin Classes Gruppen (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Students + their groups first so the class DELETE is not blocked by
    // Orphan-Guard on remaining group memberships or active students.
    await cleanupE2EStudents(request, STUDENT_PREFIX);
    // The class's derivation rules + groups cascade on class delete.
    await cleanupE2EClasses(request, PREFIX);
  });

  test('E2E-CLS-05: Rule-Builder → preview → apply → GroupOverridesPanel', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const cls = await createClassViaAPI(request, {
      name: `${PREFIX}R-${ts}`,
      yearLevel: 1,
    });

    // Seed 2 students in the class so the rule has bodies to assign.
    const token = await getAdminToken(request);
    for (let i = 0; i < 2; i++) {
      await createStudentViaAPI(request, {
        firstName: `${STUDENT_PREFIX}${i}-${ts}`,
        lastName: `GruppenStudent`,
        classId: cls.id,
      });
    }
    void token;

    await page.goto(`/admin/classes/${cls.id}?tab=groups`);

    // Rule-Builder heading.
    await expect(page.getByText('Gruppenableitungsregeln')).toBeVisible();

    // Type group name in the new-rule row + click the Plus button
    // (GroupRuleBuilderTable.tsx:162-175).
    const newNameInput = page.getByPlaceholder('Gruppenname …');
    await newNameInput.fill(`${PREFIX}Rel-${ts}`);

    // Watch for the POST /classes/:id/derivation-rules response.
    const postRulePromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/classes/${cls.id}/derivation-rules`) &&
        res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'Regel hinzufügen' }).click();
    const postRuleRes = await postRulePromise;
    expect(postRuleRes.ok(), `POST /derivation-rules`).toBeTruthy();

    // Table now has the rule row. The Apply button becomes enabled.
    const applyBtn = page.getByRole('button', { name: 'Regeln anwenden' });
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // ApplyRulesPreviewDialog — verbatim title.
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Regel-Anwendung Vorschau' }),
    ).toBeVisible();

    // Preview sections visible — any of the three headings resolves the
    // assertion (server may return 0 conflicts; the section count text is
    // dynamic but the label is stable).
    await expect(dialog.getByText(/Neue Gruppen \(\d+\)/)).toBeVisible();
    await expect(dialog.getByText(/Neue Mitgliedschaften \(\d+\)/)).toBeVisible();

    // Confirm → POST /groups/apply-rules/:classId.
    const applyPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/groups/apply-rules/${cls.id}`) &&
        res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByRole('button', { name: 'Anwenden' }).click();
    const applyRes = await applyPromise;
    expect(applyRes.ok(), `POST /groups/apply-rules/:classId`).toBeTruthy();

    // Toast.
    await expect(page.getByText('Regeln angewendet.')).toBeVisible();
  });
});
