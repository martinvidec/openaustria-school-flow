// Stammdaten-Tab: CRUD für Klassen, Lehrkräfte, Räume, Fächer + Stundentafel-Matrix.

import {
  ROOM_TYPES,
  ROOM_TYPE_LABELS,
  DAY_LABELS_SHORT,
  nextId,
  byId,
  teacherName,
  referencesTo,
  gridSlots,
  lessonPeriods,
} from '../model.js';
import { el, confirmDialog, openFormDialog } from './components.js';

let activeSub = 'klassen';

const SUBTABS = [
  ['klassen', 'Klassen'],
  ['lehrkraefte', 'Lehrkräfte'],
  ['raeume', 'Räume'],
  ['faecher', 'Fächer'],
  ['stundentafel', 'Stundentafel'],
];

export function renderStammdaten(main, store) {
  const nav = el(
    'div',
    { class: 'subtabs' },
    SUBTABS.map(([key, label]) =>
      el(
        'button',
        {
          class: `subtab${activeSub === key ? ' active' : ''}`,
          onClick: () => {
            activeSub = key;
            renderStammdaten(main, store);
          },
        },
        label,
      ),
    ),
  );
  const body = el('div', { class: 'subtab-body' });
  main.innerHTML = '';
  main.append(nav, body);

  if (activeSub === 'klassen') renderKlassen(body, store);
  else if (activeSub === 'lehrkraefte') renderLehrkraefte(body, store);
  else if (activeSub === 'raeume') renderRaeume(body, store);
  else if (activeSub === 'faecher') renderFaecher(body, store);
  else renderStundentafel(body, store);
}

// ---- Klassen ----

function renderKlassen(body, store) {
  const doc = store.doc;

  function classForm(existing) {
    openFormDialog({
      title: existing ? `Klasse ${existing.name} bearbeiten` : 'Neue Klasse',
      values: existing ?? { yearLevel: 1 },
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'yearLevel', label: 'Schulstufe', type: 'number', min: 0, max: 8, required: true },
        {
          name: 'homeRoomId',
          label: 'Stammraum',
          type: 'select',
          options: [{ value: '', label: '—' }, ...doc.rooms.map((r) => ({ value: r.id, label: r.name }))],
        },
        {
          name: 'klassenlehrerId',
          label: 'Klassenlehrer:in',
          type: 'select',
          options: [{ value: '', label: '—' }, ...doc.teachers.map((t) => ({ value: t.id, label: teacherName(t) }))],
        },
      ],
      onSubmit: (v) => {
        if (!v.name.trim()) return 'Name darf nicht leer sein.';
        store.updateData((d) => {
          if (existing) {
            Object.assign(byId(d.classes, existing.id), {
              name: v.name.trim(),
              yearLevel: v.yearLevel ?? 1,
              homeRoomId: v.homeRoomId || null,
              klassenlehrerId: v.klassenlehrerId || null,
            });
          } else {
            d.classes.push({
              id: nextId(d, 'c'),
              name: v.name.trim(),
              yearLevel: v.yearLevel ?? 1,
              homeRoomId: v.homeRoomId || null,
              klassenlehrerId: v.klassenlehrerId || null,
            });
          }
        });
      },
    });
  }

  async function removeClass(klass) {
    const refs = referencesTo(doc, 'class', klass.id);
    const message = refs.length
      ? `Klasse ${klass.name} wird verwendet von: ${refs.join(', ')}. Trotzdem löschen (inkl. Stundentafel-Einträgen)?`
      : `Klasse ${klass.name} löschen?`;
    if (!(await confirmDialog(message, 'Löschen'))) return;
    store.updateData((d) => {
      d.classSubjects = d.classSubjects.filter((cs) => cs.classId !== klass.id);
      d.classes = d.classes.filter((c) => c.id !== klass.id);
    });
  }

  const rows = doc.classes.map((klass) => {
    const hours = doc.classSubjects
      .filter((cs) => cs.classId === klass.id)
      .reduce((sum, cs) => sum + (cs.weeklyHours || 0), 0);
    return el(
      'tr',
      {},
      el('td', {}, klass.name),
      el('td', {}, String(klass.yearLevel)),
      el('td', {}, byId(doc.rooms, klass.homeRoomId)?.name ?? '—'),
      el('td', {}, teacherName(byId(doc.teachers, klass.klassenlehrerId))),
      el('td', { class: 'num' }, String(hours)),
      actionCell(
        () => classForm(klass),
        () => removeClass(klass),
      ),
    );
  });

  body.append(
    sectionHeader('Klassen', () => classForm(null)),
    dataTable(['Name', 'Schulstufe', 'Stammraum', 'Klassenlehrer:in', 'Wochenstunden', ''], rows, 'Noch keine Klassen angelegt.'),
  );
}

