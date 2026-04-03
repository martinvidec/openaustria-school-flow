import { describe, it } from 'vitest';

describe('ExcuseService', () => {
  it.todo('BOOK-06: should create an excuse with PENDING status');
  it.todo('BOOK-06: should validate endDate >= startDate');
  it.todo('BOOK-06: should reject excuses more than 30 days in the past');
  it.todo('BOOK-06: should accept excuse and update attendance to EXCUSED (D-12)');
  it.todo('BOOK-06: should reject excuse with required review note');
  it.todo('BOOK-06: should only allow parent to create excuses for own children');
  it.todo('BOOK-06: should only allow Klassenvorstand to review excuses for own class');
  it.todo('BOOK-06: should list pending excuses for Klassenvorstand');
});
