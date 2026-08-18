// Stundenplan-Tab: Wochenraster je Klasse / Lehrkraft / Raum, Score-Breakdown, Druck.

import { DAY_LABELS, byId, teacherName } from '../model.js';
import { el } from './components.js';

let viewType = 'klasse';
let selectedId = null;

export function renderPlan(main, store) {
  const doc = store.doc;
  const timetable = doc.timetable;

  main.append(el('div', { class: 'section-header' }, el('h2', {}, 'Stundenplan')));

  if (!timetable || !timetable.lessons.length) {
    main.append(
      el(
        'p',
        { class: 'empty-state' },
        'Noch kein Stundenplan berechnet. ',
        el('a', { href: '#berechnen' }, 'Jetzt berechnen →'),
      ),
    );
    return;
  }

  if (timetable.stale) {
    main.append(
      el('p', { class: 'banner banner-warning' }, 'Stammdaten oder Zeitraster wurden seit der Berechnung geändert — der Plan ist veraltet. ', el('a', { href: '#berechnen' }, 'Neu berechnen →')),
    );
  }

  const csById = new Map(doc.classSubjects.map((cs) => [cs.id, cs]));

  const entities =
    viewType === 'klasse' ? doc.classes : viewType === 'lehrkraft' ? doc.teachers : doc.rooms;
  if (!selectedId || !entities.some((e) => e.id === selectedId)) selectedId = entities[0]?.id ?? null;

  // --- Umschalter ---
  const typeSelect = el(
    'select',
    {
      onChange: (ev) => {
        viewType = ev.target.value;
        selectedId = null;
        rerender();
      },
    },
    el('option', { value: 'klasse', selected: viewType === 'klasse' }, 'Klasse'),
    el('option', { value: 'lehrkraft', selected: viewType === 'lehrkraft' }, 'Lehrkraft'),
    el('option', { value: 'raum', selected: viewType === 'raum' }, 'Raum'),
  );
  const entitySelect = el(
    'select',
    {
      onChange: (ev) => {
        selectedId = ev.target.value;
        rerender();
      },
    },
    entities.map((e) =>
      el('option', { value: e.id, selected: e.id === selectedId }, e.name ?? teacherName(e)),
    ),
  );
  const printButton = el('button', { class: 'btn', onClick: () => window.print() }, 'Drucken');

  function rerender() {
    main.innerHTML = '';
    renderPlan(main, store);
  }

  // --- Lektionen filtern und indexieren ---
  const filtered = timetable.lessons.filter((l) => {
    const cs = csById.get(l.classSubjectId);
    if (!cs) return false;
    if (viewType === 'klasse') return cs.classId === selectedId;
    if (viewType === 'lehrkraft') return l.teacherId === selectedId;
    return l.roomId === selectedId;
  });
  const bySlot = new Map();
  for (const l of filtered) {
    const key = `${l.dayOfWeek}|${l.periodNumber}`;
    let list = bySlot.get(key);
    if (!list) bySlot.set(key, (list = []));
    list.push(l);
  }

  const selectedClass = viewType === 'klasse' ? byId(doc.classes, selectedId) : null;

  // --- Wochenraster ---
  const days = doc.school.schoolDays;
  const allPeriods = doc.school.timeGrid.periods.slice().sort((a, b) => a.periodNumber - b.periodNumber);

  const table = el('table', { class: 'plan-grid' });
  const head = el('tr', {}, el('th', { class: 'plan-corner' }, ''));
  for (const day of days) head.append(el('th', {}, DAY_LABELS[day]));
  table.append(el('thead', {}, head));
  const tbody = el('tbody', {});

  for (const period of allPeriods) {
    const tr = el('tr', { class: period.isBreak ? 'break-row' : '' });
    tr.append(
      el(
        'th',
        { class: 'plan-period' },
        el('div', {}, period.label || (period.isBreak ? 'Pause' : `${period.periodNumber}. Stunde`)),
        el('div', { class: 'plan-time' }, `${period.startTime}–${period.endTime}`),
      ),
    );
    for (const day of days) {
      if (period.isBreak) {
        tr.append(el('td', { class: 'plan-break-cell' }, ''));
        continue;
      }
      const list = bySlot.get(`${day}|${period.periodNumber}`) ?? [];
      const td = el('td', { class: 'plan-cell' });
      for (const l of list) {
        const cs = csById.get(l.classSubjectId);
        const subject = byId(doc.subjects, cs.subjectId);
        const klass = byId(doc.classes, cs.classId);
        const teacher = byId(doc.teachers, l.teacherId);
        const room = byId(doc.rooms, l.roomId);
        const awayFromHomeRoom = selectedClass && selectedClass.homeRoomId && l.roomId !== selectedClass.homeRoomId;
        const detail =
          viewType === 'klasse'
            ? `${teacher?.shortName ?? '?'} · ${room?.name ?? '?'}${awayFromHomeRoom ? ' ◂' : ''}`
            : viewType === 'lehrkraft'
              ? `${klass?.name ?? '?'} · ${room?.name ?? '?'}`
              : `${klass?.name ?? '?'} · ${teacher?.shortName ?? '?'}`;
        td.append(
          el(
            'div',
            { class: 'lesson-chip', style: `background:${subject?.color ?? '#e2e8f0'}`, title: `${subject?.name ?? '?'} (${klass?.name ?? '?'}, ${teacherName(teacher)}, ${room?.name ?? '?'})` },
            el('strong', {}, subject?.shortName ?? '?'),
            el('span', {}, detail),
          ),
        );
      }
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);

  // --- Seitenleiste: Score, Solver-Info, offene Lektionen ---
  const breakdownRows = timetable.score.breakdown.map((b) =>
    el(
      'tr',
      { class: b.violations ? '' : 'muted' },
      el('td', {}, b.displayName),
      el('td', { class: 'num' }, String(b.violations)),
      el('td', { class: 'num' }, String(b.penalty)),
    ),
  );
  const unplacedItems = (timetable.unplaced ?? []).map((u) => {
    const cs = csById.get(u.classSubjectId);
    const subject = cs ? byId(doc.subjects, cs.subjectId) : null;
    const klass = cs ? byId(doc.classes, cs.classId) : null;
    const reason = u.reason === 'UNASSIGNED_TEACHER' ? 'keine Lehrkraft zugeordnet' : 'nicht platzierbar';
    return el('li', {}, `${klass?.name ?? '?'} ${subject?.name ?? u.classSubjectId}: ${u.missing} Std. offen (${reason})`);
  });
  const info = timetable.solverInfo ?? {};

  const sidebar = el(
    'aside',
    { class: 'plan-sidebar' },
    el('h3', {}, 'Bewertung'),
    el('p', {}, `Hart: ${timetable.score.hard} · Weich: ${timetable.score.soft}`),
    el(
      'table',
      { class: 'data-table score-table' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Constraint'), el('th', {}, 'Verstöße'), el('th', {}, 'Punkte'))),
      el('tbody', {}, breakdownRows),
    ),
    unplacedItems.length ? el('h3', {}, 'Offene Lektionen') : null,
    unplacedItems.length ? el('ul', { class: 'unplaced-list' }, unplacedItems) : null,
    el('h3', {}, 'Solver'),
    el('p', { class: 'hint' }, `Seed ${info.seed} · ${info.elapsedMs} ms · ${info.backtracks} Backtracks · ${info.optimizeSteps} Optimierungsschritte`),
  );

  main.append(
    el('div', { class: 'plan-controls' }, el('label', {}, 'Ansicht ', typeSelect), el('label', {}, ' ', entitySelect), printButton),
    el('div', { class: 'plan-layout' }, el('div', { class: 'plan-grid-wrap table-scroll' }, table), sidebar),
  );
}
