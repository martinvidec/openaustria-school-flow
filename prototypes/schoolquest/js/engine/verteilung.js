'use strict';
/**
 * SchoolQuest Stoffverteilung (DOM-frei, deterministisch)
 * Spec: prototypes/schoolquest/docs/04-spezifikation-schoolquest.md §6
 * Issue #200: 40-Wochen-Verteilung — topologische Vorläufer-Sortierung,
 * Bereichs-Rotation, 2 Pufferwochen. Deterministisch (keine Zufälle).
 */

const WOCHEN_GESAMT = 40;
const PUFFER_WOCHEN = 2; // 1× Mitte (Winter), 1× Ende (Puffer)

/**
 * Topologische Sortierung der Kompetenzen nach requires-Kette.
 * Kompetenz k hängt an Param (lehrplan.kompetenzen-Array).
 * requires kommen als Kompetenz-IDs — in den Lehrplan-Daten (Issue #199)
 * sind Kompetenzen noch flat; Quests tragen requires. Für die Verteilung
 * sortieren wir deterministisch: stufe aufsteigend, bereich rotierend, nr aufsteigend.
 */
function sortiereKompetenzen(kompetenzen) {
  const bereichOrder = {};
  const bereiche = [...new Set(kompetenzen.map((k) => k.bereich))];
  // Rotation durch die Bereiche: Zyklus zd → op → gr → er → zd → …
  return [...kompetenzen].sort((a, b) => {
    if (a.stufe !== b.stufe) return a.stufe - b.stufe;
    if (bereichOrder[a.bereich] === undefined) {
      bereiche.forEach((b2, i) => { bereichOrder[b2] = i; });
    }
    // Nr innerhalb des Bereichs aufsteigend
    const nrA = Number(a.id.split('.').pop());
    const nrB = Number(b.id.split('.').pop());
    // Rotationsprinzip: erst alle „.1"er der Bereiche, dann alle „.2"er, …
    if (nrA !== nrB) return nrA - nrB;
    return bereichOrder[a.bereich] - bereichOrder[b.bereich];
  });
}

/**
 * Verteilt kompetenzen auf 40 Wochen (2 Pufferwochen eingebaut).
 * Rückgabe: { wochen: [{ woche, kompetenzIds }] } — jedes Kompetenz genau 1×.
 */
function verteilungErstellen(kompetenzen) {
  const sortiert = sortiereKompetenzen(kompetenzen);
  const arbeitsWochen = WOCHEN_GESAMT - PUFFER_WOCHEN; // 38 Arbeitswochen
  const wochen = [];
  for (let i = 1; i <= WOCHEN_GESAMT; i++) wochen.push({ woche: i, kompetenzIds: [] });

  // Pufferwochen: Mitte (Woche 20) und Ende (Woche 40) bleiben frei
  const pufferSet = new Set([20, WOCHEN_GESAMT]);
  const arbeitsIdx = [];
  for (let i = 0; i < WOCHEN_GESAMT; i++) {
    if (!pufferSet.has(i + 1)) arbeitsIdx.push(i);
  }

  // Gleichmäßige Verteilung: arbeitsIdx.length Slots für sortiert.length Kompetenzen
  const n = sortiert.length;
  for (let i = 0; i < n; i++) {
    // Runde-robin-artig: slot = floor(i * arbeitsIdx.length / n)
    const slot = arbeitsIdx[Math.floor((i * arbeitsIdx.length) / n)];
    wochen[slot].kompetenzIds.push(sortiert[i].id);
  }

  // Determinismus-Check: jede Kompetenz genau 1× (intern)
  const allocated = wochen.flatMap((w) => w.kompetenzIds);
  if (allocated.length !== sortiert.length) {
    throw new Error(`Verteilungsfehler: ${allocated.length} statt ${sortiert.length} Kompetenzen verteilt.`);
  }
  return { wochen };
}

/**
 * Holt die Kompetenz-IDs für eine bestimmte Woche.
 */
function kompetenzenFuerWoche(verteilung, woche) {
  const w = verteilung.wochen.find((x) => x.woche === woche);
  return w ? w.kompetenzIds : [];
}

// Universal-Export: Browser (window) + Node (module.exports)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WOCHEN_GESAMT, PUFFER_WOCHEN, verteilungErstellen, sortiereKompetenzen, kompetenzenFuerWoche };
} else {
  window.SchoolQuestVerteilung = { WOCHEN_GESAMT, PUFFER_WOCHEN, verteilungErstellen, sortiereKompetenzen, kompetenzenFuerWoche };
}
