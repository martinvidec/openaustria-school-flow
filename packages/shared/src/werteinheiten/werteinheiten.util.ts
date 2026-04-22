/**
 * Austrian Lehrverpflichtung (Werteinheiten) calculation.
 *
 * Based on OEPU (Oesterreichischer Personalvertretungsbund) standards.
 * Each Lehrverpflichtungsgruppe has a factor that converts weekly teaching
 * hours into Werteinheiten (weighted units) for workload calculation.
 *
 * @see https://www.bmbwf.gv.at - Austrian Federal Ministry of Education
 */

export interface LehrverpflichtungsgruppeConfig {
  /** Multiplier for converting weekly hours to Werteinheiten */
  factor: number;
  /** Full employment teaching hours for this group */
  fullHours: number;
}

/**
 * All 9 Austrian Lehrverpflichtungsgruppen with their conversion factors.
 *
 * - I:   Languages (Deutsch, Englisch, Franzoesisch, Latein)
 * - II:  STEM core (Mathematik, Physik, Biologie, Chemie)
 * - III: Humanities (Geschichte, Geographie, Religion)
 * - IVb: Art/Music with exams (Bildnerische Erziehung/Musik with Matura)
 * - IVa: PE, Art, Music (Bewegung und Sport, BE, ME)
 * - IV:  Technical drawing (Darstellende Geometrie)
 * - V:   Choir, Theatre (Chor, Buehnenspiel)
 * - Va:  Practical nutrition (Ernaehrung und Haushalt, Praxis)
 * - VI:  Household economics (Hauswirtschaft)
 */
export const LEHRVERPFLICHTUNGSGRUPPEN: Record<string, LehrverpflichtungsgruppeConfig> = {
  'I':   { factor: 1.167, fullHours: 18 },
  'II':  { factor: 1.105, fullHours: 19 },
  'III': { factor: 1.050, fullHours: 20 },
  'IVb': { factor: 0.977, fullHours: 21.5 },
  'IVa': { factor: 0.955, fullHours: 22 },
  'IV':  { factor: 0.913, fullHours: 23 },
  'V':   { factor: 0.875, fullHours: 24 },
  'Va':  { factor: 0.825, fullHours: 25.45 },
  'VI':  { factor: 0.750, fullHours: 28 },
};

/**
 * Calculates the Werteinheiten (weighted teaching units) for a given
 * number of weekly hours in a specific Lehrverpflichtungsgruppe.
 *
 * @param weeklyHours - Number of weekly teaching hours in this subject/group
 * @param gruppe - The Lehrverpflichtungsgruppe identifier (e.g. 'I', 'II', 'IVa')
 * @returns The calculated Werteinheiten value
 * @throws Error if the Lehrverpflichtungsgruppe is unknown
 */
export function calculateWerteinheiten(weeklyHours: number, gruppe: string): number {
  const config = LEHRVERPFLICHTUNGSGRUPPEN[gruppe];
  if (!config) {
    throw new Error(
      `Unknown Lehrverpflichtungsgruppe: "${gruppe}". Valid groups: ${Object.keys(LEHRVERPFLICHTUNGSGRUPPEN).join(', ')}`,
    );
  }
  return weeklyHours * config.factor;
}

/**
 * Calculates the effective maximum teaching hours after applying reductions.
 *
 * Teachers may have reductions for roles like Kustodiat (lab custodian),
 * Klassenvorstand (class teacher), Mentor, Personalvertretung (staff rep), etc.
 * Each reduction is measured in Werteinheiten.
 *
 * @param werteinheitenTarget - The teacher's total Werteinheiten target (e.g. 20 for full-time)
 * @param reductions - Array of reductions, each with a werteinheiten value
 * @returns The effective Werteinheiten available for actual teaching
 */
export function calculateMaxTeachingHours(
  werteinheitenTarget: number,
  reductions: Array<{ werteinheiten: number }>,
): number {
  const totalReductions = reductions.reduce((sum, r) => sum + r.werteinheiten, 0);
  return werteinheitenTarget - totalReductions;
}
