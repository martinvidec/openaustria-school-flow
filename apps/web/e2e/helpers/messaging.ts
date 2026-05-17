/**
 * Messaging E2E helpers — #84.
 *
 * Phase 7 Conversation REST API:
 *   - POST /schools/:schoolId/conversations          — create + scope-expand
 *   - GET  /schools/:schoolId/conversations           — list for current user
 *   - DELETE /schools/:schoolId/conversations/:id     — admin/schulleitung only
 *
 * Per-spec cleanup follows the established prefix-isolation pattern
 * (`helpers/students.ts`, `helpers/teachers.ts`): every E2E-created
 * conversation carries `E2E-MSG-…` in its subject (broadcast) or body
 * (DIRECT — DIRECT has no subject in the data model) so afterEach can
 * sweep by listing + filtering + deleting.
 *
 * Listing is actor-scoped: `GET /conversations` only returns rows where
 * the caller is a `conversationMembers` row. Admin sees the broadcasts
 * they created, but DIRECT lehrer↔eltern rows require listing AS lehrer
 * (or eltern). Deletion is always done with the admin token because the
 * DELETE endpoint requires the `manage:communication` permission, which
 * lehrer/eltern do not have.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken, getRoleToken, type Role } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

export const MESSAGING_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const MESSAGING_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

/** Spec ID prefix locked at issue-level for matrix traceability. */
export const MESSAGING_PREFIX = 'E2E-MSG-';

export interface CreateBroadcastInput {
  subject: string;
  body: string;
  scopeId: string;
  scope?: 'CLASS' | 'YEAR_GROUP' | 'SCHOOL';
}

export interface CreateDirectInput {
  /** Keycloak userId of the recipient — resolve via `getSeedUserId(request, role)`. */
  recipientId: string;
  body: string;
  /**
   * Role to POST as. Defaults to 'lehrer' because that's the canonical
   * sender for the lehrer→eltern flow specified in #84.
   */
  actorRole?: Role;
}

export interface CreatedConversation {
  id: string;
  subject: string | null;
}

/**
 * Create a broadcast conversation as the admin user. Returns the new
 * conversation's id + subject so the spec can drive assertions off the
 * exact same row the API created.
 *
 * Defaults to scope=CLASS so the most common spec pattern (Lehrer →
 * Class) is a one-liner. Override `scope` for YEAR_GROUP / SCHOOL.
 */
export async function createBroadcastConversation(
  request: APIRequestContext,
  input: CreateBroadcastInput,
): Promise<CreatedConversation> {
  const token = await getAdminToken(request);
  const res = await request.post(
    `${MESSAGING_API}/schools/${MESSAGING_SCHOOL_ID}/conversations`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        scope: input.scope ?? 'CLASS',
        scopeId: input.scopeId,
        subject: input.subject,
        body: input.body,
      },
    },
  );
  expect(
    res.ok(),
    `POST /conversations seed (${input.subject}) → ${res.status()}`,
  ).toBeTruthy();
  const body = (await res.json()) as { id: string; subject: string | null };
  return { id: body.id, subject: body.subject };
}

/**
 * Create a DIRECT 1:1 conversation as `actorRole` (default 'lehrer'), to
 * the given recipient keycloakUserId, with `body` as the first message.
 *
 * DIRECT is find-or-create: if an existing conversation between the
 * actor and recipient exists (e.g. left over from a prior run that
 * cleanup didn't sweep), the backend re-uses it AND appends `body` as a
 * new message. Either way, the latest message body matches `body` and
 * surfaces in the recipient's list — so the spec assertion is stable
 * regardless of leftover state.
 */
export async function createDirectConversation(
  request: APIRequestContext,
  input: CreateDirectInput,
): Promise<CreatedConversation> {
  const role = input.actorRole ?? 'lehrer';
  const token = await getRoleToken(request, role);
  const res = await request.post(
    `${MESSAGING_API}/schools/${MESSAGING_SCHOOL_ID}/conversations`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        scope: 'DIRECT',
        recipientId: input.recipientId,
        body: input.body,
      },
    },
  );
  expect(
    res.ok(),
    `POST /conversations DIRECT (as ${role} → ${input.recipientId}) → ${res.status()}`,
  ).toBeTruthy();
  const body = (await res.json()) as { id: string; subject: string | null };
  return { id: body.id, subject: body.subject };
}

/**
 * Best-effort cleanup: list conversations visible to the listing actor,
 * keep rows whose subject OR last-message body starts with `prefix`, and
 * delete each via the admin token. Swallows per-row errors so a parallel
 * spec deleting the same row mid-flight doesn't crash this sweep — same
 * pattern as `cleanupE2EParents`.
 *
 * `listAs` defaults to 'admin'. Broadcast specs (where admin created the
 * conversation and is therefore a member) can leave the default. DIRECT
 * specs must pass the actor that participated in the conversation
 * (lehrer or eltern) — admin is NOT a member of DIRECT rows, so a
 * default-admin list would return zero DIRECT hits and the row would
 * leak.
 *
 * Bugfix note: the previous version typed the GET response as
 * `{ data?: ConversationDto[] }` and read `body.data ?? []`, but the
 * endpoint returns a bare `ConversationDto[]`. The sweep silently
 * no-op'd for the entire lifetime of PR #91, leaving every E2E-MSG-
 * broadcast in the DB. Fixed here as part of the DIRECT extension
 * because the new spec hits the same code path.
 */
export async function cleanupE2EConversations(
  request: APIRequestContext,
  prefix: string = MESSAGING_PREFIX,
  listAs: Role = 'admin',
): Promise<void> {
  const listToken = await getRoleToken(request, listAs);
  const adminToken =
    listAs === 'admin' ? listToken : await getAdminToken(request);
  const listRes = await request.get(
    `${MESSAGING_API}/schools/${MESSAGING_SCHOOL_ID}/conversations?limit=200`,
    { headers: { Authorization: `Bearer ${listToken}` } },
  );
  if (!listRes.ok()) return;
  const list = (await listRes.json()) as Array<{
    id: string;
    scope: string;
    subject?: string | null;
    lastMessage?: { body?: string | null } | null;
  }>;
  await Promise.all(
    list
      .filter((c) => {
        const subj = c.subject ?? '';
        const body = c.lastMessage?.body ?? '';
        return subj.startsWith(prefix) || body.startsWith(prefix);
      })
      .map((c) =>
        request.delete(
          `${MESSAGING_API}/schools/${MESSAGING_SCHOOL_ID}/conversations/${c.id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } },
        ),
      ),
  );
}
