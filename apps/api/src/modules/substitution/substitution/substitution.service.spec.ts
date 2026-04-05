import { describe, it } from 'vitest';

describe('SubstitutionService (SUBST-03 / SUBST-05 / D-04 / D-14)', () => {
  it.todo(
    'assignSubstitute transitions PENDING -> OFFERED, sets substituteTeacherId and offeredAt, creates SUBSTITUTION_OFFER notification',
  );
  it.todo(
    'assignSubstitute re-runs hard filters inside a Serializable transaction and returns 409 if candidate no longer free (Pitfall 2)',
  );
  it.todo(
    'respondToOffer (accept) transitions OFFERED -> CONFIRMED and creates SUBSTITUTION_CONFIRMED notifications to admin, KV, absent teacher',
  );
  it.todo(
    'respondToOffer (decline) transitions OFFERED -> DECLINED, notifies admin via SUBSTITUTION_DECLINED notification',
  );
  it.todo(
    'setEntfall transitions row to type=ENTFALL, status=CONFIRMED, emits timetable:cancelled event, no ClassBookEntry created',
  );
  it.todo(
    'setStillarbeit transitions row to type=STILLARBEIT, status=CONFIRMED, creates ClassBookEntry with thema="Stillarbeit" and substitutionId FK link (D-14)',
  );
  it.todo(
    'SUBSTITUTED type with confirmed status sets ClassBookEntry.teacherId to substitute and populates substitutionId FK (D-14)',
  );
  it.todo('cannot assign substitute to substitution with status CONFIRMED (idempotency guard)');
});
