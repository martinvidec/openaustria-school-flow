import type { AuthenticatedUser } from './authenticated-user';

/**
 * Request shape after `JwtAuthGuard` + `CurrentSchoolInterceptor` have run.
 *
 * - `user` is set by `JwtAuthGuard` (Keycloak passport strategy).
 * - `currentSchoolId` is set by `CurrentSchoolInterceptor` (see
 *   `docs/adr/0001-current-school-context.md`):
 *     - `null` for users with no Person row (admin-only KC accounts).
 *     - Otherwise the validated `X-School-Id` header value, or the user's
 *       first Person membership's `schoolId` as the fallback default.
 */
export interface RequestWithSchool {
  user: AuthenticatedUser;
  currentSchoolId: string | null;
}
