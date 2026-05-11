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

// Plan 12-03 Rule-1 fix (parity with Phase 11-03 DTO relaxation): seed
// fixture IDs (e.g. `seed-school-bgbrg-musterstadt`, `seed-class-1a`) are
// valid Prisma keys but not RFC 4122 UUIDs. `.uuid()` rejected them with
// "Ungültige Schul-ID" and the ClassCreateDialog form never submitted. The
// backend DTOs are the source of truth for ID format; client-side Zod uses a
// simpler non-empty-string guard that matches both shapes.
const ID_GUARD = (label: string) => z.string().min(1, label);

export const SchoolClassCreateSchema = z.object({
  schoolId: ID_GUARD('Ungültige Schul-ID'),
  name: z.string().min(1, 'Pflichtfeld').max(50, 'Maximal 50 Zeichen'),
  yearLevel: z
    .number()
    .int()
    .min(1, 'Jahrgangsstufe >= 1')
    .max(13, 'Jahrgangsstufe <= 13'),
  schoolYearId: ID_GUARD('Ungültige Schuljahr-ID'),
  klassenvorstandId: ID_GUARD('Ungültige Lehrer-ID').optional(),
  homeRoomId: ID_GUARD('Ungültige Raum-ID').optional(),
});

export const SchoolClassUpdateSchema = z.object({
  name: z.string().min(1, 'Pflichtfeld').max(50, 'Maximal 50 Zeichen').optional(),
  yearLevel: z.number().int().min(1).max(13).optional(),
  klassenvorstandId: ID_GUARD('Ungültige Lehrer-ID').nullable().optional(),
  homeRoomId: ID_GUARD('Ungültige Raum-ID').nullable().optional(),
});

export const ClassListFiltersSchema = z.object({
  schoolId: ID_GUARD('Ungültige Schul-ID'),
  schoolYearId: ID_GUARD('Ungültige Schuljahr-ID').optional(),
  yearLevels: z.array(z.number().int().min(1).max(13)).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SchoolClassCreateInput = z.infer<typeof SchoolClassCreateSchema>;
export type SchoolClassUpdateInput = z.infer<typeof SchoolClassUpdateSchema>;
export type ClassListFilters = z.infer<typeof ClassListFiltersSchema>;
