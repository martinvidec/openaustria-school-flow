'use strict';
/**
 * Browser-Smoke-Test (Node, ohne echten Browser): Simuliert die Browser-Umgebung
 * und lädt alle Script-Dateien in Reihenfolge der index.html — fängt exakt die
 * Fehlerklasse ab, die auf Pages aufgetreten ist (module is not defined etc.).
 * Echtes E2E folgt über die Playwright-Suite (Issue #196-Diskussion).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

// Mock-Browser-Globals
const storageData = {};
const localStorageMock = {
  getItem: (k) => (k in storageData ? storageData[k] : null),
  setItem: (k, v) => { storageData[k] = String(v); },
  removeItem: (k) => { delete storageData[k]; },
};
const sandbox = {
  window: {},
  localStorage: localStorageMock,
  document: {
    readyState: 'complete',
    addEventListener: () => {},
    createElement: () => ({ addEventListener: () => {}, classList: { add: () => {}, toggle: () => {} }, appendChild: () => {}, dataset: {} }),
    querySelectorAll: () => [],
    getElementById: () => ({ set innerHTML(v) {}, appendChild: () => {}, prepend: () => {}, querySelectorAll: () => [] }),
  },
  navigator: {},
  console,
  setTimeout,
  fetch: () => Promise.resolve({ ok: true, json: async () => ({}) }),
  Blob: function () {},
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  FileReader: function () { this.readAsText = () => {}; },
  alert: () => {},
  confirm: () => true,
  location: { reload: () => {} },
};
sandbox.window = sandbox; // window === globalThis im Browser-Scope simulieren

// Reihenfolge wie index.html — jede Datei in derselben VM ausführen
const scripts = [
  'js/store.js',
  'js/engine/quest-engine.js',
  'js/engine/verteilung.js',
  'js/engine/progress.js',
  'js/views/schueler.js',
  'js/views/lehrer.js',
  'js/views/landkarte.js',
  'js/seed.js',
  'js/app.js',
];

const context = vm.createContext(sandbox);
for (const file of scripts) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  try {
    vm.runInContext(code, context, { filename: file });
  } catch (e) {
    assert.fail(`${file} crasht im Browser-Kontext: ${e.message} (module is not defined? window-Export fehlt?)`);
  }
}

// Global-Vertrag prüfen (was app.js/views erwarten)
const requiredGlobals = [
  'SchoolQuestStore', 'SchoolQuestEngine', 'SchoolQuestVerteilung',
  'SchoolQuestProgress', 'SchoolQuestSchueler', 'SchoolQuestLehrer',
  'SchoolQuestLandkarte', 'SchoolQuestSeed',
];
for (const g of requiredGlobals) {
  assert.ok(sandbox.window[g], `window.${g} fehlt nach Laden aller Scripts!`);
}

// store-Funktionsfähigkeit im simulierten Browser
const st = sandbox.window.SchoolQuestStore.loadState();
assert.equal(st.schemaVersion, 1);

console.log('browser-smoke: 9 Scripts im simulierten Browser geladen, 8 window-Globals vorhanden ✅');
