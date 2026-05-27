/**
 * Calendar-Token E2E helpers — Issue #88.
 *
 * Issue #154 (Phase 3.5/7) reduction — the lock-bound seed/cleanup
 * functions (`seedCalendarTokenContext`, `cleanupCalendarTokenContext`)
 * + the persona-uuid map + the Prisma-direct purge were removed when
 * the three caller specs (settings-ical-generate / revoke / rbac)
 * migrated to throwaway-school. Each spec now owns its own School with
 * its own CalendarToken rows; `fixture.cleanup()` cascade-drops the
 * school + token rows via FK, so the global-state purge is obsolete.
 *
 * What stays: `apiBaseFromE2eEnv()` — a thin URL-host helper still used
 * by the migrated specs to fetch the public ICS endpoint
 * (`/api/v1/calendar/<token>.ics`) without prepending `/api/v1` twice.
 * Could live in a more generic `helpers/api-url.ts` long-term, but
 * keeping it here for now to minimize churn in this PR.
 */

/**
 * Resolve the bare API host (e.g. http://localhost:3000) for use by
 * `request.get('<host>/api/v1/calendar/<token>.ics')`. The existing
 * convention is `E2E_API_URL = http://localhost:3000/api/v1` —
 * strip the trailing `/api/v1` to get the host.
 *
 * The public ICS endpoint is mounted at `/api/v1/calendar/:token.ics`
 * and `calendarUrl` in the React settings component is the relative
 * path `/api/v1/calendar/...ics` (calendar.controller.ts:87).
 * Prepending the host produces the absolute URL the iCal subscription
 * client (Apple Kalender / Google Calendar / Outlook) would use.
 */
export function apiBaseFromE2eEnv(): string {
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}
