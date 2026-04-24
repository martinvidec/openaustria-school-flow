import { z } from 'zod';

/**
 * Link/unlink an existing Parent to a Student — Phase 12-01 (STUDENT-02, D-13.1).
 *
 * Used by:
 *   - POST /students/:id/parents (link existing Parent)
 *   - DELETE /students/:id/parents/:parentId (unlink; Parent record preserved)
 */

export const AssignParentSchema = z.object({
  parentId: z.string().uuid('Ungültige Eltern-ID'),
});

export const UnlinkParentSchema = z.object({
  studentId: z.string().uuid(),
  parentId: z.string().uuid(),
});

export type AssignParentInput = z.infer<typeof AssignParentSchema>;
export type UnlinkParentInput = z.infer<typeof UnlinkParentSchema>;
