// Stundenplan-Tab: Wochenraster je Klasse / Lehrkraft / Raum, Score-Breakdown, Druck,
// Drag-&-Drop-Nachbearbeitung (nur Klassenansicht) mit Live-Konfliktprüfung und Undo.

import { DAY_LABELS, byId, teacherName } from '../model.js';
import { checkMove, checkSwap, applyMove, applySwap, scoreFromLessons } from '../solver/edit.js';
import { el, toast } from './components.js';

let viewType = 'klasse';
let selectedId = null;

// Undo-Stack für manuelle Moves — gilt nur für den aktuellen Solver-Lauf
// (solverInfo.createdAt als Schlüssel; neuer Lauf leert den Stack).
let undoStack = [];
let undoKey = null;

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

  const currentKey = timetable.solverInfo?.createdAt ?? null;
  if (undoKey !== currentKey) {
    undoKey = currentKey;
    undoStack = [];
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

  function rerender() {
    main.innerHTML = '';
    renderPlan(main, store);
  }

  // --- Umschalter + Undo + Druck ---
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
  const undoButton = el(
    'button',
    {
      class: 'btn',
      disabled: !undoStack.length,
      title: 'Letzten manuellen Move zurücknehmen',
      onClick: () => {
        const prev = undoStack.pop();
        if (!prev) return;
        store.update((d) => {
          d.timetable.lessons = prev.lessons;
          d.timetable.score = prev.score;
        });
      },
    },
    `Rückgängig${undoStack.length ? ` (${undoStack.length})` : ''}`,
  );
  const printButton = el('button', { class: 'btn', onClick: () => window.print() }, 'Drucken');

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
  const editable = viewType === 'klasse';

  // --- Drag & Drop (nur Klassenansicht) ---
  const cellByKey = new Map(); // "day|periodNumber" -> td
  let dragCtx = null;

  function clearDragClasses() {
    for (const td of cellByKey.values()) td.classList.remove('drop-ok', 'drop-swap');
    main.querySelectorAll('.lesson-chip.dragging').forEach((c) => c.classList.remove('dragging'));
    dragCtx = null;
  }

  function startDrag(lesson) {
    const lessons = store.doc.timetable.lessons;
    const targets = new Map();
    for (const [key, td] of cellByKey) {
      const [day, periodStr] = key.split('|');
      const periodNumber = Number(periodStr);
      const occupant = (bySlot.get(key) ?? [])[0];
      if (occupant && occupant.id !== lesson.id) {
        const swap = checkSwap(doc, lessons, lesson.id, occupant.id);
        if (swap.ok) {
          targets.set(key, { type: 'swap', otherId: occupant.id });
          td.classList.add('drop-swap');
        }
      } else if (!occupant) {
        const move = checkMove(doc, lessons, lesson.id, day, periodNumber);
        if (move.ok) {
          targets.set(key, { type: 'move' });
          td.classList.add('drop-ok');
        }
      }
    }
    dragCtx = { lessonId: lesson.id, targets };
  }

  function applyEdit(newLessons, description) {
    const before = store.doc.timetable;
    undoStack.push({
      lessons: structuredClone(before.lessons),
      score: structuredClone(before.score),
    });
    store.update((d) => {
      d.timetable.lessons = newLessons;
      d.timetable.score = scoreFromLessons(d, newLessons);
    });
    toast(description);
  }

  function handleDrop(key) {
    if (!dragCtx) return;
    const target = dragCtx.targets.get(key);
    if (!target) return;
    const [day, periodStr] = key.split('|');
    const periodNumber = Number(periodStr);
    const lessons = store.doc.timetable.lessons;
    const newLessons =
      target.type === 'swap'
        ? applySwap(doc, lessons, dragCtx.lessonId, target.otherId)
        : applyMove(doc, lessons, dragCtx.lessonId, day, periodNumber);
    if (!newLessons) {
      clearDragClasses();
      toast('Move nicht mehr gültig — Plan wurde zwischenzeitlich geändert.', 'error');
      return;
    }
    applyEdit(newLessons, target.type === 'swap' ? 'Lektionen getauscht.' : 'Lektion verschoben.');
  }

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
      const key = `${day}|${period.periodNumber}`;
      const list = bySlot.get(key) ?? [];
      const td = el('td', { class: 'plan-cell' });
      if (editable) {
        cellByKey.set(key, td);
        td.addEventListener('dragover', (ev) => {
          if (dragCtx?.targets.has(key)) ev.preventDefault();
        });
        td.addEventListener('drop', (ev) => {
          ev.preventDefault();
          handleDrop(key);
        });
      }
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
        const chip = el(
          'div',
          {
            class: `lesson-chip${l.isManualEdit ? ' manual' : ''}`,
            style: `background:${subject?.color ?? '#e2e8f0'}`,
            title: `${subject?.name ?? '?'} (${klass?.name ?? '?'}, ${teacherName(teacher)}, ${room?.name ?? '?'})${l.isManualEdit ? ' — manuell verschoben' : ''}`,
            draggable: editable ? 'true' : null,
          },
          el('strong', {}, `${subject?.shortName ?? '?'}${l.isManualEdit ? ' ✎' : ''}`),
          el('span', {}, detail),
        );
        if (editable) {
          chip.addEventListener('dragstart', (ev) => {
            ev.dataTransfer.setData('text/plain', l.id);
            ev.dataTransfer.effectAllowed = 'move';
            chip.classList.add('dragging');
            startDrag(l);
          });
          chip.addEventListener('dragend', clearDragClasses);
        }
        td.append(chip);
      }
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);

  // --- Seitenleiste ---
  const manualCount = timetable.lessons.filter((l) => l.isManualEdit).length;
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
    el(
      'p',
      { class: 'hint' },
      `Seed ${info.seed} · ${info.elapsedMs} ms · ${info.backtracks} Backtracks · ${info.optimizeSteps} Optimierungsschritte` +
        (manualCount ? ` · ${manualCount} Lektion(en) manuell verschoben ✎` : ''),
    ),
  );

  main.append(
    el(
      'div',
      { class: 'plan-controls' },
      el('label', {}, 'Ansicht ', typeSelect),
      el('label', {}, ' ', entitySelect),
      undoButton,
      printButton,
    ),
    editable
      ? el('p', { class: 'hint' }, 'Nachbearbeitung: Lektionen per Drag & Drop verschieben — grün umrandete Slots sind frei, blau umrandete tauschen die beiden Lektionen. Harte Konflikte sind ausgeschlossen.')
      : el('p', { class: 'hint' }, 'Nachbearbeitung per Drag & Drop ist in der Klassenansicht möglich.'),
    el('div', { class: 'plan-layout' }, el('div', { class: 'plan-grid-wrap table-scroll' }, table), sidebar),
  );
}
