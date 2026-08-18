// Tab-Umschaltung per Hash-Routing; Re-Render bei jeder Store-Änderung.

import { renderStammdaten } from './stammdaten.js';
import { renderZeitraster } from './zeitraster.js';
import { renderBerechnen } from './berechnen.js';
import { renderPlan } from './plan.js';

const TABS = {
  stammdaten: renderStammdaten,
  zeitraster: renderZeitraster,
  berechnen: renderBerechnen,
  plan: renderPlan,
};

export function initTabs(store) {
  const main = document.getElementById('main');

  function activeTab() {
    const hash = location.hash.replace('#', '');
    return TABS[hash] ? hash : 'stammdaten';
  }

  function render() {
    const tab = activeTab();
    document.querySelectorAll('#main-tabs a').forEach((a) => {
      a.classList.toggle('active', a.dataset.tab === tab);
    });
    main.innerHTML = '';
    main.dataset.tab = tab;
    TABS[tab](main, store);
  }

  window.addEventListener('hashchange', render);
  store.subscribe(render);
  render();
}
