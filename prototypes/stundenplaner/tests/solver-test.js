// Solver-Selbsttest ohne Framework.
// Node:    node tests/solver-test.js   (Exit-Code != 0 bei Fehlschlag)
// Browser: tests/test.html importiert runAllTests() und rendert die Ergebnisse.

import { seedDocument } from '../js/seed.js';
import { runDiagnostics } from '../js/solver/diagnostics.js';
import { runSolver } from '../js/solver/run.js';
import { lessonPeriods, byId } from '../js/model.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Brute-Force-Verifikation aller harten Constraints, unabhängig von Solver-Interna.
export function verifyHardConstraints(doc, lessons) {
  const problems = [];
  const csById = new Map(doc.classSubjects.map((cs) => [cs.id, cs]));
  const activeDays = new Set(doc.school.schoolDays);
  const validPeriods = new Set(lessonPeriods(doc).map((p) => p.periodNumber));

  const teacherSlots = new Set();
  const roomSlots = new Set();
  const classSlots = new Set();

  for (const l of lessons) {
    const cs = csById.get(l.classSubjectId);
    if (!cs) {
      problems.push(`Lektion ${l.id}: unbekannter Stundentafel-Eintrag.`);
      continue;
    }
    if (!activeDays.has(l.dayOfWeek)) problems.push(`Lektion ${l.id}: inaktiver Tag ${l.dayOfWeek}.`);
    if (!validPeriods.has(l.periodNumber)) problems.push(`Lektion ${l.id}: Pausen-/ungültige Periode ${l.periodNumber}.`);

    const slot = `${l.dayOfWeek}|${l.periodNumber}`;
    const tKey = `${l.teacherId}|${slot}`;
    const rKey = `${l.roomId}|${slot}`;
    const cKey = `${cs.classId}|${slot}`;
    if (teacherSlots.has(tKey)) problems.push(`Lehrkraft-Konflikt: ${l.teacherId} doppelt in ${slot}.`);
    if (roomSlots.has(rKey)) problems.push(`Raum-Konflikt: ${l.roomId} doppelt in ${slot}.`);
    if (classSlots.has(cKey)) problems.push(`Klassen-Konflikt: ${cs.classId} doppelt in ${slot}.`);
    teacherSlots.add(tKey);
    roomSlots.add(rKey);
    classSlots.add(cKey);

    const teacher = byId(doc.teachers, l.teacherId);
    for (const rule of teacher?.availabilityRules ?? []) {
      if (rule.dayOfWeek === l.dayOfWeek && rule.periodNumber === l.periodNumber) {
        problems.push(`Lehrkraft-Verfügbarkeit verletzt: ${teacher.shortName} in ${slot}.`);
      }
    }

    const subject = byId(doc.subjects, cs.subjectId);
    const room = byId(doc.rooms, l.roomId);
    if (subject?.requiredRoomType && room?.roomType !== subject.requiredRoomType) {
      problems.push(`Raumtyp-Anforderung verletzt: ${subject.shortName} in ${room?.name ?? l.roomId}.`);
    }
  }

  return problems;
}

function lessonCountsMatch(doc, lessons) {
  const counts = new Map();
  for (const l of lessons) counts.set(l.classSubjectId, (counts.get(l.classSubjectId) ?? 0) + 1);
  const mismatches = [];
  for (const cs of doc.classSubjects) {
    if (!cs.teacherId) continue;
    const actual = counts.get(cs.id) ?? 0;
    if (actual !== cs.weeklyHours) mismatches.push(`${cs.id}: ${actual} statt ${cs.weeklyHours}`);
  }
  return mismatches;
}

function lessonsFingerprint(lessons) {
  return JSON.stringify(
    lessons
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((l) => [l.id, l.dayOfWeek, l.periodNumber, l.roomId]),
  );
}

