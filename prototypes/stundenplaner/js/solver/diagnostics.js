// Machbarkeits-Vorprüfung — Spiegel von
// apps/api/src/modules/timetable/timetable-diagnostics.service.ts (ohne Gruppen).
// Nur notwendige Bedingungen erzeugen Fehler; Warnungen blockieren den Start nicht.

import { lessonPeriods, ROOM_TYPE_LABELS, teacherName, byId } from '../model.js';

export function runDiagnostics(doc) {
  const warnings = [];
  const err = (code, message) => warnings.push({ code, severity: 'error', message });
  const warn = (code, message) => warnings.push({ code, severity: 'warning', message });

  const periods = lessonPeriods(doc);
  const activeDays = doc.school.schoolDays.length;
  const gridSlots = activeDays * periods.length;
  const totalLessons = doc.classSubjects.reduce((sum, cs) => sum + (cs.weeklyHours || 0), 0);
  const roomCount = doc.rooms.length;

  if (gridSlots === 0) {
    err('NO_GRID', 'Kein Zeitraster konfiguriert (keine Unterrichtsstunden oder keine Schultage).');
  }
  if (roomCount === 0) {
    err('NO_ROOMS', 'Keine Räume angelegt.');
  }

  if (gridSlots > 0) {
    // Klassen-Überlastung
    for (const klass of doc.classes) {
      const demand = doc.classSubjects
        .filter((cs) => cs.classId === klass.id)
        .reduce((sum, cs) => sum + (cs.weeklyHours || 0), 0);
      if (demand > gridSlots) {
        err('CLASS_OVERLOADED', `Klasse ${klass.name}: ${demand} Wochenstunden, aber nur ${gridSlots} Slots im Zeitraster.`);
      }
    }

    // Lehrkraft-Überlastung — schärfer als die Hauptapp: Sperrzeiten reduzieren die Kapazität
    // (eindeutig notwendige Bedingung, siehe docs/03-spezifikation.md).
    const validPeriodNumbers = new Set(periods.map((p) => p.periodNumber));
    const activeDaySet = new Set(doc.school.schoolDays);
    for (const teacher of doc.teachers) {
      const demand = doc.classSubjects
        .filter((cs) => cs.teacherId === teacher.id)
        .reduce((sum, cs) => sum + (cs.weeklyHours || 0), 0);
      if (demand === 0) continue;
      const seen = new Set();
      for (const rule of teacher.availabilityRules ?? []) {
        if (activeDaySet.has(rule.dayOfWeek) && validPeriodNumbers.has(rule.periodNumber)) {
          seen.add(`${rule.dayOfWeek}|${rule.periodNumber}`);
        }
      }
      const blocked = seen.size;
      const available = gridSlots - blocked;
      if (demand > available) {
        err(
          'TEACHER_OVERLOADED',
          `Lehrkraft ${teacherName(teacher)}: ${demand} Wochenstunden, aber nur ${available} verfügbare Slots` +
            (blocked ? ` (${gridSlots} minus ${blocked} Sperrzeiten).` : '.'),
        );
      }
    }

    // Raum-Gesamtkapazität
    if (roomCount > 0 && totalLessons > roomCount * gridSlots) {
      err('ROOM_CAPACITY', `${totalLessons} Wochenstunden insgesamt, aber nur ${roomCount * gridSlots} Raum-Slots.`);
    }

    // Raumtyp-Kapazität
    const demandByType = new Map();
    for (const cs of doc.classSubjects) {
      const subject = byId(doc.subjects, cs.subjectId);
      const type = subject?.requiredRoomType;
      if (!type) continue;
      demandByType.set(type, (demandByType.get(type) ?? 0) + (cs.weeklyHours || 0));
    }
    for (const [type, demand] of demandByType) {
      const count = doc.rooms.filter((r) => r.roomType === type).length;
      if (demand > count * gridSlots) {
        const label = ROOM_TYPE_LABELS[type] ?? type;
        err(
          'ROOM_TYPE_CAPACITY',
          `Raumtyp ${label}: ${demand} Wochenstunden benötigt, aber ${count === 0 ? 'kein Raum' : `nur ${count} Raum/Räume`} dieses Typs (${count * gridSlots} Slots).`,
        );
      }
    }
  }

  // Warnungen
  const unassignedHours = doc.classSubjects
    .filter((cs) => !cs.teacherId)
    .reduce((sum, cs) => sum + (cs.weeklyHours || 0), 0);
  if (unassignedHours > 0) {
    warn('UNASSIGNED_TEACHER', `${unassignedHours} Wochenstunden ohne zugeordnete Lehrkraft (werden nicht verplant).`);
  }

  for (const cs of doc.classSubjects) {
    if (!cs.teacherId) continue;
    const teacher = byId(doc.teachers, cs.teacherId);
    const subject = byId(doc.subjects, cs.subjectId);
    if (teacher && subject && !teacher.qualifications.includes(subject.id)) {
      warn('TEACHER_NOT_QUALIFIED', `Lehrkraft ${teacherName(teacher)} ist ${subject.name} zugeordnet, hat aber keine Qualifikation dafür.`);
    }
  }

  for (const klass of doc.classes) {
    if (!klass.homeRoomId) {
      warn('NO_HOMEROOM', `Klasse ${klass.name} hat keinen Stammraum (Stammraum-Präferenz wirkungslos).`);
    }
  }

  return {
    feasible: !warnings.some((w) => w.severity === 'error'),
    gridSlots,
    totalLessons,
    roomCount,
    classCount: doc.classes.length,
    teacherCount: doc.teachers.length,
    warnings,
  };
}
