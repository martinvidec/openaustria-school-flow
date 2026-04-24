import { z } from 'zod';

/**
 * ClassSubject schemas — Phase 12-02 shared Zod validation (SUBJECT-04, CLASS-03).
 *
 * Covers the Wochenstunden-Editor replace-all-in-tx payloads and the
 * Apply-Stundentafel dialog input.
 *
 * German user-facing error messages + English API field names (D-15).
 */

export const ApplyStundentafelSchema = z.object({
  schoolType: z.string().min(1, 'Schultyp wählen'),
});

export const ClassSubjectRowSchema = z.object({
  id: z.string().uuid().optional(), // undefined on new rows, set on existing
  subjectId: z.string().uuid('Fach wählen'),
  weeklyHours: z
    .number()
    .min(0, 'Wert muss >= 0 sein')
    .max(30, 'Wert muss <= 30 sein'),
  isCustomized: z.boolean().optional(),
  preferDoublePeriod: z.boolean().optional(),
});

export const UpdateClassSubjectsSchema = z.object({
  rows: z.array(ClassSubjectRowSchema).min(0),
});

export type ApplyStundentafelInput = z.infer<typeof ApplyStundentafelSchema>;
export type ClassSubjectRowInput = z.infer<typeof ClassSubjectRowSchema>;
export type UpdateClassSubjectsInput = z.infer<typeof UpdateClassSubjectsSchema>;
