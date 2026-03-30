import { IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * Default soft constraint weights used when admin has not customized.
 * Keys match Timefold constraint names exactly.
 *
 * These defaults are mirrored in TimetableConstraintConfiguration.java.
 * If you change a default here, also update the Java @ConstraintWeight annotation.
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
};

/**
 * List of all configurable soft constraint names.
 * Hard constraints are not configurable.
 */
export const CONFIGURABLE_CONSTRAINT_NAMES = Object.keys(DEFAULT_CONSTRAINT_WEIGHTS);

/**
 * DTO for overriding soft constraint weights.
 * Passed to the solver as part of the solve request.
 * Each field is optional -- only specified weights override the defaults.
 * Values must be between 0 (disabled) and 100.
 */
export class ConstraintWeightOverrideDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  'No same subject doubling'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  'Balanced weekly distribution'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  'Max lessons per day'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  'Prefer double periods'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  'Home room preference'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  'Minimize room changes'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  'Prefer morning for main subjects'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  'Subject time preference'?: number;
}

/**
 * Merge admin overrides with defaults to produce a complete weight map
 * for the solver. Keys not in overrides use default values.
 */
export function mergeWeightOverrides(
  overrides?: Record<string, number>,
): Record<string, number> {
  return {
    ...DEFAULT_CONSTRAINT_WEIGHTS,
    ...(overrides ?? {}),
  };
}
