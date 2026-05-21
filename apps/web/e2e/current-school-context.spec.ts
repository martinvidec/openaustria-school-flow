/**
 * Issue #135 — regression lock for the CurrentSchoolInterceptor + X-School-Id
 * header validation. ADR: docs/adr/0001-current-school-context.md.
 *
 * Why this spec exists (E2E-first / CLAUDE.md hard rule):
 *   The interceptor is a global APP_INTERCEPTOR that runs on every
 *   authenticated request. A regression that drops it from app.module.ts
 *   or makes it permissive would silently re-enable cross-tenant requests
 *   to succeed with the wrong schoolId — exactly the silent-permissiveness
 *   bug class memorialized in `feedback_useTeachers_tenant_leak`. This
 *   spec exercises the three load-bearing paths:
 *     - Valid header for your own school → 200
 *     - Foreign UUID header → 403
 *     - Header omitted → defaults to the user's only membership (200)
 *
 * Why throwaway-school is NOT used here (CLAUDE.md D4 exception):
 *   Same reason as auth-user-context.spec.ts — seed users are KC-bound to
 *   the SEED_SCHOOL. Read-only spec, no race risk.
 */
import { expect, test } from '@playwright/test';
import { getRoleToken } from './helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const FOREIGN_SCHOOL_UUID = '00000000-0000-0000-0000-deadbeef0001';

test.describe('CURR-SCHOOL — CurrentSchoolInterceptor + X-School-Id header validation', () => {
  test('CURR-SCHOOL-01 — valid X-School-Id matching the user\'s membership returns 200', async ({
    request,
  }) => {
    const token = await getRoleToken(request, 'lehrer');

    const me = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.status()).toBe(200);
    const ctx = (await me.json()) as {
      schoolId: string;
      availableSchools: Array<{ schoolId: string }>;
    };
    expect(ctx.availableSchools.length).toBeGreaterThan(0);

    const ownSchoolId = ctx.availableSchools[0].schoolId;
    const echoed = await request.get(`${API}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': ownSchoolId,
      },
    });
    expect(echoed.status(), 'lehrer with own X-School-Id').toBe(200);
    const body = (await echoed.json()) as { schoolId: string };
    expect(body.schoolId).toBe(ownSchoolId);
  });

  test('CURR-SCHOOL-02 — foreign X-School-Id returns 403, not 200-with-leak', async ({
    request,
  }) => {
    const token = await getRoleToken(request, 'lehrer');

    const res = await request.get(`${API}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': FOREIGN_SCHOOL_UUID,
      },
    });

    // The regression: dropping the interceptor (or making membership check
    // permissive) would let this request through with the user's default
    // schoolId — a silent cross-tenant leak.
    expect(res.status(), 'foreign X-School-Id must be rejected').toBe(403);
  });

  test('CURR-SCHOOL-03 — X-School-Id omitted falls back to first membership (single-school invariant)', async ({
    request,
  }) => {
    // Today every seed user has exactly one Person row, so the interceptor's
    // "default to first membership" fallback must keep the existing flow
    // working without a header. This is the backward-compatibility check.
    const token = await getRoleToken(request, 'eltern');
    const res = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { schoolId: string; availableSchools: Array<{ schoolId: string }> };
    expect(body.schoolId).toBe(body.availableSchools[0].schoolId);
  });

  test('CURR-SCHOOL-04 — admin without Person row + X-School-Id returns 403 (no implicit override)', async ({
    request,
  }) => {
    // Admins in seed have no Person row. The interceptor must NOT silently
    // accept any X-School-Id for them — that would defeat tenant isolation.
    const token = await getRoleToken(request, 'admin');
    const res = await request.get(`${API}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': FOREIGN_SCHOOL_UUID,
      },
    });
    expect(res.status(), 'admin without memberships sending X-School-Id must 403').toBe(403);
  });
});
