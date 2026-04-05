import { describe, it } from 'vitest';

describe('RankingService (SUBST-02)', () => {
  it.todo('excludes the absent teacher from candidates');
  it.todo(
    'hard filter: excludes candidates with conflicting TimetableLesson in the active run on (dayOfWeek, period, weekType)',
  );
  it.todo(
    'hard filter: excludes candidates with existing Substitution row on same date+lesson with status PENDING|OFFERED|CONFIRMED',
  );
  it.todo(
    'hard filter: excludes candidates with RoomBooking at the target slot (joined via Person.keycloakUserId)',
  );
  it.todo(
    'hard filter: excludes candidates blocked by BLOCKED-type AvailabilityRule on target day/period',
  );
  it.todo('hard filter: excludes candidates violating MAX_HOURS_PER_DAY AvailabilityRule');
  it.todo(
    'hard filter: excludes candidates whose werteinheitenTarget would be exceeded by adding this period',
  );
  it.todo(
    'soft score: subjectMatch=1.0 if candidate has TeacherSubject for the lesson subject, 0.5 for same Lehrverpflichtungsgruppe, 0.0 otherwise',
  );
  it.todo(
    'soft score: fairness = 1 - (given / maxGivenInWindow), higher score for fewer substitutions given',
  );
  it.todo('soft score: workloadHeadroom = (target - current) / target, clamped to [0,1]');
  it.todo('soft score: klassenvorstand = 1.0 if candidate is KV of affected class, else 0.0');
  it.todo(
    'total score = 0.45*subjectMatch + 0.30*fairness + 0.20*workloadHeadroom + 0.05*klassenvorstand',
  );
  it.todo('ranking is deterministic: ties broken by teacherId lexicographic order');
  it.todo('RANKING_WEIGHTS constant sums to 1.0');
});
