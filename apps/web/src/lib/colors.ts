import { SUBJECT_PALETTE, getSubjectColor } from '@schoolflow/shared';
import type { SubjectColorPair } from '@schoolflow/shared';

export { SUBJECT_PALETTE, getSubjectColor };
export type { SubjectColorPair };

/** Local cache for admin color overrides (fetched from school settings) */
const colorOverrides = new Map<string, SubjectColorPair>();

/**
 * Returns the subject color, preferring admin overrides over the computed palette color.
 * Overrides are loaded from school settings and cached locally.
 */
export function getSubjectColorWithOverride(subjectId: string): SubjectColorPair {
  return colorOverrides.get(subjectId) ?? getSubjectColor(subjectId);
}

/**
 * Sets a color override for a specific subject.
 * Called when admin overrides are loaded from school settings.
 */
export function setColorOverride(subjectId: string, colors: SubjectColorPair): void {
  colorOverrides.set(subjectId, colors);
}

/**
 * Clears all color overrides. Useful when switching schools or resetting.
 */
export function clearColorOverrides(): void {
  colorOverrides.clear();
}
