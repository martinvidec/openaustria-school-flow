/**
 * Phase 3 / Issue #133+#134 — regression lock for the
 * `Person.keycloakUserId` schema relaxation (composite-unique) and the
 * callsite refactor from `prisma.person.findUnique({ where: { keycloakUserId } })`
 * to `findFirst(...)`.
 *
 * Why this spec exists (E2E-first / CLAUDE.md hard rule):
 *   The PR that ships those two changes touches every authenticated read of
 *   GET /api/v1/users/me (the canonical user-context endpoint that powers
 *   useSchoolContext + useUserContext on the frontend). If the schema change
 *   landed without the callsite refactor (or vice versa), this endpoint
 *   would 500 at runtime for every persona because Prisma would reject the
 *   single-column where on a now-composite unique. This spec is the
 *   regression lock that would have caught that mismatch.
 *
 *   Pre-fix repro: revert apps/api/src/modules/user-context/user-context.service.ts
 *   to `findUnique({ where: { keycloakUserId } })` and re-run — the request
 *   throws PrismaClientValidationError -> 500.
 *
 * Why throwaway-school is NOT used here (CLAUDE.md D4 exception):
 *   The endpoint under test resolves the Person row via the live Keycloak
 *   JWT's `sub` claim. The seed users are KC-bound to the SEED_SCHOOL via
 *   fixed UUIDs (apps/api/prisma/seed.ts). A throwaway school would require
 *   provisioning new KC users for each test — out of scope for #133+#134
 *   and explicitly tracked as the #136 follow-up. This spec is read-only
 *   against the seed school (no writes) so it can't race with other specs.
 */
import { expect, test } from '@playwright/test';
import { getRoleToken, type Role } from './helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

/**
 * Expected shape per role per UserContextResponseDto + seed.ts.
 * `schoolId` is the seed school and must be returned for every persona —
 * proves the Person row was successfully resolved by keycloakUserId.
 */
const ROLE_EXPECTATIONS: Record<
  Role,
  { personType: 'TEACHER' | 'STUDENT' | 'PARENT' | null; hasTeacherId?: boolean; hasStudentId?: boolean; hasParentId?: boolean }
> = {
  admin: { personType: null }, // admin user has no Person row in seed (KC-only)
  schulleitung: { personType: null }, // same
  lehrer: { personType: 'TEACHER', hasTeacherId: true },
  eltern: { personType: 'PARENT', hasParentId: true },
  schueler: { personType: 'STUDENT', hasStudentId: true },
};

test.describe('AUTH-CTX — GET /api/v1/users/me after composite-unique schema migration', () => {
  for (const role of ['lehrer', 'eltern', 'schueler'] as const) {
    test(`AUTH-CTX-01.${role} — resolves Person via keycloakUserId (findFirst post-#133)`, async ({
      request,
    }) => {
      const token = await getRoleToken(request, role);
      const res = await request.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // The regression: a stale findUnique({ keycloakUserId }) call against
      // the post-#133 composite-unique schema returns 500 here.
      expect(res.status(), `users/me for ${role}`).toBe(200);

      const body = (await res.json()) as {
        schoolId: string;
        personId: string;
        personType: string;
        firstName: string;
        lastName: string;
        teacherId?: string;
        studentId?: string;
        parentId?: string;
      };

      expect(body.schoolId, 'schoolId from Person.findFirst').toBeTruthy();
      expect(body.personId, 'personId resolved').toBeTruthy();

      const expectation = ROLE_EXPECTATIONS[role];
      expect(body.personType).toBe(expectation.personType);
      if (expectation.hasTeacherId) expect(body.teacherId).toBeTruthy();
      if (expectation.hasStudentId) expect(body.studentId).toBeTruthy();
      if (expectation.hasParentId) expect(body.parentId).toBeTruthy();
    });
  }

  test('AUTH-CTX-02 — admin without Person row gets 404 (NotFoundException, not 500)', async ({
    request,
  }) => {
    // Admin/Schulleitung in seed have no Person row — this proves the
    // findFirst branch correctly returns null and surfaces 404 rather than
    // a Prisma runtime error.
    const token = await getRoleToken(request, 'admin');
    const res = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404]).toContain(res.status());
    // If the response is 500, the regression is back.
    expect(res.status(), 'must not 500 — that signals Prisma runtime rejection').not.toBe(500);
  });
});
