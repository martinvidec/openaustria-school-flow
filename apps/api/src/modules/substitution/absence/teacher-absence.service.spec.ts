import { describe, it } from 'vitest';

describe('TeacherAbsenceService (SUBST-01)', () => {
  it.todo('creates a TeacherAbsence with reason, date range, and optional period bounds');
  it.todo(
    'stores AbsenceReason enum value matching Austrian taxonomy (KRANK|FORTBILDUNG|DIENSTREISE|SCHULVERANSTALTUNG|ARZTTERMIN|SONSTIGES)',
  );
  it.todo(
    'range expansion creates one pending Substitution per affected lesson in the active TimetableRun',
  );
  it.todo('range expansion skips non-school days (SchoolDay.isActive=false)');
  it.todo(
    'range expansion respects A/B week cycles (lessons with weekType=A only expand on ISO-odd weeks)',
  );
  it.todo(
    'range expansion respects period bounds (periodFrom/periodTo) for same-day partial absences',
  );
  it.todo('range expansion is transactional — partial failure leaves no orphaned Substitution rows');
  it.todo('deleting a TeacherAbsence cascades to its Substitution rows');
});
