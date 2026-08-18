// App-Bootstrap: Store initialisieren, Seed bei Erststart laden, Header + Tabs verdrahten.

import { createStore } from './store.js';
import { emptyDocument, STORAGE_KEY } from './model.js';
import { seedDocument } from './seed.js';
import { initTabs } from './ui/tabs.js';
import { toast, confirmDialog, downloadFile } from './ui/components.js';

const store = createStore();

if (store.loadError) {
  toast(
    `Gespeicherte Daten konnten nicht geladen werden (${store.loadError}). ` +
      `Die Altdaten liegen als Backup unter dem localStorage-Key "${STORAGE_KEY}.backup".`,
    'error',
  );
}

// Erststart mit komplett leerem Stand: Demo-Schule laden, damit sofort etwas zu sehen ist.
if (!store.doc.subjects.length && !store.doc.classes.length && !store.doc.school.timeGrid.periods.length) {
  store.replace(seedDocument());
}

document.getElementById('btn-demo').addEventListener('click', async () => {
  if (await confirmDialog('Demo-Volksschule laden? Aktuelle Daten werden überschrieben.', 'Demo laden')) {
    store.replace(seedDocument());
    toast('Demo-Volksschule geladen.');
  }
});

document.getElementById('btn-reset').addEventListener('click', async () => {
  if (await confirmDialog('Wirklich alle Daten löschen und leer starten?', 'Zurücksetzen')) {
    store.replace(emptyDocument());
    toast('Alle Daten zurückgesetzt.');
  }
});

document.getElementById('btn-export').addEventListener('click', () => {
  downloadFile(
    `stundenplaner-${new Date().toISOString().slice(0, 10)}.json`,
    store.exportJson(),
    'application/json',
  );
});

const importInput = document.getElementById('import-file');
document.getElementById('btn-import').addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  importInput.value = '';
  if (!file) return;
  const text = await file.text();
  const error = store.importJson(text);
  if (error) toast(`Import fehlgeschlagen: ${error}`, 'error');
  else toast('Daten importiert.');
});

initTabs(store);
