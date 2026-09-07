'use strict';
/**
 * SchoolQuest UI-Basis-Komponenten (Spec 04 §7).
 * Status-Chips für Kompetenz/Quest-Status — Ausbau in #202/#203.
 */
(function () {
  function statusChip(status) {
    const span = document.createElement('span');
    span.className = 'chip chip-' + status;
    span.textContent = status;
    return span;
  }

  const api = { statusChip };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.SchoolQuestComponents = api;
  }
})();
