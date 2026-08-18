// Demo-Volksschule „VS Demodorf".
// Zeitraster: Vorlage „Volksschule (Standard 50min)" aus
// apps/api/src/modules/school/templates/austrian-school-templates.ts (1:1 übernommen).
// Stundentafel: offizielle Stundentafel der Grundschule (Lehrplan der Volksschule,
// Vierter Teil, BMB) mit Fächernamen des Lehrplans 2023 — Details in docs/03-spezifikation.md.

import { SCHEMA_VERSION } from './model.js';

export const VS_TIME_GRID = {
  name: 'Volksschule (Standard 50min)',
  periods: [
    { periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false, label: '1. Stunde', durationMin: 50 },
    { periodNumber: 2, startTime: '08:50', endTime: '09:00', isBreak: true, label: 'Pause', durationMin: 10 },
    { periodNumber: 3, startTime: '09:00', endTime: '09:50', isBreak: false, label: '2. Stunde', durationMin: 50 },
    { periodNumber: 4, startTime: '09:50', endTime: '10:10', isBreak: true, label: 'Grosse Pause', durationMin: 20 },
    { periodNumber: 5, startTime: '10:10', endTime: '11:00', isBreak: false, label: '3. Stunde', durationMin: 50 },
    { periodNumber: 6, startTime: '11:00', endTime: '11:10', isBreak: true, label: 'Pause', durationMin: 10 },
    { periodNumber: 7, startTime: '11:10', endTime: '12:00', isBreak: false, label: '4. Stunde', durationMin: 50 },
    { periodNumber: 8, startTime: '12:00', endTime: '12:50', isBreak: true, label: 'Mittagspause', durationMin: 50 },
    { periodNumber: 9, startTime: '12:50', endTime: '13:40', isBreak: false, label: '5. Stunde', durationMin: 50 },
  ],
};

export const VS_SCHOOL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

// Wochenstunden je Fach-Kürzel und Schulstufe (1–4). 0 = Fach entfällt auf dieser Stufe.
const STUNDENTAFEL = {
  REL: [2, 2, 2, 2],
  D: [7, 7, 7, 7],
  M: [4, 4, 4, 4],
  SU: [3, 3, 3, 3],
  MU: [1, 1, 1, 1],
  KG: [1, 1, 1, 1],
  TD: [1, 1, 2, 2],
  BSP: [3, 3, 2, 2],
  E: [0, 0, 1, 1],
};

