// Orchestrator: Phase 1 (Backtracking) + Phase 2 (Annealing) + Ergebnis-Zusammenbau.
// Wird identisch vom Web Worker und vom Node-Selbsttest verwendet.

import { buildProblem, solvePhase1 } from './solver.js';
import { optimize } from './optimizer.js';
import { computeScore, resolveWeights } from './score.js';

export function runSolver(doc, options = {}, onProgress = null) {
  const seed = (options.seed ?? 1) >>> 0;
  const timeLimitMs = options.timeLimitMs ?? 8000;
  const weights = resolveWeights(options.weights ?? doc.settings?.weights);
  const startedAt = Date.now();
  // Wall-Clock nur als Sicherheitsnetz (3x Budget) — die regulären Grenzen sind
  // deterministische Zähler (Backtrack-Limit, Optimierungsschritte), damit gleicher
  // Seed + gleiche Daten denselben Plan ergeben.
  const deadline = startedAt + timeLimitMs * 3;

  const problem = buildProblem(doc);

  const phase1 = solvePhase1(problem, {
    seed,
    backtrackLimit: options.backtrackLimit ?? 50000,
    restarts: options.restarts ?? 3,
    deadline,
    onProgress,
  });

  let assign = phase1.assign;
  let stepsDone = 0;
  if (phase1.placedCount > 0) {
    const phase2 = optimize(problem, assign, {
      seed: (seed + 101) >>> 0,
      steps: options.optimizeSteps ?? 20000,
      weights,
      deadline,
      onProgress,
    });
    assign = phase2.assign;
    stepsDone = phase2.stepsDone;
  }

  const score = computeScore(problem, assign, weights);

  const lessonsOut = [];
  const missingByCs = new Map();
  for (const L of problem.lessons) {
    const a = assign[L.idx];
    if (!a) {
      missingByCs.set(L.csId, (missingByCs.get(L.csId) ?? 0) + 1);
      continue;
    }
    lessonsOut.push({
      id: `${L.csId}-${L.instanceIdx}`,
      classSubjectId: L.csId,
      teacherId: L.teacherId,
      roomId: a.roomId,
      dayOfWeek: problem.days[(a.slot / problem.P) | 0],
      periodNumber: problem.periods[a.slot % problem.P].periodNumber,
    });
  }

  const unplaced = [...problem.unassignedClassSubjects];
  for (const [classSubjectId, missing] of missingByCs) {
    unplaced.push({ classSubjectId, missing, reason: 'UNPLACED' });
  }

  return {
    lessons: lessonsOut,
    unplaced,
    score,
    solverInfo: {
      seed,
      elapsedMs: Date.now() - startedAt,
      backtracks: phase1.backtracks,
      restarts: phase1.restartsUsed,
      optimizeSteps: stepsDone,
      createdAt: new Date().toISOString(),
    },
    stale: false,
  };
}
