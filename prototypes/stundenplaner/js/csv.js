// CSV-Export des berechneten Stundenplans: eine Zeile je Lektion.
// Semikolon-getrennt und UTF-8 mit BOM — damit öffnet deutschsprachiges Excel
// die Datei direkt mit korrekten Spalten und Umlauten. DOM-frei (Node-testbar).

import { ALL_DAYS, DAY_LABELS, byId, teacherName } from './model.js';

export const CSV_BOM = '\uFEFF';

const HEADER = [
  'Klasse',
  'Tag',
  'Stunde',
  'Von',
  'Bis',
  'Fach',
  'Fach-Kürzel',
  'Lehrkraft',
  'Lehrkraft-Kürzel',
  'Raum',
  'Manuell bearbeitet',
];

function escapeCsv(value) {
  const s = String(value ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function timetableToCsv(doc) {
  const timetable = doc.timetable;
  if (!timetable || !timetable.lessons.length) return null;

  const csById = new Map(doc.classSubjects.map((cs) => [cs.id, cs]));
  const periodByNumber = new Map(doc.school.timeGrid.periods.map((p) => [p.periodNumber, p]));
  const dayOrder = new Map(ALL_DAYS.map((d, i) => [d, i]));

  const rows = timetable.lessons.map((l) => {
    const cs = csById.get(l.classSubjectId);
    const klass = cs ? byId(doc.classes, cs.classId) : null;
    const subject = cs ? byId(doc.subjects, cs.subjectId) : null;
    const teacher = byId(doc.teachers, l.teacherId);
    const room = byId(doc.rooms, l.roomId);
    const period = periodByNumber.get(l.periodNumber);
    return {
      sort: [klass?.name ?? '', dayOrder.get(l.dayOfWeek) ?? 99, l.periodNumber],
      cells: [
        klass?.name ?? '?',
        DAY_LABELS[l.dayOfWeek] ?? l.dayOfWeek,
        period?.label ?? `${l.periodNumber}.`,
        period?.startTime ?? '',
        period?.endTime ?? '',
        subject?.name ?? '?',
        subject?.shortName ?? '?',
        teacher ? teacherName(teacher) : '?',
        teacher?.shortName ?? '?',
        room?.name ?? '?',
        l.isManualEdit ? 'ja' : 'nein',
      ],
    };
  });

  rows.sort((a, b) => {
    if (a.sort[0] !== b.sort[0]) return a.sort[0] < b.sort[0] ? -1 : 1;
    if (a.sort[1] !== b.sort[1]) return a.sort[1] - b.sort[1];
    return a.sort[2] - b.sort[2];
  });

  const lines = [HEADER, ...rows.map((r) => r.cells)].map((cells) =>
    cells.map(escapeCsv).join(';'),
  );
  return CSV_BOM + lines.join('\r\n') + '\r\n';
}
