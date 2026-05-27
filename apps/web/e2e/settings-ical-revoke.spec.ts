/**
 * Issue #88 — iCal calendar-token revoke flow (Settings).
 *
 * Issue #154 (Phase 3.5/7) — migrated to throwaway-school per CLAUDE.md D4.
 * The per-`(schoolId, role)` advisory lock is gone; each spec owns its own
 * throwaway School + CalendarToken rows.
 *
 * Surface: /settings → ICalSettings card → "Token erneuern" button +
 * confirmation Dialog → DELETE /api/v1/schools/:schoolId/calendar/token.
 *
 * The DELETE endpoint is misleadingly named — it actually calls
 * `revokeAndRegenerate` (calendar.service.ts:54), which HARD-deletes
 * the prior CalendarToken row (no `revoked_at` soft-delete column
 * exists in the schema) and unconditionally creates a fresh one. The
 * public ICS endpoint looks up by token PK via `findUnique({ where: { token } })`
 * so a revoked (= deleted) token returns null and throws
 * NotFoundException → HTTP 404.
 *
 * Test-Strategie — end-to-end old-vs-new URL switch:
 *
 *   ICAL-REVOKE-ELTERN:
 *     1. Throwaway-school fixture with `eltern` role.
 *     2. Eltern logs in, navigates to /settings, generates a token.
 *        Capture the URL as `urlOld`.
 *     3. Verify `urlOld` returns 200 + valid VCALENDAR via the
 *        public unauthenticated GET.
 *     4. Click "Token erneuern" → confirmation Dialog opens with
 *        the destructive copy.
 *     5. Click the destructive-variant "Token erneuern" button
 *        inside the Dialog. The page swaps to a fresh URL — capture
 *        as `urlNew`. Assert `urlNew !== urlOld`.
 *     6. The DSGVO-critical leg:
 *        * `urlOld` MUST return 404 — proves the old token was
 *          hard-deleted, not soft-revoked-but-still-honoured.
 *        * `urlNew` MUST return 200 with valid VCALENDAR.
 *
 * Bug-class this catches: a future commit that flips
 * `revokeAndRegenerate` to a soft-delete via a `revoked_at`
 * column-add without updating `findByToken` to honour it — the
 * silent DSGVO-leak the issue text warns about.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import { apiBaseFromE2eEnv } from './helpers/calendar-tokens';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

const ROLE = 'eltern' as const;

test.describe('Issue #88 — iCal revoke (throwaway-school, #154)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'iCal subscription is a desktop-anchored workflow (URL is copied into a desktop calendar app).',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { [ROLE]: true },
      withClasses: 1,
      namePrefix: 'E2E-ICAL-REV',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('ICAL-REVOKE-ELTERN: "Token erneuern" hard-deletes the old token (old URL → 404, new URL → 200)', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, ROLE);
    await page.goto('/settings');

    // Step 1 — generate the initial token.
    await page.getByRole('button', { name: 'Kalender-URL erstellen' }).click();
    await expect(page.getByText('Ihre persoenliche Kalender-URL')).toBeVisible();

    const urlSelector = page
      .locator('div.font-mono')
      .filter({ hasText: /^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i })
      .first();
    await expect(urlSelector).toBeVisible();
    const urlOld = (await urlSelector.textContent())?.trim() ?? '';
    expect(urlOld).toMatch(/^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i);

    // Sanity — the original URL is reachable BEFORE revoke.
    const apiBase = apiBaseFromE2eEnv();
    const preRevokeResponse = await request.get(`${apiBase}${urlOld}`, {
      headers: {},
    });
    expect(
      preRevokeResponse.status(),
      'Sanity: freshly generated token must be reachable on the public endpoint before we revoke it',
    ).toBe(200);

    // Step 2 — open the revoke confirmation dialog.
    // Note: there are TWO "Token erneuern" labelled affordances on this
    // page once the dialog opens — the card button and the destructive
    // dialog-footer button. Use the card button first.
    await page.getByRole('button', { name: 'Token erneuern' }).first().click();

    // Dialog content + destructive copy.
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByText(
        /Die aktuelle Kalender-URL wird ungueltig\. Alle verbundenen Kalender-Apps muessen neu eingerichtet werden\. Fortfahren\?/,
      ),
      'Destructive-copy paragraph must surface (UI-SPEC guard against silent removal of the data-loss warning)',
    ).toBeVisible();

    // Step 3 — confirm the revoke. The dialog has a destructive variant
    // "Token erneuern" button + an "Abbrechen" button. Locate the one
    // inside the dialog scope to avoid hitting the card button again.
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Token erneuern' })
      .click();

    // Step 4 — wait for the URL to swap.
    await expect.poll(
      async () => (await urlSelector.textContent())?.trim() ?? '',
      {
        message: 'The displayed URL must change after revokeAndRegenerate completes',
        timeout: 10_000,
      },
    ).not.toBe(urlOld);

    const urlNew = (await urlSelector.textContent())?.trim() ?? '';
    expect(urlNew).toMatch(/^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i);
    expect(urlNew, 'New URL must differ from the old URL').not.toBe(urlOld);

    // ── DSGVO-critical lock ─────────────────────────────────────────────
    // Old URL must now return 404 (token row is gone).
    const oldResponse = await request.get(`${apiBase}${urlOld}`, { headers: {} });
    expect(
      oldResponse.status(),
      `Revoked token MUST return 404 — got status ${oldResponse.status()} for the old URL (silent DSGVO leak)`,
    ).toBe(404);

    // New URL must serve a valid ICS document.
    const newResponse = await request.get(`${apiBase}${urlNew}`, { headers: {} });
    expect(newResponse.status()).toBe(200);
    expect(newResponse.headers()['content-type'] ?? '').toContain('text/calendar');
    const newBody = await newResponse.text();
    expect(newBody.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(newBody.trim().endsWith('END:VCALENDAR')).toBe(true);
  });
});
