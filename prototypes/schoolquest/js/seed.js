'use strict';
/**
 * SchoolQuest Demo-Seed (Issue #204) — „Schulquest-Dorf".
 * 2 Klassen (3a, 4b), 4 Beispiel-Avatare, teilweise gefüllter Fortschritt.
 * Knopfdruck im Schüler-Modus, wenn kein State existiert.
 */
(function () {
  const store = window.SchoolQuestStore;

  function seedErstellen() {
    const state = store.defaultState();
    // Klassen
    const kl3a = { id: 'kl-demo-3a', name: '3a', stufe: 3, faecher: ['mathematik', 'deutsch'] };
    const kl4b = { id: 'kl-demo-4b', name: '4b', stufe: 4, faecher: ['mathematik', 'deutsch'] };
    state.klassen = [kl3a, kl4b];

    // Avatare (PII-frei)
    const av1 = { id: 'av-demo-1', pseudonym: 'FuchsFan', avatarIcon: '🦊', klassenId: kl3a.id, fortschritt: { quests: {}, badges: [] } };
    const av2 = { id: 'av-demo-2', pseudonym: 'KoalaKlug', avatarIcon: '🐨', klassenId: kl3a.id, fortschritt: { quests: {}, badges: [] } };
    const av3 = { id: 'av-demo-3', pseudonym: 'EulenEcho', avatarIcon: '🦉', klassenId: kl4b.id, fortschritt: { quests: {}, badges: [] } };
    const av4 = { id: 'av-demo-4', pseudonym: 'DelfinPower', avatarIcon: '🐬', klassenId: kl4b.id, fortschritt: { quests: {}, badges: [] } };
    state.avatare = [av1, av2, av3, av4];
    state.aktiveAvatare = av1.id;

    // Teilweise gefüllter Fortschritt (Demo: erste Mathe-Kette 3. Stufe)
    const f1 = av1.fortschritt.quests;
    f1['quest-mathe-3-zd-1'] = { status: 'bestanden', punkte: 4, gesamt: 4, bearbeiteteAufgaben: 4, xp: 90 };
    f1['quest-mathe-3-zd-2'] = { status: 'bestanden', punkte: 3, gesamt: 3, bearbeiteteAufgaben: 3, xp: 80 };
    f1['quest-mathe-3-op-1'] = { status: 'versucht', punkte: 2, gesamt: 4, bearbeiteteAufgaben: 4, xp: 20 };
    f1['quest-deutsch-3-le-1'] = { status: 'bestanden', punkte: 3, gesamt: 3, bearbeiteteAufgaben: 3, xp: 80 };
    av1.fortschritt.badges = ['b1'];
    const f2 = av2.fortschritt.quests;
    f2['quest-mathe-3-zd-1'] = { status: 'bestanden', punkte: 4, gesamt: 4, bearbeiteteAufgaben: 4, xp: 90 };
    const f3 = av3.fortschritt.quests;
    f3['quest-mathe-4-zd-1'] = { status: 'bestanden', punkte: 3, gesamt: 3, bearbeiteteAufgaben: 3, xp: 80 };
    // av4 bleibt leer (Neuling)

    // Verteilung vorbereitet (lazy erzeugt beim ersten Dashboard-Öffnen)
    store.saveState(state);
    return state;
  }

  window.SchoolQuestSeed = { seedErstellen };
})();
