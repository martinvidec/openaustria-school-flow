// Seeded PRNG (mulberry32) — einzige Zufallsquelle im Solver-Pfad.
// Kein Math.random, damit gleicher Seed + gleiche Daten denselben Plan ergeben.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

// Fisher-Yates in place.
export function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}
