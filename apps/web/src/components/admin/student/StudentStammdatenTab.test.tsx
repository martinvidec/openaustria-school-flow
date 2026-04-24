import { describe, it } from 'vitest';

/**
 * Wave 0 TDD stubs — Phase 12-01 Plan Task 1.
 * Implementations arrive with Task 3 (Frontend build).
 */
describe('StudentStammdatenTab', () => {
  it.todo(
    'renders Stammdaten form fields in order Vorname/Nachname/Email/Phone/Address/DateOfBirth/SVNR/StudentNumber/Klasse/EnrollmentDate',
  );
  it.todo('blocks submit when lastName is empty via RHF zodResolver (Pflichtfeld)');
  it.todo('blocks submit when email is invalid via zodResolver');
  it.todo(
    'shows Archivieren row-action only when status=active and hides Reaktivieren, inverse when status=archived',
  );
  it.todo(
    'fires onSave with validated values using englische API-Feldnamen (classId, studentNumber, enrollmentDate)',
  );
});
