/**
 * Phase 11 Plan 11-03 — Admin Teachers deep-dive (desktop)
 *
 * Covers TEACHER-03 (Werteinheiten live compute) + TEACHER-04 (Verfügbarkeits-
 * Grid toggle + persistence) + TEACHER-05 (Ermäßigungen row-add + save) +
 * Keycloak-E-Mail search dialog (TEACHER-02 D-08).
 *
 * DOM contract:
 *   - apps/web/src/components/admin/teacher/LehrverpflichtungTab.tsx
 *   - apps/web/src/components/admin/teacher/VerfuegbarkeitsGrid.tsx
 *   - apps/web/src/components/admin/teacher/ErmaessigungenList.tsx
 *   - apps/web/src/components/admin/teacher/KeycloakLinkDialog.tsx
 *
 * Prefix isolation: `E2E-TEA-WE-*`, cleaned up via shared helper.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  TEACHER_API as API,
  TEACHER_SCHOOL_ID as SCHOOL_ID,
  cleanupE2ETeachers,
} from './helpers/teachers';

// Distinct prefix so parallel workers running this spec alongside
// admin-teachers-crud.spec.ts don't collide on afterEach cleanup.
const PREFIX = 'E2E-TEA-WE-';

test.describe('Phase 11 — Admin Teachers Werteinheiten / Verfügbarkeit / Ermäßigungen / Keycloak (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2ETeachers(request, PREFIX);
  });

  test('TEACHER-WE-01: Werteinheiten live compute recomputes on Werteinheiten-Soll change', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}WE-${Date.now()}`;
    const teacher = await seedTeacher(request, vorname, 20);

    await page.goto(`/admin/teachers/${teacher.id}?tab=verpflichtung`);

    // Werteinheiten-Bilanz card shows "Effektiv verfügbar" line. Initially
    // = werteinheitenTarget (20 WE) minus sum of reductions (0) = 20.0.
    const bilanz = page.getByText(/Effektiv verfügbar/).locator('..');
    await expect(bilanz).toBeVisible();

    // Read the Werteinheiten-Soll input and change the value — the
    // "Effektiv verfügbar" row derives live from useMemo(calculateMaxTeachingHours)
    // (LehrverpflichtungTab.tsx:30-33).
    const weSoll = page.getByLabel('Werteinheiten-Soll');
    await expect(weSoll).toHaveValue('20');
    await weSoll.fill('15');

    // After the state flush, the bilanz row must reflect the new number.
    await expect(page.getByText('15.0 WE').first()).toBeVisible();
  });

  test('TEACHER-VERF-02: toggle Verfügbarkeits-Grid cell and save', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}VERF-${Date.now()}`;
    const teacher = await seedTeacher(request, vorname, 20);

    await page.goto(`/admin/teachers/${teacher.id}?tab=verfuegbarkeit`);

    // VerfuegbarkeitsGrid renders role="grid" + role="gridcell" buttons with
    // accessible names like "Mo, 2. Stunde, verfügbar|geblockt". Toggle the
    // MONDAY/2 cell. Use getByLabel to target the button directly — the td
    // wrapper inherits the same accessible name from its child button, so
    // getByRole('gridcell', ...) matches both with a strict-mode violation.
    const moCell = page.getByLabel('Mo, 2. Stunde, verfügbar');
    await expect(moCell).toBeVisible();
    await expect(moCell).toHaveAttribute('aria-pressed', 'false');
    await moCell.click();
    // Post-click, the accessible name flips — query the new state.
    const moCellBlocked = page.getByLabel('Mo, 2. Stunde, geblockt');
    await expect(moCellBlocked).toHaveAttribute('aria-pressed', 'true');

    // Save — desktop Speichern button at the bottom of the grid form
    // (VerfuegbarkeitsGrid.tsx:143). Use .first() to disambiguate from any
    // co-rendered mobile Save button.
    await page.getByRole('button', { name: 'Speichern' }).first().click();

    // The update hook surfaces the "Änderungen gespeichert." toast
    // (useTeachers.ts:251).
    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();
  });

  test('TEACHER-ERM-01: Ermäßigungen add row + save', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}ERM-${Date.now()}`;
    const teacher = await seedTeacher(request, vorname, 20);

    await page.goto(`/admin/teachers/${teacher.id}?tab=ermaessigungen`);

    // ErmaessigungenList.tsx:157 renders a "Ermäßigung hinzufügen" button.
    await page.getByRole('button', { name: 'Ermäßigung hinzufügen' }).click();

    // A new row appears — default grund is KUSTODIAT (line 62). Change it
    // to KLASSENVORSTAND via the shadcn Select. The SelectTrigger has id
    // `grund-new-<ts>` — we target it by its visible current value instead.
    const grundSelect = page.getByRole('combobox').filter({ hasText: 'Kustodiat' }).first();
    await grundSelect.click();
    await page.getByRole('option', { name: 'Klassenvorstand' }).click();

    // Set WE to 2.
    const weInput = page.getByLabel('WE').last();
    await weInput.fill('2');

    // Save — the bottom-right "Speichern" button inside the tab
    // (ErmaessigungenList.tsx:165).
    await page.getByRole('button', { name: 'Speichern' }).first().click();

    // Update hook toast — uses "Änderungen gespeichert." for reductions
    // (same useUpdateTeacher.onSuccess path).
    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();
  });

  test('TEACHER-KC-01: Keycloak-E-Mail search dialog renders nomatch OR result', async ({
    page,
    request,
  }) => {
    const vorname = `${PREFIX}KC-${Date.now()}`;
    const teacher = await seedTeacher(request, vorname, 20);

    await page.goto(`/admin/teachers/${teacher.id}?tab=stammdaten`);

    // KeycloakLinkSection (apps/web/src/components/admin/teacher/KeycloakLinkSection.tsx:31)
    // renders the "Keycloak-Account verknüpfen" button when the teacher is
    // not yet linked.
    await page
      .getByRole('button', { name: 'Keycloak-Account verknüpfen' })
      .click();

    // Dialog — KeycloakLinkDialog.tsx:75.
    await expect(
      page.getByRole('heading', { name: 'Keycloak-Account verknüpfen' }),
    ).toBeVisible();

    // Type 3 characters → debounced query fires. Accept either a result
    // card or the empty-state copy — Keycloak seed state can vary.
    await page.getByLabel('Keycloak-E-Mail').fill('admin');

    // Wait for the dialog to transition out of "idle" (>= 3 chars). The
    // fastest signal is that either "Kein Account …" OR at least one
    // user-card renders. The admin-seed exists so the overwhelmingly
    // common path is a card.
    const noMatch = page.getByText('Kein Account mit dieser E-Mail gefunden');
    // A result card holds text "Keycloak-ID:" (KeycloakLinkDialog.tsx:115).
    const userCard = page.getByText(/Keycloak-ID:/);
    await expect(noMatch.or(userCard)).toBeVisible({ timeout: 10_000 });

    // Close the dialog so the afterEach cleanup runs without a lingering
    // modal.
    await page.getByRole('button', { name: 'Abbrechen' }).click();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

async function seedTeacher(
  request: APIRequestContext,
  firstName: string,
  werteinheitenTarget: number,
): Promise<{ id: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${API}/teachers`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      schoolId: SCHOOL_ID,
      firstName,
      lastName: 'WE',
      email: `${firstName.toLowerCase()}@schule.at`,
      werteinheitenTarget,
    },
  });
  expect(res.ok(), `POST /teachers seed (${firstName})`).toBeTruthy();
  const body = (await res.json()) as { id?: string; teacher?: { id: string } };
  const id = body.teacher?.id ?? body.id;
  expect(id, 'teacher id').toBeTruthy();
  return { id: id! };
}
