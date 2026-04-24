import { z } from 'zod';

/**
 * SchoolClass schemas — Phase 12-02 shared Zod validation (CLASS-01..05).
 *
 * German user-facing error messages + English API field names (D-15).
 * Consumed by:
 *   - ClassCreateDialog / ClassStammdatenTab (RHF zodResolver)
 *   - useClasses hook (filter parsing + payload validation)
 *   - backend-parity defence-in-depth alongside NestJS class-validator DTOs
 */

export const SchoolClassCreateSchema = z.object({
  schoolId: z.string().uuid('Ungültige Schul-ID'),
  name: z.string().min(1, 'Pflichtfeld').max(50, 'Maximal 50 Zeichen'),
  yearLevel: z
    .number()
    .int()
    .min(1, 'Jahrgangsstufe >= 1')
    .max(13, 'Jahrgangsstufe <= 13'),
  schoolYearId: z.string().uuid('Ungültige Schuljahr-ID'),
  klassenvorstandId: z.string().uuid('Ungültige Lehrer-ID').optional(),
});

export const SchoolClassUpdateSchema = z.object({
  name: z.string().min(1, 'Pflichtfeld').max(50, 'Maximal 50 Zeichen').optional(),
  yearLevel: z.number().int().min(1).max(13).optional(),
  klassenvorstandId: z.string().uuid().nullable().optional(),
});

export const ClassListFiltersSchema = z.object({
  schoolId: z.string().uuid('Ungültige Schul-ID'),
  schoolYearId: z.string().uuid('Ungültige Schuljahr-ID').optional(),
  yearLevels: z.array(z.number().int().min(1).max(13)).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SchoolClassCreateInput = z.infer<typeof SchoolClassCreateSchema>;
export type SchoolClassUpdateInput = z.infer<typeof SchoolClassUpdateSchema>;
export type ClassListFilters = z.infer<typeof ClassListFiltersSchema>;
