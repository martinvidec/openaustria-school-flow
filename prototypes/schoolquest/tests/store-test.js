'use strict';
const assert = require('node:assert/strict');
const store = require('../js/store.js');

// T1: defaultState hat alle Felder
const def = store.defaultState();
assert.equal(def.schemaVersion, store.SCHEMA_VERSION);
assert.deepEqual(def.avatare, []);
assert.deepEqual(def.klassen, []);

// T2: validateState — gültiger State
const valid = store.validateState({ schemaVersion: 1, avatare: [{ id: 'a1', pseudonym: 'Fuchs' }], klassen: [] });
assert.equal(valid.ok, true, JSON.stringify(valid));

// T3: validateState — invalide Inputs abgelehnt
assert.equal(store.validateState(null).ok, false);
assert.equal(store.validateState([]).ok, false);
assert.equal(store.validateState({ avatare: 'x' }).ok, false);
assert.equal(store.validateState({ schemaVersion: 1, avatare: [{}] }).ok, false, 'Avatar ohne id/pseudonym muss auffallen');

// T4: importState — ungültiges JSON abgelehnt
const bad = store.importState('{{{nicht-json');
assert.equal(bad.ok, false);
assert.ok(bad.errors.length > 0);

// T5: importState — gültiges JSON akzeptiert + Migration
const good = store.importState('{"schemaVersion":0,"avatare":[{"id":"a1","pseudonym":"Fuchs"}],"klassen":[]}');
assert.equal(good.ok, true);
assert.equal(good.state.schemaVersion, store.SCHEMA_VERSION, 'Migration auf aktuelle Version');

// T6: export → import Roundtrip
const state = store.defaultState();
state.avatare.push({ id: 'a1', pseudonym: 'Fuchs', avatarIcon: '🦊', klassenId: 'k1', fortschritt: {} });
const json = store.exportState(state);
const reimport = store.importState(json);
assert.equal(reimport.ok, true);
assert.equal(reimport.state.avatare[0].pseudonym, 'Fuchs');

// T7: localStorage-KEY korrekt
assert.equal(store.STORAGE_KEY, 'schoolquest.v1');

console.log('store-test: 7/7Assertions grün ✅');
