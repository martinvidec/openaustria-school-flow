import { describe, it } from 'vitest';

describe('ExamService', () => {
  // HW-02: Lehrer kann Pruefungstermine eintragen mit Kollisionserkennung
  describe('HW-02: exam CRUD with collision detection', () => {
    it.todo('creates exam with title, date, classSubjectId, classId');
    it.todo('detects collision when exam exists on same day for same class');
    it.todo('returns no collision when no exams on that day');
    it.todo('allows override when collision exists (D-03 soft warning)');
    it.todo('lists exams for a class');
    it.todo('lists exams for a class subject');
    it.todo('updates exam date and re-checks collision');
    it.todo('deletes exam by id');
  });

  // HW-03: exam notifications
  describe('HW-03: exam notifications', () => {
    it.todo('sends EXAM_SCHEDULED notification to class students on create');
    it.todo('sends EXAM_SCHEDULED notification to class parents on create');
    it.todo('does NOT notify the creating teacher');
  });
});
