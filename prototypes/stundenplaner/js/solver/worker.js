// Web-Worker-Einstieg. Einzige Datei mit self.onmessage.
// Abbrechen läuft über worker.terminate() im Main-Thread — pro Lauf wird ein
// frischer Worker erzeugt (ein synchron rechnender Worker empfängt keine Messages).

import { runDiagnostics } from './diagnostics.js';
import { runSolver } from './run.js';

self.onmessage = (event) => {
  const msg = event.data;
  if (msg?.type !== 'solve') return;
  const { data, options } = msg.payload;
  try {
    const diagnostics = runDiagnostics(data);
    if (!diagnostics.feasible) {
      self.postMessage({
        type: 'error',
        message: 'Die Machbarkeitsprüfung meldet Fehler — Berechnung nicht gestartet.',
        diagnostics,
      });
      return;
    }
    const startedAt = Date.now();
    let lastProgress = 0;
    const timetable = runSolver(data, options, (p) => {
      const now = Date.now();
      if (now - lastProgress >= 250) {
        lastProgress = now;
        self.postMessage({ type: 'progress', ...p, elapsedMs: now - startedAt });
      }
    });
    self.postMessage({ type: 'result', timetable, diagnostics });
  } catch (e) {
    self.postMessage({ type: 'error', message: e?.message ?? String(e) });
  }
};
