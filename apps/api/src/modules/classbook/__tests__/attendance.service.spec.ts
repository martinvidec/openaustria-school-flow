import { describe, it } from 'vitest';

describe('AttendanceService', () => {
  it.todo('BOOK-01: should create attendance records for all students in a lesson');
  it.todo('BOOK-01: should update attendance status for a single student');
  it.todo('BOOK-01: should bulk-update attendance with debounced batch');
  it.todo('BOOK-01: should default all students to PRESENT');
  it.todo('BOOK-01: should store lateMinutes when status is LATE (D-04)');
  it.todo('BOOK-01: should reject lateMinutes when status is not LATE');
  it.todo('BOOK-01: should return 409 on concurrent edit conflict');
});
