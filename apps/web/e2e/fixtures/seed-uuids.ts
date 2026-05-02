/**
 * Stable UUIDs from `apps/api/prisma/seed.ts` — single source of truth for E2E
 * tests that reference seed-data rows by ID.
 *
 * Background: Phase 15.1-01 (commit 40c1377) migrated all seed IDs from string
 * slugs (`'seed-school-bgbrg-musterstadt'`, `'kc-lehrer-teacher'`) to UUIDs,
 * but the e2e specs were not updated and continued to look up rows by the old
 * slugs. The slug rows do not exist in the DB, so every Prisma `findFirst`
 * with the slug returned `null` and tests failed with errors like
 * `Teacher kc-lehrer-teacher not found` or `school-class for ... null`.
 *
 * Tracking: GitHub issues #18, #20, #21.
 *
 * NOTE: These values must stay in sync with `apps/api/prisma/seed.ts`. If a
 * seed UUID changes, update this file in the same PR. There is intentionally
 * no shared package for these — seed.ts is internal to apps/api, and these
 * constants are an e2e-test concern.
 */

// School ──────────────────────────────────────────────────────────────────────
export const SEED_SCHOOL_UUID = 'a0000000-0000-4000-8000-000000000001';

// Keycloak-linked Persons (Person.id) ─────────────────────────────────────────
export const SEED_PERSON_KC_LEHRER_UUID = 'd0000000-0000-4000-8000-000000000001';
export const SEED_PERSON_KC_SCHULLEITUNG_UUID = 'd0000000-0000-4000-8000-000000000002';
export const SEED_PERSON_KC_ADMIN_UUID = 'd0000000-0000-4000-8000-000000000003';
export const SEED_PERSON_KC_SCHUELER_UUID = 'd0000000-0000-4000-8000-000000000004';
export const SEED_PERSON_KC_ELTERN_UUID = 'd0000000-0000-4000-8000-000000000005';

// Keycloak-linked Teacher / Student / Parent rows (Teacher.id, Student.id, Parent.id) ─
export const SEED_TEACHER_KC_LEHRER_UUID = '10000000-0000-4000-8000-000000000001';
export const SEED_TEACHER_KC_SCHULLEITUNG_UUID = '10000000-0000-4000-8000-000000000002';
export const SEED_STUDENT_KC_SCHUELER_UUID = '10000000-0000-4000-8000-000000000003';
export const SEED_PARENT_KC_ELTERN_UUID = '10000000-0000-4000-8000-000000000004';