export function runAllTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, message: e.message });
    }
  };

  test('Diagnose: Demo-Schule ist machbar (keine Fehler, 25 Slots)', () => {
    const diag = runDiagnostics(seedDocument());
    assert(diag.gridSlots === 25, `gridSlots ${diag.gridSlots} statt 25`);
    const errors = diag.warnings.filter((w) => w.severity === 'error');
    assert(errors.length === 0, `unerwartete Fehler: ${errors.map((e) => e.code).join(', ')}`);
    assert(diag.feasible, 'feasible sollte true sein');
  });

  test('Diagnose: überladene Klasse => CLASS_OVERLOADED', () => {
    const doc = structuredClone(seedDocument());
    const cs = doc.classSubjects.find((x) => x.classId === 'c1' && x.subjectId === 's2');
    cs.weeklyHours = 11; // Klassensumme 26 > 25
    const diag = runDiagnostics(doc);
    assert(!diag.feasible, 'feasible sollte false sein');
    assert(diag.warnings.some((w) => w.code === 'CLASS_OVERLOADED'), 'CLASS_OVERLOADED fehlt');
  });

  test('Diagnose: Turnsaal entfernt => ROOM_TYPE_CAPACITY', () => {
    const doc = structuredClone(seedDocument());
    doc.rooms = doc.rooms.filter((r) => r.id !== 'r5');
    const diag = runDiagnostics(doc);
    assert(!diag.feasible, 'feasible sollte false sein');
    assert(diag.warnings.some((w) => w.code === 'ROOM_TYPE_CAPACITY'), 'ROOM_TYPE_CAPACITY fehlt');
  });

  test('Solve (Seed 42): alle 90 Lektionen platziert, harte Constraints halten', () => {
    const doc = seedDocument();
    const result = runSolver(doc, { seed: 42 });
    assert(result.unplaced.length === 0, `offene Lektionen: ${JSON.stringify(result.unplaced)}`);
    assert(result.lessons.length === 90, `${result.lessons.length} Lektionen statt 90`);
    const problems = verifyHardConstraints(doc, result.lessons);
    assert(problems.length === 0, `Hard-Constraint-Verstöße: ${problems.slice(0, 5).join(' | ')}`);
    const mismatches = lessonCountsMatch(doc, result.lessons);
    assert(mismatches.length === 0, `Wochenstunden-Abweichungen: ${mismatches.join(', ')}`);
    assert(result.score.hard === 0, 'hard score muss 0 sein');
  });

  test('Determinismus: Seed 42 reproduzierbar, Seed 43 abweichend', () => {
    const a = runSolver(seedDocument(), { seed: 42 });
    const b = runSolver(seedDocument(), { seed: 42 });
    const c = runSolver(seedDocument(), { seed: 43 });
    assert(lessonsFingerprint(a.lessons) === lessonsFingerprint(b.lessons), 'Seed 42 nicht reproduzierbar');
    assert(a.score.soft === b.score.soft, 'Seed 42: Scores weichen ab');
    assert(lessonsFingerprint(a.lessons) !== lessonsFingerprint(c.lessons), 'Seed 43 liefert identischen Plan');
  });

  test('Optimierer: verschlechtert nie, hard bleibt 0', () => {
    const doc = seedDocument();
    const unoptimized = runSolver(doc, { seed: 42, optimizeSteps: 0 });
    const optimized = runSolver(doc, { seed: 42 });
    assert(
      optimized.score.soft >= unoptimized.score.soft,
      `Score verschlechtert: ${unoptimized.score.soft} -> ${optimized.score.soft}`,
    );
    assert(optimized.score.hard === 0, 'hard score muss 0 sein');
    const problems = verifyHardConstraints(doc, optimized.lessons);
    assert(problems.length === 0, `Hard-Constraint-Verstöße nach Optimierung: ${problems.slice(0, 5).join(' | ')}`);
  });

  return results;
}

const isNode = typeof process !== 'undefined' && !!process.versions?.node;
if (isNode) {
  const results = runAllTests();
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.message}`}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `${failed} von ${results.length} Tests fehlgeschlagen.` : `Alle ${results.length} Tests grün.`);
  process.exitCode = failed ? 1 : 0;
}
