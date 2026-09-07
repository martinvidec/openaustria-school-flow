'use strict';
/**
 * SchoolQuest Store — localStorage-Persistenz (schoolquest.v1)
 * DOM-frei, pure functions + thin localStorage wrapper.
 * Spec: prototypes/schoolquest/docs/04-spezifikation-schoolquest.md §4
 */
const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'schoolquest.v1';

function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    aktiveAvatare: null,          // ID des aktiven Avatars oder null
    avatare: [],                  // [{ id, pseudonym, avatarIcon, klassenId, fortschritt }]
    klassen: [],                  // [{ id, name, stufe, faecher: [...] }]
    verteilung: {},               // { `${klassenId}:${fach}`: { wochen: [{ woche, kompetenzIds }] } }
    overrides: [],                // [{ klassenId, kompetenzId, aktion: 'freischalten'|'sperren', weekIndex }]
    letzteGeoeffnet: null,        // ISO timestamp
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Migriert ältere States auf die aktuelle Schema-Version. */
function migrateState(raw) {
  const state = Object.assign(defaultState(), raw);
  if (typeof state.schemaVersion !== 'number' || state.schemaVersion < SCHEMA_VERSION) {
    state.schemaVersion = SCHEMA_VERSION;
  }
  return state;
}

/** Validiert ein importiertes State-Objekt. Gibt { ok, errors } zurück. */
function validateState(obj) {
  const errors = [];
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { ok: false, errors: ['State muss ein Objekt sein.'] };
  }
  if (typeof obj.schemaVersion !== 'number') errors.push('schemaVersion fehlt.');
  if (!Array.isArray(obj.avatare)) errors.push('avatare muss ein Array sein.');
  if (!Array.isArray(obj.klassen)) errors.push('klassen muss ein Array sein.');
  if (obj.verteilung !== undefined && typeof obj.verteilung !== 'object') errors.push('verteilung muss ein Objekt sein.');
  if (obj.overrides !== undefined && !Array.isArray(obj.overrides)) errors.push('overrides muss ein Array sein.');
  for (const a of (obj.avatare || [])) {
    if (!a.id || !a.pseudonym) { errors.push('Avatar ohne id/pseudonym gefunden.'); break; }
  }
  return { ok: errors.length === 0, errors };
}

const isBrowser = typeof localStorage !== 'undefined';

function loadState() {
  if (!isBrowser) return defaultState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    return migrateState(JSON.parse(raw));
  } catch (_e) {
    return defaultState();
  }
}

function saveState(state) {
  if (!isBrowser) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return true;
}

function resetState() {
  if (!isBrowser) return defaultState();
  localStorage.removeItem(STORAGE_KEY);
  return defaultState();
}

/** Exportiert den aktuellen State als JSON-String. */
function exportState(state) {
  return JSON.stringify(state, null, 2);
}

/** Importiert einen JSON-String. Gibt { ok, state, errors } zurück. */
function importState(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateState(parsed);
    if (!validation.ok) return { ok: false, errors: validation.errors, state: null };
    const state = migrateState(parsed);
    saveState(state);
    return { ok: true, errors: [], state };
  } catch (_e) {
    return { ok: false, errors: ['Ungültiges JSON.'], state: null };
  }
}

// Universal-Export: Browser (window) + Node (module.exports) — keine Browser-Crashes mehr
const storeApi = {
  SCHEMA_VERSION,
  STORAGE_KEY,
  defaultState,
  cloneState,
  migrateState,
  validateState,
  loadState,
  saveState,
  resetState,
  exportState,
  importState,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = storeApi; // Node-Tests
} else {
  window.SchoolQuestStore = storeApi; // Browser
}
