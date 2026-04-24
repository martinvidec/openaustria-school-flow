import { describe, it } from 'vitest';

/**
 * Wave 0 TDD stubs — Phase 12-01 Plan Task 1.
 * Full implementation lands in Task 2 (ParentModule greenfield).
 */
describe('ParentService', () => {
  describe('create', () => {
    it.todo('nested-creates Person with personType=PARENT then Parent row in single tx');
    it.todo('returns parent with nested person');
    it.todo('throws BadRequestException on invalid email');
  });

  describe('findAll', () => {
    it.todo('filters by schoolId (required)');
    it.todo('filters by email substring');
    it.todo('filters by name substring (firstName OR lastName)');
    it.todo('returns paginated response with meta');
  });

  describe('findOne', () => {
    it.todo('returns parent with nested person + children count');
    it.todo('throws NotFoundException when id not found');
  });

  describe('update', () => {
    it.todo('updates Person fields (firstName/lastName/email/phone) via nested update');
  });

  describe('remove — Orphan-Guard', () => {
    it.todo('deletes person (cascading parent) when zero ParentStudent refs');
    it.todo(
      'throws ConflictException with affectedEntities.linkedStudents when ParentStudent refs exist',
    );
  });
});
