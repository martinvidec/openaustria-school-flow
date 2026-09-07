'use strict';
/**
 * SchoolQuest Lernlandkarte (Issue #204) — Spec 04 §7.3 (F19).
 * Ketten je Fach, XP, Badge-Galerie, Mastery-Markierung.
 */
(function () {
  const store = window.SchoolQuestStore;
  const progress = window.SchoolQuestProgress;

  function render(container) {
    const state = store.loadState();
    container.innerHTML = '<h2>🗺️ Lernlandkarte</h2>';
    const avatar = state.avatare.find((a) => a.id === state.aktiveAvatare);
    if (!avatar) {
      const hint = document.createElement('p');
      hint.className = 'muted';
      hint.textContent = 'Erst im Schüler-Modus einen Avatar wählen — dann erscheint hier deine Lernlandkarte.';
      container.appendChild(hint);
      return;
    }
    const d = { quests: window.QUESTS };
    const gemastert = new Set(progress.gemasterteKompetenzen(d.quests, avatar.fortschritt));
    const xp = progress.gesamtXp(avatar.fortschritt);

    // Kopf: XP + Badges
    const kopf = document.createElement('div');
    kopf.className = 'landkarte-kopf';
    kopf.innerHTML = `<span class="xp-badge">${avatar.avatarIcon} ${avatar.pseudonym}</span><span class="xp-badge">⚡ ${xp} XP</span>`;
    const badgeIds = new Set(avatar.fortschritt.badges || []);
    const alleBadges = [
      ...d.quests.filter((q) => q.badge).map((q) => q.badge),
      ...progress.MEILENSTEINE,
    ];
    alleBadges.forEach((b) => {
      const span = document.createElement('span');
      span.className = 'badge-item' + (badgeIds.has(b.id) ? '' : ' badge-gesperrt');
      span.textContent = b.icon + ' ' + b.name;
      span.title = badgeIds.has(b.id) ? 'Freigeschaltet!' : 'Noch gesperrt';
      kopf.appendChild(span);
    });
    container.appendChild(kopf);

    // Ketten je Fach
    const faecher = { mathematik: 'Mathematik', deutsch: 'Deutsch' };
    Object.entries(faecher).forEach(([fach, label]) => {
      const h3 = document.createElement('h3');
      h3.textContent = label;
      container.appendChild(h3);
      const questsFach = d.quests.filter((q) => q.fach === fach).sort((a, b) => a.stufe - b.stufe);
      const kette = document.createElement('div');
      kette.className = 'quest-kette';
      questsFach.forEach((q, i) => {
        const fort = (avatar.fortschritt.quests || {})[q.id];
        const status = fort ? fort.status : 'gesperrt';
        const node = document.createElement('div');
        node.className = 'kette-node status-' + status + (gemastert.has(q.kompetenz) ? ' mastery' : '');
        node.innerHTML = `<span class="kette-icon">${status === 'bestanden' ? '✅' : status === 'versucht' ? '🔄' : '🔒'}</span><span class="kette-titel">${q.titel}</span>${gemastert.has(q.kompetenz) ? '<span class="mastery-mark">★</span>' : ''}`;
        node.title = `${q.titel} (${status})`;
        kette.appendChild(node);
      });
      container.appendChild(kette);
    });
  }

  window.SchoolQuestLandkarte = { render };
})();
