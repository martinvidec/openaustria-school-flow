import { z } from 'zod';

/**
 * TeachingReduction schema — Phase 11 shared Zod validation.
 *
 * Enum values MUST match the Prisma enum `ReductionType`
 * (apps/api/prisma/schema.prisma §264-§271). The original Phase 11 plan
 * referenced OEPU_FUNKTION / SUPPLIERREDUKTION / MENTORING / SONSTIGES —
 * those names do not exist in the database; the backend uses KUSTODIAT /
 * KLASSENVORSTAND / MENTOR / PERSONALVERTRETUNG / ADMINISTRATION / OTHER.
 * Using the plan's draft names would produce a 400 on every PUT. Staying
 * on the DB enum keeps the UI free-text Anmerkung field as the canonical
 * place for "Supplierreduktion" / "Sonstiges" semantic detail.
 */

export const ReductionTypeEnum = z.enum([
  'KUSTODIAT',
  'KLASSENVORSTAND',
  'MENTOR',
  'PERSONALVERTRETUNG',
  'ADMINISTRATION',
  'OTHER',
]);
export type ReductionType = z.infer<typeof ReductionTypeEnum>;

/**
 * TeachingReductionSchema — single row on Tab 4 (Ermässigungen).
 *
 * Anmerkung ("description") is required when Grund == OTHER per D-07:
 * admin must explain what the generic OTHER row stands for.
 */
export const TeachingReductionSchema = z
  .object({
    reductionType: ReductionTypeEnum,
    werteinheiten: z.number().min(0, 'Wert muss >= 0 sein'),
    description: z.string().max(120).optional(),
    schoolYearId: z.string().uuid().optional(),
  })
  .refine(
    (r) => r.reductionType !== 'OTHER' || (!!r.description && r.description.length > 0),
    { message: 'Anmerkung ist bei "Sonstiges" erforderlich', path: ['description'] },
  );

export type TeachingReductionInput = z.infer<typeof TeachingReductionSchema>;
