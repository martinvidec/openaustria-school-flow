'use strict';
/**
 * SchoolQuest Engine-Test — Platzhalter für Issue #200 (#3).
 * Wird in #200 durch echte Engine-Tests ersetzt (quest-engine, verteilung, progress).
 * Existiert jetzt schon, damit `npm test` laut Issue #198 grün lauffähig ist.
 */
const assert = require('node:assert/strict');

// Platzhalter-Assertion: Store ist geladen und Engine-Module folgen in #200.
const store = require('../js/store.js');
assert.ok(typeof store.defaultState === 'function');

console.log('engine-test: Platzhalter grün (echte Tests in Issue #200) ✅');