export function seedDocument() {
  const subjects = [
    { id: 's1', name: 'Religion', shortName: 'REL', requiredRoomType: null, isMainSubject: false, color: '#d9c9f2' },
    { id: 's2', name: 'Deutsch', shortName: 'D', requiredRoomType: null, isMainSubject: true, color: '#f9d5a7' },
    { id: 's3', name: 'Mathematik', shortName: 'M', requiredRoomType: null, isMainSubject: true, color: '#aecbfa' },
    { id: 's4', name: 'Sachunterricht', shortName: 'SU', requiredRoomType: null, isMainSubject: false, color: '#b7e1cd' },
    { id: 's5', name: 'Musik', shortName: 'MU', requiredRoomType: null, isMainSubject: false, color: '#fde2f3' },
    { id: 's6', name: 'Kunst und Gestaltung', shortName: 'KG', requiredRoomType: null, isMainSubject: false, color: '#fff2a8' },
    { id: 's7', name: 'Technik und Design', shortName: 'TD', requiredRoomType: 'WERKRAUM', isMainSubject: false, color: '#e2c9a0' },
    { id: 's8', name: 'Bewegung und Sport', shortName: 'BSP', requiredRoomType: 'TURNSAAL', isMainSubject: false, color: '#c7ecee' },
    { id: 's9', name: 'Lebende Fremdsprache', shortName: 'E', requiredRoomType: null, isMainSubject: false, color: '#f6b8b8' },
  ];

  const allExceptReligion = subjects.filter((s) => s.id !== 's1').map((s) => s.id);

  // Sperrzeiten der Religionslehrerin: Mittwoch + Freitag ganztags
  // (periodNumbers der Unterrichtsstunden: 1, 3, 5, 7, 9).
  const steBlocked = [];
  for (const dayOfWeek of ['WEDNESDAY', 'FRIDAY']) {
    for (const periodNumber of [1, 3, 5, 7, 9]) steBlocked.push({ dayOfWeek, periodNumber });
  }

  const teachers = [
    { id: 't1', firstName: 'Maria', lastName: 'Huber', shortName: 'HUB', qualifications: allExceptReligion, availabilityRules: [] },
    { id: 't2', firstName: 'Josef', lastName: 'Gruber', shortName: 'GRU', qualifications: allExceptReligion, availabilityRules: [] },
    { id: 't3', firstName: 'Anna', lastName: 'Bauer', shortName: 'BAU', qualifications: allExceptReligion, availabilityRules: [] },
    { id: 't4', firstName: 'Eva', lastName: 'Wagner', shortName: 'WAG', qualifications: allExceptReligion, availabilityRules: [] },
    { id: 't5', firstName: 'Theresa', lastName: 'Steiner', shortName: 'STE', qualifications: ['s1'], availabilityRules: steBlocked },
    { id: 't6', firstName: 'Lisa', lastName: 'Moser', shortName: 'MOS', qualifications: ['s7', 's8'], availabilityRules: [] },
  ];

  const rooms = [
    { id: 'r1', name: 'Klassenzimmer 1', roomType: 'KLASSENZIMMER' },
    { id: 'r2', name: 'Klassenzimmer 2', roomType: 'KLASSENZIMMER' },
    { id: 'r3', name: 'Klassenzimmer 3', roomType: 'KLASSENZIMMER' },
    { id: 'r4', name: 'Klassenzimmer 4', roomType: 'KLASSENZIMMER' },
    { id: 'r5', name: 'Turnsaal', roomType: 'TURNSAAL' },
    { id: 'r6', name: 'Werkraum', roomType: 'WERKRAUM' },
  ];

  const classes = [
    { id: 'c1', name: '1a', yearLevel: 1, homeRoomId: 'r1', klassenlehrerId: 't1' },
    { id: 'c2', name: '2a', yearLevel: 2, homeRoomId: 'r2', klassenlehrerId: 't2' },
    { id: 'c3', name: '3a', yearLevel: 3, homeRoomId: 'r3', klassenlehrerId: 't3' },
    { id: 'c4', name: '4a', yearLevel: 4, homeRoomId: 'r4', klassenlehrerId: 't4' },
  ];

  // Fachlehrkräfte: Religion → STE, Technik und Design + Bewegung und Sport → MOS,
  // alle übrigen Fächer → Klassenlehrer:in.
  const specialistBySubject = { s1: 't5', s7: 't6', s8: 't6' };

  const classSubjects = [];
  let csCounter = 0;
  for (const klass of classes) {
    for (const subject of subjects) {
      const hours = STUNDENTAFEL[subject.shortName][klass.yearLevel - 1];
      if (!hours) continue;
      csCounter += 1;
      classSubjects.push({
        id: `cs${csCounter}`,
        classId: klass.id,
        subjectId: subject.id,
        teacherId: specialistBySubject[subject.id] ?? klass.klassenlehrerId,
        weeklyHours: hours,
        // Doppelstunde nur für Technik und Design ab 2 Wochenstunden (St. 3/4).
        preferDoublePeriod: subject.id === 's7' && hours >= 2,
      });
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    school: {
      name: 'VS Demodorf',
      schoolDays: [...VS_SCHOOL_DAYS],
      timeGrid: { name: VS_TIME_GRID.name, periods: VS_TIME_GRID.periods.map((p) => ({ ...p })) },
    },
    subjects,
    teachers,
    rooms,
    classes,
    classSubjects,
    timetable: null,
    settings: { solverSeed: null, timeLimitMs: 8000, weights: {} },
  };
}
