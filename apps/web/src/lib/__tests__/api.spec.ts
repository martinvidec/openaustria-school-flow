/* @vitest-environment jsdom */
/**
 * Regression guards for apiFetch's Content-Type header behavior.
 *
 * apiFetch (apps/web/src/lib/api.ts) is the cross-cutting authenticated fetch
 * wrapper used by every mutation hook in the web app. Its Content-Type
 * handling has had two production-impacting bugs in its short history; this
 * spec locks down the canonical behavior so neither can re-emerge silently.
 *
 * Case A — body-less DELETE has NO Content-Type header
 *   Locks in the fix from commit 1fb7abf (2026-04-02). The original scaffold
 *   (commit 03e8de5) unconditionally set `Content-Type: application/json` on
 *   every non-GET request, including body-less DELETE. Fastify 5.x rejects
 *   `Content-Type: application/json` + empty body with FST_ERR_CTP_EMPTY_JSON_BODY
 *   (HTTP 400), which broke EVERY DELETE in the app (resource delete, room
 *   booking cancel, etc.) for ~7 hours until 1fb7abf flipped the guard from
 *   `options?.method !== 'GET'` to `options?.body`. See
 *   .planning/debug/resolved/resource-delete-error.md for the full forensic
 *   trail. A regression of this assertion would re-break every DELETE.
 *
 * Case B — request with JSON body string sets Content-Type: application/json
 *   The canonical happy path. Mutation hooks (POST/PATCH/PUT) pass
 *   `body: JSON.stringify(dto)` and rely on apiFetch to set the Content-Type
 *   so Fastify parses the body. A regression here would silently strip the
 *   header and break every JSON-body mutation in the app — likely with a
 *   confusing `body must be object` validation error rather than an obvious
 *   500.
 *
 * Case C — request with FormData body has NO Content-Type set by apiFetch
 *   Locks in the fix from commit c70c134 (Phase 5.06, file-upload support for
 *   excuse attachments). When the body is FormData, the browser must set the
 *   Content-Type itself because the value includes a dynamically-generated
 *   multipart boundary string (`multipart/form-data; boundary=----WebKitFormBoundary...`).
 *   If apiFetch forces `application/json`, the browser does NOT override it,
 *   the server cannot parse the multipart payload, and every file upload
 *   feature breaks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/keycloak', () => ({
  keycloak: {
    updateToken: vi.fn().mockResolvedValue(true),
    token: 'test-token',
  },
}));

import { apiFetch } from '../api';

describe('apiFetch — Content-Type header regression guards', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 204, statusText: 'No Content' }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does NOT set Content-Type on body-less DELETE (regression guard for commit 1fb7abf)', async () => {
    await apiFetch('/x', { method: 'DELETE' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;

    // Critical: a Content-Type on a body-less request triggers Fastify
    // FST_ERR_CTP_EMPTY_JSON_BODY (400). Reverting the body-conditional guard
    // in api.ts L21 re-breaks every DELETE in the app.
    expect(headers.get('Content-Type')).toBeNull();
  });

  it('sets Content-Type: application/json when a JSON-string body is provided (canonical happy path)', async () => {
    await apiFetch('/x', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;

    // Canonical mutation path: every POST/PATCH/PUT relies on this.
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does NOT set Content-Type on FormData body — browser must set the multipart boundary (regression guard for commit c70c134)', async () => {
    const fd = new FormData();
    fd.append('file', new Blob(['hello'], { type: 'text/plain' }), 'test.txt');

    await apiFetch('/x', { method: 'POST', body: fd });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Headers;

    // Critical: apiFetch must NOT force application/json on FormData. The
    // browser sets `multipart/form-data; boundary=...` itself, where the
    // boundary is generated per-request. A user-set Content-Type prevents the
    // browser from emitting the boundary, breaking server-side multipart
    // parsing and every file upload feature (e.g. excuse attachments,
    // Phase 5.06).
    expect(headers.get('Content-Type')).toBeNull();
  });
});
