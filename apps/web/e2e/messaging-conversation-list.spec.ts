/**
 * Issue #84 — Messaging conversation list + detail view.
 *
 * Slice 1/n of the Messaging coverage gap. Locks the recipient-side flow:
 * a broadcast that the admin (Lehrer-equivalent) sends to class 1A must
 * surface in the parents' /messages list, and clicking it must show the
 * actual message body in ConversationView.
 *
 * Why this slice first: it exercises three load-bearing layers in one
 * test — conversation creation + scope expansion (backend membership
 * resolution), useConversations list fetch (frontend hook), and the
 * MessageBubble render (UI rendering of the first message). A bug in
 * any one of them surfaces here as a missing-row or missing-body
 * assertion.
 *
 * Multi-tab realtime, polls, and 1:1 direct-message specs are
 * intentionally deferred to follow-up PRs so this one stays reviewable.
 *
 * Chromium-only-skip per the race-family precedent — shared seed-school
 * mutating specs collide on parallel browser projects.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  MESSAGING_PREFIX,
  cleanupE2EConversations,
  createBroadcastConversation,
  type CreatedConversation,
} from './helpers/messaging';

const SEED_CLASS_1A_ID = 'seed-class-1a';

test.describe('Issue #84 — Messaging conversation list + detail (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'List-detail two-pane layout is desktop-only; mobile has a separate route the next slice will cover.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Conversation rows on the shared seed school race on parallel browser projects.',
  );

  let created: CreatedConversation | null = null;

  test.afterEach(async ({ request }) => {
    // Sweep ALL `E2E-MSG-` rows, not just the one created in beforeEach.
    // A killed previous run could leave parallel siblings behind, and
    // their members include the eltern-user — which would clutter the
    // ConversationList assertion below the next time this spec runs.
    await cleanupE2EConversations(request, MESSAGING_PREFIX);
    created = null;
  });

  test('MSG-LIST-01: broadcast to class 1A shows up in eltern-user list and opens with message body', async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const subject = `${MESSAGING_PREFIX}LIST-${ts}`;
    const body = `${MESSAGING_PREFIX}BODY-${ts} — Hallo Eltern, dies ist eine Test-Nachricht.`;

    created = await createBroadcastConversation(request, {
      scope: 'CLASS',
      scopeId: SEED_CLASS_1A_ID,
      subject,
      body,
    });
    expect(created.subject, 'API must echo back the subject we sent').toBe(
      subject,
    );

    await loginAsRole(page, 'eltern');
    await page.goto('/messages');

    // Page chrome must be visible — proves the route loaded before we
    // assert on list rows.
    await expect(
      page.getByRole('heading', { name: 'Nachrichten' }),
    ).toBeVisible();

    // The ConversationListItem renders the subject as its title (see
    // apps/web/src/components/messaging/ConversationListItem.tsx:34).
    // Use a precise match so a future spec's row doesn't accidentally
    // pass this one.
    const row = page.getByRole('button', { name: new RegExp(subject) });
    await expect(
      row,
      'eltern-user (Franz Huber, parent of Lisa in 1A) must be a member of the broadcast',
    ).toBeVisible();

    await row.click();

    // ConversationView renders the first message via MessageBubble
    // (apps/web/src/components/messaging/MessageBubble.tsx:90), so the
    // body text is a real on-page string after navigation. `.first()`
    // because the same body text appears 3x on page after the row click:
    // (1) the truncated `<span>` preview still visible in the list column,
    // (2) the MessageBubble paragraph in ConversationView, (3) a second
    // bubble render observed under high parallelism — assertion intent
    // ("body appears after clicking the row") is preserved.
    await expect(
      page.getByText(body).first(),
      'first message body must appear in ConversationView after click',
    ).toBeVisible();
  });
});
