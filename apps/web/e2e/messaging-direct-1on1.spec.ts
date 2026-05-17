/**
 * Issue #84 — Messaging DIRECT 1:1 (lehrer → eltern, recipient visibility).
 *
 * Slice 2/n of the Messaging coverage gap. Locks the recipient-side flow
 * for DIRECT 1:1 conversations: a message that the lehrer sends to a
 * single parent must surface in that parent's /messages list, and
 * clicking it must show the actual message body in ConversationView.
 *
 * Why DIRECT next (after MSG-LIST-01 broadcast): the DIRECT path takes a
 * different branch in ConversationService.create() — `createDirect` with
 * its `directPairKey` find-or-create + 2-member transactional create.
 * The previous broadcast spec exercised the CLASS scope-expansion
 * branch; this one closes the DIRECT branch on the same load-bearing
 * stack (backend create → useConversations list → ConversationView
 * render). DIRECT also has no subject, so the recipient sees the row
 * titled by the sender's name with the body in the preview — a
 * different UI rendering path (`title = conversation.subject ?? senderName`
 * in `ConversationListItem.tsx:34`).
 *
 * Compose-via-UI is intentionally NOT exercised here: the current
 * `ComposeDialog.tsx` wires its footer "Senden" button only to
 * `handleBroadcastSend`, so the Direktnachricht tab cannot actually
 * post through the UI today. Driving setup via the API mirrors the
 * MSG-LIST-01 pattern (seed-via-API, assert-via-UI), keeps the spec
 * focused on the recipient-visibility contract, and avoids couplng to
 * the unrelated dialog wiring gap.
 *
 * Chromium-only-skip per the race-family precedent — DIRECT rows
 * between the shared seed (lehrer-user, eltern-user) pair are
 * find-or-create, so two parallel browser projects would step on the
 * same `directPairKey` row mid-flight.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import { getSeedUserId } from './helpers/users';
import {
  MESSAGING_PREFIX,
  cleanupE2EConversations,
  createDirectConversation,
  type CreatedConversation,
} from './helpers/messaging';

test.describe('Issue #84 — Messaging DIRECT 1:1 (lehrer → eltern, desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'List-detail two-pane layout is desktop-only; mobile has a separate route a future slice will cover.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'DIRECT rows share a per-pair singleton (directPairKey) on the seed users; parallel browser projects collide mid-flight.',
  );

  let created: CreatedConversation | null = null;

  test.afterEach(async ({ request }) => {
    // Sweep DIRECT rows whose latest message body carries the E2E-MSG-
    // prefix. Listing AS lehrer is required because admin is not a
    // member of DIRECT conversations and so cannot see them via the
    // member-scoped GET. Deletion still goes through the admin token
    // inside the helper (DELETE requires manage:communication).
    // Scope sweep to this spec's own sub-prefix so sibling messaging
    // specs running in parallel don't sweep our mid-test DIRECT row
    // (race-family from PR #107 parallel-run failure: shared
    // `E2E-MSG-` prefix made every spec's afterEach sweep every
    // other spec's conversations).
    await cleanupE2EConversations(request, `${MESSAGING_PREFIX}DIRECT-`, 'lehrer');
    created = null;
  });

  test('MSG-DIRECT-01: lehrer-sent DIRECT message appears in eltern-user list and opens with body', async ({
    page,
    request,
  }) => {
    const elternId = await getSeedUserId(request, 'eltern');
    const ts = Date.now();
    const body = `${MESSAGING_PREFIX}DIRECT-${ts} — Hallo, eine direkte Nachricht von Maria Mueller.`;

    created = await createDirectConversation(request, {
      actorRole: 'lehrer',
      recipientId: elternId,
      body,
    });
    expect(created.id, 'POST /conversations DIRECT must return an id').toBeTruthy();

    await loginAsRole(page, 'eltern');
    await page.goto('/messages');

    // Page chrome must be visible before we assert on rows.
    await expect(
      page.getByRole('heading', { name: 'Nachrichten' }),
    ).toBeVisible();

    // DIRECT rows render with `title = senderName` (Maria Mueller) and
    // body preview underneath (ConversationListItem.tsx:33-34, 73-75).
    // Matching on the unique body prefix isolates this run's row from
    // any pre-existing lehrer↔eltern DIRECT conversation (find-or-create
    // semantics mean the same conversation row can carry many prior
    // messages — only the latest is asserted).
    const row = page.getByRole('button', { name: new RegExp(`${MESSAGING_PREFIX}DIRECT-${ts}`) });
    await expect(
      row,
      'eltern-user must see the DIRECT message preview the lehrer just sent',
    ).toBeVisible();

    await row.click();

    // ConversationView renders the first message via MessageBubble
    // (MessageBubble.tsx:90). `.first()` because the unique body string
    // appears twice on the page after the row click: once in the
    // truncated list preview and once in the bubble itself. Assertion
    // intent ("body is rendered in ConversationView") is preserved.
    await expect(
      page.getByText(body).first(),
      'DIRECT message body must appear in ConversationView after click',
    ).toBeVisible();

    // DIRECT badge proves the row is the DIRECT path (not a stray
    // broadcast leaking through with a colliding prefix). `.first()`
    // because the same "Direkt" badge appears in BOTH the list row
    // (still visible in the left column) and the conversation header
    // after the row click.
    await expect(
      page.getByText('Direkt').first(),
      'Scope badge "Direkt" must render — guards against a broadcast-row false-positive',
    ).toBeVisible();
  });
});
