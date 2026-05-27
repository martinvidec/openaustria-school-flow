/**
 * Issue #84 — Messaging DIRECT 1:1 (lehrer → eltern, recipient visibility).
 *
 * Issue #150 (Phase 3.5/3) — migrated to throwaway-school per CLAUDE.md D4.
 * The `messaging:direct:lehrer-eltern:${SEED_SCHOOL_UUID}` advisory lock
 * is gone; each spec owns its own throwaway School so DIRECT find-or-create
 * (Pitfall 5) lives in tenant-isolated rows. The same PR also closed a
 * latent backend bug — `conversations.direct_pair_key` was previously a
 * GLOBALLY unique column, so two parallel throwaway specs would alias to
 * a single Conversation row on whichever throwaway happened to win the
 * race. The composite (school_id, direct_pair_key) unique introduced in
 * the same PR restores per-tenant isolation.
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
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  MESSAGING_PREFIX,
  createDirectConversation,
  type CreatedConversation,
} from './helpers/messaging';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #84 — Messaging DIRECT 1:1 (lehrer → eltern, throwaway-school, #150)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'List-detail two-pane layout is desktop-only; mobile has a separate route a future slice will cover.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;
  let created: CreatedConversation | null = null;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { lehrer: true, eltern: true },
      withClasses: 1,
      namePrefix: 'E2E-MSG-DIRECT',
    });
  });

  test.afterEach(async () => {
    created = null;
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('MSG-DIRECT-01: lehrer-sent DIRECT message appears in eltern-user list and opens with body', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const elternKcId = fixture.keycloakUserIds.eltern;
    if (!elternKcId) throw new Error('throwaway fixture missing eltern KC id');

    await useThrowawaySchoolHeader(context, fixture.schoolId);

    const ts = Date.now();
    const body = `${MESSAGING_PREFIX}DIRECT-${ts} — Hallo, eine direkte Nachricht von Maria Mueller.`;

    created = await createDirectConversation(request, {
      actorRole: 'lehrer',
      recipientId: elternKcId,
      body,
      schoolId: fixture.schoolId,
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
    // semantics within this school — global cross-school aliasing was
    // closed in #150 backend changes).
    const row = page.getByRole('button', { name: new RegExp(`${MESSAGING_PREFIX}DIRECT-${ts}`) });
    await expect(
      row,
      'eltern-user must see the DIRECT message preview the lehrer just sent',
    ).toBeVisible();

    await row.click();

    // ConversationView renders the first message via MessageBubble
    // (MessageBubble.tsx:90). `.first()` because the unique body string
    // appears twice on the page after the row click: once in the
    // truncated list preview and once in the bubble itself.
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