// ---- Lehrkräfte ----

function renderLehrkraefte(body, store) {
  const doc = store.doc;
  const periods = lessonPeriods(doc);
  const days = doc.school.schoolDays;

  // Sperrzeiten-Raster (Tage x Unterrichtsstunden) als custom-Feld im Dialog.
  function blockedGridField() {
    return {
      name: 'availabilityRules',
      label: 'Sperrzeiten',
      type: 'custom',
      render: (container, values) => {
        const blocked = new Set((values.availabilityRules ?? []).map((r) => `${r.dayOfWeek}|${r.periodNumber}`));
        const table = el('table', { class: 'mini-grid' });
        const head = el('tr', {}, el('th', {}, 'Sperrzeiten'));
        for (const day of days) head.append(el('th', {}, DAY_LABELS_SHORT[day]));
        table.append(head);
        for (const p of periods) {
          const tr = el('tr', {}, el('th', {}, p.label ?? `${p.periodNumber}.`));
          for (const day of days) {
            const key = `${day}|${p.periodNumber}`;
            tr.append(
              el(
                'td',
                {},
                el('input', {
                  type: 'checkbox',
                  checked: blocked.has(key),
                  'data-day': day,
                  'data-period': String(p.periodNumber),
                }),
              ),
            );
          }
          table.append(tr);
        }
        container.append(table, el('span', { class: 'form-hint' }, 'Angehakte Slots sind für diese Lehrkraft gesperrt.'));
      },
      collect: (container) => {
        const rules = [];
        container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          if (cb.checked) rules.push({ dayOfWeek: cb.dataset.day, periodNumber: Number(cb.dataset.period) });
        });
        return rules;
      },
    };
  }

  function qualificationsField() {
    return {
      name: 'qualifications',
      label: 'Qualifikationen',
      type: 'custom',
      render: (container, values) => {
        const selected = new Set(values.qualifications ?? []);
        container.append(el('span', { class: 'form-label' }, 'Qualifikationen'));
        const list = el('div', { class: 'checkbox-list' });
        for (const s of doc.subjects) {
          list.append(
            el(
              'label',
              { class: 'checkbox-item' },
              el('input', { type: 'checkbox', checked: selected.has(s.id), 'data-subject': s.id }),
              ` ${s.name}`,
            ),
          );
        }
        container.append(list);
      },
      collect: (container) => {
        const ids = [];
        container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          if (cb.checked) ids.push(cb.dataset.subject);
        });
        return ids;
      },
    };
  }

  function teacherForm(existing) {
    openFormDialog({
      title: existing ? `${teacherName(existing)} bearbeiten` : 'Neue Lehrkraft',
      values: existing ?? {},
      fields: [
        { name: 'firstName', label: 'Vorname', type: 'text', required: true },
        { name: 'lastName', label: 'Nachname', type: 'text', required: true },
        { name: 'shortName', label: 'Kürzel', type: 'text', required: true },
        qualificationsField(),
        blockedGridField(),
      ],
      onSubmit: (v) => {
        if (!v.lastName.trim()) return 'Nachname darf nicht leer sein.';
        const data = {
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          shortName: v.shortName.trim().toUpperCase(),
          qualifications: v.qualifications,
          availabilityRules: v.availabilityRules,
        };
        store.updateData((d) => {
          if (existing) Object.assign(byId(d.teachers, existing.id), data);
          else d.teachers.push({ id: nextId(d, 't'), ...data });
        });
      },
    });
  }

  async function removeTeacher(teacher) {
    const refs = referencesTo(doc, 'teacher', teacher.id);
    const message = refs.length
      ? `${teacherName(teacher)} wird verwendet von: ${refs.join(', ')}. Trotzdem löschen (Zuordnungen werden entfernt)?`
      : `${teacherName(teacher)} löschen?`;
    if (!(await confirmDialog(message, 'Löschen'))) return;
    store.updateData((d) => {
      for (const cs of d.classSubjects) if (cs.teacherId === teacher.id) cs.teacherId = null;
      for (const c of d.classes) if (c.klassenlehrerId === teacher.id) c.klassenlehrerId = null;
      d.teachers = d.teachers.filter((t) => t.id !== teacher.id);
    });
  }

  const rows = doc.teachers.map((t) => {
    const hours = doc.classSubjects
      .filter((cs) => cs.teacherId === t.id)
      .reduce((sum, cs) => sum + (cs.weeklyHours || 0), 0);
    return el(
      'tr',
      {},
      el('td', {}, teacherName(t)),
      el('td', {}, t.shortName),
      el('td', {}, t.qualifications.map((id) => byId(doc.subjects, id)?.shortName ?? '?').join(', ') || '—'),
      el('td', { class: 'num' }, String((t.availabilityRules ?? []).length)),
      el('td', { class: 'num' }, String(hours)),
      actionCell(
        () => teacherForm(t),
        () => removeTeacher(t),
      ),
    );
  });

  body.append(
    sectionHeader('Lehrkräfte', () => teacherForm(null)),
    dataTable(['Name', 'Kürzel', 'Qualifikationen', 'Sperrzeiten', 'Wochenstunden', ''], rows, 'Noch keine Lehrkräfte angelegt.'),
  );
}

