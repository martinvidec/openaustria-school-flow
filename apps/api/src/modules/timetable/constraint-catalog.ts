/**
 * Static catalog of all 16 solver constraints (7 HARD + 9 SOFT).
 *
 * SYNC: apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
 * SYNC: packages/shared/src/constraint-catalog.ts (frontend mirror)
 *
 * Constraint `name` values MUST match the Java @Constraint name() argument verbatim
 * (TimetableConstraintProvider.java:defineConstraints). The 9th SOFT entry
 * `Subject preferred slot` is added in Phase 14 Task 5 (NEW Java constraint stream).
 */

export type ConstraintSeverity = 'HARD' | 'SOFT';

export interface ConstraintCatalogEntry {
  name: string;            // EXACT Java constraint name
  displayName: string;     // German UI label
  description: string;     // German tooltip text
  severity: ConstraintSeverity;
  source: string;          // 'TimetableConstraintProvider.java#methodName'
}

export const CONSTRAINT_CATALOG: ConstraintCatalogEntry[] = [
  // === HARD (7) ===
  {
    name: 'Teacher conflict',
    displayName: 'Lehrkraft-Konflikt',
    description: 'Eine Lehrkraft darf nicht zwei Stunden gleichzeitig unterrichten.',
    severity: 'HARD',
    source: 'TimetableConstraintProvider.java#teacherConflict',
  },
  {
    name: 'Room conflict',
    displayName: 'Raum-Konflikt',
    description: 'Zwei Stunden dürfen nicht gleichzeitig im selben Raum stattfinden.',
    severity: 'HARD',
    source: 'TimetableConstraintProvider.java#roomConflict',
  },
  {
    name: 'Teacher availability',
    displayName: 'Lehrkraft-Verfügbarkeit',
    description: 'Eine Lehrkraft darf nicht in einer als gesperrt markierten Periode unterrichten.',
    severity: 'HARD',
    source: 'TimetableConstraintProvider.java#teacherAvailability',
  },
  {
    name: 'Student group conflict',
    displayName: 'Klassen-/Gruppen-Konflikt',
    description: 'Eine Klasse oder Gruppe darf nicht zwei sich überlappende Stunden gleichzeitig haben.',
    severity: 'HARD',
    source: 'TimetableConstraintProvider.java#studentGroupConflict',
  },
  {
    name: 'Room type requirement',
    displayName: 'Raumtyp-Anforderung',
    description: 'Stunden mit speziellem Raumbedarf (z. B. Turnsaal, Chemie-Saal) müssen in einem passenden Raum liegen.',
    severity: 'HARD',
    source: 'TimetableConstraintProvider.java#roomTypeRequirement',
  },
  {
    name: 'Class timeslot restriction',
    displayName: 'Klassen-Sperrzeit',
    description: 'Klassen dürfen nicht in gesperrten Perioden unterrichtet werden (siehe Tab Klassen-Sperrzeiten).',
    severity: 'HARD',
    source: 'TimetableConstraintProvider.java#classTimeslotRestriction',
  },
  {
    // Issue #72: hard constraint pinning each lesson to a timeslot whose
    // weekType is compatible. Activated when the school has A/B-week
    // rhythms enabled and at least one ClassSubject opts in.
    name: 'Week type compatibility',
    displayName: 'A/B-Wochen-Zuordnung',
    description: 'Stunden mit A- oder B-Wochen-Rhythmus müssen in der passenden Wochenvariante liegen.',
    severity: 'HARD',
    source: 'TimetableConstraintProvider.java#weekTypeCompatibility',
  },

  // === SOFT (9 — 8 existing + 1 NEW for Phase 14 Task 5) ===
  {
    name: 'No same subject doubling',
    displayName: 'Kein Doppel-Fach hintereinander',
    description: 'Vermeidet, dass dasselbe Fach in derselben Klasse direkt aufeinanderfolgend liegt.',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#noSameSubjectDoubling',
  },
  {
    name: 'Balanced weekly distribution',
    displayName: 'Gleichmäßige Wochenverteilung',
    description: 'Verteilt Fachstunden möglichst gleichmäßig über die Schultage.',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#balancedWeeklyDistribution',
  },
  {
    name: 'Max lessons per day',
    displayName: 'Maximale Stunden pro Tag',
    description: 'Reduziert übermäßig viele Stunden pro Klasse pro Tag.',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#maxLessonsPerDay',
  },
  {
    name: 'Prefer double periods',
    displayName: 'Doppelstunden bevorzugen',
    description: 'Bevorzugt zusammenhängende Doppelstunden für entsprechend markierte Fächer.',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#preferDoublePeriod',
  },
  {
    name: 'Home room preference',
    displayName: 'Stammraum-Präferenz',
    description: 'Bevorzugt das Halten einer Klasse in ihrem Stammraum.',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#homeRoomPreference',
  },
  {
    name: 'Minimize room changes',
    displayName: 'Raumwechsel minimieren',
    description: 'Reduziert unnötige Raumwechsel innerhalb eines Schultages.',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#minimizeRoomChanges',
  },
  {
    name: 'Prefer morning for main subjects',
    displayName: 'Hauptfächer am Vormittag',
    description: 'Bevorzugt das Legen der Hauptfächer auf die Vormittagsperioden.',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#preferMorningForMainSubjects',
  },
  {
    name: 'Subject time preference',
    displayName: 'Vormittags-Präferenz pro Fach',
    description: 'Bevorzugt für ein Fach ein konfigurierbares spätestes Periode (siehe Tab Fach-Präferenzen → Vormittags-Präferenzen).',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#subjectTimePreference',
  },
  {
    name: 'Subject preferred slot',
    displayName: 'Bevorzugter Slot pro Fach',
    description: 'Belohnt Stunden, die einem konfigurierten (Fach, Wochentag, Periode)-Slot entsprechen (siehe Tab Fach-Präferenzen → Bevorzugte Slots).',
    severity: 'SOFT',
    source: 'TimetableConstraintProvider.java#subjectPreferredSlot',
  },
];
