'use strict';
/**
 * SchoolQuest App-Shell — Daten laden (fetch), Ansichtsumschalter, Import/Export.
 * Einstiegspunkt. Lägt JSON-Daten (lehrplan, avatare, quests) auf window und
 * startet dann die Schüler-Ansicht.
 */
(function () {
  const store = window.SchoolQuestStore;
  let state = null;

  async function ladeJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fehler beim Laden ${url}: ${res.status}`);
    return res.json();
  }

  async function ladeQuests() {
    // MVP: feste Liste (42 Dateien) — issue #204 ersetzt das durch manifest.json
    const manifest = [
      'q-mathe-3-zd-1','q-mathe-3-zd-2','q-mathe-3-op-1','q-mathe-3-op-2','q-mathe-3-op-3',
      'q-mathe-3-gr-1','q-mathe-3-gr-2','q-mathe-3-er-1','q-mathe-3-er-1b','q-mathe-3-er-2','q-mathe-3-er-3',
      'q-mathe-4-zd-1','q-mathe-4-zd-2','q-mathe-4-zd-3','q-mathe-4-op-1','q-mathe-4-op-2',
      'q-mathe-4-gr-1','q-mathe-4-gr-2','q-mathe-4-er-1','q-mathe-4-er-2','q-mathe-4-er-3',
      'q-deutsch-3-le-1','q-deutsch-3-le-2','q-deutsch-3-hs-1','q-deutsch-3-vt-1','q-deutsch-3-vt-2',
      'q-deutsch-3-rs-1','q-deutsch-3-rs-2','q-deutsch-3-rs-2b','q-deutsch-3-rs-3','q-deutsch-3-rs-4',
      'q-deutsch-4-le-1','q-deutsch-4-le-2','q-deutsch-4-hs-1','q-deutsch-4-hs-2','q-deutsch-4-vt-1',
      'q-deutsch-4-vt-1b','q-deutsch-4-vt-2','q-deutsch-4-rs-1','q-deutsch-4-rs-2','q-deutsch-4-rs-3','q-deutsch-4-rs-4',
    ];
    const quests = await Promise.all(manifest.map((id) => ladeJson(`data/quests/${id}.json`)));
    return quests;
  }

  async function init() {
    state = store.loadState();
    try {
      const [mathematik, deutsch, avatare, quests] = await Promise.all([
        ladeJson('data/lehrplan_mathematik.json'),
        ladeJson('data/lehrplan_deutsch.json'),
        ladeJson('data/avatare.json'),
        ladeQuests(),
      ]);
      window.LEHRPLAN_MATHEMATIK = mathematik;
      window.LEHRPLAN_DEUTSCH = deutsch;
      window.AVATARE = avatare;
      window.QUESTS = quests;
      setupViewSwitcher();
      setupDataButtons();
      // Schüler-Ansicht starten
      const schuelerPanel = document.getElementById('ansicht-schueler');
      schuelerPanel.innerHTML = '';
      window.SchoolQuestSchueler.render(schuelerPanel);
    } catch (e) {
      document.getElementById('ansicht-schueler').innerHTML =
        `<div class="placeholder-card"><h2>⚠️ Fehler beim Laden</h2><p>${e.message}</p><p>Hinweis: Bei file:// startet die App nicht (CORS) — nutze einen lokalen Server: <code>python3 -m http.server</code></p></div>`;
    }
  }

  function setupViewSwitcher() {
    const buttons = document.querySelectorAll('.ansicht-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.ansicht;
        buttons.forEach((b) => {
          const aktiv = b === btn;
          b.classList.toggle('aktiv', aktiv);
          b.setAttribute('aria-selected', String(aktiv));
        });
        document.querySelectorAll('[data-ansicht-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.ansichtPanel !== target;
        });
      });
    });
  }

  function setupDataButtons() {
    document.getElementById('btn-export')?.addEventListener('click', () => {
      const blob = new Blob([store.exportState(state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schoolquest-export.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('file-import').click();
    });

    document.getElementById('file-import')?.addEventListener('change', (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = store.importState(String(reader.result));
        if (!result.ok) {
          alert('Import fehlgeschlagen:\n' + result.errors.join('\n'));
          return;
        }
        state = result.state;
        alert('Import erfolgreich. Seite neu laden, um den Stand zu sehen.');
        location.reload();
      };
      reader.readAsText(file);
      ev.target.value = '';
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (!confirm('Wirklich alle lokalen SchoolQuest-Daten löschen?')) return;
      state = store.resetState();
      location.reload();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
