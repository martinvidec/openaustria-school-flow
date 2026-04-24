import { z } from 'zod';

/**
 * Student schemas — Phase 12-01 shared Zod validation (STUDENT-01..04).
 *
 * German user-facing error messages + English API field names (D-15).
 * Consumed by:
 *   - StudentCreateDialog / StudentStammdatenTab (RHF zodResolver)
 *   - useStudents hook (filter parsing + payload validation)
 *   - backend-parity defence-in-depth alongside NestJS class-validator DTOs
 */

export const StudentStammdatenSchema = z.object({
  firstName: z.string().min(1, 'Pflichtfeld').max(100),
  lastName: z.string().min(1, 'Pflichtfeld').max(100),
  email: z
    .string()
    .email('Gültige E-Mail-Adresse eingeben')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(), // ISO YYYY-MM-DD, encrypted at DB layer
  socialSecurityNumber: z.string().optional(),
  studentNumber: z.string().optional(),
  classId: z.string().uuid('Ungültige Klassen-ID').optional(),
  enrollmentDate: z.string().optional(),
});

export const StudentCreateSchema = StudentStammdatenSchema.extend({
  schoolId: z.string().uuid(),
  firstName: z.string().min(1, 'Pflichtfeld').max(100),
  lastName: z.string().min(1, 'Pflichtfeld').max(100),
  parentIds: z.array(z.string().uuid()).optional().default([]),
});

export const StudentUpdateSchema = StudentStammdatenSchema.partial();

export const StudentArchiveFilterEnum = z.enum(['active', 'archived', 'all']);
export type StudentArchiveFilter = z.infer<typeof StudentArchiveFilterEnum>;

export const StudentListFiltersSchema = z.object({
  schoolId: z.string().uuid(),
  search: z.string().optional(),
  classId: z.string().uuid().optional(),
  noClass: z.boolean().optional(),
  archived: StudentArchiveFilterEnum.default('active'),
  schoolYearId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type StudentStammdatenInput = z.infer<typeof StudentStammdatenSchema>;
export type StudentCreateInput = z.infer<typeof StudentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof StudentUpdateSchema>;
export type StudentListFilters = z.infer<typeof StudentListFiltersSchema>;
