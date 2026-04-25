import { apiFetch } from '@/lib/api';
import type {
  ConstraintCatalogEntry,
  ConstraintWeightsMap,
  ConstraintTemplateParams,
} from '@schoolflow/shared';

/**
 * Phase 14-02: Solver-Tuning API client.
 *
 * Wraps the backend endpoints delivered by Plan 14-01:
 *   GET    /api/v1/schools/:schoolId/timetable/constraint-catalog
 *   GET    /api/v1/schools/:schoolId/constraint-weights      → { weights, lastUpdatedAt }
 *   PUT    /api/v1/schools/:schoolId/constraint-weights      body { weights }
 *   DELETE /api/v1/schools/:schoolId/constraint-weights/:constraintName
 *   GET    /api/v1/schools/:schoolId/constraint-templates
 *   POST   /api/v1/schools/:schoolId/constraint-templates
 *   PUT    /api/v1/schools/:schoolId/constraint-templates/:id
 *   PATCH  /api/v1/schools/:schoolId/constraint-templates/:id/active
 *   DELETE /api/v1/schools/:schoolId/constraint-templates/:id
 *   GET    /api/v1/schools/:schoolId/timetable/runs?limit=1&order=desc
 *
 * NOTE: `apiFetch` returns a `Response` — callers must check `res.ok` and
 * parse JSON themselves (mirrors Phase 11/12/13 admin hook conventions).
 */

export type ConstraintTemplateType =
  | 'NO_LESSONS_AFTER'
  | 'SUBJECT_MORNING'
  | 'SUBJECT_PREFERRED_SLOT'
  | 'BLOCK_TIMESLOT';

export interface ConstraintTemplate {
  id: string;
  schoolId: string;
  templateType: ConstraintTemplateType;
  params: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ConstraintWeightsResponse {
  weights: ConstraintWeightsMap;
  lastUpdatedAt: string | null;
}

export interface TimetableRunSummary {
  id: string;
  status: string;
  hardScore: number | null;
  softScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  constraintConfig?: Record<string, number> | null;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  extensions?: Record<string, unknown>;
}

export class SolverTuningApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;
  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

async function readProblemDetail(res: Response): Promise<ProblemDetail> {
  try {
    return (await res.json()) as ProblemDetail;
  } catch {
    return { status: res.status, detail: `HTTP ${res.status}` };
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new SolverTuningApiError(res.status, await readProblemDetail(res));
  }
  return (await res.json()) as T;
}

async function unwrapVoid(res: Response): Promise<void> {
  if (!res.ok) {
    throw new SolverTuningApiError(res.status, await readProblemDetail(res));
  }
}

export const solverTuningApi = {
  async getConstraintCatalog(schoolId: string): Promise<ConstraintCatalogEntry[]> {
    const res = await apiFetch(`/api/v1/schools/${schoolId}/timetable/constraint-catalog`);
    return unwrap(res);
  },

  async getConstraintWeights(schoolId: string): Promise<ConstraintWeightsResponse> {
    const res = await apiFetch(`/api/v1/schools/${schoolId}/constraint-weights`);
    return unwrap(res);
  },

  async putConstraintWeights(
    schoolId: string,
    weights: ConstraintWeightsMap,
  ): Promise<ConstraintWeightsResponse> {
    const res = await apiFetch(`/api/v1/schools/${schoolId}/constraint-weights`, {
      method: 'PUT',
      body: JSON.stringify({ weights }),
    });
    return unwrap(res);
  },

  async resetConstraintWeight(schoolId: string, constraintName: string): Promise<void> {
    const res = await apiFetch(
      `/api/v1/schools/${schoolId}/constraint-weights/${encodeURIComponent(constraintName)}`,
      { method: 'DELETE' },
    );
    return unwrapVoid(res);
  },

  async listTemplates(
    schoolId: string,
    templateType?: ConstraintTemplateType,
  ): Promise<ConstraintTemplate[]> {
    const res = await apiFetch(`/api/v1/schools/${schoolId}/constraint-templates`);
    const all = await unwrap<ConstraintTemplate[]>(res);
    return templateType ? all.filter((t) => t.templateType === templateType) : all;
  },

  async createTemplate(
    schoolId: string,
    params: ConstraintTemplateParams,
    isActive = true,
  ): Promise<ConstraintTemplate> {
    const res = await apiFetch(`/api/v1/schools/${schoolId}/constraint-templates`, {
      method: 'POST',
      body: JSON.stringify({
        templateType: params.templateType,
        params,
        isActive,
      }),
    });
    return unwrap(res);
  },

  async updateTemplate(
    schoolId: string,
    id: string,
    params: ConstraintTemplateParams,
  ): Promise<ConstraintTemplate> {
    const res = await apiFetch(`/api/v1/schools/${schoolId}/constraint-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ params }),
    });
    return unwrap(res);
  },

  async setTemplateActive(
    schoolId: string,
    id: string,
    isActive: boolean,
  ): Promise<ConstraintTemplate> {
    const res = await apiFetch(
      `/api/v1/schools/${schoolId}/constraint-templates/${id}/active`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      },
    );
    return unwrap(res);
  },

  async deleteTemplate(schoolId: string, id: string): Promise<void> {
    const res = await apiFetch(
      `/api/v1/schools/${schoolId}/constraint-templates/${id}`,
      { method: 'DELETE' },
    );
    return unwrapVoid(res);
  },

  async getLatestRun(schoolId: string): Promise<TimetableRunSummary | null> {
    const res = await apiFetch(
      `/api/v1/schools/${schoolId}/timetable/runs?limit=1&order=desc`,
    );
    const list = await unwrap<TimetableRunSummary[]>(res);
    return list[0] ?? null;
  },
};
