import { z } from 'zod';

/**
 * Phase 13-01 USER-02 — PUT /admin/users/:userId/roles payload.
 *
 * `roleNames` is a flat list of seeded role names (admin, schulleitung,
 * lehrer, eltern, schueler). Empty array is legal — it clears all roles
 * (the min-1-admin guard lives server-side in RoleManagementService and
 * surfaces as RFC 9457 409, not here).
 *
 * Hard cap of 5 matches the seed role count; more than that is never
 * legitimate and is almost certainly a client-side enumeration bug.
 */
export const updateUserRolesSchema = z.object({
  roleNames: z
    .array(z.string().min(1, 'Rollenname darf nicht leer sein'))
    .max(5, 'Maximal 5 Rollen pro Benutzer'),
});

export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
