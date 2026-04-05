import { getISOWeek } from 'date-fns';

/**
 * A/B week resolver utility.
 *
 * Phase 3 convention (Open Question 3 resolution): ISO-week parity determines
 * the A/B week cycle when a school has abWeekEnabled=true. Odd ISO weeks map to
 * weekType 'A' and even ISO weeks map to 'B'. Lessons with weekType='BOTH'
 * always apply, regardless of parity.
 *
 * When abWeekEnabled=false for the school, the only valid weekType is 'BOTH';
 * the helpers short-circuit so callers can pass any stored weekType without
 * accidentally filtering lessons out.
 */
export type WeekType = 'A' | 'B' | 'BOTH';

/**
 * Returns true if a lesson with the given weekType applies on the given date.
 * When abWeekEnabled=false, every weekType is considered compatible (Phase 3
 * stores weekType='BOTH' for non-A/B schools, but callers should not depend on
 * that detail).
 */
export function isWeekCompatible(
  date: Date,
  lessonWeekType: string,
  abWeekEnabled: boolean,
): boolean {
  if (!abWeekEnabled) return true;
  if (lessonWeekType === 'BOTH') return true;
  const isoWeek = getISOWeek(date);
  const targetWeekType: WeekType = isoWeek % 2 === 1 ? 'A' : 'B';
  return lessonWeekType === targetWeekType;
}

/**
 * Resolves the A/B weekType active for a given calendar date.
 * Returns 'BOTH' when A/B mode is disabled at the school level.
 */
export function resolveWeekType(date: Date, abWeekEnabled: boolean): WeekType {
  if (!abWeekEnabled) return 'BOTH';
  const isoWeek = getISOWeek(date);
  return isoWeek % 2 === 1 ? 'A' : 'B';
}
