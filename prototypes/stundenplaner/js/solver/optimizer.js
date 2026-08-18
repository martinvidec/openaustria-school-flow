// Phase 2: Simulated Annealing über hart-zulässige Moves.
// Verbessert den Soft-Score, ohne je einen harten Constraint zu verletzen.

import { mulberry32, randInt } from './rng.js';
import { computeScore, resolveWeights } from './score.js';

export function optimize(problem, assignIn, opts = {}) {
  const { seed = 1, steps = 20000, deadline = Infinity, onProgress = null } = opts;
  const weights = opts.weights ?? resolveWeights();
  const { lessons, S } = problem;

  const assign = assignIn.map((a) => (a ? { ...a } : null));
  const placedIdx = [];
  for (const L of lessons) if (assign[L.idx]) placedIdx.push(L.idx);

  let current = computeScore(problem, assign, weights).soft;
  let bestScore = current;
  let bestAssign = assign.map((a) => (a ? { ...a } : null));

  if (placedIdx.length === 0 || steps <= 0) {
    return { assign: bestAssign, softScore: bestScore, stepsDone: 0 };
  }

  // Belegungs-Maps: Wert = Lektionsindex oder -1.
  const classBusy = new Map();
  const teacherBusy = new Map();
  const roomBusy = new Map();
  const freeArr = () => new Int16Array(S).fill(-1);
  for (const L of lessons) {
    if (!classBusy.has(L.classId)) classBusy.set(L.classId, freeArr());
    if (!teacherBusy.has(L.teacherId)) teacherBusy.set(L.teacherId, freeArr());
    for (const rid of L.roomCandidates) if (!roomBusy.has(rid)) roomBusy.set(rid, freeArr());
  }
  const placedByClass = new Map();
  for (const idx of placedIdx) {
    const L = lessons[idx];
    const a = assign[idx];
    classBusy.get(L.classId)[a.slot] = idx;
    teacherBusy.get(L.teacherId)[a.slot] = idx;
    if (!roomBusy.has(a.roomId)) roomBusy.set(a.roomId, freeArr());
    roomBusy.get(a.roomId)[a.slot] = idx;
    let list = placedByClass.get(L.classId);
    if (!list) placedByClass.set(L.classId, (list = []));
    list.push(idx);
  }
  const classList = [...placedByClass.keys()];

  const rng = mulberry32(seed);
  const T0 = 12;

  function removeL(L) {
    const a = assign[L.idx];
    classBusy.get(L.classId)[a.slot] = -1;
    teacherBusy.get(L.teacherId)[a.slot] = -1;
    roomBusy.get(a.roomId)[a.slot] = -1;
    assign[L.idx] = null;
  }

  function placeL(L, slot, roomId) {
    assign[L.idx] = { slot, roomId };
    classBusy.get(L.classId)[slot] = L.idx;
    teacherBusy.get(L.teacherId)[slot] = L.idx;
    roomBusy.get(roomId)[slot] = L.idx;
  }

  function slotFreeFor(L, slot) {
    if (classBusy.get(L.classId)[slot] !== -1) return false;
    if (teacherBusy.get(L.teacherId)[slot] !== -1) return false;
    const blocked = problem.teacherBlocked.get(L.teacherId);
    return !(blocked && blocked.has(slot));
  }

  // Erster freier Raum: erst bevorzugte Räume (sofern zulässiger Kandidat), dann alle Kandidaten.
  function pickRoom(L, slot, preferred, offset) {
    for (const rid of preferred) {
      if (rid && L.roomCandidates.includes(rid) && roomBusy.get(rid)[slot] === -1) return rid;
    }
    const cands = L.roomCandidates;
    for (let i = 0; i < cands.length; i++) {
      const rid = cands[(i + offset) % cands.length];
      if (roomBusy.get(rid)[slot] === -1) return rid;
    }
    return null;
  }

  // Jeder try*-Move gibt bei Erfolg eine Revert-Funktion zurück, sonst null.

  function tryMove() {
    const L = lessons[placedIdx[randInt(rng, placedIdx.length)]];
    const old = { ...assign[L.idx] };
    const slot = randInt(rng, S);
    if (slot === old.slot) return null;
    removeL(L);
    if (!slotFreeFor(L, slot)) {
      placeL(L, old.slot, old.roomId);
      return null;
    }
    const roomId = pickRoom(L, slot, [], randInt(rng, L.roomCandidates.length || 1));
    if (!roomId) {
      placeL(L, old.slot, old.roomId);
      return null;
    }
    placeL(L, slot, roomId);
    return () => {
      removeL(L);
      placeL(L, old.slot, old.roomId);
    };
  }

  function trySwap() {
    const classId = classList[randInt(rng, classList.length)];
    const list = placedByClass.get(classId);
    if (list.length < 2) return null;
    const L1 = lessons[list[randInt(rng, list.length)]];
    const L2 = lessons[list[randInt(rng, list.length)]];
    if (L1.idx === L2.idx) return null;
    const a1 = { ...assign[L1.idx] };
    const a2 = { ...assign[L2.idx] };
    removeL(L1);
    removeL(L2);
    const restore = () => {
      placeL(L1, a1.slot, a1.roomId);
      placeL(L2, a2.slot, a2.roomId);
    };
    if (!slotFreeFor(L1, a2.slot) || !slotFreeFor(L2, a1.slot)) {
      restore();
      return null;
    }
    const r1 = pickRoom(L1, a2.slot, [a1.roomId, a2.roomId], 0);
    if (!r1) {
      restore();
      return null;
    }
    placeL(L1, a2.slot, r1);
    const r2 = pickRoom(L2, a1.slot, [a2.roomId, a1.roomId], 0);
    if (!r2) {
      removeL(L1);
      restore();
      return null;
    }
    placeL(L2, a1.slot, r2);
    return () => {
      removeL(L1);
      removeL(L2);
      restore();
    };
  }

  function tryRoomChange() {
    const L = lessons[placedIdx[randInt(rng, placedIdx.length)]];
    if (L.roomCandidates.length < 2) return null;
    const old = { ...assign[L.idx] };
    const offset = randInt(rng, L.roomCandidates.length);
    let roomId = null;
    for (let i = 0; i < L.roomCandidates.length; i++) {
      const rid = L.roomCandidates[(i + offset) % L.roomCandidates.length];
      if (rid !== old.roomId && roomBusy.get(rid)[old.slot] === -1) {
        roomId = rid;
        break;
      }
    }
    if (!roomId) return null;
    removeL(L);
    placeL(L, old.slot, roomId);
    return () => {
      removeL(L);
      placeL(L, old.slot, old.roomId);
    };
  }

  let stepsDone = 0;
  for (let step = 0; step < steps; step++) {
    if ((step & 511) === 0 && Date.now() > deadline) break;
    stepsDone += 1;

    const r = rng();
    const revert = r < 0.55 ? tryMove() : r < 0.85 ? trySwap() : tryRoomChange();
    if (!revert) continue;

    const next = computeScore(problem, assign, weights).soft;
    const delta = next - current;
    const progress = step / steps;
    const temp = T0 * (1 - progress) * (1 - progress) + 0.05;
    if (delta >= 0 || rng() < Math.exp(delta / temp)) {
      current = next;
      if (current > bestScore) {
        bestScore = current;
        bestAssign = assign.map((a) => (a ? { ...a } : null));
      }
    } else {
      revert();
    }

    if (onProgress && step > 0 && step % 2000 === 0) {
      onProgress({ phase: 'optimieren', bestSoft: bestScore, step, steps });
    }
  }

  return { assign: bestAssign, softScore: bestScore, stepsDone };
}
