/**
 * Phase 12 Plan 12-03 — Admin Students Move (STUDENT-03 D-05)
 *
 * Covers single-row + bulk class-move flows:
 *   - E2E-STD-05-SINGLE: row-action "In andere Klasse verschieben" → dialog →
 *                        select target class → Confirm → toast + row moves.
 *   - E2E-STD-05-BULK:   check multiple rows → floating bulk toolbar
 *                        "Ausgewählte verschieben" → dialog with avatar-stack →
 *                        Confirm → progress toast → bulk success toast.
 *
 * DOM contract:
 *   - MoveStudentDialog.tsx — title pattern "Schüler:in(nen) in andere Klasse verschieben",
 *     Ziel-Klasse select, avatar-stack testid `avatar-stack`, progress
 *     "{done}/{total} verschoben …"
 *   - students.index.tsx — bulk toolbar testid `bulk-toolbar`, button
 *     "Ausgewählte verschieben" (line 218)
 *   - useStudents.ts — single toast "Schüler:in verschoben." line 323,
 *     bulk toast "{done}/{total} Schüler:innen verschoben." line 373
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2EStudents,
  cleanupE2EClasses,
  createStudentViaAPI,
  createClassViaAPI,
} from './helpers/students';

const PREFIX = 'E2E-STD-MOVE-';
// Class name column is VARCHAR(20). Keep the prefix short enough to fit a
// disambiguation suffix + 13-digit timestamp (Date.now()).
const CLASS_PREFIX = 'E2E-MV-';

test.describe('Phase 12 — Admin Students Move (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Students first so the class delete succeeds (Orphan-Guard).
    await cleanupE2EStudents(request, PREFIX);
    await cleanupE2EClasses(request, CLASS_PREFIX);
  });

  test('E2E-STD-05-SINGLE: single-row move via dialog → toast + classId updated', async ({
    page,
    request,
  }) => {
    // Short 4-digit suffix instead of full 13-digit timestamp — class
    // name column is VARCHAR(20).
    const ts = Date.now().toString().slice(-6);
    const classA = await createClassViaAPI(request, {
      name: `${CLASS_PREFIX}SA-${ts}`,
    });
    const classB = await createClassViaAPI(request, {
      name: `${CLASS_PREFIX}SB-${ts}`,
      schoolYearId: classA.schoolYearId,
    });
    const vorname = `${PREFIX}single-${ts}`;
    await createStudentViaAPI(request, {
      firstName: vorname,
      lastName: 'MoveSingle',
      classId: classA.id,
    });

    // Filter students to class A so we know the row is there.
    await page.goto(`/admin/students?classId=${classA.id}`);

    const row = page.locator('tr').filter({ hasText: vorname });
    await expect(row).toBeVisible();

    // Row-action menu → "In andere Klasse verschieben".
    await row.getByRole('button', { name: 'Aktionen' }).click();
    await page
      .getByRole('menuitem', { name: 'In andere Klasse verschieben' })
      .click();

    // MoveStudentDialog (mode=single) — title verbatim from component line 95.
    await expect(
      page.getByRole('heading', {
        name: 'Schüler:in in andere Klasse verschieben',
      }),
    ).toBeVisible();

    // Select target class B via the native <select>.
    await page.getByLabel('Ziel-Klasse').selectOption(classB.id);

    // Confirm with the footer Verschieben button.
    await page.getByRole('button', { name: 'Verschieben' }).click();

    // Single-move toast — verbatim from useStudents.ts:323.
    await expect(page.getByText('Schüler:in verschoben.')).toBeVisible();

    // Switch filter to class B — row should now be listed there.
    await page.goto(`/admin/students?classId=${classB.id}`);
    await expect(
      page.locator('tr').filter({ hasText: vorname }),
    ).toBeVisible();
  });

  test('E2E-STD-05-BULK: bulk-move 2 rows via floating toolbar → avatar-stack + progress', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const classA = await createClassViaAPI(request, {
      name: `${CLASS_PREFIX}BA-${ts}`,
    });
    const classB = await createClassViaAPI(request, {
      name: `${CLASS_PREFIX}BB-${ts}`,
      schoolYearId: classA.schoolYearId,
    });
    const names = [
      `${PREFIX}bulk-a-${ts}`,
      `${PREFIX}bulk-b-${ts}`,
    ];
    for (const firstName of names) {
      await createStudentViaAPI(request, {
        firstName,
        lastName: 'MoveBulk',
        classId: classA.id,
      });
    }

    // Filter to class A.
    await page.goto(`/admin/students?classId=${classA.id}`);

    // Wait for both rows visible.
    for (const n of names) {
      await expect(page.locator('tr').filter({ hasText: n })).toBeVisible();
    }

    // Select both via row checkboxes (aria-label `<lastName>, <firstName> auswählen`).
    for (const n of names) {
      await page
        .getByRole('checkbox', {
          name: new RegExp(`MoveBulk, ${n.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')} auswählen`),
        })
        .click();
    }

    // Floating bulk toolbar — testid from students.index.tsx:212.
    const bulkToolbar = page.locator('[data-testid="bulk-toolbar"]');
    await expect(bulkToolbar).toBeVisible();
    await expect(bulkToolbar.getByText('2')).toBeVisible();

    await bulkToolbar
      .getByRole('button', { name: 'Ausgewählte verschieben' })
      .click();

    // MoveStudentDialog bulk mode — avatar-stack testid (MoveStudentDialog.tsx:110).
    await expect(
      page.getByRole('heading', {
        name: '2 Schüler:innen in andere Klasse verschieben',
      }),
    ).toBeVisible();
    const avatarStack = page.locator('[data-testid="avatar-stack"]');
    await expect(avatarStack).toBeVisible();

    // Select target class B.
    await page.getByLabel('Ziel-Klasse').selectOption(classB.id);
    await page.getByRole('button', { name: 'Verschieben' }).click();

    // Bulk success toast — verbatim "2/2 Schüler:innen verschoben."
    // (useStudents.ts:373 — `${result.done}/${result.total} Schüler:innen verschoben.`).
    await expect(
      page.getByText(/2\/2 Schüler:innen verschoben\./),
    ).toBeVisible();

    // Flip filter to class B — both rows visible there.
    await page.goto(`/admin/students?classId=${classB.id}`);
    for (const n of names) {
      await expect(page.locator('tr').filter({ hasText: n })).toBeVisible();
    }
  });
});
