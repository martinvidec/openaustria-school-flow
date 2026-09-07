'use strict';
/**
 * SchoolQuest Progression & Mastery (DOM-frei)
 * Spec: prototypes/schoolquest/docs/04-spezifikation-schoolquest.md §3 (Mastery), §5
 * Issue #200: Mastery je Kompetenz, Badge-Vergabe (Doppelvergabe ausgeschlossen).
 */

/**
 * Mastery: Eine Kompetenz ist gemastert, wenn eine bestandene Quest sie referenziert.
 * quests = Array aller Quest-Definitionen (id, kompetenz, requires)
 * fort = Avatar-Fortschritt: { quests: { [questId]: { status, punkte, gesamt, xp } } }
 */
function gemasterteKompetenzen(quests, fort) {
  const bestandenIds = new Set(
    Object.entries((fort && fort.quests) || {})
      .filter(([, v]) => v.status === 'bestanden')
      .map(([questId]) => questId)
  );
  const mastered = new Set();
  for (const q of quests) {
    if (bestandenIds.has(q.id)) mastered.add(q.kompetenz);
  }
  return [...mastered];
}

/**
 * Gesamte XP eines Avatars.
 */
function gesamtXp(fort) {
  return Object.values((fort && fort.quests) || {}).reduce((sum, q) => sum + (q.xp || 0), 0);
}

/**
 * BADGE-VERGABE (AC-F19, Doppelvergabe ausgeschlossen):
 * Badges = { id, name, icon, bedingung }
 * - quest-Badge: je bestandene Quest mit eigenem badge-Objekt
 * - mastery-Badge: je Kompetenz gemastert (bereichsübergreifend Zähler)
 * - meilenstein-Badges: 10 / 25 / 50 / 100 bestandene Quests
 * Vergabe: identifiziert neue Badges; bereits vergebene bleiben erhalten.
 */
const MEILENSTEINE = [
  { id: 'badge-10', name: 'Erste Schritte', icon: '🥉', anzahl: 10 },
  { id: 'badge-25', name: 'Quest-Profi', icon: '🥈', anzahl: 25 },
  { id: 'badge-50', name: 'Quest-Meister', icon: '🥇', anzahl: 50 },
  { id: 'badge-100', name: 'Quest-Legende', icon: '🏆', anzahl: 100 },
];

function verfuegbareBadges(quests, fort) {
  const bestandene = Object.entries((fort && fort.quests) || {}).filter(([, v]) => v.status === 'bestanden');
  const bestandeneIds = new Set(bestandene.map(([id]) => id));
  const vergeben = new Set((fort && fort.badges) || []);
  const neue = [];

  // Quest-Badges
  for (const q of quests) {
    if (bestandeneIds.has(q.id) && q.badge && !vergeben.has(q.badge.id)) {
      neue.push(q.badge);
      vergeben.add(q.badge.id);
    }
  }
  // Meilenstein-Badges
  for (const m of MEILENSTEINE) {
    if (bestandene.length >= m.anzahl && !vergeben.has(m.id)) {
      neue.push(m);
      vergeben.add(m.id);
    }
  }
  return neue;
}

// Universal-Export: Browser (window) + Node (module.exports)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { gemasterteKompetenzen, gesamtXp, verfuegbareBadges, MEILENSTEINE };
} else {
  window.SchoolQuestProgress = { gemasterteKompetenzen, gesamtXp, verfuegbareBadges, MEILENSTEINE };
}
