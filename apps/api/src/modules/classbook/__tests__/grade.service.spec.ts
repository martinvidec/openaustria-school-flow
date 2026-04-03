import { describe, it } from 'vitest';

describe('GradeService', () => {
  it.todo('BOOK-03: should create a grade entry with decimal value (D-05)');
  it.todo('BOOK-03: should reject invalid grade values outside 0.75-5.25');
  it.todo('BOOK-03: should only accept valid grade steps (1, 1+, 1-, 2, 2+, etc.)');
  it.todo('BOOK-03: should return grade matrix with students as rows and grades as columns (D-07)');
  it.todo('BOOK-03: should calculate weighted average using grade weights (D-06)');
  it.todo('BOOK-03: should resolve weight hierarchy: classSubject override > school default');
  it.todo('BOOK-03: should update grade weights per classSubject (D-06)');
  it.todo('BOOK-03: should filter grade matrix by category');
  it.todo('BOOK-03: should sort grade matrix by name or average');
});
