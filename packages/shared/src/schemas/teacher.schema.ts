import { z } from 'zod';

/**
 * Teacher schemas — Phase 11 shared Zod validation.
 *
 * German user-facing error messages (UI copy contract §11), English API field
 * names (defense-in-depth alongside existing NestJS class-validator DTOs per D-15).
 *
 * NOTE: `status` is a UI-level concept (ACTIVE/ARCHIVED). The Teacher model
 * currently has no dedicated status column — the frontend derives it from
 * heuristics (isPermanent flag, presence of active rules, etc.). If a real
 * archive column is added later this schema is the natural home for the enum.
 */

export const TeacherStatusEnum = z.enum(['ACTIVE', 'ARCHIVED']);
export type TeacherStatus = z.infer<typeof TeacherStatusEnum>;

/**
 * StammdatenSchema — Tab 1 (Stammdaten) form validation.
 * Vorname/Nachname/Titel/Email/Phone/Status (UI-SPEC §2.2).
 */
export const StammdatenSchema = z.object({
  firstName: z.string().min(1, 'Pflichtfeld').max(100),
  lastName: z.string().min(1, 'Pflichtfeld').max(100),
  academicTitle: z.string().max(32).optional(),
  email: z.string().email('Gültige E-Mail-Adresse eingeben'),
  phone: z.string().optional(),
  status: TeacherStatusEnum.default('ACTIVE'),
});

/**
 * LehrverpflichtungSchema — Tab 2 (Lehrverpflichtung) form validation.
 * Drives live Werteinheiten computation via
 * `calculateMaxTeachingHours` from '@schoolflow/shared'.
 */
export const LehrverpflichtungSchema = z.object({
  employmentPercentage: z
    .number()
    .min(0, 'Wert muss zwischen 0 und 100 liegen')
    .max(100, 'Wert muss zwischen 0 und 100 liegen'),
  oepuGroup: z.string().optional(),
  oepuFunctionHours: z.number().min(0).optional(),
  extraWerteinheiten: z.number().min(0).optional(),
  werteinheitenTarget: z.number().min(0).default(20),
  subjectIds: z.array(z.string().uuid()).default([]),
});

/**
 * TeacherCreateSchema — used by TeacherCreateDialog. Extends StammdatenSchema
 * with the two server-required fields (schoolId + employmentPercentage default).
 */
export const TeacherCreateSchema = StammdatenSchema.extend({
  schoolId: z.string().uuid(),
  employmentPercentage: z.number().min(0).max(100).default(100),
});

/**
 * TeacherUpdateSchema — all fields optional (PATCH-style partial update).
 */
export const TeacherUpdateSchema = StammdatenSchema.partial().merge(
  LehrverpflichtungSchema.partial(),
);

export type StammdatenInput = z.infer<typeof StammdatenSchema>;
export type LehrverpflichtungInput = z.infer<typeof LehrverpflichtungSchema>;
export type TeacherCreateInput = z.infer<typeof TeacherCreateSchema>;
export type TeacherUpdateInput = z.infer<typeof TeacherUpdateSchema>;
