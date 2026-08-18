// Datenmodell: Konstanten, Entity-Factories, ID-Vergabe, Validierung.
// Feldnamen spiegeln apps/api/prisma/schema.prisma der Hauptapp.

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'stundenplaner.v1';

export const ROOM_TYPES = ['KLASSENZIMMER', 'TURNSAAL', 'EDV_RAUM', 'WERKRAUM', 'LABOR', 'MUSIKRAUM'];

export const ROOM_TYPE_LABELS = {
  KLASSENZIMMER: 'Klassenzimmer',
  TURNSAAL: 'Turnsaal',
  EDV_RAUM: 'EDV-Raum',
  WERKRAUM: 'Werkraum',
  LABOR: 'Labor',
  MUSIKRAUM: 'Musikraum',
};

export const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const DAY_LABELS = {
  MONDAY: 'Montag',
  TUESDAY: 'Dienstag',
  WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag',
  FRIDAY: 'Freitag',
  SATURDAY: 'Samstag',
};

export const DAY_LABELS_SHORT = {
  MONDAY: 'MO',
  TUESDAY: 'DI',
  WEDNESDAY: 'MI',
  THURSDAY: 'DO',
  FRIDAY: 'FR',
  SATURDAY: 'SA',
};

const TIME_RE = /^\d{2}:\d{2}$/;

// ---- ID-Vergabe: lesbare Zähler-Strings (t1, r2, cs17) je Präfix ----

export function nextId(doc, prefix) {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const list of [doc.subjects, doc.teachers, doc.rooms, doc.classes, doc.classSubjects]) {
    for (const item of list) {
      const m = re.exec(item.id);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return `${prefix}${max + 1}`;
}

// ---- Leeres Dokument ----

export function emptyDocument() {
  return {
    schemaVersion: SCHEMA_VERSION,
    school: {
      name: 'Neue Schule',
      schoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      timeGrid: { name: '', periods: [] },
    },
    subjects: [],
    teachers: [],
    rooms: [],
    classes: [],
    classSubjects: [],
    timetable: null,
    settings: { solverSeed: null, timeLimitMs: 8000, weights: {} },
  };
}

// ---- Abgeleitete Werte ----

export function lessonPeriods(doc) {
  return doc.school.timeGrid.periods
    .filter((p) => !p.isBreak)
    .slice()
    .sort((a, b) => a.periodNumber - b.periodNumber);
}

export function gridSlots(doc) {
  return doc.school.schoolDays.length * lessonPeriods(doc).length;
}

export function teacherName(t) {
  return t ? `${t.firstName} ${t.lastName}` : '—';
}

export function byId(list, id) {
  return list.find((x) => x.id === id) ?? null;
}

// ---- Validierung ----

export function validatePeriods(periods) {
  const errors = [];
  const seen = new Set();
  for (const p of periods) {
    if (!Number.isInteger(p.periodNumber) || p.periodNumber < 1) {
      errors.push(`Ungültige Stundennummer: ${p.periodNumber}`);
    }
    if (seen.has(p.periodNumber)) errors.push(`Stundennummer ${p.periodNumber} ist doppelt.`);
    seen.add(p.periodNumber);
    if (!TIME_RE.test(p.startTime) || !TIME_RE.test(p.endTime)) {
      errors.push(`Zeile ${p.periodNumber}: Uhrzeiten müssen im Format HH:mm sein.`);
    }
  }
  return errors;
}

// Prüft ein importiertes Dokument auf strukturelle Mindestanforderungen.
export function validateDocument(doc) {
  if (!doc || typeof doc !== 'object') return 'Datei enthält kein JSON-Objekt.';
  if (doc.schemaVersion !== SCHEMA_VERSION) {
    return `Nicht unterstützte Schema-Version ${doc.schemaVersion} (erwartet: ${SCHEMA_VERSION}).`;
  }
  if (!doc.school || !doc.school.timeGrid || !Array.isArray(doc.school.timeGrid.periods)) {
    return 'Feld school.timeGrid.periods fehlt.';
  }
  if (!Array.isArray(doc.school.schoolDays)) return 'Feld school.schoolDays fehlt.';
  for (const key of ['subjects', 'teachers', 'rooms', 'classes', 'classSubjects']) {
    if (!Array.isArray(doc[key])) return `Feld ${key} fehlt oder ist keine Liste.`;
  }
  return null;
}

// Referenz-Prüfung vor dem Löschen: liefert deutsche Beschreibungen aller Verwendungen.
export function referencesTo(doc, kind, id) {
  const refs = [];
  const count = (n, singular, plural) => (n === 1 ? `1 ${singular}` : `${n} ${plural}`);
  if (kind === 'subject') {
    const cs = doc.classSubjects.filter((x) => x.subjectId === id).length;
    if (cs) refs.push(count(cs, 'Stundentafel-Eintrag', 'Stundentafel-Einträgen'));
    const q = doc.teachers.filter((t) => t.qualifications.includes(id)).length;
    if (q) refs.push(count(q, 'Lehrkraft-Qualifikation', 'Lehrkraft-Qualifikationen'));
  } else if (kind === 'teacher') {
    const cs = doc.classSubjects.filter((x) => x.teacherId === id).length;
    if (cs) refs.push(count(cs, 'Stundentafel-Eintrag', 'Stundentafel-Einträgen'));
    const kl = doc.classes.filter((c) => c.klassenlehrerId === id).length;
    if (kl) refs.push(count(kl, 'Klasse (als Klassenlehrer:in)', 'Klassen (als Klassenlehrer:in)'));
  } else if (kind === 'room') {
    const hr = doc.classes.filter((c) => c.homeRoomId === id).length;
    if (hr) refs.push(count(hr, 'Klasse (als Stammraum)', 'Klassen (als Stammraum)'));
  } else if (kind === 'class') {
    const cs = doc.classSubjects.filter((x) => x.classId === id).length;
    if (cs) refs.push(count(cs, 'Stundentafel-Eintrag', 'Stundentafel-Einträgen'));
  }
  return refs;
}
