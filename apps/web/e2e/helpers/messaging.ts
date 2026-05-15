/**
 * Messaging E2E helpers — #84.
 *
 * Phase 7 Conversation REST API:
 *   - POST /schools/:schoolId/conversations          — create + scope-expand
 *   - GET  /schools/:schoolId/conversations           — list for current user
 *   - DELETE /schools/:schoolId/conversations/:id     — admin-only cleanup
 *
 * Per-spec cleanup follows the established prefix-isolation pattern
 * (`helpers/students.ts`, `helpers/teachers.ts`): every E2E-created
 * conversation carries `E2E-MSG-…` in its subject so afterEach can sweep
 * by listing + filtering + deleting.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
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
 * Best-effort cleanup: list conversations the admin can see, filter by
 * subject prefix, and delete each. Swallows per-row errors so a parallel
 * spec deleting the same row mid-flight doesn't crash this sweep — same
 * pattern as `cleanupE2EParents`.
 */
export async function cleanupE2EConversations(
  request: APIRequestContext,
  prefix: string = MESSAGING_PREFIX,
): Promise<void> {
  const token = await getAdminToken(request);
  const listRes = await request.get(
    `${MESSAGING_API}/schools/${MESSAGING_SCHOOL_ID}/conversations?limit=200`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok()) return;
  const body = (await listRes.json()) as {
    data?: Array<{ id: string; subject?: string | null }>;
  };
  const list = body.data ?? [];
  await Promise.all(
    list
      .filter((c) => (c.subject ?? '').startsWith(prefix))
      .map((c) =>
        request.delete(
          `${MESSAGING_API}/schools/${MESSAGING_SCHOOL_ID}/conversations/${c.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ),
  );
}
