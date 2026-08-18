// Phase 1: Backtracking mit Forward Checking, MRV-Variablenordnung und
// Symmetriebrechung. Platziert jede Wochenstunde ohne Verletzung harter Constraints.
// Konvention wie die Hauptapp (solver-input.service.ts): Pausen werden vor dem Lösen
// gefiltert, je weeklyHours entsteht eine Lektion-Instanz.

import { lessonPeriods } from '../model.js';
import { mulberry32, shuffle } from './rng.js';

// Baut die solver-interne Problem-Repräsentation aus dem Dokument.
// Slots sind Indizes 0..S-1 mit slot = tagIndex * P + periodenIndex.
export function buildProblem(doc) {
  const days = [...doc.school.schoolDays];
  const periods = lessonPeriods(doc);
  const P = periods.length;
  const S = days.length * P;

  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const periodIdxByNumber = new Map(periods.map((p, i) => [p.periodNumber, i]));
  const subjectById = new Map(doc.subjects.map((s) => [s.id, s]));
  const classById = new Map(doc.classes.map((c) => [c.id, c]));
  const klassenzimmer = doc.rooms.filter((r) => r.roomType === 'KLASSENZIMMER');

  function roomCandidatesFor(subject, klass) {
    if (subject?.requiredRoomType) {
      return doc.rooms.filter((r) => r.roomType === subject.requiredRoomType).map((r) => r.id);
    }
    const candidates = [];
    if (klass?.homeRoomId) candidates.push(klass.homeRoomId);
    for (const r of klassenzimmer) if (r.id !== klass?.homeRoomId) candidates.push(r.id);
    return candidates.length ? candidates : doc.rooms.map((r) => r.id);
  }

  const lessons = [];
  const unassignedClassSubjects = [];
  for (const cs of doc.classSubjects) {
    const hours = cs.weeklyHours || 0;
    if (hours <= 0) continue;
    if (!cs.teacherId) {
      unassignedClassSubjects.push({ classSubjectId: cs.id, missing: hours, reason: 'UNASSIGNED_TEACHER' });
      continue;
    }
    const subject = subjectById.get(cs.subjectId) ?? null;
    const klass = classById.get(cs.classId) ?? null;
    const roomCandidates = roomCandidatesFor(subject, klass);
    for (let i = 0; i < hours; i++) {
      lessons.push({
        idx: lessons.length,
        csId: cs.id,
        instanceIdx: i,
        prevIdx: i === 0 ? -1 : lessons.length - 1,
        classId: cs.classId,
        subjectId: cs.subjectId,
        teacherId: cs.teacherId,
        preferDoublePeriod: !!cs.preferDoublePeriod,
        isMainSubject: !!subject?.isMainSubject,
        requiredRoomType: subject?.requiredRoomType ?? null,
        homeRoomId: klass?.homeRoomId ?? null,
        roomCandidates,
      });
    }
  }

  const teacherBlocked = new Map();
  for (const t of doc.teachers) {
    const set = new Set();
    for (const rule of t.availabilityRules ?? []) {
      const d = dayIndex.get(rule.dayOfWeek);
      const pi = periodIdxByNumber.get(rule.periodNumber);
      if (d !== undefined && pi !== undefined) set.add(d * P + pi);
    }
    if (set.size) teacherBlocked.set(t.id, set);
  }

  return { doc, days, periods, P, S, lessons, unassignedClassSubjects, teacherBlocked };
}

export function solvePhase1(problem, opts = {}) {
  const { seed = 1, backtrackLimit = 50000, restarts = 3, deadline = Infinity, onProgress = null } = opts;
  let best = { assign: problem.lessons.map(() => null), placedCount: 0 };
  let totalBacktracks = 0;
  let restartsUsed = 0;

  for (let attempt = 0; attempt <= restarts; attempt++) {
    restartsUsed = attempt;
    const res = attemptSolve(problem, (seed + attempt) >>> 0, backtrackLimit, deadline, onProgress, totalBacktracks);
    totalBacktracks += res.backtracks;
    if (res.placedCount > best.placedCount) best = { assign: res.assign, placedCount: res.placedCount };
    if (res.complete || res.timedOut) break;
  }

  return {
    assign: best.assign,
    placedCount: best.placedCount,
    complete: best.placedCount === problem.lessons.length,
    backtracks: totalBacktracks,
    restartsUsed,
  };
}

