/**
 * Phase 14 Plan 14-03 — shared constraint API helpers.
 *
 * Provides setup + cleanup for ConstraintWeightOverride + ConstraintTemplate
 * fixtures used by the Phase 14 E2E specs (E2E-SOLVER-*).
 *
 * Mirrors `apps/web/e2e/helpers/subjects.ts` shape so the Phase 12-style
 * per-spec cleanup pattern (afterEach prefix sweep / bulk reset) keeps
 * working without bespoke fixture wiring.
 *
 * Backend endpoints (Plan 14-01):
 *   GET    /api/v1/schools/:schoolId/constraint-weights
 *   PUT    /api/v1/schools/:schoolId/constraint-weights         (replace-all-in-tx)
 *   DELETE /api/v1/schools/:schoolId/constraint-weights/:name   (reset to default)
 *   POST   /api/v1/schools/:schoolId/constraint-templates
 *   GET    /api/v1/schools/:schoolId/constraint-templates[?templateType=...]
 *   PUT    /api/v1/schools/:schoolId/constraint-templates/:id
 *   PATCH  /api/v1/schools/:schoolId/constraint-templates/:id/active
 *   DELETE /api/v1/schools/:schoolId/constraint-templates/:id
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

export const CONSTRAINT_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const CONSTRAINT_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;
/** Spec ID prefix locked at plan-level for matrix traceability. */
export const CONSTRAINT_PREFIX = 'E2E-SOLVER-';

/**
 * Set ONE weight override (constraintName → weight) preserving any other
 * overrides already in place. The PUT endpoint is replace-all-in-tx so we
 * GET the merged map first and merge the new value on top.
 */
export async function createConstraintWeightOverrideViaAPI(
  request: APIRequestContext,
  constraintName: string,
  weight: number,
): Promise<void> {
  const token = await getAdminToken(request);
  // GET returns the merged { weights: Record<string,number>, lastUpdatedAt }
  // shape (Plan 14-01 contract). Use the merged map so we don't accidentally
  // reset other constraints back to defaults via empty-PUT.
  const current = await request.get(
    `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-weights`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(current.ok(), 'GET /constraint-weights seed').toBeTruthy();
  const body = (await current.json()) as {
    weights: Record<string, number>;
    lastUpdatedAt: string | null;
  };
  const next = { ...body.weights, [constraintName]: weight };
  const res = await request.put(
    `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-weights`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { weights: next },
    },
  );
  expect(
    res.ok(),
    `PUT /constraint-weights seed (${constraintName}=${weight})`,
  ).toBeTruthy();
}

export type ConstraintTemplateType =
  | 'NO_LESSONS_AFTER'
  | 'SUBJECT_MORNING'
  | 'SUBJECT_PREFERRED_SLOT';

/**
 * Create a single ConstraintTemplate row via API. Returns the created id.
 *
 * Caller supplies the templateType-specific `params` payload:
 *   NO_LESSONS_AFTER       → { classId, maxPeriod }
 *   SUBJECT_MORNING        → { subjectId, latestPeriod }
 *   SUBJECT_PREFERRED_SLOT → { subjectId, dayOfWeek, period }
 */
export async function createConstraintTemplateViaAPI(
  request: APIRequestContext,
  templateType: ConstraintTemplateType,
  params: Record<string, unknown>,
  isActive = true,
): Promise<{ id: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(
    `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-templates`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { templateType, params, isActive },
    },
  );
  expect(
    res.ok(),
    `POST /constraint-templates seed (${templateType}) → ${res.status()}`,
  ).toBeTruthy();
  return (await res.json()) as { id: string };
}

/**
 * Best-effort cleanup: delete every constraint-template (optionally filtered
 * by templateType) for the seed school. Swallows individual DELETE errors so
 * a partial state from a previous run doesn't block the suite.
 *
 * `templateType` accepts a single ConstraintTemplateType OR an array of them.
 * Specs SHOULD pass the type(s) they create — an unscoped wipe (omitted arg)
 * races against parallel specs on the second worker that also create
 * templates: cleanup from one spec deletes the row another spec is mid-flight
 * on, surfacing as 404 on the in-flight spec's DELETE click. Same family as
 * the DSGVO cleanupAll race fixed in efe4ce3.
 */
export async function cleanupConstraintTemplatesViaAPI(
  request: APIRequestContext,
  templateType?: ConstraintTemplateType | ConstraintTemplateType[],
): Promise<void> {
  const token = await getAdminToken(request);
  const types = Array.isArray(templateType)
    ? templateType
    : templateType
      ? [templateType]
      : null;

  // Fetch the full list once. Per-type filtering happens client-side so we
  // never make an unscoped server fetch when scoping is asked for.
  const listRes = await request.get(
    `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-templates`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok()) return;
  const all = (await listRes.json()) as Array<{ id: string; templateType: string }>;
  const filtered = types
    ? all.filter((t) => types.includes(t.templateType as ConstraintTemplateType))
    : all;
  await Promise.all(
    filtered.map((t) =>
      request
        .delete(
          `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-templates/${t.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .catch(() => undefined),
    ),
  );
}

/**
 * Reset all weight overrides for the seed school back to defaults via the
 * bulk-PUT replace-all-in-tx with an empty map. Plan 14-01 spec confirms an
 * empty `weights: {}` payload runs only the deleteMany branch (no createMany
 * with empty data[]).
 */
export async function cleanupConstraintWeightOverridesViaAPI(
  request: APIRequestContext,
): Promise<void> {
  const token = await getAdminToken(request);
  await request
    .put(
      `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-weights`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { weights: {} },
      },
    )
    .catch(() => undefined);
}
