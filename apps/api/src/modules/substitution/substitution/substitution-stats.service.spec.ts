import { describe, it } from 'vitest';

describe('SubstitutionStatsService (SUBST-06)', () => {
  it.todo(
    'getFairnessStats returns count + Werteinheiten-weighted hours for substitutions GIVEN by each teacher',
  );
  it.todo(
    'getFairnessStats returns count of substitutions RECEIVED (where originalTeacherId = teacherId)',
  );
  it.todo('getFairnessStats returns count of Entfall outcomes affecting each teacher');
  it.todo('getFairnessStats returns count of Stillarbeit outcomes affecting each teacher');
  it.todo(
    'getFairnessStats computes deltaVsAverage = givenCount - schoolAverage for fairness delta (D-17)',
  );
  it.todo('default window = current semester via getSemesterDateRange from Phase 5 StatisticsService');
  it.todo('supports week|month|semester|schoolYear|custom window options (D-18)');
  it.todo(
    'Werteinheiten weighting uses calculateWerteinheiten from werteinheiten.util.ts (so a Doppelstunde = 2x a single period)',
  );
});
