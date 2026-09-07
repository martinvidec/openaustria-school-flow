'use strict';
/**
 * SchoolQuest App-Shell — Ansichtsumschalter + Store-Initialisierung + Import/Export.
 * Einstiegspunkt (defer). UI-Module folgen in Issue #202/#203.
 */
(function () {
  const store = window.SchoolQuestStore;
  let state = null;

  function init() {
    state = store.loadState();
    setupViewSwitcher();
    setupDataButtons();
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
        alert('Import erfolgreich.');
      };
      reader.readAsText(file);
      ev.target.value = '';
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (!confirm('Wirklich alle lokalen SchoolQuest-Daten löschen?')) return;
      state = store.resetState();
      alert('Daten zurückgesetzt.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