// ---- Räume ----

function renderRaeume(body, store) {
  const doc = store.doc;

  function roomForm(existing) {
    openFormDialog({
      title: existing ? `Raum ${existing.name} bearbeiten` : 'Neuer Raum',
      values: existing ?? { roomType: 'KLASSENZIMMER' },
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        {
          name: 'roomType',
          label: 'Raumtyp',
          type: 'select',
          options: ROOM_TYPES.map((t) => ({ value: t, label: ROOM_TYPE_LABELS[t] })),
        },
      ],
      onSubmit: (v) => {
        if (!v.name.trim()) return 'Name darf nicht leer sein.';
        store.updateData((d) => {
          if (existing) Object.assign(byId(d.rooms, existing.id), { name: v.name.trim(), roomType: v.roomType });
          else d.rooms.push({ id: nextId(d, 'r'), name: v.name.trim(), roomType: v.roomType });
        });
      },
    });
  }

  async function removeRoom(room) {
    const refs = referencesTo(doc, 'room', room.id);
    const message = refs.length
      ? `Raum ${room.name} wird verwendet von: ${refs.join(', ')}. Trotzdem löschen?`
      : `Raum ${room.name} löschen?`;
    if (!(await confirmDialog(message, 'Löschen'))) return;
    store.updateData((d) => {
      for (const c of d.classes) if (c.homeRoomId === room.id) c.homeRoomId = null;
      d.rooms = d.rooms.filter((r) => r.id !== room.id);
    });
  }

  const rows = doc.rooms.map((room) =>
    el(
      'tr',
      {},
      el('td', {}, room.name),
      el('td', {}, ROOM_TYPE_LABELS[room.roomType] ?? room.roomType),
      actionCell(
        () => roomForm(room),
        () => removeRoom(room),
      ),
    ),
  );

  body.append(
    sectionHeader('Räume', () => roomForm(null)),
    dataTable(['Name', 'Raumtyp', ''], rows, 'Noch keine Räume angelegt.'),
  );
}

// ---- Fächer ----

