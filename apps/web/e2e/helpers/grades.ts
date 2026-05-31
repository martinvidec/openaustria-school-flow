/**
 * Grades E2E helpers — #81.
 *
 * The grade API ships full CRUD plus a matrix endpoint:
 *   - POST   /classbook/grades                          — admin creates entry
 *   - GET    /classbook/grades/matrix/:classSubjectId   — student rows + weighted avg
 *   - PATCH  /classbook/grades/:gradeId                 — update
 *   - DELETE /classbook/grades/:gradeId                 — delete (returns 204)
 *
 * No description-prefix filter is needed for cleanup — the sweep is
 * scoped to one classSubjectId, which a single test owns end-to-end
 * via the throwaway-school timetable stack.
 */
import { type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

export const GRADES_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const GRADES_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

/**
 * Delete every Grade entry on a given classSubject. The grade-matrix
 * endpoint surfaces grades nested under each student row, so we collect
 * the ids from there and DELETE each in parallel. Best-effort — 404 per
 * row is fine (parallel sweep may have already removed it).
 */
export async function cleanupGradesForClassSubject(
  request: APIRequestContext,
  classSubjectId: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const matrixRes = await request.get(
    `${GRADES_API}/schools/${GRADES_SCHOOL_ID}/classbook/grades/matrix/${classSubjectId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!matrixRes.ok()) return;
  const matrix = (await matrixRes.json()) as {
    rows?: Array<{ grades: Array<{ id: string }> }>;
  };
  const gradeIds = (matrix.rows ?? []).flatMap((row) =>
    row.grades.map((g) => g.id),
  );
  await Promise.all(
    gradeIds.map((gradeId) =>
      request
        .delete(
          `${GRADES_API}/schools/${GRADES_SCHOOL_ID}/classbook/grades/${gradeId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .catch(() => undefined),
    ),
  );
}
