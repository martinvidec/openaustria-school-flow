'use strict';
/**
 * Full-Play-Test (Issue #205-Verifikation, nach Live-Bug-Report ergänzt):
 * Spielt ALLE Quests mit browser-genauen Antworttypen durch —
 * beweist: jede Quest ist mit perfekten Antworten bestehbar.
 * Nutzt die ECHTE Engine (require) + ECHTE Quest-JSONs (data/quests/).
 * Ergänzt browser-smoke (lädt Scripts) um die funktionale Ebene.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const engine = require('../js/engine/quest-engine.js');
const QUESTS_DIR = path.join(__dirname, '..', 'data', 'quests');

// Browser-genaue Antworttypen (was der DOM-Handler wirklich schickt):
function perfekteAntwort(aufgabe) {
  if (aufgabe.typ === 'eingabe') {
    // <input> liefert STRING; loesung kann String oder Liste sein
    const l = aufgabe.loesung;
    return Array.isArray(l) ? l[0] : l;
  }
  if (aufgabe.typ === 'quiz') return aufgabe.loesung;          // Button-Index
  if (aufgabe.typ === 'drag-drop') return aufgabe.loesung;      // Objekt key→zone
  if (aufgabe.typ === 'matching') return aufgabe.loesung;       // Array [links,rechts]
  throw new Error('unbekannter Typ: ' + aufgabe.typ);
}

const files = fs.readdirSync(QUESTS_DIR).filter((f) => f.endsWith('.json'));
let bestanden = 0; const fehler = [];
for (const f of files) {
  const q = JSON.parse(fs.readFileSync(path.join(QUESTS_DIR, f), 'utf8'));
  const ergebnisse = q.aufgaben.map((a) => engine.bewerteAufgabe(a, perfekteAntwort(a)));
  const ratio = ergebnisse.reduce((s, e) => s + e.ratio, 0) / ergebnisse.length;
  if (ratio >= (q.bestehensgrenze ?? 0.8)) {
    bestanden++;
  } else {
    fehler.push(`${q.id}: ratio=${ratio.toFixed(2)} < ${q.bestehensgrenze ?? 0.8}`);
  }
}
assert.equal(fehler.length, 0, `Nicht bestehbar mit perfekten Antworten:\n${fehler.join('\n')}`);
assert.equal(bestanden, files.length, 'alle Quests bestehbar');
console.log(`fullplay-test: ${bestanden}/${files.length} Quests bestanden mit perfekten (browser-genaue Typen) Antworten ✅`);
