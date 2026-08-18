// Zentraler State: hält das Dokument, persistiert nach localStorage,
// benachrichtigt Subscriber, bietet Import/Export.

import { STORAGE_KEY, emptyDocument, validateDocument } from './model.js';

export function createStore() {
  const listeners = new Set();
  let doc = null;
  let loadError = null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      const problem = validateDocument(parsed);
      if (problem) loadError = problem;
      else doc = parsed;
    } catch {
      loadError = 'Gespeicherte Daten sind kein gültiges JSON.';
    }
    // Nicht ladbare Altdaten sichern, bevor sie beim nächsten Speichern überschrieben würden.
    if (loadError) localStorage.setItem(`${STORAGE_KEY}.backup`, raw);
  }
  if (!doc) doc = emptyDocument();

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }

  function notify() {
    for (const fn of listeners) fn(doc);
  }

  return {
    get doc() {
      return doc;
    },
    // Fehlermeldung, falls localStorage-Daten nicht geladen werden konnten (Schema-Drift).
    get loadError() {
      return loadError;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    // Alle Mutationen laufen über update(): fn mutiert das Dokument in place.
    update(fn) {
      fn(doc);
      persist();
      notify();
    },
    // Mutation der Stammdaten/des Zeitrasters: markiert einen vorhandenen Plan als veraltet.
    updateData(fn) {
      fn(doc);
      if (doc.timetable) doc.timetable.stale = true;
      persist();
      notify();
    },
    replace(newDoc) {
      doc = newDoc;
      persist();
      notify();
    },
    exportJson() {
      return JSON.stringify(doc, null, 2);
    },
    // Liefert null bei Erfolg, sonst eine deutsche Fehlermeldung.
    importJson(text) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return 'Datei ist kein gültiges JSON.';
      }
      const problem = validateDocument(parsed);
      if (problem) return problem;
      doc = parsed;
      persist();
      notify();
      return null;
    },
  };
}
