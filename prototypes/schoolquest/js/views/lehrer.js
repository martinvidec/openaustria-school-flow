'use strict';
/**
 * SchoolQuest Lehrer-Dashboard (Issue #203) — Spec 04 §7.2 (F13–F15).
 * Klassen anlegen/auswählen, 40-Wochen-Raster (Verschieben ±, Reset),
 * Fortschritt-Ampel aus lokalen Avatar-Daten („Stand dieses Geräts"),
 * Quest-Override (freischalten/sperren).
 */
(function () {
  const store = window.SchoolQuestStore;
  const verteilung = window.SchoolQuestVerteilung;

  let aktuelleKlassenId = null;
  let aktuellesFach = 'mathematik';

  // Store-Singleton: IMMER frisch aus dem Store laden (Modul-Isolation vermeiden —
  // gleiches Bug-Muster wie schueler.js, Live-Bug 07.09.2026)
  function getState() {
    return store.loadState();
  }
  function persistState(stateToSave) {
    store.saveState(stateToSave ?? getState());
  }

  function ladeDaten() {
    return {
      lehrplan: { mathematik: window.LEHRPLAN_MATHEMATIK, deutsch: window.LEHRPLAN_DEUTSCH },
      quests: window.QUESTS,
    };
  }

  function render(container) {
    const state = getState();
    container.innerHTML = '<h2>🧑‍🏫 Lehrer-Dashboard</h2>';
    // Klassen-Auswahl
    const klassenRow = document.createElement('div');
    klassenRow.className = 'klassen-row';
    const sel = document.createElement('select');
    sel.className = 'klassen-select';
    sel.innerHTML = '<option value="">— Klasse wählen —</option>';
    state.klassen.forEach((k) => {
      const o = document.createElement('option');
      o.value = k.id;
      o.textContent = `${k.name} (Stufe ${k.stufe})`;
      if (k.id === aktuelleKlassenId) o.selected = true;
      sel.appendChild(o);
    });
    const btnNeu = document.createElement('button');
    btnNeu.textContent = '+ Neue Klasse';
    btnNeu.className = 'btn-secondary';
    btnNeu.addEventListener('click', () => {
      const name = prompt('Klassenname (z. B. 3a):');
      if (!name) return;
      const stufe = Number(prompt('Schulstufe (3 oder 4):') || 3);
      if (![3, 4].includes(stufe)) { alert('MVP: Stufe 3 oder 4.'); return; }
      const k = { id: 'kl-' + Date.now().toString(36), name: name.trim(), stufe, faecher: ['mathematik', 'deutsch'] };
      const st = getState();
      st.klassen.push(k);
      aktuelleKlassenId = k.id;
      persistState(st);
      render(container);
    });
    sel.addEventListener('change', () => { aktuelleKlassenId = sel.value; render(container); });
    klassenRow.append(sel, btnNeu);
    container.appendChild(klassenRow);

    const klasse = state.klassen.find((k) => k.id === aktuelleKlassenId);
    if (!klasse) {
      const hint = document.createElement('p');
      hint.className = 'muted';
      hint.textContent = 'Klasse anlegen oder wählen, um Stoffverteilung und Fortschritt zu sehen.';
      container.appendChild(hint);
      return;
    }

    // Fach-Tabs
    const fachTabs = document.createElement('div');
    fachTabs.className = 'fach-tabs';
    klasse.faecher.forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ansicht-btn' + (f === aktuellesFach ? ' aktiv' : '');
      b.textContent = f === 'mathematik' ? 'Mathematik' : 'Deutsch';
      b.addEventListener('click', () => { aktuellesFach = f; render(container); });
      fachTabs.appendChild(b);
    });
    container.appendChild(fachTabs);

    renderVerteilung(container, klasse);
    renderFortschritt(container, klasse);
  }

  // ---------- 40-Wochen-Raster ----------
  function verteilungFuer(klasse, fach) {
    const key = `${klasse.id}:${fach}`;
    const st = getState();
    if (!st.verteilung[key]) {
      const d = ladeDaten();
      const lp = d.lehrplan[fach];
      const kompetenzen = lp.kompetenzen.filter((k) => k.stufe === klasse.stufe);
      st.verteilung[key] = verteilung.verteilungErstellen(kompetenzen);
      persistState(st);
    }
    return st.verteilung[key];
  }

  function renderVerteilung(container, klasse) {
    const d = ladeDaten();
    const lp = d.lehrplan[aktuellesFach];
    const vert = verteilungFuer(klasse, aktuellesFach);
    const h3 = document.createElement('h3');
    h3.textContent = `Stoffverteilung — 40 Wochen (Puffer: W20, W40)`;
    container.appendChild(h3);

    const grid = document.createElement('div');
    grid.className = 'wochen-grid';
    vert.wochen.forEach((w) => {
      const cell = document.createElement('div');
      cell.className = 'woche-cell' + (w.kompetenzIds.length === 0 ? ' puffer' : '');
      const label = document.createElement('span');
      label.className = 'woche-nr';
      label.textContent = 'W' + w.woche;
      cell.appendChild(label);
      w.kompetenzIds.forEach((kid) => {
        const k = lp.kompetenzen.find((x) => x.id === kid);
        const chip = document.createElement('div');
        chip.className = 'kompetenz-chip';
        chip.title = k ? k.text : kid;
        chip.textContent = kid.split('.').slice(2).join('.') + ' #' + kid.split('.').pop();
        // Verschieben: +/- Buttons (± 1 Woche, kein Vorläufer-Check im MVP — dokumentiert)
        const moveWrap = document.createElement('span');
        moveWrap.className = 'move-btns';
        const minus = document.createElement('button');
        minus.textContent = '−'; minus.title = 'Eine Woche früher';
        minus.addEventListener('click', () => verschiebe(klasse, vert, kid, w.woche, -1));
        const plus = document.createElement('button');
        plus.textContent = '+'; plus.title = 'Eine Woche später';
        plus.addEventListener('click', () => verschiebe(klasse, vert, kid, w.woche, +1));
        moveWrap.append(minus, plus);
        chip.appendChild(moveWrap);
        cell.appendChild(chip);
      });
      grid.appendChild(cell);
    });
    container.appendChild(grid);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↺ Verteilung zurücksetzen';
    resetBtn.className = 'btn-secondary';
    resetBtn.addEventListener('click', () => {
      if (!confirm('Verteilung auf den Spec-Default zurücksetzen?')) return;
      const st = getState();
      delete st.verteilung[`${klasse.id}:${aktuellesFach}`];
      persistState(st);
      render(container);
    });
    container.appendChild(resetBtn);
  }

  function verschiebe(klasse, vert, kompetenzId, vonWoche, delta) {
    const ziel = vonWoche + delta;
    if (ziel < 1 || ziel > verteilung.WOCHEN_GESAMT) return;
    const quelle = vert.wochen.find((w) => w.woche === vonWoche);
    const zielW = vert.wochen.find((w) => w.woche === ziel);
    if (!quelle || !zielW) return;
    if (zielW.kompetenzIds.length > 0 && (ziel === 20 || ziel === 40)) return; // Puffer bleibt frei
    quelle.kompetenzIds = quelle.kompetenzIds.filter((x) => x !== kompetenzId);
    zielW.kompetenzIds.push(kompetenzId);
    // Persistierung: verteilungFuer hat den State geladen und mutiert —
    // frisch laden (mutierte Arrays leben im geladenen Objekt) und speichern
    store.saveState(getState());
    render(container);
  }

  // ---------- Fortschritt-Ampel ----------
  function renderFortschritt(container, klasse) {
    const d = ladeDaten();
    const avatare = getState().avatare.filter((a) => a.klassenId === klasse.id);
    const h3 = document.createElement('h3');
    h3.textContent = 'Fortschritt (Stand dieses Geräts — PII-frei, E11)';
    container.appendChild(h3);

    if (!avatare.length) {
      const hint = document.createElement('p');
      hint.className = 'muted';
      hint.textContent = 'Noch keine Avatare dieser Klasse auf diesem Gerät. Schüler erstellen Avatare im Schüler-Modus und wählen diese Klasse.';
      container.appendChild(hint);
      return;
    }

    const table = document.createElement('table');
    table.className = 'fortschritt-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Avatar</th><th>Quests bestanden</th><th>XP</th><th>Ø Fortschritt</th><th>Ampel</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    avatare.forEach((av) => {
      const bestanden = Object.values(av.fortschritt.quests || {}).filter((q) => q.status === 'bestanden').length;
      const gesamtQuests = d.quests.filter((q) => q.stufe === klasse.stufe).length;
      const prozent = gesamtQuests ? Math.round((bestanden / gesamtQuests) * 100) : 0;
      const ampel = prozent >= 80 ? '🟢' : prozent >= 50 ? '🟡' : '🔴';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${av.avatarIcon} ${av.pseudonym}</td><td>${bestanden}/${gesamtQuests}</td><td>${progressXP(av)}</td><td>${prozent}%</td><td>${ampel}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  function progressXP(av) {
    return Object.values(av.fortschritt.quests || {}).reduce((s, q) => s + (q.xp || 0), 0);
  }

  // ---------- Quest-Override ----------
  function renderOverride(container, klasse) {
    const d = ladeDaten();
    const h3 = document.createElement('h3');
    h3.textContent = 'Quest-Freischaltung / Zusperren (Override)';
    container.appendChild(h3);
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Setzt einen Lehrer-Override für eine Kompetenz — überschreibt die requires-Kette (AC-F15, Badge zeigt Override an).';
    container.appendChild(p);
    const row = document.createElement('div');
    row.className = 'override-row';
    const selKompetenz = document.createElement('select');
    const lp = d.lehrplan[aktuellesFach];
    lp.kompetenzen.filter((k) => k.stufe === klasse.stufe).forEach((k) => {
      const o = document.createElement('option');
      o.value = k.id; o.textContent = k.id + ' — ' + k.text.slice(0, 60) + '…';
      selKompetenz.appendChild(o);
    });
    const selAktion = document.createElement('select');
    [['freischalten', '🔓 freischalten'], ['sperren', '🔒 sperren']].forEach(([v, t]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      selAktion.appendChild(o);
    });
    const btn = document.createElement('button');
    btn.textContent = 'Override setzen';
    btn.className = 'btn-primary';
    btn.addEventListener('click', () => {
      const st = getState();
      const vorhandene = st.overrides.findIndex((o) => o.kompetenzId === selKompetenz.value);
      const eintrag = { klassenId: klasse.id, kompetenzId: selKompetenz.value, aktion: selAktion.value };
      if (vorhandene >= 0) st.overrides[vorhandene] = eintrag;
      else st.overrides.push(eintrag);
      persistState(st);
      alert(`Override gesetzt: ${eintrag.kompetenzId} → ${eintrag.aktion}`);
    });
    row.append(selKompetenz, selAktion, btn);
    container.appendChild(row);
  }

  window.SchoolQuestLehrer = {
    render(container) {
      render(container);
      const klasse = getState().klassen.find((k) => k.id === aktuelleKlassenId);
      if (klasse) renderOverride(container, klasse);
    },
  };
})();
