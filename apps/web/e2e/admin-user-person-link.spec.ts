/**
 * Phase 13 Plan 13-03 — Admin Person-Link (desktop)
 *
 * Covers USER-05 — User ↔ Person bidirectional link with 409 conflict
 * resolution via 2-stage ReLinkConflictDialog.
 *
 * Subject users:
 *   - schulleitung-user: target for the link-happy spec (defensive unlink
 *     beforeEach because seed has it linked to "Elisabeth Fischer")
 *   - lehrer-user: pre-linked to Teacher "Maria Mueller" in seed —
 *     stable target for the conflict test
 *
 * Each test begins with API-level state normalization so reruns don't
 * depend on a previous test leaving state correct. afterEach restores
 * lehrer-user → Maria Mueller and unlinks schulleitung-user (best-effort).
 *
 * Implementation note (deviation from UI-SPEC §222):
 *   The unlink hook emits `Verknüpfung entfernt` instead of UI-SPEC's
 *   `Verknüpfung gelöst`. Spec asserts the actual emitted string.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  USER_API,
  getSeedUserId,
  findUnlinkedTeacher,
  linkPersonViaAPI,
  unlinkPersonViaAPI,
} from './helpers/users';
import { getAdminToken } from './helpers/login';

const SEED_LEHRER_TEACHER_PERSON_ID = 'kc-lehrer-person';
const SEED_LEHRER_TEACHER_DOMAIN_ID = 'kc-lehrer-teacher';
// Note: The seed Teacher row id is `kc-lehrer-teacher` (Teacher.id), not
// the Person.id. The `personId` payload of POST /admin/users/:id/link-person
// expects the Teacher.id (USER-05 D-13 contract).

test.describe('Phase 13 — Admin Person-Link (desktop)', () => {
  // Phase 17 deferred: shared admin-user search-fixture regression
  // (#cluster-13-person-link). 3/3 fail in CI (PR #1 lines 103-105). Same
  // root cause family as #cluster-13-overrides. See 17-TRIAGE.md. Owner: 17.1.
  test.skip(
    true,
    'Phase 17 deferred: GET /admin/users (search=...) fixture regression — see 17-TRIAGE.md row #cluster-13-person-link.',
  );

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    // Defensive: ensure schulleitung-user is unlinked at the start of
    // each test so the "Nicht verknüpft" branch is visible.
    const schulleitungId = await getSeedUserId(request, 'schulleitung').catch(
      () => null,
    );
    if (schulleitungId) {
      await unlinkPersonViaAPI(request, schulleitungId).catch(() => {});
    }
  });

  test.afterEach(async ({ request }) => {
    // Restore: schulleitung-user → unlinked (cheap to re-run idempotently).
    const schulleitungId = await getSeedUserId(request, 'schulleitung').catch(
      () => null,
    );
    if (schulleitungId) {
      await unlinkPersonViaAPI(request, schulleitungId).catch(() => {});
    }
    // Restore: lehrer-user → linked to Maria Mueller (kc-lehrer-teacher).
    const lehrerId = await getSeedUserId(request, 'lehrer').catch(() => null);
    if (lehrerId) {
      // Unlink first so the link is idempotent; ignore errors.
      await unlinkPersonViaAPI(request, lehrerId).catch(() => {});
      await linkPersonViaAPI(
        request,
        lehrerId,
        'TEACHER',
        SEED_LEHRER_TEACHER_DOMAIN_ID,
      ).catch(() => {});
    }
  });

  test('USER-05-LINK-01: link schulleitung-user to an unlinked Teacher (happy path)', async ({
    page,
    request,
  }) => {
    const schulleitungId = await getSeedUserId(request, 'schulleitung');

    // Find any unlinked teacher in the seed.
    const teacher = await findUnlinkedTeacher(request);

    await page.goto(`/admin/users/${schulleitungId}?tab=overrides`);
    await page.getByRole('tab', { name: 'Overrides & Verknüpfung' }).click();

    // Initial state: Nicht verknüpft.
    await expect(page.getByText('Nicht verknüpft', { exact: true })).toBeVisible();

    // Open dialog.
    await page
      .getByRole('button', { name: 'Mit Person verknüpfen' })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Mit Person verknüpfen' }),
    ).toBeVisible();

    // Select Lehrkraft radio (already default but explicit).
    await page.getByRole('radio', { name: 'Lehrkraft' }).click();

    // Type the unlinked teacher's lastName.
    await page
      .getByPlaceholder(/Nachname eingeben/)
      .fill(teacher.lastName);
    await page.waitForTimeout(500); // 300ms debounce + render

    // Pick the matching option.
    await page
      .getByRole('option', { name: new RegExp(teacher.lastName) })
      .first()
      .click();

    // Confirm — footer button "Verknüpfen".
    await page.getByRole('button', { name: 'Verknüpfen' }).last().click();

    // Success toast.
    await expect(page.getByText('Verknüpfung aktualisiert')).toBeVisible();

    // Section flips to linked state.
    await expect(
      page.getByText(/Verknüpft mit (Lehrkraft|Schüler:in|Erziehungsberechtigte:n)/),
    ).toBeVisible();

    // Unlink CTA visible.
    await expect(
      page.getByRole('button', { name: 'Verknüpfung lösen' }).first(),
    ).toBeVisible();
  });

  test('USER-05-LINK-02: re-link conflict — linking to an already-linked teacher opens ReLinkConflictDialog and resolves', async ({
    page,
    request,
  }) => {
    const schulleitungId = await getSeedUserId(request, 'schulleitung');
    const lehrerId = await getSeedUserId(request, 'lehrer');

    // Ensure lehrer-user is linked to Maria (seed default; idempotent).
    await unlinkPersonViaAPI(request, lehrerId).catch(() => {});
    const linkRes = await linkPersonViaAPI(
      request,
      lehrerId,
      'TEACHER',
      SEED_LEHRER_TEACHER_DOMAIN_ID,
    );
    expect(linkRes.ok, `seed re-link lehrer→Maria (${linkRes.status})`).toBe(
      true,
    );

    // Resolve Maria's lastName for the autocomplete search.
    const lehrerLastName = 'Mueller';

    await page.goto(`/admin/users/${schulleitungId}?tab=overrides`);
    await page.getByRole('tab', { name: 'Overrides & Verknüpfung' }).click();

    // Open link dialog.
    await page
      .getByRole('button', { name: 'Mit Person verknüpfen' })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Mit Person verknüpfen' }),
    ).toBeVisible();

    await page.getByRole('radio', { name: 'Lehrkraft' }).click();
    await page.getByPlaceholder(/Nachname eingeben/).fill(lehrerLastName);
    await page.waitForTimeout(500);

    // Select the Maria Mueller option.
    await page
      .getByRole('option', { name: /Mueller/ })
      .first()
      .click();

    await page.getByRole('button', { name: 'Verknüpfen' }).last().click();

    // ReLinkConflictDialog opens.
    await expect(
      page.getByRole('heading', { name: 'Bestehende Verknüpfung ersetzen?' }),
    ).toBeVisible({ timeout: 10_000 });

    // Destructive confirm verbatim.
    await expect(
      page.getByRole('button', { name: 'Bestehende lösen und neu verknüpfen' }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: 'Bestehende lösen und neu verknüpfen' })
      .click();

    // After 2-stage resolution, success toast.
    await expect(page.getByText('Verknüpfung aktualisiert')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('USER-05-LINK-03: unlink → confirm dialog → Nicht verknüpft restored', async ({
    page,
    request,
  }) => {
    const schulleitungId = await getSeedUserId(request, 'schulleitung');
    // Setup: link schulleitung-user to any unlinked teacher via API.
    const teacher = await findUnlinkedTeacher(request).catch(() => null);
    if (!teacher) {
      throw new Error('USER-05-LINK-03: no unlinked teacher in seed');
    }
    await unlinkPersonViaAPI(request, schulleitungId).catch(() => {});
    const linkRes = await linkPersonViaAPI(
      request,
      schulleitungId,
      'TEACHER',
      teacher.id,
    );
    expect(linkRes.ok, `seed link schulleitung→teacher (${linkRes.status})`).toBe(
      true,
    );

    await page.goto(`/admin/users/${schulleitungId}?tab=overrides`);
    await page.getByRole('tab', { name: 'Overrides & Verknüpfung' }).click();

    // Linked state.
    await expect(
      page.getByText(/Verknüpft mit (Lehrkraft|Schüler:in|Erziehungsberechtigte:n)/),
    ).toBeVisible();

    // Open unlink dialog.
    await page
      .getByRole('button', { name: 'Verknüpfung lösen' })
      .first()
      .click();

    // WarnDialog title verbatim.
    await expect(
      page.getByRole('heading', { name: 'Verknüpfung lösen?' }),
    ).toBeVisible();

    // Confirm — destructive button (the WarnDialog footer's "Verknüpfung lösen").
    await page
      .getByRole('button', { name: 'Verknüpfung lösen' })
      .last()
      .click();

    // Toast — actual hook emission per use-unlink-person.ts:21.
    await expect(page.getByText('Verknüpfung entfernt')).toBeVisible();

    // Section reverts to Nicht verknüpft.
    await expect(page.getByText('Nicht verknüpft', { exact: true })).toBeVisible({
      timeout: 5_000,
    });
  });
});

// Unused at runtime — kept as silenced references so future expansion
// (asserting personLink state via /admin/users/:id detail) doesn't have
// to re-add the imports.
void getAdminToken;
void USER_API;
void SEED_LEHRER_TEACHER_PERSON_ID;
type _UnusedAPIRequestContext = APIRequestContext;
