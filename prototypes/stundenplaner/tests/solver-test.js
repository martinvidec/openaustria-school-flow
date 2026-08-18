// Solver-Selbsttest ohne Framework.
// Node:    node tests/solver-test.js   (Exit-Code != 0 bei Fehlschlag)
// Browser: tests/test.html importiert runAllTests() und rendert die Ergebnisse.

import { seedDocument } from '../js/seed.js';
import { runDiagnostics } from '../js/solver/diagnostics.js';
import { runSolver } from '../js/solver/run.js';
import { checkMove, applyMove, checkSwap, applySwap, scoreFromLessons } from '../js/solver/edit.js';
import { timetableToCsv, CSV_BOM } from '../js/csv.js';
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

  test('Nachbearbeitung: ungültige Moves werden abgelehnt', () => {
    const doc = seedDocument();
    const { lessons } = runSolver(doc, { seed: 42 });
    const rel = lessons.find((l) => l.teacherId === 't5');
    assert(rel, 'keine REL-Lektion gefunden');
    const ontoBlocked = checkMove(doc, lessons, rel.id, 'WEDNESDAY', rel.periodNumber);
    assert(!ontoBlocked.ok, 'Move auf Sperr-Tag der Lehrkraft muss abgelehnt werden');
    const ontoBreak = checkMove(doc, lessons, rel.id, 'MONDAY', 2);
    assert(!ontoBreak.ok, 'Move in einen Pausen-Slot muss abgelehnt werden');
    const ontoInactive = checkMove(doc, lessons, rel.id, 'SATURDAY', 1);
    assert(!ontoInactive.ok, 'Move auf inaktiven Schultag muss abgelehnt werden');
    // Turnsaal-Lektion auf einen Slot, in dem der Turnsaal belegt ist
    const csById = new Map(doc.classSubjects.map((cs) => [cs.id, cs]));
    const bspLessons = lessons.filter((l) => csById.get(l.classSubjectId)?.subjectId === 's8');
    const [b1, b2] = bspLessons;
    if (b1 && b2) {
      // b1 auf den Slot von b2: Turnsaal (einziger TURNSAAL) ist dort belegt,
      // zulässig wäre das nur, wenn die eigene Klasse + Lehrkraft frei wären — Raum blockt sicher.
      const clash = checkMove(doc, lessons, b1.id, b2.dayOfWeek, b2.periodNumber);
      assert(!clash.ok, 'Move in belegten Pflicht-Raum muss abgelehnt werden');
    }
  });

  test('Nachbearbeitung: gültiger Move und Swap halten harte Constraints', () => {
    const doc = seedDocument();
    const { lessons } = runSolver(doc, { seed: 42 });
    const teachingPeriods = lessonPeriods(doc).map((p) => p.periodNumber);

    // Brute-Force ein gültiges Move-Ziel suchen und anwenden.
    let moved = null;
    let movedId = null;
    outer: for (const l of lessons) {
      for (const day of doc.school.schoolDays) {
        for (const p of teachingPeriods) {
          if (checkMove(doc, lessons, l.id, day, p).ok) {
            moved = applyMove(doc, lessons, l.id, day, p);
            movedId = l.id;
            break outer;
          }
        }
      }
    }
    assert(moved, 'kein einziges gültiges Move-Ziel gefunden (unplausibel)');
    assert(moved.length === lessons.length, 'Move darf Lektionen weder erzeugen noch löschen');
    assert(moved.find((l) => l.id === movedId).isManualEdit === true, 'isManualEdit fehlt nach Move');
    assert(verifyHardConstraints(doc, moved).length === 0, 'Hard-Constraint-Verstoß nach Move');

    // Brute-Force einen gültigen Swap zweier Lektionen derselben Klasse.
    const csById = new Map(doc.classSubjects.map((cs) => [cs.id, cs]));
    const c1Lessons = moved.filter((l) => csById.get(l.classSubjectId)?.classId === 'c1');
    let swapped = null;
    swapOuter: for (let i = 0; i < c1Lessons.length; i++) {
      for (let j = i + 1; j < c1Lessons.length; j++) {
        if (checkSwap(doc, moved, c1Lessons[i].id, c1Lessons[j].id).ok) {
          swapped = applySwap(doc, moved, c1Lessons[i].id, c1Lessons[j].id);
          break swapOuter;
        }
      }
    }
    assert(swapped, 'kein gültiger Swap in Klasse 1a gefunden (unplausibel)');
    assert(verifyHardConstraints(doc, swapped).length === 0, 'Hard-Constraint-Verstoß nach Swap');
    assert(lessonCountsMatch(doc, swapped).length === 0, 'Wochenstunden-Abweichung nach Swap');
  });

  test('CSV-Export: 90 Zeilen, Excel-kompatibel, Sonderzeichen korrekt escaped', () => {
    const doc = seedDocument();
    doc.timetable = runSolver(doc, { seed: 42 });
    const csv = timetableToCsv(doc);
    assert(csv, 'CSV darf nicht null sein');
    assert(csv.startsWith(CSV_BOM), 'UTF-8-BOM fehlt');
    const lines = csv.slice(CSV_BOM.length).split('\r\n').filter((l) => l.length);
    assert(lines.length === 91, `${lines.length} Zeilen statt 91 (Header + 90 Lektionen)`);
    assert(lines[0].startsWith('Klasse;Tag;Stunde;Von;Bis;Fach;'), `Header falsch: ${lines[0]}`);
    assert(lines.every((l) => l.split(';').length >= 11), 'Zeile mit zu wenigen Spalten');
    assert(csv.includes('Bewegung und Sport') && csv.includes('Turnsaal'), 'erwartete Inhalte fehlen');
    // Sortierung: erste Datenzeile ist Klasse 1a am Montag in der 1. Stunde
    assert(lines[1].startsWith('1a;Montag;'), `Sortierung falsch: ${lines[1]}`);
    // Escaping: Semikolon im Fachnamen erzwingt Anführungszeichen
    const doc2 = seedDocument();
    doc2.subjects.find((s) => s.id === 's2').name = 'Deutsch; Lesen; Schreiben';
    doc2.timetable = runSolver(doc2, { seed: 42 });
    const csv2 = timetableToCsv(doc2);
    assert(csv2.includes('"Deutsch; Lesen; Schreiben"'), 'Semikolon-Feld nicht gequotet');
    // Kein Plan => null
    const empty = seedDocument();
    assert(timetableToCsv(empty) === null, 'ohne Plan muss null kommen');
  });

  test('scoreFromLessons stimmt mit dem Solver-Score überein', () => {
    const doc = seedDocument();
    const result = runSolver(doc, { seed: 42 });
    const rescored = scoreFromLessons(doc, result.lessons);
    assert(rescored.hard === 0, 'hard muss 0 sein');
    assert(
      rescored.soft === result.score.soft,
      `Score-Mapping inkonsistent: ${rescored.soft} statt ${result.score.soft}`,
    );
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
