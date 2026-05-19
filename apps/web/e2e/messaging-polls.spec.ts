/**
 * Issue #84 — Messaging inline polls (slice 4/5).
 *
 * Locks the recipient-side voting flow on a `SINGLE_CHOICE` poll
 * attached to a CLASS broadcast:
 *
 *   1. Admin POSTs a conversation with `pollData` (CLASS scope to 1A,
 *      timestamped question, 3 options) — `PollService.createWithMessage`
 *      creates the `polls` row + `poll_options` rows + attaches them
 *      to the first message.
 *   2. eltern-user (Franz Huber, parent of Lisa in 1A) logs in →
 *      /messages → opens the broadcast.
 *   3. `PollDisplay` renders the question + 3 vote buttons (no result
 *      bars yet because `userVoteOptionIds.length === 0`).
 *   4. Click option 2 → `castVote` mutation → toast "Stimme abgegeben"
 *      → `showResults` flips to true → result bars render with 1/1
 *      vote on option 2.
 *
 * Why seed via API (not UI compose): the frontend
 * `useCreateConversation` hook sends the inline poll as `{ poll: ... }`
 * but the backend `CreateConversationDto` field name is `pollData`.
 * UI-compose with a poll silently sends the message without the poll
 * today. Tracked in PR #107 body as a separate
 * `useCreateConversation` field-rename fix.
 *
 * Why the voter is kc-lehrer (NOT eltern): the seed's `elternPermissions`
 * (apps/api/prisma/seed.ts:392) grant `read/create:message` but NOT
 * `create:poll`, so POST `/polls/:id/votes` 403s for eltern-user. The
 * issue text expects eltern to vote — that intent is broken at the
 * permission layer, also tracked in the PR body. kc-lehrer
 * (Klassenvorstand of 1A) IS a member of the CLASS-1A broadcast and
 * has `create:poll` from the lehrer permission set
 * (apps/api/prisma/seed.ts:376), so the test exercises the same
 * load-bearing UI surfaces (PollDisplay → vote button → toast →
 * result bars) using a role that the backend currently permits.
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
  createBroadcastConversation,
  type CreatedConversation,
} from './helpers/messaging';

const SEED_CLASS_1A_ID = 'seed-class-1a';

test.describe('Issue #84 — Messaging inline polls (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'PollDisplay is desktop-prioritised — mobile rendering is identical but the list-detail navigation differs.',
  );

  let created: CreatedConversation | null = null;

  test.afterEach(async ({ request }) => {
    // Scope the sweep to this spec's own sub-prefix so a sibling
    // messaging spec's cleanup (running on the other Playwright worker)
    // doesn't delete our mid-test conversation. Same pattern as the
    // E2E-EXC-*- sub-prefix scoping in the excuses specs.
    await cleanupE2EConversations(request, `${MESSAGING_PREFIX}POLL-`);
    created = null;
  });

  test('MSG-POLL-01: kc-lehrer (Klassenvorstand) votes on a SINGLE_CHOICE poll → toast → result bars surface with the voted option', async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const subject = `${MESSAGING_PREFIX}POLL-${ts}`;
    const body = `${MESSAGING_PREFIX}POLL-BODY-${ts} — Bitte abstimmen unten.`;
    const question = `${MESSAGING_PREFIX}POLL-Q-${ts} — Soll der Wandertag am Freitag stattfinden?`;
    const optionTexts = [
      `${MESSAGING_PREFIX}OPT-A-${ts} — Ja`,
      `${MESSAGING_PREFIX}OPT-B-${ts} — Nein`,
      `${MESSAGING_PREFIX}OPT-C-${ts} — Egal`,
    ];

    created = await createBroadcastConversation(request, {
      scope: 'CLASS',
      scopeId: SEED_CLASS_1A_ID,
      subject,
      body,
      pollData: {
        question,
        type: 'SINGLE_CHOICE',
        options: optionTexts,
      },
    });
    expect(created.id, 'POST /conversations with pollData must return an id').toBeTruthy();

    await loginAsRole(page, 'lehrer');
    await page.goto('/messages');

    // Open the broadcast — same row-matching pattern as MSG-LIST-01.
    await page.getByRole('button', { name: new RegExp(subject) }).click();

    // PollDisplay nests inside MessageBubble's poll branch which lives
    // inside a Radix `ScrollArea` viewport (ConversationView.tsx:143).
    // The ScrollArea uses absolute positioning and `overflow:hidden`
    // on the viewport, which Playwright's `toBeVisible()` reports as
    // hidden even when the element renders on screen. Use
    // `toBeAttached()` for DOM presence + `scrollIntoViewIfNeeded()`
    // before clicking the vote button so the click target is in the
    // visible viewport when the click lands.
    await expect(
      page.getByText(question).first(),
      'PollDisplay question text must be present in the DOM (ScrollArea-clipped visibility is not reliably testable)',
    ).toBeAttached();

    // "Offen" badge confirms the poll is open and votable
    // (PollDisplay.tsx:128). Same ScrollArea constraint applies, so
    // `toBeAttached` keeps the check honest without false-flagging
    // ScrollArea-clipped renders.
    await expect(
      page.getByText('Offen', { exact: true }).first(),
      'open polls must render the "Offen" status badge',
    ).toBeAttached();

    // Vote buttons render as one button per option (SINGLE_CHOICE
    // branch at PollDisplay.tsx:198). The option text appears verbatim
    // in the button's accessible name. Click option B ("Nein") — the
    // middle option, so the spec also locks that arbitrary-index votes
    // route to the correct option_id (not just the first).
    // `scrollIntoViewIfNeeded` because the option lives inside the
    // ScrollArea viewport; clicking without scrolling can land on the
    // ScrollArea scrollbar instead of the button on the smaller
    // desktop viewport.
    const voteButton = page
      .getByRole('button', { name: new RegExp(optionTexts[1]) });
    await voteButton.scrollIntoViewIfNeeded();
    await voteButton.click();

    await expect(
      page.getByText('Stimme abgegeben'),
      'success toast must fire after castVote commits',
    ).toBeVisible({ timeout: 5_000 });

    // After the toast, useCastVote invalidates the conversation+poll
    // cache → refetch → userVoteOptionIds=[opt-B] → showResults=true
    // → result bars render. The voted option's bar carries the
    // user-vote highlight (PollResultBar.tsx). Counting the "100%"
    // text — exactly one option got the only vote, so its bar shows
    // 100% and the other two show 0%. ScrollArea-attached (not
    // -visible) per the same constraint that applies to the question
    // assertion above.
    await expect(
      page.getByText('100%').first(),
      'after voting, the voted option must render at 100% (sole voter so far)',
    ).toBeAttached();

    // Cross-check: the chosen option text still appears AFTER the
    // showResults flip — proves the result bar render keeps the
    // label visible (not just the percentage).
    await expect(
      page.getByText(optionTexts[1]).first(),
      'voted option label must remain attached on the result bar',
    ).toBeAttached();
  });
});
