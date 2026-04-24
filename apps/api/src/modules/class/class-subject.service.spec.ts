import { describe, it } from 'vitest';

// Phase 12-02 Wave 0 stubs — turned green in Task 2 together with the
// `ClassSubjectService` implementation.

describe('ClassSubjectService', () => {
  describe('applyStundentafel', () => {
    it.todo(
      'creates ClassSubject rows from shared template for (schoolType, yearLevel) tuple in single tx',
    );
    it.todo('throws ConflictException when ClassSubjects already exist for class');
    it.todo('sets isCustomized=false on applied rows');
  });

  describe('updateClassSubjects', () => {
    it.todo('replaces ALL ClassSubject rows for class in single tx (delete + createMany)');
    it.todo('flips isCustomized=true for rows whose weeklyHours differs from template');
    it.todo('preserves isCustomized=true flag for untouched rows');
  });

  describe('resetStundentafel', () => {
    it.todo('deletes all ClassSubject rows for class then re-applies template in single tx');
  });
});
