'use strict';
/**
 * Konsistenz-Test für die Lehrplan-Daten (Issue #199, AC: Schema-Validierung).
 * - IDs eindeutig, Schema <fach>.<stufe>.<bereich>.<nr>
 * - Pflichtfelder nicht-leer (text, quelle, bereichLabel)
 * - Bereichs-Codes valide (mathe: zd/op/gr/er, deutsch: hs/le/vt/rs)
 * - wörtliche BGBl.-Zitate: 'quelle'-Feld gesetzt
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const VALIDE_BEREICHE = {
  mathematik: ['zd', 'op', 'gr', 'er'],
  deutsch: ['hs', 'le', 'vt', 'rs'],
};

const dateien = ['lehrplan_mathematik.json', 'lehrplan_deutsch.json'];

// ID-Prefix-Kurzform (Spec 04 §2.1): mathe.*, deutsch.*
const ID_PREFIX = { mathematik: 'mathe', deutsch: 'deutsch' };
let total = 0;

for (const datei of dateien) {
  const fach = datei.match(/lehrplan_(\w+)\.json/)[1];
  const raw = fs.readFileSync(path.join(DATA_DIR, datei), 'utf8');
  const data = JSON.parse(raw);

  assert.equal(data.fach, fach, `${datei}: fach-Feld stimmt nicht mit Dateiname`);
  assert.ok(typeof data.quelle === 'string' && data.quelle.includes('BGBl'), `${datei}: quelle fehlt`);
  assert.ok(Array.isArray(data.kompetenzen) && data.kompetenzen.length > 0, `${datei}: keine Kompetenzen`);

  const ids = new Set();
  const stufen = new Set();
  for (const k of data.kompetenzen) {
    // ID-Format
    assert.match(k.id, new RegExp(`^${ID_PREFIX[fach]}\\.(3|4)\\.[a-z]{2}\\.\\d+$`), `ID-Format falsch: ${k.id}`);
    // Eindeutigkeit
    assert.ok(!ids.has(k.id), `Doppelte ID: ${k.id}`);
    ids.add(k.id);
    // Pflichtfelder
    assert.ok(typeof k.text === 'string' && k.text.trim().length > 20, `${k.id}: text fehlt/zu kurz`);
    assert.ok(k.quelle && k.quelle.includes('BGBl'), `${k.id}: quelle fehlt`);
    assert.ok(k.bereichLabel && k.bereichLabel.length > 2, `${k.id}: bereichLabel fehlt`);
    // Stufe 3 oder 4 (MVP)
    assert.ok([3, 4].includes(k.stufe), `${k.id}: Stufe muss 3 oder 4 sein (MVP)`);
    stufen.add(k.stufe);
    // Bereichs-Code valide
    assert.ok(VALIDE_BEREICHE[fach].includes(k.bereich), `${k.id}: unbekannter Bereich ${k.bereich}`);
    total++;
  }
  // MVP: beide Stufen abgedeckt
  assert.ok(stufen.has(3) && stufen.has(4), `${fach}: Stufe 3 UND 4 müssen abgedeckt sein`);
}

// Avatare: 12 Icons, keine PII (nur Emoji + Tiername)
const av = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'avatare.json'), 'utf8'));
assert.ok(Array.isArray(av.avatare) && av.avatare.length >= 12, 'mind. 12 Avatare');
for (const a of av.avatare) {
  assert.ok(a.icon && a.name, 'Avatar ohne icon/name');
  assert.ok(!('email' in a) && !('name2' in a), 'Avatar-PII-Feld entdeckt');
}

console.log(`lehrplan-test: ${total} Kompetenzen (Mathe+Deutsch, Stufe 3-4) validiert ✅`);