function renderFaecher(body, store) {
  const doc = store.doc;

  function subjectForm(existing) {
    openFormDialog({
      title: existing ? `Fach ${existing.name} bearbeiten` : 'Neues Fach',
      values: existing ?? { color: '#dbeafe' },
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'shortName', label: 'Kürzel', type: 'text', required: true },
        {
          name: 'requiredRoomType',
          label: 'Benötigter Raumtyp',
          type: 'select',
          options: [
            { value: '', label: 'Kein besonderer Raum' },
            ...ROOM_TYPES.map((t) => ({ value: t, label: ROOM_TYPE_LABELS[t] })),
          ],
        },
        { name: 'isMainSubject', label: 'Hauptfach (bevorzugt am Vormittag)', type: 'checkbox' },
        { name: 'color', label: 'Farbe', type: 'color' },
      ],
      onSubmit: (v) => {
        if (!v.name.trim()) return 'Name darf nicht leer sein.';
        const data = {
          name: v.name.trim(),
          shortName: v.shortName.trim().toUpperCase(),
          requiredRoomType: v.requiredRoomType || null,
          isMainSubject: v.isMainSubject,
          color: v.color,
        };
        store.updateData((d) => {
          if (existing) Object.assign(byId(d.subjects, existing.id), data);
          else d.subjects.push({ id: nextId(d, 's'), ...data });
        });
      },
    });
  }

  async function removeSubject(subject) {
    const refs = referencesTo(doc, 'subject', subject.id);
    const message = refs.length
      ? `Fach ${subject.name} wird verwendet von: ${refs.join(', ')}. Trotzdem löschen (inkl. Stundentafel-Einträgen)?`
      : `Fach ${subject.name} löschen?`;
    if (!(await confirmDialog(message, 'Löschen'))) return;
    store.updateData((d) => {
      d.classSubjects = d.classSubjects.filter((cs) => cs.subjectId !== subject.id);
      for (const t of d.teachers) t.qualifications = t.qualifications.filter((id) => id !== subject.id);
      d.subjects = d.subjects.filter((s) => s.id !== subject.id);
    });
  }

  const rows = doc.subjects.map((s) =>
    el(
      'tr',
      {},
      el('td', {}, el('span', { class: 'color-chip', style: `background:${s.color ?? '#e2e8f0'}` }), ` ${s.name}`),
      el('td', {}, s.shortName),
      el('td', {}, s.requiredRoomType ? ROOM_TYPE_LABELS[s.requiredRoomType] : '—'),
      el('td', {}, s.isMainSubject ? 'Ja' : '—'),
      actionCell(
        () => subjectForm(s),
        () => removeSubject(s),
      ),
    ),
  );

  body.append(
    sectionHeader('Fächer', () => subjectForm(null)),
    dataTable(['Name', 'Kürzel', 'Benötigter Raumtyp', 'Hauptfach', ''], rows, 'Noch keine Fächer angelegt.'),
  );
}

// ---- Stundentafel-Matrix ----

