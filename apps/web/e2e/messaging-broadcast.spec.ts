/**
 * Issue #84 — Messaging broadcast via ComposeDialog UI (slice 3/5).
 *
 * Locks the UI-driven CLASS broadcast flow that MSG-LIST-01 (PR #91)
 * exercised only via the API helper. The flow:
 *
 *   1. Admin opens /messages → clicks "Neue Nachricht" →
 *      `ComposeDialog` mounts on the "Rundnachricht" tab.
 *   2. Scope stays at "Klasse" (default), Target gets the seed class
 *      UUID, Subject + Body filled, Send.
 *   3. Dialog closes after the POST /conversations commits + the
 *      first message lands (`ConversationController.create` ships both
 *      in one request).
 *   4. eltern-user (Franz Huber, parent of Lisa in 1A) logs into a
 *      second page session → /messages → the broadcast row surfaces
 *      with the subject we typed.
 *
 * Why a separate UI spec (not just MSG-LIST-01 via API): the
 * ComposeDialog's broadcast tab wires the scope Select + target Input
 * + subject + body + the footer "Nachricht senden" button. A
 * regression in any of those bindings (default scope drift, button
 * disabled by stale validation, scopeId stripped before mutate) would
 * not be caught by an API-driven seed. This spec is the only place
 * those bindings are integration-tested.
 *
 * Known UX gap (out of scope, flagged for follow-up): the broadcast
 * tab's "Klasse" target is a free-text `<input>` — the user must type
 * the literal class UUID. The dialog has no class-picker dropdown.
 * `ComposeDialog.tsx:184` placeholder suggests "z.B. 3A" which is
 * misleading because the backend's `expandClass` uses `scopeId` as a
 * Prisma `findUnique` on `id`. A proper class picker would parallel
 * the AbsenceForm teacher Select pattern. For now this spec types the
 * seed UUID directly to lock the WIRE contract (the dialog DOES
 * forward whatever scopeId text it receives); a UX fix is a separate
 * PR with its own UI-driving regression test.
 *
 * Chromium-only-skip per the race-family precedent — shared seed-school
 * conversations on parallel browser projects collide on the
 * subject-prefix sweep.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  MESSAGING_PREFIX,
  cleanupE2EConversations,
} from './helpers/messaging';

const SEED_CLASS_1A_ID = 'seed-class-1a';

test.describe('Issue #84 — Messaging broadcast via ComposeDialog (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'ComposeDialog is desktop-prioritised — mobile layout uses a different sheet pattern that will be locked in a follow-up.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Shared seed-school broadcasts race on parallel browser projects.',
  );

  test.afterEach(async ({ request }) => {
    // Scope to this spec's own sub-prefix so a sibling spec's afterEach
    // (on the other worker) doesn't sweep our mid-test conversation.
    await cleanupE2EConversations(request, `${MESSAGING_PREFIX}BROADCAST-UI-`);
  });

  test('MSG-BROADCAST-01: admin sends CLASS broadcast via ComposeDialog UI → eltern-user sees it in /messages', async ({
    browser,
    request,
  }) => {
    const ts = Date.now();
    const subject = `${MESSAGING_PREFIX}BROADCAST-UI-${ts}`;
    const body = `${MESSAGING_PREFIX}BCAST-BODY-${ts} — Eltern-Information aus dem ComposeDialog UI-Flow.`;

    // Two browser contexts so admin's compose session and eltern's
    // recipient session don't share auth state. cheaper than re-login
    // via the same context.
    const adminContext = await browser.newContext();
    const elternContext = await browser.newContext();
    try {
      const adminPage = await adminContext.newPage();
      const elternPage = await elternContext.newPage();

      await loginAsRole(adminPage, 'admin');
      await adminPage.goto('/messages');

      // ConversationList renders the trigger button.
      await adminPage
        .getByRole('button', { name: 'Neue Nachricht' })
        .click();

      // Dialog header confirms the dialog mounted on the Rundnachricht
      // tab by default (TabsTrigger value="broadcast" is the
      // defaultValue at ComposeDialog.tsx:172).
      await expect(
        adminPage.getByRole('heading', { name: 'Neue Nachricht' }),
      ).toBeVisible();

      // Scope stays at "Klasse" (default at ComposeDialog.tsx:54).
      // Target is the free-text input that wires straight to scopeId.
      await adminPage.fill('input#target', SEED_CLASS_1A_ID);
      await adminPage.fill('input#subject', subject);
      await adminPage.fill('textarea#body', body);

      await adminPage
        .getByRole('button', { name: 'Nachricht senden' })
        .click();

      // The dialog closes on a successful POST (ComposeDialog.tsx:111
      // → onOpenChange(false)). Waiting for the heading to leave the
      // DOM is the "POST committed" signal — no toast is fired today.
      await expect(
        adminPage.getByRole('heading', { name: 'Neue Nachricht' }),
      ).toHaveCount(0);

      // Eltern picks up the broadcast in their list. Same locator
      // pattern as MSG-LIST-01 — subject is the discriminator.
      await loginAsRole(elternPage, 'eltern');
      await elternPage.goto('/messages');
      await expect(
        elternPage.getByRole('heading', { name: 'Nachrichten' }),
      ).toBeVisible();

      await expect(
        elternPage.getByRole('button', {
          name: new RegExp(subject),
        }),
        'eltern-user must see the broadcast in their list — proves admin → CLASS → expandClass(seed-class-1a) → member rows landed for the parent',
      ).toBeVisible();

      // Click through to ConversationView and assert the body. Locks
      // the second leg: useCreateConversation's response chained the
      // first-message body into the conversation, so the recipient
      // sees the actual text not just an empty thread.
      await elternPage
        .getByRole('button', { name: new RegExp(subject) })
        .click();
      await expect(
        elternPage.getByText(body).first(),
        'message body must render in ConversationView after clicking the broadcast row',
      ).toBeVisible();
    } finally {
      await adminContext.close();
      await elternContext.close();
      // Best-effort cleanup independent of the per-test request fixture
      // (which is bound to a third "default" context not used above).
      // Scope to this spec's own sub-prefix so a sibling spec's afterEach
    // (on the other worker) doesn't sweep our mid-test conversation.
    await cleanupE2EConversations(request, `${MESSAGING_PREFIX}BROADCAST-UI-`);
    }
  });
});
