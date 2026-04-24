import { z } from 'zod';

/**
 * Move-student schemas — Phase 12-01 (STUDENT-03, D-05).
 *
 * `MoveStudentSchema`      — single-student move via PUT /students/:id.
 * `BulkMoveStudentSchema`  — multi-select bulk-move via sequential PUT per row
 *                            (UI-side orchestration with progress toast).
 */

export const MoveStudentSchema = z.object({
  targetClassId: z
    .string({ error: 'Bitte Ziel-Klasse auswählen' })
    .uuid('Bitte Ziel-Klasse auswählen'),
  notiz: z.string().max(500).optional(),
});

export const BulkMoveStudentSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'Keine Schüler:innen ausgewählt'),
  targetClassId: z
    .string({ error: 'Bitte Ziel-Klasse auswählen' })
    .uuid('Bitte Ziel-Klasse auswählen'),
  notiz: z.string().max(500).optional(),
});

export type MoveStudentInput = z.infer<typeof MoveStudentSchema>;
export type BulkMoveStudentInput = z.infer<typeof BulkMoveStudentSchema>;
