/**
 * Issue #88 — iCal calendar-token revoke flow (Settings).
 *
 * Surface: /settings → ICalSettings card → "Token erneuern" button +
 * confirmation Dialog → DELETE /api/v1/schools/:schoolId/calendar/token.
 *
 * The DELETE endpoint is misleadingly named — it actually calls
 * `revokeAndRegenerate` (calendar.service.ts:54), which HARD-deletes
 * the prior CalendarToken row (no `revoked_at` soft-delete column
 * exists in the schema, despite the issue text mentioning one) and
 * unconditionally creates a fresh one. The public ICS endpoint
 * looks up by token PK via `findUnique({ where: { token } })`
 * (calendar.service.ts:47), so a revoked (= deleted) token returns
 * null and throws NotFoundException → HTTP 404.
 *
 * Test-Strategie — end-to-end old-vs-new URL switch:
 *
 *   ICAL-REVOKE-ELTERN:
 *     1. Purge any stale token row (defensive — see generate spec).
 *     2. Eltern logs in, navigates to /settings, generates a token.
 *        Capture the URL as `urlOld`.
 *     3. Verify `urlOld` returns 200 + valid VCALENDAR via the
 *        public unauthenticated GET.
 *     4. Click "Token erneuern" → confirmation Dialog opens with
 *        the destructive copy "Die aktuelle Kalender-URL wird
 *        ungueltig. Alle verbundenen Kalender-Apps muessen neu
 *        eingerichtet werden. Fortfahren?" (ICalSettings.tsx:154).
 *     5. Click the destructive-variant "Token erneuern" button
 *        inside the Dialog. The page swaps to a fresh URL — capture
 *        as `urlNew`. Assert `urlNew !== urlOld`.
 *     6. The DSGVO-critical leg:
 *        * `urlOld` MUST return 404 — proves the old token was
 *          hard-deleted, not soft-revoked-but-still-honoured.
 *        * `urlNew` MUST return 200 with valid VCALENDAR — proves
 *          the regenerate half of `revokeAndRegenerate` worked.
 *
 * Why eltern: the issue lists the spec as an Eltern flow ("eltern-
 * user sieht nur eigene Tokens, kann nicht andere widerrufen"). The
 * core revoke behaviour is role-agnostic — same endpoint, same
 * permissions for all three personas (apps/api/prisma/seed.ts:428
 * grants create/read/delete calendar-token to eltern). Using
 * eltern here keeps role coverage symmetric with the generate
 * spec (lehrer) and the rbac spec (lehrer + eltern).
 *
 * Bug-class this catches: a future commit that flips
 * `revokeAndRegenerate` to a soft-delete via a `revoked_at`
 * column-add without updating `findByToken` to honour it. That's
 * exactly the silent DSGVO-leak the issue text warns about: the
 * user clicks "Token erneuern" expecting the old URL to stop
 * working, but the public endpoint still serves their personal
 * timetable + Klausur dates to whoever cached the old URL.
 *
 * Race-Family-Achtung: Issue #112 Phase 2.5a (#117) — per-(schoolId,
 * role) Postgres advisory lock serializes parallel specs sharing the
 * eltern persona. Cross-browser safe; previous chromium-only-skip
 * removed.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  apiBaseFromE2eEnv,
  seedCalendarTokenContext,
  cleanupCalendarTokenContext,
  type CalendarTokenContext,
} from './helpers/calendar-tokens';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const ROLE = 'eltern' as const;

test.describe('Issue #88 — iCal revoke (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'iCal subscription is a desktop-anchored workflow (URL is copied into a desktop calendar app).',
  );

  let ctx: CalendarTokenContext | undefined;

  test.beforeEach(async () => {
    ctx = await seedCalendarTokenContext(SEED_SCHOOL_UUID, [ROLE]);
  });

  test.afterEach(async () => {
    if (ctx) {
      await cleanupCalendarTokenContext(ctx);
      ctx = undefined;
    }
  });

  test('ICAL-REVOKE-ELTERN: "Token erneuern" hard-deletes the old token (old URL → 404, new URL → 200)', async ({
    page,
    request,
  }) => {
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
    // dialog-footer button (both literally `Token erneuern` per
    // ICalSettings.tsx:144 + 167). Use the card button first.
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

    // Step 4 — wait for the URL to swap. The Dialog auto-closes via
    // useRevokeCalendarToken.onSuccess (ICalSettings.tsx:65).
    // The mutation invalidates calendarTokenKeys.all(schoolId) and the
    // useCalendarToken query refetches the NEW token. Poll the visible
    // URL element until it differs from urlOld — the polled equality
    // check guards against the race where the old URL is still
    // visible on the first sample but flips a beat later.
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
    // Old URL must now return 404 (token row is gone). If the backend
    // ever switches to soft-delete WITHOUT updating findByToken to
    // honour `revoked_at`, this assertion goes red loudly. This is the
    // EXACT bug class the issue text calls out:
    //
    //   "wenn die Generate/Revoke-Logik bricht, kann ein revoked Token
    //    weiter funktionieren = stiller Datenleak (Stundenplan +
    //    Klausuren in fremde Hände)"
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
