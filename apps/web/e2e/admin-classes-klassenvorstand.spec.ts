/**
 * Phase 12 Plan 12-03 — Admin Classes Klassenvorstand assignment (CLASS-02 / D-08)
 *
 * Covers:
 *   - E2E-CLS-03-ASSIGN: TeacherSearchPopover → pick a teacher by lastName →
 *                        save → PUT /classes/:id fires with klassenvorstandId.
 *   - E2E-CLS-03-CLEAR:  Clear-Icon resets Klassenvorstand to null → save →
 *                        PUT /classes/:id body contains klassenvorstandId: null.
 *
 * DOM contract:
 *   - TeacherSearchPopover.tsx — placeholder "Lehrer:in suchen …" line 44,
 *     Clear-Icon aria-label "Klassenvorstand entfernen" line 126,
 *     Command input "Lehrer:in-Suche" line 77 (role=combobox)
 *   - ClassStammdatenTab.tsx — Save button line 104-108.
 *
 * Precondition: at least one seeded teacher in
 * `seed-school-bgbrg-musterstadt`. Phase 11-01 + 11-03 seed ships "Mueller"
 * as one of the default teachers.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupE2EClasses,
  createClassViaAPI,
} from './helpers/students';

const PREFIX = 'E2E-KV-';

test.describe('Phase 12 — Admin Classes Klassenvorstand (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EClasses(request, PREFIX);
  });

  test('E2E-CLS-03-ASSIGN: pick a teacher via TeacherSearchPopover → save', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const name = `${PREFIX}A-${ts}`;
    const cls = await createClassViaAPI(request, { name });

    await page.goto(`/admin/classes/${cls.id}?tab=stammdaten`);

    // TeacherSearchPopover placeholder / trigger.
    await page.getByRole('button', { name: /Klassenvorstand auswählen/ }).click();

    // 300ms-debounced CommandInput — min 2 chars before hitting the API.
    const input = page.getByRole('combobox', { name: 'Lehrer:in-Suche' });
    await expect(input).toBeVisible();
    await input.fill('Mu');

    // Wait for a CommandItem result — seeded teacher "Maria Mueller" should appear.
    // The CommandItem value is the teacher id (TeacherSearchPopover.tsx:96).
    // We match by name visible text.
    const hit = page.getByRole('option', { name: /Mueller/ }).first();
    await expect(hit).toBeVisible({ timeout: 10_000 });
    await hit.click();

    // The selected teacher populates the TeacherSearchPopover trigger label
    // (TeacherSearchPopover.tsx:68).
    await expect(
      page.getByRole('button', { name: /Maria Mueller|Klassenvorstand/ }).first(),
    ).toBeVisible();

    // Save. Expect a PUT /classes/:id with klassenvorstandId set.
    const putPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/classes/${cls.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    const putRes = await putPromise;
    expect(putRes.ok(), `PUT /classes/:id`).toBeTruthy();
    const reqBody = JSON.parse(putRes.request().postData() ?? '{}');
    expect(
      reqBody.klassenvorstandId,
      'PUT body includes non-null klassenvorstandId',
    ).toBeTruthy();

    // Toast.
    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();
  });

  test('E2E-CLS-03-CLEAR: Clear-Icon → save → PUT klassenvorstandId=null', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const name = `${PREFIX}C-${ts}`;

    // Seed a class with a klassenvorstand already assigned. Find a teacher
    // via the list endpoint.
    const token = await import('./helpers/login').then((m) => m.getAdminToken(request));
    const teacherRes = await request.get(
      `http://localhost:3000/api/v1/teachers?schoolId=seed-school-bgbrg-musterstadt&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(teacherRes.ok(), `GET /teachers`).toBeTruthy();
    const teachersBody = (await teacherRes.json()) as {
      data?: Array<{ id: string }>;
    };
    const teacherId = teachersBody.data?.[0]?.id;
    expect(teacherId, 'at least one seeded teacher').toBeTruthy();

    const cls = await createClassViaAPI(request, {
      name,
      klassenvorstandId: teacherId,
    });

    await page.goto(`/admin/classes/${cls.id}?tab=stammdaten`);

    // Clear-Icon — rendered next to the TeacherSearchPopover when value != null
    // (TeacherSearchPopover.tsx:122-131).
    const clearBtn = page.getByRole('button', { name: 'Klassenvorstand entfernen' });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // The trigger label reverts to "Lehrer:in suchen …".
    await expect(
      page.getByRole('button', { name: /Klassenvorstand auswählen/ }),
    ).toBeVisible();

    // Save → PUT with klassenvorstandId: null.
    const putPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/classes/${cls.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    const putRes = await putPromise;
    expect(putRes.ok(), `PUT /classes/:id clear`).toBeTruthy();
    const reqBody = JSON.parse(putRes.request().postData() ?? '{}');
    expect(reqBody.klassenvorstandId, `PUT body klassenvorstandId=null`).toBeNull();

    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();
  });
});
