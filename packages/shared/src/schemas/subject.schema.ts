import { z } from 'zod';

/**
 * Subject (Fach) schemas — Phase 11 shared Zod validation.
 *
 * Per CONTEXT.md D-11 USER-OVERRIDE ROLLBACK (2026-04-22 post-research):
 * - Farbe field is REMOVED from Create/Edit (no schema columns for color).
 * - Subject colors are auto-derived via `getSubjectColor(id)` in
 *   `types/timetable.ts` (deterministic hash-to-SUBJECT_PALETTE).
 * - Schultyp multi-select (A4) also rolled back — no schoolType junction.
 *
 * UI error strings are user-facing German (UI-SPEC §11); API field names
 * stay English (defense-in-depth alongside NestJS class-validator per D-15).
 */

export const SubjectTypeEnum = z.enum([
  'PFLICHT',
  'WAHLPFLICHT',
  'FREIGEGENSTAND',
  'UNVERBINDLICH',
]);
export type SubjectTypeInput = z.infer<typeof SubjectTypeEnum>;

/**
 * SubjectCreateSchema — used by SubjectFormDialog (create mode) + FE→BE POST.
 *
 * `shortName` auto-uppercases on parse via `.transform(s => s.toUpperCase())` —
 * mirrors the UI onBlur transform so server-side validation also receives
 * canonical uppercase Kürzel (idempotent).
 */
export const SubjectCreateSchema = z.object({
  schoolId: z.string().uuid(),
  name: z.string().min(1, 'Pflichtfeld').max(64),
  shortName: z
    .string()
    .min(1, 'Pflichtfeld')
    .max(8, 'Maximal 8 Zeichen')
    .transform((s) => s.toUpperCase()),
  subjectType: SubjectTypeEnum.default('PFLICHT'),
  lehrverpflichtungsgruppe: z.string().optional(),
  werteinheitenFactor: z.number().optional(),
});

/**
 * SubjectUpdateSchema — all fields optional (PATCH-style partial update).
 */
export const SubjectUpdateSchema = SubjectCreateSchema.partial();

export type SubjectCreateInput = z.infer<typeof SubjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof SubjectUpdateSchema>;
