'use strict';
/**
 * Engine-Tests (Issue #200) — DOM-frei, Node.
 * Deckt AC-F2 (Teilpunkte je Aufgabentyp), AC-F4 (Bestehensgrenze),
 * AC-F5/F15 (requires + Override), Verteilung (deterministisch, 1× je Kompetenz),
 * XP, Mastery/Badges ab.
 */
const assert = require('node:assert/strict');
const engine = require('../js/engine/quest-engine.js');
const vert = require('../js/engine/verteilung.js');
const progress = require('../js/engine/progress.js');

// ---------- Aufgabentypen inkl. Teilpunkte (AC-F2) ----------

// Quiz single: richtig/falsch
assert.deepEqual(engine.bewerteAufgabe({ typ: 'quiz', loesung: 2 }, 2), { punkte: 1, gesamt: 1, ratio: 1 });
assert.deepEqual(engine.bewerteAufgabe({ typ: 'quiz', loesung: 2 }, 0), { punkte: 0, gesamt: 1, ratio: 0 });

// Quiz multi: Teilpunkte (2 von 3)
const multiErg = engine.bewerteAufgabe({ typ: 'quiz', loesung: [1, 2, 3] }, [1, 3]);
assert.equal(multiErg.punkte, 2); assert.equal(multiErg.gesamt, 3);

// Eingabe: normalisiert (case, whitespace), Alternative
assert.equal(engine.bewerteAufgabe({ typ: 'eingabe', loesung: 'Wien' }, '  wien  ').punkte, 1);
assert.equal(engine.bewerteAufgabe({ typ: 'eingabe', loesung: ['ja', 'yes'] }, 'YES').punkte, 1);
assert.equal(engine.bewerteAufgabe({ typ: 'eingabe', loesung: 'ja' }, 'nein').punkte, 0);

// Drag-Drop: Teilpunkte (2 von 3 Zuordnungen richtig)
const dd = engine.bewerteAufgabe(
  { typ: 'drag-drop', loesung: { a: 'x', b: 'y', c: 'z' } },
  { a: 'x', b: 'z', c: 'z' } // b falsch, c richtig (kollision egal, punkt-je-key)
);
assert.equal(dd.punkte, 2); assert.equal(dd.gesamt, 3);

// Matching: Teilpunkte (1 von 2 Paaren)
const mt = engine.bewerteAufgabe(
  { typ: 'matching', loesung: [['l1', 'r1'], ['l2', 'r2']] },
  [['l1', 'r1'], ['l2', 'x']]
);
assert.equal(mt.punkte, 1); assert.equal(mt.gesamt, 2);

// Unbekannter Typ → Fehler
assert.throws(() => engine.bewerteAufgabe({ typ: 'xor', loesung: 1 }, 1), /Unbekannter/);

// ---------- Bestehensgrenze (AC-F4): 2/3 korrekt bei Grenze 0.8 = NICHT bestanden ----------
const ergebnisse667 = [{ ratio: 1 }, { ratio: 1 }, { ratio: 0 }];
assert.equal(engine.istBestanden(ergebnisse667, 0.8), false, '2/3 = 0.667 < 0.8 → nicht bestanden');
assert.equal(engine.istBestanden([{ ratio: 1 }, { ratio: 1 }, { ratio: 1 }], 0.8), true);
assert.equal(engine.istBestanden([{ ratio: 0.8 }], 0.8), true);

// ---------- XP ----------
const aufgaben = [{ typ: 'quiz' }, { typ: 'drag-drop' }];
const ergs = [{ punkte: 1, gesamt: 1, ratio: 1 }, { punkte: 2, gesamt: 4, ratio: 0.5 }];
// 10*1 + (0.5*10*1.5=7.5) = 17.5 → 18; bestanden +50 = 68
assert.equal(engine.berechneXp(aufgaben, ergs, true), 68);
assert.equal(engine.berechneXp(aufgaben, ergs, false), 18);

