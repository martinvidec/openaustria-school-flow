// Zeitraster-Tab: Perioden-Tabelle (Unterricht + Pausen), Schultage, Vorlage-Reset.

import { ALL_DAYS, DAY_LABELS, validatePeriods } from '../model.js';
import { VS_TIME_GRID, VS_SCHOOL_DAYS } from '../seed.js';
import { el, toast, confirmDialog } from './components.js';

const TIME_RE = /^\d{2}:\d{2}$/;

function minutesBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function renderZeitraster(main, store) {
  const doc = store.doc;
  const periods = doc.school.timeGrid.periods;

  function mutatePeriods(fn) {
    store.updateData((d) => {
      fn(d.school.timeGrid.periods);
      // Nummerierung folgt der Zeilenreihenfolge — verhindert Duplikate.
      d.school.timeGrid.periods.forEach((p, i) => {
        p.periodNumber = i + 1;
        if (TIME_RE.test(p.startTime) && TIME_RE.test(p.endTime)) {
          p.durationMin = Math.max(1, minutesBetween(p.startTime, p.endTime));
        }
      });
    });
  }

  function setPeriodField(index, field, value) {
    if ((field === 'startTime' || field === 'endTime') && !TIME_RE.test(value)) {
      toast('Uhrzeiten bitte im Format HH:mm angeben (z. B. 08:00).', 'error');
      store.update(() => {}); // Re-Render, Eingabe verwerfen
      return;
    }
    mutatePeriods((list) => {
      list[index][field] = value;
    });
  }

  const table = el(
    'table',
    { class: 'data-table' },
    el(
      'thead',
      {},
      el('tr', {}, ['Nr.', 'Von', 'Bis', 'Pause', 'Bezeichnung', 'Minuten', ''].map((h) => el('th', {}, h))),
    ),
  );
  const tbody = el('tbody', {});
  periods.forEach((p, index) => {
    tbody.append(
      el(
        'tr',
        { class: p.isBreak ? 'break-row' : '' },
        el('td', { class: 'num' }, String(p.periodNumber)),
        el('td', {}, el('input', { class: 'time-input', value: p.startTime, onChange: (ev) => setPeriodField(index, 'startTime', ev.target.value.trim()) })),
        el('td', {}, el('input', { class: 'time-input', value: p.endTime, onChange: (ev) => setPeriodField(index, 'endTime', ev.target.value.trim()) })),
        el('td', { class: 'center' }, el('input', { type: 'checkbox', checked: p.isBreak, onChange: (ev) => mutatePeriods((list) => { list[index].isBreak = ev.target.checked; }) })),
        el('td', {}, el('input', { value: p.label ?? '', onChange: (ev) => mutatePeriods((list) => { list[index].label = ev.target.value; }) })),
        el('td', { class: 'num' }, String(p.durationMin ?? '')),
        el(
          'td',
          { class: 'actions' },
          el('button', { class: 'btn btn-small btn-danger', onClick: () => mutatePeriods((list) => list.splice(index, 1)) }, 'Löschen'),
        ),
      ),
    );
  });
  table.append(tbody);

  const addButton = el(
    'button',
    {
      class: 'btn',
      onClick: () =>
        mutatePeriods((list) => {
          const last = list[list.length - 1];
          const start = last?.endTime && TIME_RE.test(last.endTime) ? last.endTime : '08:00';
          const [h, m] = start.split(':').map(Number);
          const endMinutes = Math.min(h * 60 + m + 50, 23 * 60 + 59);
          const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
          list.push({ periodNumber: list.length + 1, startTime: start, endTime: end, isBreak: false, label: '', durationMin: 50 });
        }),
    },
    '+ Zeile hinzufügen',
  );

  const dayToggles = el(
    'div',
    { class: 'day-toggles' },
    ALL_DAYS.map((day) =>
      el(
        'label',
        { class: 'checkbox-item' },
        el('input', {
          type: 'checkbox',
          checked: doc.school.schoolDays.includes(day),
          onChange: (ev) =>
            store.updateData((d) => {
              const set = new Set(d.school.schoolDays);
              if (ev.target.checked) set.add(day);
              else set.delete(day);
              d.school.schoolDays = ALL_DAYS.filter((x) => set.has(x));
            }),
        }),
        ` ${DAY_LABELS[day]}`,
      ),
    ),
  );

  const resetButton = el(
    'button',
    {
      class: 'btn',
      onClick: async () => {
        if (!(await confirmDialog('Zeitraster und Schultage auf die VS-Standardvorlage zurücksetzen?', 'Zurücksetzen'))) return;
        store.updateData((d) => {
          d.school.timeGrid = { name: VS_TIME_GRID.name, periods: VS_TIME_GRID.periods.map((p) => ({ ...p })) };
          d.school.schoolDays = [...VS_SCHOOL_DAYS];
        });
        toast('VS-Standardvorlage wiederhergestellt.');
      },
    },
    'VS-Standardvorlage wiederherstellen',
  );

  const problems = validatePeriods(periods);

  main.append(
    el('div', { class: 'section-header' }, el('h2', {}, 'Zeitraster'), resetButton),
    doc.timetable
      ? el('p', { class: 'banner banner-warning' }, 'Achtung: Änderungen am Zeitraster markieren den vorhandenen Stundenplan als veraltet.')
      : null,
    problems.length ? el('p', { class: 'banner banner-error' }, problems.join(' ')) : null,
    el('div', { class: 'table-scroll' }, table),
    el('p', {}, addButton),
    el('h3', {}, 'Schultage'),
    dayToggles,
  );
}
