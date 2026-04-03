import type { GradeCategory, GradeWithCategory, WeightConfig } from '@schoolflow/shared';

/** All valid grade decimal values (Austrian 1-5 with +/- modifiers) per D-05 */
export const VALID_GRADE_VALUES = [
  0.75, 1.0, 1.25, 1.75, 2.0, 2.25, 2.75, 3.0, 3.25, 3.75, 4.0, 4.25, 4.75, 5.0, 5.25,
] as const;

/** Grade display string to decimal value mapping */
const DISPLAY_TO_VALUE: Record<string, number> = {
  '1+': 0.75, '1': 1.0, '1-': 1.25,
  '2+': 1.75, '2': 2.0, '2-': 2.25,
  '3+': 2.75, '3': 3.0, '3-': 3.25,
  '4+': 3.75, '4': 4.0, '4-': 4.25,
  '5+': 4.75, '5': 5.0, '5-': 5.25,
};

/** Decimal value to display string mapping (reverse of above) */
const VALUE_TO_DISPLAY: Record<number, string> = Object.fromEntries(
  Object.entries(DISPLAY_TO_VALUE).map(([k, v]) => [v, k]),
);

/**
 * Format a decimal grade value to Austrian display notation.
 * E.g., 1.75 -> "2+", 3.0 -> "3", 2.25 -> "2-"
 */
export function formatGradeDisplay(value: number): string {
  return VALUE_TO_DISPLAY[value] ?? String(value);
}

/**
 * Parse a grade display string to its decimal value.
 * E.g., "2+" -> 1.75, "3" -> 3.0
 * Returns null for invalid input.
 */
export function parseGradeInput(input: string): number | null {
  const trimmed = input.trim();
  return DISPLAY_TO_VALUE[trimmed] ?? null;
}

/**
 * Check if a decimal value is a valid Austrian grade.
 */
export function isValidGradeValue(value: number): boolean {
  return (VALID_GRADE_VALUES as readonly number[]).includes(value);
}

/**
 * Calculate weighted average for a set of grades using configurable category weights.
 * Handles missing categories by re-normalizing weights across available categories only.
 * Returns null if no grades provided.
 *
 * D-06: Three fixed categories: Schularbeit 40%, Muendlich 30%, Mitarbeit 30% (defaults).
 *       Teacher can override per classSubject.
 */
export function calculateWeightedAverage(
  grades: GradeWithCategory[],
  weights: WeightConfig,
): number | null {
  if (grades.length === 0) return null;

  const categoryMap: Record<GradeCategory, number[]> = {
    SCHULARBEIT: [],
    MUENDLICH: [],
    MITARBEIT: [],
  };

  for (const g of grades) {
    categoryMap[g.category].push(g.value);
  }

  const weightMap: Record<GradeCategory, number> = {
    SCHULARBEIT: weights.schularbeitPct,
    MUENDLICH: weights.muendlichPct,
    MITARBEIT: weights.mitarbeitPct,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const category of ['SCHULARBEIT', 'MUENDLICH', 'MITARBEIT'] as GradeCategory[]) {
    const values = categoryMap[category];
    if (values.length === 0) continue; // Skip empty categories, re-normalize

    const categoryAvg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const weight = weightMap[category];
    weightedSum += categoryAvg * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100; // Round to 2 decimals
}
