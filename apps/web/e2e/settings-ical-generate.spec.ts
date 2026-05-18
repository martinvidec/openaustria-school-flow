/**
 * Issue #88 — iCal calendar-token generate flow (Settings).
 *
 * Surface: /settings → ICalSettings card (apps/web/src/components/
 * calendar/ICalSettings.tsx). Today only `roles-smoke.spec.ts`
 * proves the page rendert ohne Crash — there is no end-to-end
 * regression-lock that the generated token URL actually serves a
 * valid iCal feed.
 *
 * Test-Strategie — full POST → URL → public-GET round-trip:
 *
 *   ICAL-GEN-LEHRER:
 *     1. Purge any stale token row for lehrer-user on the seed
 *        school (defensive — a previous failed run could leave
 *        one and the page would land in "Token exists" state,
 *        not "Noch kein Kalender-Abonnement").
 *     2. Lehrer logs in, navigates to /settings.
 *     3. Page shows the empty-state copy + the "Kalender-URL erstellen"
 *        CTA. Click it.
 *     4. Success toast "Kalender-URL erstellt" surfaces.
 *     5. The monospace URL element renders with the
 *        `/api/v1/calendar/<uuid>.ics` path (a UUID — token is
 *        `crypto.randomUUID()`, calendar.service.ts:30).
 *     6. Issue an UNAUTHENTICATED GET on the absolute version of
 *        that URL. The public ICS endpoint is @Public()
 *        (calendar.controller.ts:34) and serves the iCal even
 *        without a JWT — exactly what an iCal subscription client
 *        (Apple Kalender / Google Calendar / Outlook) sends.
 *     7. Assert: 200 OK, Content-Type contains "text/calendar",
 *        body starts with BEGIN:VCALENDAR and ends with
 *        END:VCALENDAR.
 *
 * Bug-class this catches: any future commit that breaks the
 * full token-URL-roundtrip — e.g. renaming the controller
 * `@Public()` decorator, changing the URL shape, dropping the
 * UUID format, or serving the wrong Content-Type. These are
 * exactly the kind of silent regressions the iCal subscription
 * surface needs locked, because the user-visible failure mode is
 * "my calendar app silently stops syncing" — no toast, no error,
 * no log line on the user's side.
 *
 * Race-Family-Achtung: chromium-only-skip + purgeCalendarTokensFor
 * in both beforeEach and afterEach. CalendarToken is per-(userId,
 * schoolId) — multiple workers running this spec for the same
 * lehrer would race the @@unique constraint on the `token` column
 * and the unconditional INSERT (calendar.service.ts:32 has no
 * upsert), so chromium is the sole writer.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  apiBaseFromE2eEnv,
  purgeCalendarTokensForRoles,
} from './helpers/calendar-tokens';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const ROLE = 'lehrer' as const;

test.describe('Issue #88 — iCal generate (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'iCal subscription is a desktop-anchored workflow (URL is copied into a desktop calendar app). Mobile coverage belongs to its own *.mobile.spec.ts that asserts the "URL kopieren" button surfaces below the URL field on base/sm.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates the singleton CalendarToken row for lehrer-user on the seed school — chromium is the sole writer (race-family precedent).',
  );

  test.beforeEach(async () => {
    await purgeCalendarTokensForRoles(SEED_SCHOOL_UUID, [ROLE]);
  });

  test.afterEach(async () => {
    await purgeCalendarTokensForRoles(SEED_SCHOOL_UUID, [ROLE]);
  });

  test('ICAL-GEN-LEHRER: "Kalender-URL erstellen" → toast + URL renders → public GET returns valid VCALENDAR', async ({
    page,
    request,
  }) => {
    await loginAsRole(page, ROLE);
    await page.goto('/settings');

    // Empty-state lock — proves the purge took effect and the page is
    // actually rendering the "no token yet" branch (ICalSettings.tsx:78).
    //
    // Note: shadcn CardTitle renders as <div>, NOT <h*> (see
    // apps/web/src/components/ui/card.tsx:32 — `React.forwardRef<HTMLDivElement>`).
    // getByRole('heading') would not match — use getByText instead.
    await expect(
      page.getByText('Kalender-Abonnement', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Noch kein Kalender-Abonnement eingerichtet.'),
    ).toBeVisible();

    const createButton = page.getByRole('button', {
      name: 'Kalender-URL erstellen',
    });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Success toast surfaces from useGenerateCalendarToken.onSuccess
    // (useCalendarToken.ts:49). Sonner renders toasts inside a region
    // with aria-label "Notifications" — getByText scoped to status role
    // is the cleanest locator that doesn't trip on the card body's
    // sibling text.
    await expect(
      page.getByText('Kalender-URL erstellt', { exact: false }),
    ).toBeVisible();

    // After the query invalidation refetches, the page swaps to the
    // "token exists" branch which renders the monospace URL field. The
    // <label> for that field is "Ihre persoenliche Kalender-URL".
    await expect(
      page.getByText('Ihre persoenliche Kalender-URL'),
    ).toBeVisible();

    // The URL element is `<div className="font-mono ...">` with the
    // calendarUrl text. Grab the visible relative URL — `crypto.randomUUID()`
    // produces a v4 UUID so the format is fixed.
    const urlElement = page
      .locator('div.font-mono')
      .filter({ hasText: /^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i })
      .first();
    await expect(urlElement).toBeVisible();
    const relativeUrl = (await urlElement.textContent())?.trim() ?? '';
    expect(
      relativeUrl,
      'Generated URL must match /api/v1/calendar/<uuid>.ics shape (token is crypto.randomUUID() per calendar.service.ts:30)',
    ).toMatch(/^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i);

    // ── Public ICS endpoint round-trip — no Authorization header ────────
    // calendar.controller.ts:34 marks getIcs() @Public() so this
    // request bypasses the JWT guard. The iCal subscription client
    // (Apple Kalender etc.) sends this exact request shape.
    const absoluteUrl = `${apiBaseFromE2eEnv()}${relativeUrl}`;
    const icsResponse = await request.get(absoluteUrl, {
      // Belt-and-braces: explicitly drop any auth header that might be
      // sticky on the shared Playwright APIRequestContext from earlier
      // logged-in fetches.
      headers: {},
    });

    expect(
      icsResponse.status(),
      `Public ICS endpoint must return 200 OK for a freshly generated token (got status ${icsResponse.status()} for ${relativeUrl})`,
    ).toBe(200);
    expect(
      icsResponse.headers()['content-type'] ?? '',
      'Content-Type must be text/calendar (calendar.controller.ts:53)',
    ).toContain('text/calendar');

    const icsBody = await icsResponse.text();
    expect(
      icsBody.startsWith('BEGIN:VCALENDAR'),
      `ICS body must start with BEGIN:VCALENDAR (got first 80 chars: ${JSON.stringify(icsBody.slice(0, 80))})`,
    ).toBe(true);
    expect(
      icsBody.trim().endsWith('END:VCALENDAR'),
      'ICS body must end with END:VCALENDAR — proves the ical-generator emitted a complete document, not a partial response',
    ).toBe(true);
    // PRODID line is mandatory in RFC 5545 and the service sets it to
    // SchoolFlow explicitly (calendar.service.ts:70). This catches a
    // future swap to a stub ical-generator that emits empty calendars.
    expect(icsBody).toMatch(/PRODID:[^\r\n]*SchoolFlow/i);

  });
});
