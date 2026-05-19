/**
 * Issue #84 — Messaging Socket.IO realtime delivery (slice 5/5, "optional" per the issue).
 *
 * Locks the WebSocket-driven invalidation path on /messages: a message
 * sent by one user lands in another user's open conversation view
 * WITHOUT a page reload. This is the load-bearing UX promise of the
 * messaging surface (Untis-alternative chatter has to feel real-time
 * or the school adoption story breaks).
 *
 *   1. Seed a DIRECT conversation between kc-lehrer and kc-eltern via
 *      the API helper, with one initial message body so the
 *      conversation row surfaces in both users' lists.
 *   2. eltern-user logs in (context B) and opens `/messages` →
 *      clicks the DIRECT row → ConversationView mounts and the
 *      messaging socket connects (jwt available via useAuth).
 *   3. Without touching eltern's page, the spec fires a SECOND
 *      message into the same conversation via the API as kc-lehrer.
 *      Backend `MessagingGateway.emitNewMessage` pushes
 *      `message:new` to `user:{elternKcId}` (gateway.ts:111).
 *   4. eltern's `useMessagingSocket` invalidates the messages query
 *      → useMessages refetches → the new body appears WITHOUT
 *      eltern's page.reload() ever being called.
 *
 * Why two browser contexts (and not page.context().newPage()):
 * Playwright contexts isolate cookies/localStorage. Sharing a context
 * between kc-lehrer and kc-eltern would force a Keycloak re-login
 * each time and risk auth-state races; two contexts give two clean
 * sessions in parallel.
 *
 * Why no `page.reload()` between seed and assertion: that's the whole
 * point. If a reload were needed, the socket layer wouldn't be doing
 * its job and the spec wouldn't be a regression-lock — it would be a
 * stale-cache stress test.
 *
 * Chromium-only-skip per the race-family precedent — shared
 * lehrer↔eltern DIRECT row is a per-pair singleton (`directPairKey`).
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import { getSeedUserId } from './helpers/users';
import {
  MESSAGING_PREFIX,
  cleanupE2EConversations,
  createDirectConversation,
  sendMessageViaAPI,
  type CreatedConversation,
} from './helpers/messaging';
import { acquireAdvisoryLock, type AdvisoryLock } from './helpers/advisory-lock';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

test.describe('Issue #84 — Messaging realtime (Socket.IO, desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'List-detail two-pane layout is desktop-only; mobile realtime parity is a follow-up once the mobile route lands.',
  );

  // Issue #112 Phase 4 wave 2b (#120): DIRECT lehrer↔eltern is a per-pair
  // singleton (find-or-create on `directPairKey`). Shared with the
  // messaging-direct-1on1 spec — without the lock, a parallel run on
  // the other spec would interleave messages into the same row and
  // contaminate the realtime delivery assertion. Lock acquired here
  // serializes both specs cross-spec AND cross-project.
  let lock: AdvisoryLock | undefined;
  let created: CreatedConversation | null = null;

  test.beforeEach(async () => {
    lock = await acquireAdvisoryLock(
      `messaging:direct:lehrer-eltern:${SEED_SCHOOL_UUID}`,
    );
  });

  test.afterEach(async ({ request }) => {
    // Scope sweep to this spec's own sub-prefix so sibling messaging
    // specs running in parallel don't sweep our mid-test DIRECT row.
    await cleanupE2EConversations(request, `${MESSAGING_PREFIX}RT-`, 'lehrer');
    created = null;
    if (lock) {
      await lock.release();
      lock = undefined;
    }
  });

  test('MSG-REALTIME-01: kc-eltern sees a kc-lehrer-sent message land via Socket.IO without page.reload()', async ({
    browser,
    request,
  }) => {
    const ts = Date.now();
    const initialBody = `${MESSAGING_PREFIX}RT-INIT-${ts} — Erste Nachricht (initial seed)`;
    const realtimeBody = `${MESSAGING_PREFIX}RT-LIVE-${ts} — Diese Nachricht muss ohne Reload erscheinen`;

    // Seed the DIRECT row + initial message so eltern's /messages
    // list has a row to click.
    const elternId = await getSeedUserId(request, 'eltern');
    created = await createDirectConversation(request, {
      actorRole: 'lehrer',
      recipientId: elternId,
      body: initialBody,
    });

    // Eltern session — open /messages, click the row, mount
    // ConversationView. The socket connects on first render of any
    // authenticated route (useMessagingSocket hook is wired into the
    // _authenticated layout — it doesn't require the messages route
    // specifically, but mounting there ensures we're on the right
    // useMessages query key for invalidation).
    const elternContext = await browser.newContext();
    try {
      const elternPage = await elternContext.newPage();
      await loginAsRole(elternPage, 'eltern');
      await elternPage.goto('/messages');
      await expect(
        elternPage.getByRole('heading', { name: 'Nachrichten' }),
      ).toBeVisible();

      // Open the DIRECT conversation. The row name carries the
      // initial body in the preview (DIRECT has no subject — title
      // falls back to sender name, but the preview substring is
      // unique per run).
      await elternPage
        .getByRole('button', { name: new RegExp(`${MESSAGING_PREFIX}RT-INIT-${ts}`) })
        .click();

      // Initial body renders in the conversation view — wait for it
      // to settle so we KNOW the socket has had a chance to connect
      // (the messages query is fetched immediately after the route
      // mounts; once its result is on-screen the socket is also
      // wired since both hang off the same _authenticated layout).
      await expect(
        elternPage.getByText(initialBody).first(),
        'initial message body must render before we fire the realtime probe',
      ).toBeVisible();

      // Give the Socket.IO handshake an extra moment to settle. The
      // /socket.io polling handshake + websocket upgrade typically
      // completes in <200ms but CI runners sometimes need more — the
      // 1s buffer is small enough not to slow the suite materially.
      await elternPage.waitForTimeout(1_000);

      // Realtime probe — fire as lehrer via API, eltern's page is
      // NEVER touched between this line and the assertion below.
      await sendMessageViaAPI(request, created.id, {
        actorRole: 'lehrer',
        body: realtimeBody,
      });

      // Eltern's `useMessagingSocket.on('message:new')` invalidates
      // the messages query, useMessages refetches, the new body
      // renders inside the existing ConversationView WITHOUT a page
      // reload. Generous timeout — the network round-trip plus
      // React Query refetch can stretch on slower CI runners.
      await expect(
        elternPage.getByText(realtimeBody).first(),
        'new message body must appear via Socket.IO invalidation without page.reload()',
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await elternContext.close();
    }
  });
});
