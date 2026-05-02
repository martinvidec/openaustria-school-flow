/**
 * Seed fixture UUID constants — mirrors `apps/api/prisma/seed.ts` SEED_* constants.
 *
 * Phase 15.1 (Plan 15.1-01, commit 40c1377) introduced UUID-aligned seed IDs
 * so the DSGVO admin DTOs (@IsUUID() on schoolId / personId) accept the
 * seeded school + persons. The matching e2e migration was incomplete, leaving
 * `'seed-school-bgbrg-musterstadt'` / `'kc-lehrer-teacher'` slug literals in
 * 14 specs + 1 fixture; Phase 17.1 (commit 47e1773) replaced those with
 * imports from this module. See GitHub issues #18, #20, #21.
 *
 * Update both `seed.ts` and this file in sync when seed IDs change. The
 * `KC_*_ID` Keycloak user UUIDs are NOT exported here — they are
 * Keycloak-internal and only referenced via `keycloakUserId` in seed.ts
 * (cross-system contract from `docker/keycloak/realm-export.json`).
 */

export const SEED_SCHOOL_UUID                  = 'a0000000-0000-4000-8000-000000000001';

export const SEED_PERSON_TEACHER_1_UUID        = 'b0000000-0000-4000-8000-000000000001';
export const SEED_PERSON_TEACHER_2_UUID        = 'b0000000-0000-4000-8000-000000000002';
export const SEED_PERSON_TEACHER_3_UUID        = 'b0000000-0000-4000-8000-000000000003';

export const SEED_PERSON_STUDENT_1_UUID        = 'c0000000-0000-4000-8000-000000000001';
export const SEED_PERSON_STUDENT_2_UUID        = 'c0000000-0000-4000-8000-000000000002';
export const SEED_PERSON_STUDENT_3_UUID        = 'c0000000-0000-4000-8000-000000000003';
export const SEED_PERSON_STUDENT_4_UUID        = 'c0000000-0000-4000-8000-000000000004';
export const SEED_PERSON_STUDENT_5_UUID        = 'c0000000-0000-4000-8000-000000000005';
export const SEED_PERSON_STUDENT_6_UUID        = 'c0000000-0000-4000-8000-000000000006';
export const SEED_PERSON_STUDENT_7_UUID        = 'c0000000-0000-4000-8000-000000000007'; // archived fixture

export const SEED_PERSON_KC_LEHRER_UUID        = 'd0000000-0000-4000-8000-000000000001';
export const SEED_PERSON_KC_SCHULLEITUNG_UUID  = 'd0000000-0000-4000-8000-000000000002';
export const SEED_PERSON_KC_ADMIN_UUID         = 'd0000000-0000-4000-8000-000000000003';
export const SEED_PERSON_KC_SCHUELER_UUID      = 'd0000000-0000-4000-8000-000000000004';
export const SEED_PERSON_KC_ELTERN_UUID        = 'd0000000-0000-4000-8000-000000000005';

export const SEED_STUDENT_1_UUID               = 'e0000000-0000-4000-8000-000000000001';
export const SEED_STUDENT_2_UUID               = 'e0000000-0000-4000-8000-000000000002';
export const SEED_STUDENT_3_UUID               = 'e0000000-0000-4000-8000-000000000003';
export const SEED_STUDENT_4_UUID               = 'e0000000-0000-4000-8000-000000000004';
export const SEED_STUDENT_5_UUID               = 'e0000000-0000-4000-8000-000000000005';
export const SEED_STUDENT_6_UUID               = 'e0000000-0000-4000-8000-000000000006';
export const SEED_STUDENT_7_UUID               = 'e0000000-0000-4000-8000-000000000007';

export const SEED_TEACHER_1_UUID               = 'f0000000-0000-4000-8000-000000000001';
export const SEED_TEACHER_2_UUID               = 'f0000000-0000-4000-8000-000000000002';
export const SEED_TEACHER_3_UUID               = 'f0000000-0000-4000-8000-000000000003';

// KC-linked Teacher / Student / Parent record IDs (separate prefix family):
export const SEED_TEACHER_KC_LEHRER_UUID       = '10000000-0000-4000-8000-000000000001';
export const SEED_TEACHER_KC_SCHULLEITUNG_UUID = '10000000-0000-4000-8000-000000000002';
export const SEED_STUDENT_KC_SCHUELER_UUID     = '10000000-0000-4000-8000-000000000003';
export const SEED_PARENT_KC_ELTERN_UUID        = '10000000-0000-4000-8000-000000000004';
export const SEED_PARENTSTUDENT_KC_ELTERN_UUID = '10000000-0000-4000-8000-000000000005';
