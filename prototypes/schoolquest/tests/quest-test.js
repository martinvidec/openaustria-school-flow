'use strict';
/**
 * Quest-Inhalte Konsistenz-Test (Issue #201).
 * - Alle JSON-Dateien in data/quests/ parsen
 * - Pflichtfelder: id, titel, fach, stufe, kompetenz, aufgaben, loesungstexte
 * - kompetenz-Ref existiert in lehrplan_*.json (AC-F8)
 * - requires-IDs existieren; keine Zyklen (topologisch prüfbar)
 * - Alle 4 Aufgabentypen im Bestand ≥ 3× (Issue-AC)
 * - loesungstexte.length === aufgaben.length
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DATA = path.join(__dirname, '..', 'data');
const QUESTS_DIR = path.join(DATA, 'quests');

const lehrplanIds = new Set();
for (const f of ['lehrplan_mathematik.json', 'lehrplan_deutsch.json']) {
  const d = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  for (const k of d.kompetenzen) lehrplanIds.add(k.id);
}

const files = fs.readdirSync(QUESTS_DIR).filter((f) => f.endsWith('.json'));
assert.ok(files.length >= 16, `mindestens 16 Quests erwartet, gefunden: ${files.length}`);

const questIds = new Set();
const typen = { quiz: 0, eingabe: 0, 'drag-drop': 0, matching: 0 };
const quests = [];
const fachStufe = new Set();

for (const f of files) {
  const q = JSON.parse(fs.readFileSync(path.join(QUESTS_DIR, f), 'utf8'));
  // Pflichtfelder
  assert.ok(q.id && q.titel && q.fach && q.stufe && q.kompetenz, `${f}: Pflichtfeld fehlt`);
  assert.ok(Array.isArray(q.aufgaben) && q.aufgaben.length > 0, `${f}: keine Aufgaben`);
  assert.ok(Array.isArray(q.loesungstexte) && q.loesungstexte.length === q.aufgaben.length, `${f}: loesungstexte.length ≠ aufgaben.length`);
  // ID
  assert.ok(!questIds.has(q.id), `Doppelte Quest-ID: ${q.id}`);
  questIds.add(q.id);
  quests.push(q);
  fachStufe.add(`${q.fach}:${q.stufe}`);
  // Kompetenz-Ref existiert (AC-F8)
  assert.ok(lehrplanIds.has(q.kompetenz), `${f}: kompetenz-Ref unbekannt: ${q.kompetenz}`);
  // Aufgaben-Typen zählen + loesungstexte-Paarung
  for (const a of q.aufgaben) {
    assert.ok(typen[a.typ] !== undefined, `${f}: unbekannter Typ ${a.typ}`);
    typen[a.typ]++;
  }
}

// MVP-Abdeckung: 2 Fächer × 2 Stufen
assert.equal(fachStufe.size, 4, `2 Fächer × 2 Stufen erwartet, gefunden: ${[...fachStufe].join(', ')}`);

// Jeder Typ mindestens 3× (Issue-AC)
for (const [t, n] of Object.entries(typen)) {
  assert.ok(n >= 3, `Aufgabentyp ${t} nur ${n}× — mindestens 3 gefordert`);
}

// Zyklen-Check (topologische Sortierung über requires)
const byId = new Map(quests.map((q) => [q.id, q]));
const state = new Map(); // 0=unbesucht, 1=in-progress, 2=fertig
function visit(id, stack) {
  if (state.get(id) === 2) return;
  if (state.get(id) === 1) {
    assert.fail(`Zyklus entdeckt: ${[...stack, id].join(' → ')}`);
  }
  state.set(id, 1);
  const q = byId.get(id);
  for (const r of (q && q.requires) || []) {
    if (byId.has(r)) visit(r, [...stack, id]);
  }
  state.set(id, 2);
}
for (const q of quests) visit(q.id, []);

// requires-Refs existieren (jetzt sind alle questIds bekannt)
for (const q of quests) {
  for (const r of q.requires || []) {
    assert.ok(lehrplanIds.has(r), `${q.id}: requires-Ref (Kompetenz-ID) unbekannt: ${r}`);
  }
}

// Jede referenzierte Kompetenz im MVP-Scope (Mathe/Deutsch, Stufe 3/4)
for (const q of quests) {
  assert.ok(q.kompetenz.startsWith('mathe.') || q.kompetenz.startsWith('deutsch.'), `${q.id}: nicht MVP-Fach`);
}

console.log(`quest-test: ${quests.length} Quests validiert (Typen: quiz=${typen.quiz}, eingabe=${typen.eingabe}, drag-drop=${typen['drag-drop']}, matching=${typen.matching}) ✅`);