// ---------- Status-Maschine (AC-F5/F15) ----------
const quests = [
  { id: 'q1', kompetenz: 'mathe.3.zd.1' },
  { id: 'q2', kompetenz: 'mathe.3.zd.2', requires: ['mathe.3.zd.1'] },
  { id: 'q3', kompetenz: 'mathe.3.zd.3' },
];
const fortLeer = { quests: {} };
const gemastertQ1 = progress.gemasterteKompetenzen(quests, { quests: { q1: { status: 'bestanden', xp: 60 } } });
assert.deepEqual(gemastertQ1, ['mathe.3.zd.1']);

// q2 gesperrt ohne q1-Mastery
assert.equal(engine.questStatus(quests[1], fortLeer, null, []), 'gesperrt');
// q2 offen mit q1-Mastery
assert.equal(engine.questStatus(quests[1], fortLeer, null, gemastertQ1), 'offen');
// q2 gesperrt TROTZ Mastery wenn Lehrer sperrt
assert.equal(engine.questStatus(quests[1], fortLeer, 'sperren', gemastertQ1), 'gesperrt');
// q3 offen auch ohnerequires
assert.equal(engine.questStatus(quests[2], fortLeer, null, []), 'offen');
// versucht: bearbeitet, nicht bestanden
const fortVersucht = { quests: { q3: { status: 'versucht', bearbeiteteAufgaben: 2 } } };
assert.equal(engine.questStatus(quests[2], fortVersucht, null, []), 'versucht');
// bestanden persistiert
const fortBestanden = { quests: { q3: { status: 'bestanden', xp: 60 } } };
assert.equal(engine.questStatus(quests[2], fortBestanden, 'sperren', []), 'bestanden', 'bestanden bleibt bestanden');

// ---------- Verteilung: deterministisch, jede Kompetenz genau 1× ----------
const kompetenzen = [];
for (let i = 1; i <= 3; i++) {
  for (const b of ['zd', 'op', 'gr', 'er']) {
    kompetenzen.push({ id: `mathe.3.${b}.${i}`, stufe: 3, bereich: b });
  }
}
const v1 = vert.verteilungErstellen(kompetenzen);
const v2 = vert.verteilungErstellen(kompetenzen);
assert.deepEqual(v1, v2, 'Verteilung muss deterministisch sein');
const alleIds = v1.wochen.flatMap((w) => w.kompetenzIds);
assert.equal(alleIds.length, kompetenzen.length, 'jede Kompetenz genau 1×');
assert.deepEqual(new Set(alleIds).size, kompetenzen.length, 'keine Doppelvergabe');
// Pufferwochen leer
assert.deepEqual(v1.wochen.find((w) => w.woche === 20).kompetenzIds, [], 'Pufferwoche 20 leer');
assert.deepEqual(v1.wochen.find((w) => w.woche === 40).kompetenzIds, [], 'Pufferwoche 40 leer');
assert.equal(vert.WOCHEN_GESAMT, 40);
// kompFightertiefe: Kompetenz für Woche abfragen
assert.deepEqual(vert.kompetenzenFuerWoche(v1, 20), []);

// ---------- Mastery + Badges (Doppelvergabe ausgeschlossen) ----------
const questsBadges = [
  { id: 'q1', kompetenz: 'mathe.3.zd.1', badge: { id: 'b1', name: 'Zahlenheld', icon: '⭐' } },
  { id: 'q2', kompetenz: 'mathe.3.zd.2' },
];
const fortMitBadge = { quests: { q1: { status: 'bestanden', xp: 60 } }, badges: ['b1'] };
assert.deepEqual(progress.verfuegbareBadges(questsBadges, fortMitBadge), [], 'b1 schon vergeben → keine Doppelvergabe');
const fortOhne = { quests: { q1: { status: 'bestanden', xp: 60 } } };
assert.deepEqual(progress.verfuegbareBadges(questsBadges, fortOhne).map((b) => b.id), ['b1']);

console.log('engine-test: 28+ Assertions grün (Typen, Grenze, XP, Status, Verteilung, Mastery/Badges) ✅');
