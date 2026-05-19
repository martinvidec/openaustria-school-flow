/**
 * Issue #88 — iCal calendar-token per-user isolation (Settings).
 *
 * This is the "optional" third sub-spec in #88 ("eltern-user sieht nur
 * eigene Tokens, kann nicht andere widerrufen"). The CalendarToken
 * table is single-row-per-(userId, schoolId) and lookups derive the
 * userId from the JWT subject — no list-all-tokens endpoint, no
 * cross-user delete path. The realistic regression to lock is
 * therefore "each user gets their OWN token, distinct from any
 * other user's, and both URLs serve valid VCALENDAR feeds".
 *
 * Test-Strategie — two-context per-user isolation:
 *
 *   ICAL-RBAC-PER-USER:
 *     1. Two browser contexts so lehrer and eltern auth state
 *        don't share — same pattern as messaging-broadcast/realtime
 *        specs.
 *     2. Lehrer generates a token in context A. Capture URL.
 *     3. Eltern generates a token in context B. Capture URL.
 *     4. Assert the two URLs differ — proves the backend keyed by
 *        the JWT subject, not by some shared key (e.g. schoolId
 *        alone, which would mean Lehrer + Eltern share one token
 *        = exposing Eltern's child's data to Lehrer and vice versa).
 *     5. Each token URL fetched unauthenticated → 200 + valid ICS.
 *        Proves the public endpoint resolves the FK back to the
 *        right user row for both — a regression that swapped the
 *        FK or hard-coded a single user would surface here.
 *
 * Bug-class this catches: any future change that breaks the
 * per-user partitioning of CalendarToken — e.g. a schema migration
 * that drops the `userId` column, a controller refactor that
 * resolves the user from a path param instead of the JWT, or a
 * findFirst that mis-orders the where clause and grabs an
 * arbitrary token.
 *
 * Race-Family-Achtung: Issue #112 Phase 2.5a (#117) — per-(schoolId,
 * role) Postgres advisory lock acquired on BOTH personas in sorted
 * order (eltern → lehrer). The sibling generate.spec (lehrer) and
 * revoke.spec (eltern) acquire their single lock and block on this
 * spec's set; the sorted acquisition order makes ABBA deadlock
 * impossible. Cross-browser safe; previous chromium-only-skip and
 * disjoint-personas workaround (schueler+admin) removed — this spec
 * is back on the originally-intended lehrer+eltern personas now that
 * the advisory lock eliminates the race.
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

const ROLES = ['lehrer', 'eltern'] as const;

test.describe('Issue #88 — iCal RBAC / per-user isolation (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'iCal subscription is a desktop-anchored workflow.',
  );

  let ctx: CalendarTokenContext | undefined;

  test.beforeEach(async () => {
    ctx = await seedCalendarTokenContext(SEED_SCHOOL_UUID, ROLES);
  });

  test.afterEach(async () => {
    if (ctx) {
      await cleanupCalendarTokenContext(ctx);
      ctx = undefined;
    }
  });

  test('ICAL-RBAC-PER-USER: two different users get distinct tokens, both URLs serve valid ICS', async ({
    browser,
    request,
  }) => {
    // Two contexts so each persona has its own JWT — same pattern as
    // messaging-broadcast.spec.ts:77 / messaging-realtime.spec.ts:91.
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    try {
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      // --- Lehrer in context A ----------------------------------------
      await loginAsRole(pageA, 'lehrer');
      await pageA.goto('/settings');
      await pageA
        .getByRole('button', { name: 'Kalender-URL erstellen' })
        .click();
      await expect(
        pageA.getByText('Ihre persoenliche Kalender-URL'),
      ).toBeVisible();
      const urlElementA = pageA
        .locator('div.font-mono')
        .filter({ hasText: /^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i })
        .first();
      await expect(urlElementA).toBeVisible();
      const urlA = (await urlElementA.textContent())?.trim() ?? '';
      expect(urlA).toMatch(/^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i);

      // --- Eltern in context B ----------------------------------------
      await loginAsRole(pageB, 'eltern');
      await pageB.goto('/settings');
      await pageB
        .getByRole('button', { name: 'Kalender-URL erstellen' })
        .click();
      await expect(
        pageB.getByText('Ihre persoenliche Kalender-URL'),
      ).toBeVisible();
      const urlElementB = pageB
        .locator('div.font-mono')
        .filter({ hasText: /^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i })
        .first();
      await expect(urlElementB).toBeVisible();
      const urlB = (await urlElementB.textContent())?.trim() ?? '';
      expect(urlB).toMatch(/^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i);

      // --- The core isolation lock ------------------------------------
      // The two UUIDs MUST differ. Same string would mean the backend
      // either keys CalendarToken on (schoolId) alone or returns a
      // cached row from a different user — both are silent DSGVO leaks
      // (one user would see the other's calendar feed).
      expect(
        urlB,
        `Two distinct users MUST receive different tokens; got identical URLs (${urlA}) — backend has lost per-user partitioning`,
      ).not.toBe(urlA);

      // --- Both public endpoints must serve valid ICS ----------------
      const apiBase = apiBaseFromE2eEnv();
      const [icsA, icsB] = await Promise.all([
        request.get(`${apiBase}${urlA}`, { headers: {} }),
        request.get(`${apiBase}${urlB}`, { headers: {} }),
      ]);
      expect(icsA.status(), 'Lehrer ICS endpoint must return 200').toBe(200);
      expect(icsB.status(), 'Eltern ICS endpoint must return 200').toBe(200);
      const bodyA = await icsA.text();
      const bodyB = await icsB.text();
      expect(bodyA.startsWith('BEGIN:VCALENDAR')).toBe(true);
      expect(bodyB.startsWith('BEGIN:VCALENDAR')).toBe(true);
      expect(bodyA.trim().endsWith('END:VCALENDAR')).toBe(true);
      expect(bodyB.trim().endsWith('END:VCALENDAR')).toBe(true);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
