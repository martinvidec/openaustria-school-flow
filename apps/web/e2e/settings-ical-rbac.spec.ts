/**
 * Issue #88 — iCal calendar-token per-user isolation (Settings).
 *
 * Issue #154 (Phase 3.5/7) — migrated to throwaway-school per CLAUDE.md D4.
 * The sorted-acquisition advisory lock for the eltern + lehrer persona
 * pair is gone; the throwaway school owns its own CalendarToken rows for
 * BOTH persons, so the two-context race is impossible by construction.
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
 *     1. Throwaway-school with both `lehrer` + `eltern` roles.
 *     2. Two browser contexts so lehrer and eltern auth state
 *        don't share — same pattern as messaging-broadcast/realtime
 *        specs. BOTH contexts pin to the throwaway via
 *        `useThrowawaySchoolHeader` so `/users/me` and `/settings`
 *        resolve to the throwaway tenant.
 *     3. Lehrer generates a token in context A. Capture URL.
 *     4. Eltern generates a token in context B. Capture URL.
 *     5. Assert the two URLs differ — proves the backend keyed by
 *        the JWT subject, not by some shared key.
 *     6. Each token URL fetched unauthenticated → 200 + valid ICS.
 *
 * Bug-class this catches: any future change that breaks the
 * per-user partitioning of CalendarToken — e.g. a schema migration
 * that drops the `userId` column, a controller refactor that
 * resolves the user from a path param instead of the JWT, or a
 * findFirst that mis-orders the where clause and grabs an
 * arbitrary token.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import { apiBaseFromE2eEnv } from './helpers/calendar-tokens';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #88 — iCal RBAC / per-user isolation (throwaway-school, #154)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'iCal subscription is a desktop-anchored workflow.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { lehrer: true, eltern: true },
      withClasses: 1,
      namePrefix: 'E2E-ICAL-RBAC',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('ICAL-RBAC-PER-USER: two different users get distinct tokens, both URLs serve valid ICS', async ({
    browser,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const schoolId = fixture.schoolId;

    // Two contexts so each persona has its own JWT. The throwaway header
    // is installed on each context BEFORE login so `/users/me` resolves
    // the throwaway as the active school for both personas.
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    try {
      await useThrowawaySchoolHeader(ctxA, schoolId);
      await useThrowawaySchoolHeader(ctxB, schoolId);

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
      // cached row from a different user — both are silent DSGVO leaks.
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
