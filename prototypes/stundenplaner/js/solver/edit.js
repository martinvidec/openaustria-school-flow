// Manuelle Nachbearbeitung: Validierung und Anwendung von Move/Swap-Operationen
// auf einem berechneten Plan. DOM-frei — wird von der Plan-UI und vom Node-Selbsttest
// genutzt. Harte Constraints sind identisch zu Phase 1 des Solvers; isManualEdit
// spiegelt TimetableLesson.isManualEdit der Hauptapp.

import { byId } from '../model.js';
import { buildProblem } from './solver.js';
import { computeScore, resolveWeights } from './score.js';

function contextFor(doc, lesson) {
  const cs = byId(doc.classSubjects, lesson.classSubjectId);
  return {
    cs,
    subject: cs ? byId(doc.subjects, cs.subjectId) : null,
    klass: cs ? byId(doc.classes, cs.classId) : null,
    teacher: byId(doc.teachers, lesson.teacherId),
  };
}

// Belegungs-Index ohne die zu bewegenden Lektionen.
function occupancy(doc, lessons, ignoreIds) {
  const csById = new Map(doc.classSubjects.map((cs) => [cs.id, cs]));
  const ignore = new Set(ignoreIds);
  const teacher = new Set();
  const room = new Set();
  const klass = new Set();
  for (const l of lessons) {
    if (ignore.has(l.id)) continue;
    const key = `${l.dayOfWeek}|${l.periodNumber}`;
    teacher.add(`${l.teacherId}|${key}`);
    room.add(`${l.roomId}|${key}`);
    const cs = csById.get(l.classSubjectId);
    if (cs) klass.add(`${cs.classId}|${key}`);
  }
  return { teacher, room, klass };
}

function isBlocked(teacher, dayOfWeek, periodNumber) {
  return (teacher?.availabilityRules ?? []).some(
    (r) => r.dayOfWeek === dayOfWeek && r.periodNumber === periodNumber,
  );
}

// Raum-Prioritäten wie im Solver: aktueller Raum zuerst, dann Stammraum,
// dann übrige Klassenzimmer; bei Raumtyp-Anforderung nur Räume dieses Typs.
function roomCandidates(doc, subject, klass, currentRoomId) {
  let base;
  if (subject?.requiredRoomType) {
    base = doc.rooms.filter((r) => r.roomType === subject.requiredRoomType).map((r) => r.id);
  } else {
    base = [];
    if (klass?.homeRoomId) base.push(klass.homeRoomId);
    for (const r of doc.rooms) {
      if (r.roomType === 'KLASSENZIMMER' && !base.includes(r.id)) base.push(r.id);
    }
    if (!base.length) base = doc.rooms.map((r) => r.id);
  }
  if (currentRoomId && base.includes(currentRoomId)) {
    base = [currentRoomId, ...base.filter((id) => id !== currentRoomId)];
  }
  return base;
}

function slotProblem(doc, dayOfWeek, periodNumber) {
  if (!doc.school.schoolDays.includes(dayOfWeek)) return 'Kein aktiver Schultag.';
  const period = doc.school.timeGrid.periods.find((p) => p.periodNumber === periodNumber);
  if (!period) return 'Unbekannte Stunde.';
  if (period.isBreak) return 'Pausen-Slot.';
  return null;
}

// Prüft, ob eine Lektion (unter Ausschluss von ignoreIds) auf den Ziel-Slot darf,
// und liefert den zu verwendenden Raum.
function canPlace(doc, occ, lesson, dayOfWeek, periodNumber, preferredRooms) {
  const { cs, subject, klass, teacher } = contextFor(doc, lesson);
  if (!cs) return { ok: false, reason: 'Stundentafel-Eintrag fehlt.' };
  const key = `${dayOfWeek}|${periodNumber}`;
  if (occ.klass.has(`${cs.classId}|${key}`)) {
    return { ok: false, reason: `Klasse ${klass?.name ?? '?'} ist im Zielslot belegt.` };
  }
  if (occ.teacher.has(`${lesson.teacherId}|${key}`)) {
    return { ok: false, reason: `Lehrkraft ${teacher?.shortName ?? '?'} ist im Zielslot belegt.` };
  }
  if (isBlocked(teacher, dayOfWeek, periodNumber)) {
    return { ok: false, reason: `Sperrzeit von ${teacher?.shortName ?? '?'}.` };
  }
  const candidates = [
    ...(preferredRooms ?? []).filter((id) => id),
    ...roomCandidates(doc, subject, klass, lesson.roomId),
  ];
  const allowed = new Set(roomCandidates(doc, subject, klass, lesson.roomId));
  for (const rid of candidates) {
    if (allowed.has(rid) && !occ.room.has(`${rid}|${key}`)) return { ok: true, roomId: rid };
  }
  return { ok: false, reason: 'Kein passender Raum frei.' };
}

