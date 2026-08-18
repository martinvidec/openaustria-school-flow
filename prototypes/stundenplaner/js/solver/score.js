// Soft-Score-Bewertung. Constraint-Namen, deutsche Labels und Default-Gewichte
// spiegeln packages/shared/src/constraint-catalog.ts der Hauptapp;
// die Verstoß-Definitionen sind in docs/03-spezifikation.md dokumentiert.

export const HARD_CONSTRAINTS = [
  { name: 'Teacher conflict', displayName: 'Lehrkraft-Konflikt' },
  { name: 'Room conflict', displayName: 'Raum-Konflikt' },
  { name: 'Teacher availability', displayName: 'Lehrkraft-Verfügbarkeit' },
  { name: 'Student group conflict', displayName: 'Klassen-Konflikt' },
  { name: 'Room type requirement', displayName: 'Raumtyp-Anforderung' },
];

export const SOFT_CONSTRAINTS = [
  { name: 'No same subject doubling', displayName: 'Kein Doppel-Fach hintereinander', weight: 10 },
  { name: 'Balanced weekly distribution', displayName: 'Gleichmäßige Wochenverteilung', weight: 5 },
  { name: 'Max lessons per day', displayName: 'Maximale Stunden pro Tag', weight: 8 },
  { name: 'Prefer double periods', displayName: 'Doppelstunden bevorzugen', weight: 8 },
  { name: 'Home room preference', displayName: 'Stammraum-Präferenz', weight: 2 },
  { name: 'Minimize room changes', displayName: 'Raumwechsel minimieren', weight: 3 },
  { name: 'Prefer morning for main subjects', displayName: 'Hauptfächer am Vormittag', weight: 1 },
];

export function resolveWeights(overrides) {
  const weights = {};
  for (const c of SOFT_CONSTRAINTS) {
    const o = overrides?.[c.name];
    weights[c.name] = Number.isFinite(o) ? o : c.weight;
  }
  return weights;
}

export function computeScore(problem, assign, weights = resolveWeights()) {
  const { lessons, P, days } = problem;
  const violations = {};
  for (const c of SOFT_CONSTRAINTS) violations[c.name] = 0;

  const placed = [];
  for (const L of lessons) {
    const a = assign[L.idx];
    if (a) placed.push({ L, roomId: a.roomId, day: (a.slot / P) | 0, pi: a.slot % P });
  }

  const byCs = new Map();
  const byClassDay = new Map();
  for (const e of placed) {
    let cs = byCs.get(e.L.csId);
    if (!cs) byCs.set(e.L.csId, (cs = []));
    cs.push(e);
    const key = `${e.L.classId}|${e.day}`;
    let cd = byClassDay.get(key);
    if (!cd) byClassDay.set(key, (cd = []));
    cd.push(e);
  }

  // Kein Doppel-Fach hintereinander / Gleichmäßige Wochenverteilung / Doppelstunden bevorzugen
  // (je Stundentafel-Zeile = je Klasse+Fach, da im Modell eindeutig)
  for (const entries of byCs.values()) {
    const L = entries[0].L;
    const hours = entries.length;

    const perDay = new Map();
    for (const e of entries) {
      let list = perDay.get(e.day);
      if (!list) perDay.set(e.day, (list = []));
      list.push(e.pi);
    }

    for (const list of perDay.values()) {
      list.sort((a, b) => a - b);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[j] - list[i] > 1) violations['No same subject doubling'] += 1;
        }
      }
    }

    const ideal = Math.min(days.length, L.preferDoublePeriod ? Math.ceil(hours / 2) : hours);
    violations['Balanced weekly distribution'] += Math.max(0, ideal - perDay.size);

    if (L.preferDoublePeriod) {
      const sorted = entries.slice().sort((a, b) => a.day - b.day || a.pi - b.pi);
      let pairs = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].day === sorted[i + 1].day && sorted[i + 1].pi === sorted[i].pi + 1) {
          pairs += 1;
          i += 1; // Paar verbraucht beide Lektionen
        }
      }
      violations['Prefer double periods'] += Math.max(0, Math.floor(hours / 2) - pairs);
    }
  }

  // Maximale Stunden pro Tag / Raumwechsel minimieren
  for (const entries of byClassDay.values()) {
    if (entries.length > 8) violations['Max lessons per day'] += entries.length - 8;
    entries.sort((a, b) => a.pi - b.pi);
    for (let i = 0; i < entries.length - 1; i++) {
      const cur = entries[i];
      const next = entries[i + 1];
      if (
        next.pi === cur.pi + 1 &&
        cur.roomId !== next.roomId &&
        !cur.L.requiredRoomType &&
        !next.L.requiredRoomType
      ) {
        violations['Minimize room changes'] += 1;
      }
    }
  }

  // Stammraum-Präferenz / Hauptfächer am Vormittag
  const half = Math.ceil(P / 2);
  for (const e of placed) {
    if (!e.L.requiredRoomType && e.L.homeRoomId && e.roomId !== e.L.homeRoomId) {
      violations['Home room preference'] += 1;
    }
    if (e.L.isMainSubject && e.pi >= half) {
      violations['Prefer morning for main subjects'] += 1;
    }
  }

  let soft = 0;
  const breakdown = SOFT_CONSTRAINTS.map((c) => {
    const count = violations[c.name];
    const penalty = -weights[c.name] * count;
    soft += penalty;
    return { name: c.name, displayName: c.displayName, weight: weights[c.name], violations: count, penalty };
  });

  return { hard: 0, soft, breakdown };
}
