import { describe, it } from 'vitest';

describe('HomeworkService', () => {
  // HW-01: Lehrer kann Hausaufgaben einer Unterrichtsstunde zuordnen
  describe('HW-01: homework CRUD linked to lesson', () => {
    it.todo('creates homework with title, description, dueDate, classSubjectId, classBookEntryId');
    it.todo('lists homework for a class subject');
    it.todo('lists homework for a school');
    it.todo('updates homework title and dueDate');
    it.todo('deletes homework by id');
    it.todo('rejects create with missing required fields');
  });

  // HW-03: notifications for students/parents
  describe('HW-03: homework notifications', () => {
    it.todo('sends HOMEWORK_ASSIGNED notification to class students on create');
    it.todo('sends HOMEWORK_ASSIGNED notification to class parents on create');
    it.todo('does NOT notify the creating teacher (self-notification prevention)');
  });
});
