/**
 * Phase 13-02 — frontend types mirroring the Plan 13-01 backend DTOs.
 *
 * The backend-side definitions live in:
 *   - apps/api/src/modules/user-directory/user-directory.service.ts (UserDirectorySummary)
 *   - apps/api/src/modules/effective-permissions/effective-permissions.service.ts (EffectivePermissionRow)
 *   - apps/api/src/modules/permission-override/* (PermissionOverride model)
 *
 * Shapes are kept structural-equivalent (not imported) to keep the web bundle
 * Prisma-free.
 */

export type PersonType = 'TEACHER' | 'STUDENT' | 'PARENT';

export interface UserDirectorySummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  enabled: boolean;
  createdTimestamp?: number;
  roles: string[];
  personLink: {
    id: string;
    personType: PersonType | string;
    firstName: string;
    lastName: string;
  } | null;
}

export type UserDirectoryDetail = UserDirectorySummary;

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
}

export interface PermissionOverride {
  id: string;
  userId: string;
  action: string;
  subject: string;
  granted: boolean;
  conditions: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  grantedBy: string | null;
}

export interface EffectivePermissionRow {
  action: string;
  subject: string;
  granted: boolean;
  conditions: Record<string, unknown> | null;
  interpolatedConditions: Record<string, unknown> | null;
  source: { kind: 'role'; roleName: string } | { kind: 'override' };
  reason: string | null;
}

export type LinkedFilter = 'all' | 'linked' | 'unlinked';
export type EnabledFilter = 'all' | 'active' | 'disabled';

export interface UserDirectoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string[];
  linked?: LinkedFilter;
  enabled?: EnabledFilter;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    totalIsApproximate?: boolean;
  };
}

/**
 * Shape of `extensions.affectedEntities` on RFC 9457 problem-detail bodies
 * surfaced by the LOCK-01 / link-conflict / last-admin-guard endpoints.
 */
export interface ProblemAffectedEntity {
  kind: 'user' | 'person-teacher' | 'person-student' | 'person-parent';
  id: string;
  email?: string | null;
  name?: string | null;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  extensions?: Record<string, unknown> & {
    affectedEntities?: ProblemAffectedEntity[];
  };
  affectedEntities?: ProblemAffectedEntity[];
}

export class UserApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;
  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
    this.name = 'UserApiError';
  }
}

export async function readProblemDetail(res: Response): Promise<ProblemDetail> {
  try {
    const json = (await res.json()) as ProblemDetail;
    return json;
  } catch {
    return { status: res.status, detail: `HTTP ${res.status}` };
  }
}
