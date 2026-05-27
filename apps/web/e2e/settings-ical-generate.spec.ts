/**
 * Issue #88 — iCal calendar-token generate flow (Settings).
 *
 * Issue #154 (Phase 3.5/7) — migrated to throwaway-school per CLAUDE.md D4.
 * The per-`(schoolId, role)` advisory lock + Prisma-direct purge are gone;
 * each spec owns its own throwaway School so CalendarToken rows live in
 * tenant-isolated tables. `fixture.cleanup()` cascade-drops the school
 * (and its calendar_tokens rows via FK) on afterEach.
 *
 * Surface: /settings → ICalSettings card (apps/web/src/components/
 * calendar/ICalSettings.tsx).
 *
 * Test-Strategie — full POST → URL → public-GET round-trip:
 *
 *   ICAL-GEN-LEHRER:
 *     1. Throwaway-school fixture with `lehrer` role — fresh tenant,
 *        no pre-existing CalendarToken rows.
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
 * UUID format, or serving the wrong Content-Type.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import { apiBaseFromE2eEnv } from './helpers/calendar-tokens';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

const ROLE = 'lehrer' as const;

test.describe('Issue #88 — iCal generate (throwaway-school, #154)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'iCal subscription is a desktop-anchored workflow (URL is copied into a desktop calendar app). Mobile coverage belongs to its own *.mobile.spec.ts.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { [ROLE]: true },
      withClasses: 1,
      namePrefix: 'E2E-ICAL-GEN',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('ICAL-GEN-LEHRER: "Kalender-URL erstellen" → toast + URL renders → public GET returns valid VCALENDAR', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, ROLE);
    await page.goto('/settings');

    // Empty-state lock — proves the fresh throwaway has no prior token
    // and the page is rendering the "no token yet" branch
    // (ICalSettings.tsx:78).
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
    // (useCalendarToken.ts:49).
    await expect(
      page.getByText('Kalender-URL erstellt', { exact: false }),
    ).toBeVisible();

    // After the query invalidation refetches, the page swaps to the
    // "token exists" branch which renders the monospace URL field.
    await expect(
      page.getByText('Ihre persoenliche Kalender-URL'),
    ).toBeVisible();

    // The URL element is `<div className="font-mono ...">` with the
    // calendarUrl text. `crypto.randomUUID()` produces a v4 UUID so
    // the format is fixed.
    const urlElement = page
      .locator('div.font-mono')
      .filter({ hasText: /^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i })
      .first();
    await expect(urlElement).toBeVisible();
    const relativeUrl = (await urlElement.textContent())?.trim() ?? '';
    expect(
      relativeUrl,
      'Generated URL must match /api/v1/calendar/<uuid>.ics shape',
    ).toMatch(/^\/api\/v1\/calendar\/[0-9a-f-]{36}\.ics$/i);

    // ── Public ICS endpoint round-trip — no Authorization header ────────
    // calendar.controller.ts:34 marks getIcs() @Public() so this
    // request bypasses the JWT guard AND the CurrentSchoolInterceptor
    // (no X-School-Id needed). The iCal subscription client sends
    // this exact request shape — pure token-lookup, no tenant header.
    const absoluteUrl = `${apiBaseFromE2eEnv()}${relativeUrl}`;
    const icsResponse = await request.get(absoluteUrl, {
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
    // SchoolFlow explicitly (calendar.service.ts:70).
    expect(icsBody).toMatch(/PRODID:[^\r\n]*SchoolFlow/i);
  });
});
