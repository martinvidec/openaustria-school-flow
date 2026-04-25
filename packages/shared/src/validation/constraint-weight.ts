import { z } from 'zod';

/**
 * Constraint-Weight Zod schemas — Phase 14-01 (D-07).
 *
 * Used by:
 *   - Frontend Plan 14-02 Tab "Gewichtungen" RHF zodResolver
 *   - Backend Plan 14-01 Task 2 controller defence-in-depth
 */

export const constraintWeightsSchema = z.record(
  z.string().min(1),
  z.number().int().min(0).max(100),
);

export const bulkConstraintWeightsSchema = z.object({
  weights: constraintWeightsSchema,
});

export type ConstraintWeightsMap = z.infer<typeof constraintWeightsSchema>;
export type BulkConstraintWeightsInput = z.infer<typeof bulkConstraintWeightsSchema>;

/**
 * Phase 14: 9 configurable SOFT constraints (8 existing + 'Subject preferred slot').
 *
 * MUST stay in sync with apps/api/src/modules/timetable/dto/constraint-weight.dto.ts
 * DEFAULT_CONSTRAINT_WEIGHTS (the canonical Java mirror lives there).
 *
 * Frontend Plan 14-02 imports this constant verbatim to render 9 sliders.
 */
export const DEFAULT_CONSTRAINT_WEIGHTS: Record<string, number> = {
  'No same subject doubling': 10,
  'Balanced weekly distribution': 5,
  'Max lessons per day': 8,
  'Prefer double periods': 8,
  'Home room preference': 2,
  'Minimize room changes': 3,
  'Prefer morning for main subjects': 1,
  'Subject time preference': 3,
  'Subject preferred slot': 5,
};
