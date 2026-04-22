import { z } from 'zod';

/**
 * AvailabilityRule schema — Phase 11 shared Zod validation.
 *
 * Enum values MUST match the Prisma enums `AvailabilityRuleType` and
 * `DayOfWeek` (apps/api/prisma/schema.prisma §257-§262 / §30-§37).
 * Any drift here silently breaks the replace-all PUT pipeline.
 */

export const DayOfWeekEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
]);
export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;

export const AvailabilityRuleTypeEnum = z.enum([
  'MAX_DAYS_PER_WEEK',
  'BLOCKED_PERIOD',
  'BLOCKED_DAY_PART',
  'PREFERRED_FREE_DAY',
]);
export type AvailabilityRuleType = z.infer<typeof AvailabilityRuleTypeEnum>;

export const DayPartEnum = z.enum(['MORNING', 'AFTERNOON']);
export type DayPart = z.infer<typeof DayPartEnum>;

/**
 * AvailabilityRuleSchema — mirrors CreateAvailabilityRuleDto (NestJS
 * class-validator) so server-side re-validation stays byte-identical.
 *
 * A "blocked cell" in the VerfuegbarkeitsGrid (UI concept) maps to
 * `ruleType: 'BLOCKED_PERIOD'` with the cell's dayOfWeek + periodNumbers.
 */
export const AvailabilityRuleSchema = z.object({
  ruleType: AvailabilityRuleTypeEnum,
  dayOfWeek: DayOfWeekEnum.optional(),
  periodNumbers: z.array(z.number().int().positive()).default([]),
  maxValue: z.number().int().optional(),
  dayPart: DayPartEnum.optional(),
  isHard: z.boolean().default(true),
});

export type AvailabilityRuleInput = z.infer<typeof AvailabilityRuleSchema>;
