'use strict';
/**
 * SchoolQuest Schüler-Modus (Issue #202) — Avatar, Fachwahl, Quest-Liste, Quest-Spiel.
 * UI-Logik: DOM-Rendering + Store-Operationen. Engine (DOM-frei) liefert Auswertung/Status.
 */
(function () {
  const store = window.SchoolQuestStore;
  const engine = window.SchoolQuestEngine;
  const progress = window.SchoolQuestProgress;

  let state = null;
  let aktiveQuest = null; // Quest-Objekt während des Spielens
  let aktuelleAntworten = [];

  // ---------- Daten laden ----------
  function ladeDaten() {
    return {
      lehrplan: {
        mathematik: window.LEHRPLAN_MATHEMATIK,
        deutsch: window.LEHRPLAN_DEUTSCH,
      },
      avatare: window.AVATARE.avatare,
      quests: window.QUESTS,
    };
  }

  // ---------- Avatare ----------
  function renderAvatarAuswahl(container) {
    const d = ladeDaten();
    container.innerHTML = '';
    if (!state.avatare.length) {
      container.innerHTML = '<div class="placeholder-card"><h2>Avatar erstellen</h2></div>';
      const form = document.createElement('div');
      form.className = 'avatar-form';
      const input = document.createElement('input');
      input.placeholder = 'Pseudonym (z. B. FuchsFan)';
      input.maxLength = 30;
      const iconGrid = document.createElement('div');
      iconGrid.className = 'icon-grid';
      d.avatare.forEach((av, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'icon-btn';
        b.textContent = av.icon;
        b.title = av.name;
        b.addEventListener('click', () => {
          iconGrid.querySelectorAll('.icon-btn').forEach((x) => x.classList.remove('aktiv'));
          b.classList.add('aktiv');
          iconGrid.dataset.ausgewaehlt = String(i);
        });
        iconGrid.appendChild(b);
      });
      const createBtn = document.createElement('button');
      createBtn.textContent = 'Avatar erstellen';
      createBtn.className = 'btn-primary';
      createBtn.addEventListener('click', () => {
        const pseudonym = input.value.trim();
        if (!pseudonym) { alert('Bitte Pseudonym eingeben (kein echter Name!).'); return; }
        const idx = Number(iconGrid.dataset.ausgewaehlt ?? 0);
        const av = d.avatare[idx] || d.avatare[0];
        const neuer = {
          id: 'av-' + Date.now().toString(36),
          pseudonym,
          avatarIcon: av.icon,
          klassenId: null,
          fortschritt: { quests: {}, badges: [] },
        };
        state.avatare.push(neuer);
        state.aktiveAvatare = neuer.id;
        store.saveState(state);
        renderSchuelerModus(container);
      });
      form.append(input, iconGrid, createBtn);
      container.querySelector('.placeholder-card').appendChild(form);
      return;
    }
    // Avatar-Liste
    const list = document.createElement('div');
    list.className = 'avatar-list';
    state.avatare.forEach((av) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'avatar-card' + (state.aktiveAvatare === av.id ? ' aktiv' : '');
      card.innerHTML = `<span class="avatar-icon">${av.avatarIcon}</span><span>${av.pseudonym}</span>`;
      card.addEventListener('click', () => {
        state.aktiveAvatare = av.id;
        store.saveState(state);
        renderFachwahl(container, av);
      });
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  // ---------- Fachwahl ----------
  function renderFachwahl(container, avatar) {
    const d = ladeDaten();
    const stufe = (avatar.klassenId && (state.klassen.find((k) => k.id === avatar.klassenId) || {}).stufe) || 3;
    container.innerHTML = `<h2>Stufe ${stufe} — Fach wählen</h2>`;
    const grid = document.createElement('div');
    grid.className = 'fach-grid';
    Object.entries(d.lehrplan).forEach(([fach, lp]) => {
      const anzahl = d.quests.filter((q) => q.fach === fach && q.stufe === stufe).length;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'fach-card';
      card.innerHTML = `<strong>${lp.fachLabel}</strong><span class="muted">${anzahl > 0 ? anzahl + ' Quests' : 'in Arbeit'}</span>`;
      if (anzahl === 0) card.disabled = true;
      card.addEventListener('click', () => renderQuestListe(container, avatar, fach, stufe));
      grid.appendChild(card);
    });
    container.appendChild(grid);
    const zurueck = document.createElement('button');
    zurueck.textContent = '← Avatare';
    zurueck.className = 'btn-secondary';
    zurueck.addEventListener('click', () => renderSchuelerModus(container));
    container.appendChild(zurueck);
  }

  // ---------- Quest-Liste ----------
  function renderQuestListe(container, avatar, fach, stufe) {
    const d = ladeDaten();
    const lp = d.lehrplan[fach];
    const quests = d.quests.filter((q) => q.fach === fach && q.stufe === stufe);
    const gemastert = progress.gemasterteKompetenzen(d.quests, avatar.fortschritt);
    container.innerHTML = `<h2>${lp.fachLabel} — Stufe ${stufe}</h2>`;
    const gruppen = {};
    quests.forEach((q) => {
      const k = lp.kompetenzen.find((x) => x.id === q.kompetenz);
      const bereich = k ? k.bereichLabel : q.kompetenz;
      (gruppen[bereich] = gruppen[bereich] || []).push(q);
    });
    Object.entries(gruppen).forEach(([bereich, qs]) => {
      const section = document.createElement('section');
      section.className = 'bereich-section';
      const h3 = document.createElement('h3');
      h3.textContent = bereich;
      section.appendChild(h3);
      qs.forEach((q) => {
        const status = engine.questStatus(q, avatar.fortschritt, overrideFuer(q), gemastert);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'quest-row status-' + status;
        row.innerHTML = `<span class="quest-titel">${q.titel}</span><span class="status-badge">${statusIcon(status)} ${status}</span>`;
        if (status === 'gesperrt') row.disabled = true;
        row.addEventListener('click', () => starteQuest(container, avatar, q));
        section.appendChild(row);
      });
      container.appendChild(section);
    });
    const zurueck = document.createElement('button');
    zurueck.textContent = '← Fächer';
    zurueck.className = 'btn-secondary';
    zurueck.addEventListener('click', () => renderFachwahl(container, avatar));
    container.appendChild(zurueck);
  }

  function statusIcon(status) {
    return { gesperrt: '🔒', offen: '▶️', versucht: '🔄', bestanden: '✅' }[status] || '•';
  }
  function overrideFuer(quest) {
    return (state.overrides || []).find((o) => o.kompetenzId === quest.kompetenz)?.aktion || null;
  }

  // ---------- Quest-Spiel ----------
  function starteQuest(container, avatar, quest) {
    aktiveQuest = quest;
    aktuelleAntworten = [];
    renderAufgabe(container, avatar, quest, 0, []);
  }

  function renderAufgabe(container, avatar, quest, idx, ergebnisse) {
    if (idx >= quest.aufgaben.length) {
      return abschliessen(container, avatar, quest, ergebnisse);
    }
    const aufgabe = quest.aufgaben[idx];
    container.innerHTML = `<h2>${quest.titel}</h2><p class="progress-info">Aufgabe ${idx + 1}/${quest.aufgaben.length}</p>`;
    const card = document.createElement('div');
    card.className = 'aufgabe-card';
    const frage = document.createElement('p');
    frage.className = 'aufgabe-frage';
    frage.textContent = aufgabe.frage;
    card.appendChild(frage);

    const antwortWrap = document.createElement('div');
    antwortWrap.className = 'antwort-wrap';
    let antwort = null;

    if (aufgabe.typ === 'quiz') {
      aufgabe.optionen.forEach((opt, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'option-btn';
        b.textContent = opt;
        b.addEventListener('click', () => {
          antwortWrap.querySelectorAll('.option-btn').forEach((x) => x.classList.remove('ausgewaehlt'));
          b.classList.add('ausgewaehlt');
          antwort = Array.isArray(aufgabe.loesung) ? [i] : i;
        });
        antwortWrap.appendChild(b);
      });
    } else if (aufgabe.typ === 'eingabe') {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Antwort eingeben…';
      input.className = 'eingabe-feld';
      input.addEventListener('input', () => { antwort = input.value; });
      antwortWrap.appendChild(input);
    } else if (aufgabe.typ === 'drag-drop' || aufgabe.typ === 'matching') {
      // MVP: Zuordnung per Select-Paare (Drag-UX folgt in #204/#7 Polish)
      const loesung = aufgabe.loesung;
      antwort = {};
      Object.entries(aufgabe.elemente || {}).forEach(([key, label]) => {
        const row = document.createElement('div');
        row.className = 'zuordnungs-row';
        row.innerHTML = `<span>${label}</span>`;
        const sel = document.createElement('select');
        const zonen = aufgabe.zonen || {};
        const ziele = aufgabe.typ === 'drag-drop' ? Object.keys(zonen) : (loesung[0] ? loesung.map((p) => p[1]) : []);
        (aufgabe.typ === 'drag-drop' ? Object.entries(zonen) : ziele.map((z) => [z, z])).forEach(([val, lbl]) => {
          const opt = document.createElement('option');
          opt.value = val; opt.textContent = lbl;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', () => { antwort[key] = sel.value; });
        row.appendChild(sel);
        antwortWrap.appendChild(row);
      });
      if (aufgabe.typ === 'matching') {
        // matching: elemente fehlen im JSON-MVP — nutze loesung keys als links
        antwortWrap.innerHTML = '';
        loesung.forEach(([links]) => {
          const row = document.createElement('div');
          row.className = 'zuordnungs-row';
          row.innerHTML = `<span><strong>${links}</strong> →</span>`;
          const sel = document.createElement('select');
          sel.dataset.links = links;
          const rechte = loesung.map((p) => p[1]);
          rechte.forEach((r) => {
            const opt = document.createElement('option');
            opt.value = r; opt.textContent = r;
            sel.appendChild(opt);
          });
          sel.addEventListener('change', () => { antwort[links] = sel.value; });
          row.appendChild(sel);
          antwortWrap.appendChild(row);
        });
        // matching-Auswertung erwartet Array von Paaren
        antwort = null; // wird beim Weiter-Button aus selects gebaut
        antwortWrap.dataset.modus = 'matching';
      }
    }

    card.appendChild(antwortWrap);
    const loesungHinweis = document.createElement('p');
    loesungHinweis.className = 'loesung-hinweis';
    loesungHinweis.hidden = true;
    loesungHinweis.textContent = '💡 ' + (quest.loesungstexte[idx] || '');
    card.appendChild(loesungHinweis);

    const btnWeiter = document.createElement('button');
    btnWeiter.textContent = 'Weiter';
    btnWeiter.className = 'btn-primary';
    btnWeiter.addEventListener('click', () => {
      let ergebnis;
      if (antwortWrap.dataset.modus === 'matching') {
        const paare = [...antwortWrap.querySelectorAll('select')].map((s) => [s.dataset.links, s.value]);
        ergebnis = engine.bewerteAufgabe(aufgabe, paare);
      } else {
        if (antwort === null) { alert('Bitte eine Antwort wählen!'); return; }
        ergebnis = engine.bewerteAufgabe(aufgabe, antwort);
      }
      ergebnisse.push(ergebnis);
      loesungHinweis.hidden = false;
      loesungHinweis.className += ergebnis.ratio === 1 ? ' richtig' : ' teils';
      btnWeiter.disabled = true;
      setTimeout(() => renderAufgabe(container, avatar, quest, idx + 1, ergebnisse), 1600);
    });
    card.appendChild(btnWeiter);
    container.appendChild(card);
  }

  function abschliessen(container, avatar, quest, ergebnisse) {
    const bestanden = engine.istBestanden(ergebnisse, quest.bestehensgrenze || 0.8);
    const xp = engine.berechneXp(quest.aufgaben, ergebnisse, bestanden);
    // Fortschritt speichern
    avatar.fortschritt.quests = avatar.fortschritt.quests || {};
    const vor = avatar.fortschritt.quests[quest.id];
    const warBestanden = vor && vor.status === 'bestanden';
    if (!warBestanden || (vor.xp || 0) < xp) {
      avatar.fortschritt.quests[quest.id] = {
        status: bestanden ? 'bestanden' : 'versucht',
        punkte: ergebnisse.reduce((s, e) => s + e.punkte, 0),
        gesamt: ergebnisse.reduce((s, e) => s + e.gesamt, 0),
        bearbeiteteAufgaben: ergebnisse.length,
        xp: Math.max(xp, (vor && vor.xp) || 0),
      };
    }
    // Badges
    const d = ladeDaten();
    const neue = progress.verfuegbareBadges(d.quests, avatar.fortschritt);
    if (neue.length) avatar.fortschritt.badges = [...(avatar.fortschritt.badges || []), ...neue.map((b) => b.id)];
    store.saveState(state);

    container.innerHTML = `<h2>${bestanden ? '🎉 Quest bestanden!' : '🔄 Fast geschafft!'}</h2>`;
    const card = document.createElement('div');
    card.className = 'ergebnis-card' + (bestanden ? ' bestanden' : '');
    const xpRow = document.createElement('p');
    xpRow.innerHTML = `<strong>+${xp} XP</strong> ${warBestanden && xp <= (vor?.xp || 0) ? '(Bestwert beibehalten)' : ''}`;
    card.appendChild(xpRow);
    if (neue.length) {
      const badgeRow = document.createElement('p');
      badgeRow.innerHTML = '🏅 Neue Badges: ' + neue.map((b) => `${b.icon} ${b.name}`).join(', ');
      card.appendChild(badgeRow);
    }
    if (!bestanden) {
      const hinweis = document.createElement('p');
      hinweis.textContent = 'Du kannst die Quest wiederholen — die Lösungen stehen in den Hinweisen!';
      card.appendChild(hinweis);
    }
    container.appendChild(card);
    const zurueck = document.createElement('button');
    zurueck.textContent = '← Quest-Liste';
    zurueck.className = 'btn-primary';
    zurueck.addEventListener('click', () => {
      const fach = quest.fach, stufe = quest.stufe;
      renderQuestListe(container, avatar, fach, stufe);
    });
    container.appendChild(zurueck);
  }

  // ---------- Einstieg ----------
  function renderSchuelerModus(container) {
    container.innerHTML = '<h2>Wer spielt?</h2>';
    renderAvatarAuswahl(container);
  }

  window.SchoolQuestSchueler = { render: renderSchuelerModus };
})();
