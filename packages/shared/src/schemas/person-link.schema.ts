import { z } from 'zod';

/**
 * Phase 13-01 USER-05 — POST/DELETE /admin/users/:userId/link-person payload.
 *
 * Tells the UserDirectoryService dispatcher which service to route to
 * (teacher / student / parent), and which Person/Teacher/Student/Parent
 * row to link. The user-side + person-side conflict checks (and the RFC
 * 9457 409 `schoolflow://errors/person-link-conflict` response) live in
 * the backend service — not here.
 */
export const linkPersonSchema = z.object({
  personType: z.enum(['TEACHER', 'STUDENT', 'PARENT']),
  personId: z.string().min(1, 'Person-ID darf nicht leer sein'),
});

export type LinkPersonInput = z.infer<typeof linkPersonSchema>;
