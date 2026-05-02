/**
 * Phase 16 Plan 02 — Frontend re-declaration of the admin-dashboard
 * status DTOs. The backend (apps/api) owns the canonical types; this
 * file mirrors the wire shape so apps/web doesn't need a runtime
 * dependency on the API project.
 *
 * Keep in sync with the contract documented in
 * .planning/phases/16-admin-dashboard-mobile-h-rtung/16-CONTEXT.md.
 */

export type CategoryStatus = 'done' | 'partial' | 'missing';

export type CategoryKey =
  | 'school'
  | 'timegrid'
  | 'schoolyear'
  | 'subjects'
  | 'teachers'
  | 'classes'
  | 'students'
  | 'solver'
  | 'dsgvo'
  | 'audit';

export interface CategoryStatusDto {
  key: CategoryKey;
  status: CategoryStatus;
  /** German pre-formatted secondary line, e.g. "12 Lehrer:innen". */
  secondary: string;
}

export interface DashboardStatusDto {
  schoolId: string;
  /** ISO-8601 timestamp from the backend. */
  generatedAt: string;
  categories: CategoryStatusDto[];
}
