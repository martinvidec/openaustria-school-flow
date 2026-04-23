import type { SchoolType } from '../schemas/school.schema.js';

/**
 * Deutsche Anzeigenamen für die 7 österreichischen Schultypen.
 * Quelle: UI-SPEC §3.4.1 (Phase 11) + 11-CONTEXT.md D-10.
 *
 * Keys MUST match `SCHOOL_TYPES` in `schemas/school.schema.ts`.
 */
export const SCHOOL_TYPES_LABELS: Record<SchoolType, string> = {
  VS: 'Volksschule',
  NMS: 'Mittelschule',
  AHS: 'Allgemeinbildende Höhere Schule',
  BHS: 'Berufsbildende Höhere Schule',
  BMS: 'Berufsbildende Mittlere Schule',
  PTS: 'Polytechnische Schule',
  ASO: 'Allgemeine Sonderschule',
};

/**
 * Legacy SchoolType labels — covers the historical `AHS_UNTER`, `AHS_OBER`,
 * `MS` enum values still present in `apps/api/prisma/schema.prisma` and
 * used as keys in `AUSTRIAN_STUNDENTAFELN`. Phase 11 uses these for the
 * Stundentafel-Vorlagen tabs alongside the 7 modern labels.
 */
export const LEGACY_SCHOOL_TYPES_LABELS: Record<string, string> = {
  AHS_UNTER: 'AHS Unterstufe',
  AHS_OBER: 'AHS Oberstufe',
  MS: 'Mittelschule (legacy)',
};

/**
 * Unified lookup — returns a deutsches label for any known SchoolType
 * (modern or legacy). Falls back to the raw key if unknown.
 */
export function getSchoolTypeLabel(schoolType: string): string {
  if (schoolType in SCHOOL_TYPES_LABELS) {
    return SCHOOL_TYPES_LABELS[schoolType as SchoolType];
  }
  if (schoolType in LEGACY_SCHOOL_TYPES_LABELS) {
    return LEGACY_SCHOOL_TYPES_LABELS[schoolType];
  }
  return schoolType;
}