function attemptSolve(problem, seed, backtrackLimit, deadline, onProgress, backtracksOffset) {
  const { lessons, P, S, teacherBlocked } = problem;
  const n = lessons.length;
  const rng = mulberry32(seed);
  const assign = new Array(n).fill(null);

  const classBusy = new Map();
  const teacherBusy = new Map();
  const roomBusy = new Map();
  const subjDayCount = new Map(); // "classId|subjectId" -> Anzahl Lektionen je Tag
  for (const L of lessons) {
    if (!classBusy.has(L.classId)) classBusy.set(L.classId, new Uint8Array(S));
    if (!teacherBusy.has(L.teacherId)) teacherBusy.set(L.teacherId, new Uint8Array(S));
    for (const rid of L.roomCandidates) if (!roomBusy.has(rid)) roomBusy.set(rid, new Uint8Array(S));
    const key = `${L.classId}|${L.subjectId}`;
    if (!subjDayCount.has(key)) subjDayCount.set(key, new Uint8Array(problem.days.length));
  }

  let placed = 0;
  let backtracks = 0;
  let nodes = 0;
  let aborted = false;
  let timedOut = false;
  let bestPlaced = 0;
  let bestAssign = null;

  function snapshotIfBest() {
    if (placed > bestPlaced) {
      bestPlaced = placed;
      bestAssign = assign.map((a) => (a ? { ...a } : null));
    }
  }

  // Gültige Slots einer Lektion; null = noch nicht wählbar (Vorgänger-Instanz offen).
  function validSlots(L) {
    if (L.prevIdx >= 0 && !assign[L.prevIdx]) return null;
    const minSlot = L.prevIdx >= 0 ? assign[L.prevIdx].slot + 1 : 0; // Symmetriebrechung
    const cb = classBusy.get(L.classId);
    const tb = teacherBusy.get(L.teacherId);
    const blocked = teacherBlocked.get(L.teacherId);
    const out = [];
    for (let s = minSlot; s < S; s++) {
      if (cb[s] || tb[s]) continue;
      if (blocked && blocked.has(s)) continue;
      let roomOk = false;
      for (const rid of L.roomCandidates) {
        if (!roomBusy.get(rid)[s]) {
          roomOk = true;
          break;
        }
      }
      if (roomOk) out.push(s);
    }
    return out;
  }

  // Werteordnung: seeded gemischt, dann heuristisch stabil sortiert
  // (Doppelstunden-Nachbarslot zuerst, Fach-Häufung am selben Tag zuletzt,
  // Hauptfächer möglichst früh am Tag).
  function orderSlots(L, slots) {
    shuffle(slots, rng);
    const counts = subjDayCount.get(`${L.classId}|${L.subjectId}`);
    const prevSlot = L.prevIdx >= 0 ? assign[L.prevIdx].slot : -99;
    const prevDay = prevSlot >= 0 ? (prevSlot / P) | 0 : -1;
    const scored = slots.map((s) => {
      const day = (s / P) | 0;
      const pi = s % P;
      let h = 0;
      if (L.preferDoublePeriod && s === prevSlot + 1 && day === prevDay) h += 50;
      h -= 8 * counts[day];
      if (L.isMainSubject) h -= pi;
      return [s, h];
    });
    scored.sort((a, b) => b[1] - a[1]);
    return scored.map((x) => x[0]);
  }

  function chooseRoom(L, s) {
    for (const rid of L.roomCandidates) if (!roomBusy.get(rid)[s]) return rid;
    return null;
  }

  function place(L, s, roomId) {
    assign[L.idx] = { slot: s, roomId };
    classBusy.get(L.classId)[s] = 1;
    teacherBusy.get(L.teacherId)[s] = 1;
    roomBusy.get(roomId)[s] = 1;
    subjDayCount.get(`${L.classId}|${L.subjectId}`)[(s / P) | 0] += 1;
    placed += 1;
  }

  function unplace(L, s, roomId) {
    assign[L.idx] = null;
    classBusy.get(L.classId)[s] = 0;
    teacherBusy.get(L.teacherId)[s] = 0;
    roomBusy.get(roomId)[s] = 0;
    subjDayCount.get(`${L.classId}|${L.subjectId}`)[(s / P) | 0] -= 1;
    placed -= 1;
  }

  function search() {
    nodes += 1;
    if (backtracks > backtrackLimit) {
      aborted = true;
      return false;
    }
    if ((nodes & 255) === 0 && Date.now() > deadline) {
      aborted = true;
      timedOut = true;
      return false;
    }
    if (onProgress && nodes % 2000 === 0) {
      onProgress({ phase: 'platzieren', placed, total: n, backtracks: backtracksOffset + backtracks });
    }

    // MRV mit Forward Checking: leere Domäne einer offenen Lektion => sofortiger Backtrack.
    let bestL = null;
    let bestSlots = null;
    for (const L of lessons) {
      if (assign[L.idx]) continue;
      const vs = validSlots(L);
      if (vs === null) continue;
      if (vs.length === 0) return false;
      if (!bestSlots || vs.length < bestSlots.length) {
        bestL = L;
        bestSlots = vs;
        if (vs.length === 1) break;
      }
    }
    if (!bestL) return placed === n;

    for (const s of orderSlots(bestL, bestSlots)) {
      const roomId = chooseRoom(bestL, s);
      if (!roomId) continue;
      place(bestL, s, roomId);
      snapshotIfBest();
      if (search()) return true;
      if (aborted) return false;
      unplace(bestL, s, roomId);
      backtracks += 1;
    }
    return false;
  }

  const complete = search();
  return {
    complete,
    timedOut,
    backtracks,
    placedCount: complete ? n : bestPlaced,
    assign: complete ? assign : (bestAssign ?? assign.map(() => null)),
  };
}