function renderStundentafel(body, store) {
  const doc = store.doc;
  const slots = gridSlots(doc);

  if (!doc.subjects.length || !doc.classes.length) {
    body.append(
      sectionHeader('Stundentafel', null),
      el('p', { class: 'empty-state' }, 'Zuerst Fächer und Klassen anlegen — dann lässt sich hier die Stundentafel befüllen.'),
    );
    return;
  }

  const findCs = (classId, subjectId) =>
    doc.classSubjects.find((cs) => cs.classId === classId && cs.subjectId === subjectId) ?? null;

  function setHours(classId, subjectId, hours) {
    store.updateData((d) => {
      const existing = d.classSubjects.find((cs) => cs.classId === classId && cs.subjectId === subjectId);
      if (hours <= 0) {
        if (existing) d.classSubjects = d.classSubjects.filter((cs) => cs !== existing);
        return;
      }
      if (existing) existing.weeklyHours = hours;
      else {
        const klass = d.classes.find((c) => c.id === classId);
        d.classSubjects.push({
          id: nextId(d, 'cs'),
          classId,
          subjectId,
          teacherId: klass?.klassenlehrerId ?? null,
          weeklyHours: hours,
          preferDoublePeriod: false,
        });
      }
    });
  }

  function setTeacher(classId, subjectId, teacherId) {
    store.updateData((d) => {
      const cs = d.classSubjects.find((x) => x.classId === classId && x.subjectId === subjectId);
      if (cs) cs.teacherId = teacherId || null;
    });
  }

  function setDouble(classId, subjectId, value) {
    store.updateData((d) => {
      const cs = d.classSubjects.find((x) => x.classId === classId && x.subjectId === subjectId);
      if (cs) cs.preferDoublePeriod = value;
    });
  }

  const table = el('table', { class: 'data-table st-matrix' });
  const head = el('tr', {}, el('th', {}, 'Fach'));
  for (const klass of doc.classes) head.append(el('th', {}, klass.name));
  table.append(el('thead', {}, head));

  const tbody = el('tbody', {});
  for (const subject of doc.subjects) {
    const tr = el(
      'tr',
      {},
      el('th', { class: 'st-subject' }, el('span', { class: 'color-chip', style: `background:${subject.color ?? '#e2e8f0'}` }), ` ${subject.shortName}`, el('span', { class: 'st-subject-name' }, ` ${subject.name}`)),
    );
    for (const klass of doc.classes) {
      const cs = findCs(klass.id, subject.id);
      const hoursInput = el('input', {
        type: 'number',
        class: 'st-hours',
        min: 0,
        max: 40,
        value: cs?.weeklyHours ?? '',
        title: 'Wochenstunden',
        onChange: (ev) => setHours(klass.id, subject.id, Number(ev.target.value) || 0),
      });
      const teacherSelect = el(
        'select',
        {
          class: 'st-teacher',
          disabled: !cs,
          title: 'Lehrkraft',
          onChange: (ev) => setTeacher(klass.id, subject.id, ev.target.value),
        },
        el('option', { value: '' }, '— Lehrkraft —'),
        doc.teachers.map((t) => {
          const qualified = t.qualifications.includes(subject.id);
          return el(
            'option',
            { value: t.id, selected: cs?.teacherId === t.id },
            `${t.shortName}${qualified ? '' : ' ⚠'}`,
          );
        }),
      );
      const doubleBox = el('label', { class: 'st-double', title: 'Doppelstunden bevorzugen' },
        el('input', {
          type: 'checkbox',
          checked: cs?.preferDoublePeriod ?? false,
          disabled: !cs || (cs.weeklyHours ?? 0) < 2,
          onChange: (ev) => setDouble(klass.id, subject.id, ev.target.checked),
        }),
        ' 2er',
      );
      tr.append(el('td', { class: 'st-cell' }, hoursInput, teacherSelect, doubleBox));
    }
    tbody.append(tr);
  }

  const sumRow = el('tr', { class: 'st-sum' }, el('th', {}, `Summe (max. ${slots})`));
  for (const klass of doc.classes) {
    const sum = doc.classSubjects
      .filter((cs) => cs.classId === klass.id)
      .reduce((acc, cs) => acc + (cs.weeklyHours || 0), 0);
    sumRow.append(el('td', { class: `num${sum > slots ? ' over' : ''}` }, String(sum)));
  }
  tbody.append(sumRow);
  table.append(tbody);

  body.append(
    sectionHeader('Stundentafel', null),
    el('p', { class: 'hint' }, 'Wochenstunden je Fach und Klasse; „⚠" markiert Lehrkräfte ohne Qualifikation für das Fach, „2er" wünscht Doppelstunden.'),
    el('div', { class: 'table-scroll' }, table),
  );
}

// ---- gemeinsame Bausteine ----

function sectionHeader(title, onNew) {
  return el(
    'div',
    { class: 'section-header' },
    el('h2', {}, title),
    onNew ? el('button', { class: 'btn btn-primary', onClick: onNew }, 'Neu …') : null,
  );
}

function dataTable(headers, rows, emptyText) {
  if (!rows.length) return el('p', { class: 'empty-state' }, emptyText);
  return el(
    'div',
    { class: 'table-scroll' },
    el(
      'table',
      { class: 'data-table' },
      el('thead', {}, el('tr', {}, headers.map((h) => el('th', {}, h)))),
      el('tbody', {}, rows),
    ),
  );
}

function actionCell(onEdit, onDelete) {
  return el(
    'td',
    { class: 'actions' },
    el('button', { class: 'btn btn-small', onClick: onEdit }, 'Bearbeiten'),
    el('button', { class: 'btn btn-small btn-danger', onClick: onDelete }, 'Löschen'),
  );
}
