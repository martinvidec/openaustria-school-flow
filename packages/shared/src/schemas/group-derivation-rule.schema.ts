import { z } from 'zod';

/**
 * GroupDerivationRule schemas — Phase 12-02 (CLASS-05, D-12).
 *
 * Persists group-derivation rules per class so the admin Rule-Builder
 * round-trips state to the server rather than stashing rules in request
 * bodies only.
 */

export const GroupTypeEnum = z.enum([
  'RELIGION',
  'WAHLPFLICHT',
  'LEISTUNG',
  'LANGUAGE',
  'CUSTOM',
]);

export const GroupDerivationRuleCreateSchema = z.object({
  groupType: GroupTypeEnum,
  groupName: z.string().min(1, 'Pflichtfeld').max(100, 'Maximal 100 Zeichen'),
  level: z.string().max(100, 'Maximal 100 Zeichen').optional(),
  studentIds: z.array(z.string().uuid('Ungültige Schüler-ID')).optional().default([]),
});

export const GroupDerivationRuleUpdateSchema =
  GroupDerivationRuleCreateSchema.partial();

export type GroupDerivationRuleCreateInput = z.infer<
  typeof GroupDerivationRuleCreateSchema
>;
export type GroupDerivationRuleUpdateInput = z.infer<
  typeof GroupDerivationRuleUpdateSchema
>;
export type GroupTypeValue = z.infer<typeof GroupTypeEnum>;
