'use strict';
/**
 * SchoolQuest Quest-Engine (DOM-frei, pure functions)
 * Spec: prototypes/schoolquest/docs/04-spezifikation-schoolquest.md §3 (Auswertung), §5 (Progression)
 * Issue #200: Aufgabentypen-Auswertung inkl. Teilpunkte, Bestehensgrenze, XP, Status-Maschine
 */

/**
 * WERTUNG je Aufgabentyp:
 * - quiz:      antwort (Index oder Array von Indizes) vs. loesung (Index / Array) → 1 Punkt / Teilpunkte bei multi
 * - eingabe:   antwort (String) vs. loesung (String | String[]) → normalisiert vergleichen (trim, case-insensitive), 1/0
 * - drag-drop: zuordnung (Objekt key→zielId) vs. loesung (Objekt) → Teilpunkte korrekt/gesamt
 * - matching:  paare (Array von [linksId, rechtsId]) vs. loesung (Array) → Teilpunkte korrekt/gesamt
 *
 * Rückgabe: { punkte, gesamt, ratio } — ratio ∈ [0,1]
 */
function normalisiereText(s) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function bewerteAufgabe(aufgabe, antwort) {
  const typ = aufgabe.typ;
  let punkte = 0;
  let gesamt = 1;

  if (typ === 'quiz') {
    const loesung = aufgabe.loesung;
    if (Array.isArray(loesung)) {
      gesamt = loesung.length;
      const antwortSet = new Set(Array.isArray(antwort) ? antwort : [antwort]);
      for (const l of loesung) if (antwortSet.has(l)) punkte++;
    } else {
      punkte = antwort === loesung ? 1 : 0;
    }
  } else if (typ === 'eingabe') {
    const loesungen = Array.isArray(aufgabe.loesung) ? aufgabe.loesung : [aufgabe.loesung];
    punkte = loesungen.some((l) => normalisiereText(l) === normalisiereText(antwort)) ? 1 : 0;
  } else if (typ === 'drag-drop') {
    const loesung = aufgabe.loesung || {};
    const keys = Object.keys(loesung);
    gesamt = Math.max(keys.length, 1);
    const z = antwort || {};
    for (const k of keys) if (z[k] === loesung[k]) punkte++;
  } else if (typ === 'matching') {
    const loesung = aufgabe.loesung || [];
    gesamt = Math.max(loesung.length, 1);
    const pairs = Array.isArray(antwort) ? antwort : [];
    const asSet = new Set(pairs.map((p) => `${p[0]}|${p[1]}`));
    for (const [l, r] of loesung) if (asSet.has(`${l}|${r}`)) punkte++;
  } else {
    throw new Error(`Unbekannter Aufgabentyp: ${typ}`);
  }

  return { punkte, gesamt, ratio: gesamt > 0 ? punkte / gesamt : 0 };
}

/**
 * BESTEHENSGRENZE (AC-F4): Standard 0.8 — d. h. 2/3 korrekt (0.667) = NICHT bestanden.
 * quest.schwierigkeit kann die Grenze individualisieren (Spec §3).
 */
function istBestanden(aufgabenErgebnisse, grenze = 0.8) {
  const gesamtRatio = aufgabenErgebnisse.reduce((sum, e) => sum + e.ratio, 0) / Math.max(aufgabenErgebnisse.length, 1);
  return gesamtRatio >= grenze;
}

/**
 * XP-BERECHNUNG (Spec §3): Basis-XP je Aufgabe 10, Multiplikator je Typ:
 * quiz=1, eingabe=1, drag-drop=1.5, matching=1.5; Bestehensbonus +50.
 * XP = round(sum(punkte/gesamt * 10 * multiplikator)) + (bestanden ? 50 : 0)
 */
const XP_MULTIPLIKATOR = { quiz: 1, eingabe: 1, 'drag-drop': 1.5, matching: 1.5 };
function berechneXp(aufgaben, ergebnisse, bestanden) {
  let xp = 0;
  ergebnisse.forEach((e, i) => {
    const mult = XP_MULTIPLIKATOR[aufgaben[i].typ] || 1;
    xp += (e.punkte / Math.max(e.gesamt, 1)) * 10 * mult;
  });
  xp = Math.round(xp);
  if (bestanden) xp += 50;
  return xp;
}

/**
 * STATUS-MASCHINE (Spec §3, AC-F5/F15):
 * gesperrt → offen → versucht → bestanden
 * - gesperrt: mindestens eine required-Kompetenz ist NICHT gemastert (oder Quest explizit gesperrt via Override)
 * - offen: alle requires erfüllt und nicht versucht
 * - versucht: mind. 1 Aufgabe bearbeitet, aber nicht bestanden
 * - bestanden: Bestehensgrenze erreicht
 * - Override: lehrerOverride 'freischalten' → offen trotz gesperrt; 'sperren' → gesperrt trotz offen
 */
function questStatus(quest, fortschritt, lehrerOverride, gemasterteKompetenzen) {
  const vor = (fortschritt && fortschritt.quests && fortschritt.quests[quest.id]) || null;
  if (vor && vor.status === 'bestanden') return 'bestanden';
  if (lehrerOverride === 'sperren') return 'gesperrt';

  const requires = quest.requires || [];
  const alleRequiresGemastert = requires.every((r) => gemasterteKompetenzen.includes(r));
  if (!alleRequiresGemastert && lehrerOverride !== 'freischalten') return 'gesperrt';

  if (vor) {
    if (vor.status === 'bestanden') return 'bestanden';
    if ((vor.bearbeiteteAufgaben || 0) > 0) return 'versucht';
  }
  return 'offen';
}

module.exports = { bewerteAufgabe, istBestanden, berechneXp, questStatus, normalisiereText, XP_MULTIPLIKATOR };