export function checkMove(doc, lessons, lessonId, dayOfWeek, periodNumber) {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) return { ok: false, reason: 'Lektion nicht gefunden.' };
  if (lesson.dayOfWeek === dayOfWeek && lesson.periodNumber === periodNumber) {
    return { ok: false, reason: 'Ziel ist der aktuelle Slot.' };
  }
  const slotIssue = slotProblem(doc, dayOfWeek, periodNumber);
  if (slotIssue) return { ok: false, reason: slotIssue };
  const occ = occupancy(doc, lessons, [lesson.id]);
  return canPlace(doc, occ, lesson, dayOfWeek, periodNumber, []);
}

export function applyMove(doc, lessons, lessonId, dayOfWeek, periodNumber) {
  const check = checkMove(doc, lessons, lessonId, dayOfWeek, periodNumber);
  if (!check.ok) return null;
  return lessons.map((l) =>
    l.id === lessonId ? { ...l, dayOfWeek, periodNumber, roomId: check.roomId, isManualEdit: true } : l,
  );
}

export function checkSwap(doc, lessons, lessonIdA, lessonIdB) {
  const a = lessons.find((l) => l.id === lessonIdA);
  const b = lessons.find((l) => l.id === lessonIdB);
  if (!a || !b) return { ok: false, reason: 'Lektion nicht gefunden.' };
  if (a.id === b.id) return { ok: false, reason: 'Identische Lektion.' };
  const occ = occupancy(doc, lessons, [a.id, b.id]);
  // A übernimmt Slot von B und umgekehrt; Räume bevorzugt behalten bzw. tauschen.
  const placeA = canPlace(doc, occ, a, b.dayOfWeek, b.periodNumber, [a.roomId, b.roomId]);
  if (!placeA.ok) return { ok: false, reason: placeA.reason };
  const placeB = canPlace(doc, occ, b, a.dayOfWeek, a.periodNumber, [b.roomId, a.roomId]);
  if (!placeB.ok) return { ok: false, reason: placeB.reason };
  return { ok: true, roomA: placeA.roomId, roomB: placeB.roomId };
}

export function applySwap(doc, lessons, lessonIdA, lessonIdB) {
  const check = checkSwap(doc, lessons, lessonIdA, lessonIdB);
  if (!check.ok) return null;
  const a = lessons.find((l) => l.id === lessonIdA);
  const b = lessons.find((l) => l.id === lessonIdB);
  return lessons.map((l) => {
    if (l.id === a.id) {
      return { ...l, dayOfWeek: b.dayOfWeek, periodNumber: b.periodNumber, roomId: check.roomA, isManualEdit: true };
    }
    if (l.id === b.id) {
      return { ...l, dayOfWeek: a.dayOfWeek, periodNumber: a.periodNumber, roomId: check.roomB, isManualEdit: true };
    }
    return l;
  });
}

// Bewertet eine Lektionsliste mit derselben Score-Funktion wie der Solver.
// Lektions-IDs (`${csId}-${instanceIdx}`) verbinden Plan und Problem-Repräsentation;
// Lektionen, die im aktuellen Dokument keinen Stundentafel-Eintrag mehr haben,
// werden ignoriert (veralteter Plan).
export function scoreFromLessons(doc, lessons, weights) {
  const problem = buildProblem(doc);
  const byLessonId = new Map(lessons.map((l) => [l.id, l]));
  const assign = problem.lessons.map((L) => {
    const l = byLessonId.get(`${L.csId}-${L.instanceIdx}`);
    if (!l) return null;
    const d = problem.days.indexOf(l.dayOfWeek);
    const pi = problem.periods.findIndex((p) => p.periodNumber === l.periodNumber);
    if (d < 0 || pi < 0) return null;
    return { slot: d * problem.P + pi, roomId: l.roomId };
  });
  return computeScore(problem, assign, resolveWeights(weights ?? doc.settings?.weights));
}
