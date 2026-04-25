import { z } from 'zod';

/**
 * Constraint-Template Zod schemas — Phase 14-01 (D-09).
 *
 * Discriminated union over `templateType`. Used by frontend RHF zodResolver
 * AND backend defence-in-depth.
 *
 * Note: seed school IDs (`seed-class-1a`, etc.) are not RFC 4122 UUIDs, so we
 * use `.min(1)` instead of `.uuid()` (Phase 12 D-08 / Plan 12-03 fix pattern).
 */

export const dayOfWeekEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
]);

export const constraintTemplateParamsSchema = z.discriminatedUnion('templateType', [
  z.object({
    templateType: z.literal('NO_LESSONS_AFTER'),
    classId: z.string().min(1),
    maxPeriod: z.number().int().min(1).max(12),
  }),
  z.object({
    templateType: z.literal('SUBJECT_MORNING'),
    subjectId: z.string().min(1),
    latestPeriod: z.number().int().min(1).max(12),
  }),
  z.object({
    templateType: z.literal('SUBJECT_PREFERRED_SLOT'),
    subjectId: z.string().min(1),
    dayOfWeek: dayOfWeekEnum,
    period: z.number().int().min(1).max(12),
  }),
  z.object({
    templateType: z.literal('BLOCK_TIMESLOT'),
    teacherId: z.string().min(1),
    dayOfWeek: dayOfWeekEnum,
    periods: z.array(z.number().int().min(1).max(12)).min(1),
  }),
]);

export const createConstraintTemplateSchema = z.object({
  params: constraintTemplateParamsSchema,
  isActive: z.boolean().optional().default(true),
});

export type ConstraintTemplateParams = z.infer<typeof constraintTemplateParamsSchema>;
export type CreateConstraintTemplateInput = z.infer<typeof createConstraintTemplateSchema>;
