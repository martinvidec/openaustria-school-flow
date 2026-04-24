/**
 * Phase 12 Plan 12-03 — fixture for STUDENT-04 Parent-Link "search-existing" leg.
 *
 * Creates a Parent with a known email so the ParentSearchPopover's
 * 300ms-debounced email autocomplete can find a deterministic hit.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from '../helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

export interface ExistingParentFixture {
  parentId: string;
  email: string;
  firstName: string;
  lastName: string;
  cleanup: () => Promise<void>;
}

export async function seedExistingParent(
  request: APIRequestContext,
  schoolId: string,
  emailSeed?: string,
): Promise<ExistingParentFixture> {
  const token = await getAdminToken(request);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const ts = Date.now();
  const email = emailSeed ?? `e2e-parent-existing-${ts}@example.test`;
  const firstName = 'E2E-PARENT-EXISTING';
  const lastName = `${ts}`;

  const res = await request.post(`${API}/parents`, {
    headers,
    data: { schoolId, firstName, lastName, email },
  });
  expect(res.ok(), `POST /parents seed (${email})`).toBeTruthy();
  const body = (await res.json()) as {
    id?: string;
    parent?: { id: string };
  };
  const parentId = body.parent?.id ?? body.id;
  expect(parentId, 'parent id').toBeTruthy();

  const cleanup = async () => {
    await request.delete(`${API}/parents/${parentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return { parentId: parentId!, email, firstName, lastName, cleanup };
}

export async function cleanupExistingParent(
  request: APIRequestContext,
  refs: { parentId: string },
): Promise<void> {
  const token = await getAdminToken(request);
  await request.delete(`${API}/parents/${refs.parentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
