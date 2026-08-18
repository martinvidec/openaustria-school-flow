// Berechnen-Tab: Diagnose-Panel, Solver-Optionen, Start/Abbrechen, Fortschritt.

import { runDiagnostics } from '../solver/diagnostics.js';
import { el, toast } from './components.js';

// Laufender Solver-Lauf überlebt Tab-Wechsel/Re-Render (modulweiter Zustand).
let activeRun = null;

export function renderBerechnen(main, store) {
  const doc = store.doc;
  const diagnostics = runDiagnostics(doc);
  const errors = diagnostics.warnings.filter((w) => w.severity === 'error');
  const warnings = diagnostics.warnings.filter((w) => w.severity === 'warning');

  // --- Diagnose-Panel ---
  const facts = el(
    'div',
    { class: 'diag-facts' },
    fact('Slots im Raster', diagnostics.gridSlots),
    fact('Wochenstunden gesamt', diagnostics.totalLessons),
    fact('Klassen', diagnostics.classCount),
    fact('Lehrkräfte', diagnostics.teacherCount),
    fact('Räume', diagnostics.roomCount),
  );
  const diagList = el(
    'ul',
    { class: 'diag-list' },
    errors.map((w) => el('li', { class: 'diag-error' }, `✗ ${w.message}`)),
    warnings.map((w) => el('li', { class: 'diag-warning' }, `⚠ ${w.message}`)),
    !errors.length && !warnings.length ? el('li', { class: 'diag-ok' }, '✓ Keine Auffälligkeiten — der Plan kann berechnet werden.') : null,
  );

  // --- Optionen ---
  const seedInput = el('input', {
    type: 'text',
    class: 'seed-input',
    placeholder: 'zufällig',
    value: doc.settings.solverSeed ?? '',
    onChange: (ev) => {
      const raw = ev.target.value.trim();
      store.update((d) => {
        d.settings.solverSeed = raw === '' ? null : Number(raw) >>> 0;
      });
    },
  });
  const timeInput = el('input', {
    type: 'number',
    min: 1,
    max: 60,
    class: 'time-limit-input',
    value: Math.round((doc.settings.timeLimitMs ?? 8000) / 1000),
    onChange: (ev) =>
      store.update((d) => {
        d.settings.timeLimitMs = Math.max(1, Number(ev.target.value) || 8) * 1000;
      }),
  });

  // --- Start / Abbrechen / Fortschritt ---
  const progressBar = el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill', style: 'width:0%' }));
  const progressText = el('p', { class: 'progress-text' }, '');
  const runBox = el('div', { class: 'run-box' });

  function setRunningUi(running) {
    startButton.disabled = running || errors.length > 0;
    cancelButton.disabled = !running;
    progressBar.style.display = running ? '' : 'none';
    if (!running) progressText.textContent = '';
  }

  function startSolve() {
    const data = JSON.parse(JSON.stringify({ ...store.doc, timetable: null }));
    const seed = store.doc.settings.solverSeed ?? (Math.random() * 0xffffffff) >>> 0;
    const timeLimitMs = store.doc.settings.timeLimitMs ?? 8000;
    const worker = new Worker(new URL('../solver/worker.js', import.meta.url), { type: 'module' });
    activeRun = { worker, startedAt: Date.now() };

    worker.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        const pct = msg.phase === 'platzieren' ? Math.round((msg.placed / Math.max(1, msg.total)) * 50) : 50 + Math.round(((msg.step ?? 0) / Math.max(1, msg.steps ?? 1)) * 50);
        progressBar.querySelector('.progress-fill').style.width = `${pct}%`;
        progressText.textContent =
          msg.phase === 'platzieren'
            ? `Platzieren: ${msg.placed}/${msg.total} Lektionen (${msg.backtracks} Backtracks)`
            : `Optimieren: Best-Score ${msg.bestSoft} (Schritt ${msg.step}/${msg.steps})`;
      } else if (msg.type === 'result') {
        worker.terminate();
        activeRun = null;
        store.update((d) => {
          d.timetable = msg.timetable;
        });
        const t = msg.timetable;
        toast(
          t.unplaced.length
            ? `Plan berechnet — ${t.unplaced.length} Stundentafel-Einträge konnten nicht vollständig platziert werden.`
            : `Plan berechnet (Score ${t.score.soft}, Seed ${t.solverInfo.seed}).`,
          t.unplaced.length ? 'error' : 'info',
        );
      } else if (msg.type === 'error') {
        worker.terminate();
        activeRun = null;
        toast(msg.message, 'error');
        setRunningUi(false);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      activeRun = null;
      toast(`Solver-Fehler: ${err.message ?? 'unbekannt'}`, 'error');
      setRunningUi(false);
    };

    worker.postMessage({
      type: 'solve',
      payload: {
        data,
        options: {
          seed,
          timeLimitMs,
          optimizeSteps: Math.max(2000, Math.min(200000, timeLimitMs * 5)),
          weights: store.doc.settings.weights,
        },
      },
    });
    setRunningUi(true);
    progressText.textContent = 'Berechnung gestartet …';
  }

  function cancelSolve() {
    if (!activeRun) return;
    activeRun.worker.terminate();
    activeRun = null;
    setRunningUi(false);
    toast('Berechnung abgebrochen.');
  }

  const startButton = el('button', { class: 'btn btn-primary', onClick: startSolve }, 'Stundenplan berechnen');
  const cancelButton = el('button', { class: 'btn btn-danger', onClick: cancelSolve }, 'Abbrechen');
  runBox.append(startButton, cancelButton, progressBar, progressText);

  // --- letztes Ergebnis ---
  const result = doc.timetable;
  let resultBox = null;
  if (result) {
    const info = result.solverInfo ?? {};
    resultBox = el(
      'div',
      { class: 'result-box' },
      el('h3', {}, 'Letztes Ergebnis'),
      result.stale
        ? el('p', { class: 'banner banner-warning' }, 'Stammdaten oder Zeitraster wurden seit der Berechnung geändert — der Plan ist veraltet.')
        : null,
      el(
        'p',
        {},
        `Score: hart ${result.score.hard}, weich ${result.score.soft} · ${result.lessons.length} Lektionen · `,
        `Seed ${info.seed}`,
        ' ',
        el(
          'button',
          {
            class: 'btn btn-small',
            title: 'Diesen Seed für reproduzierbare Läufe übernehmen',
            onClick: () =>
              store.update((d) => {
                d.settings.solverSeed = info.seed;
              }),
          },
          'Seed übernehmen',
        ),
        ` · ${info.elapsedMs} ms · ${info.backtracks} Backtracks · ${info.optimizeSteps} Optimierungsschritte`,
      ),
      result.unplaced.length
        ? el('p', { class: 'banner banner-error' }, `${result.unplaced.length} Stundentafel-Einträge nicht vollständig platziert — Details im Stundenplan-Tab.`)
        : null,
      el('p', {}, el('a', { href: '#plan', class: 'btn btn-primary' }, 'Zum Stundenplan →')),
    );
  }

  main.append(
    el('div', { class: 'section-header' }, el('h2', {}, 'Berechnen')),
    el('h3', {}, 'Machbarkeitsprüfung'),
    facts,
    diagList,
    el('h3', {}, 'Optionen'),
    el(
      'div',
      { class: 'options-row' },
      el('label', {}, 'Zeitlimit (Sekunden) ', timeInput),
      el('label', {}, 'Seed ', seedInput),
    ),
    runBox,
    resultBox,
  );

  setRunningUi(!!activeRun);
  if (activeRun) progressText.textContent = 'Berechnung läuft …';
}

function fact(label, value) {
  return el('div', { class: 'diag-fact' }, el('strong', {}, String(value)), el('span', {}, label));
}
