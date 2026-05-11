import { describe, it, expect } from 'vitest';
import {
  SchoolClassCreateSchema,
  SchoolClassUpdateSchema,
  ClassListFiltersSchema,
} from './school-class.schema.js';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const validCreate = {
  schoolId: VALID_UUID,
  name: '3B',
  yearLevel: 3,
  schoolYearId: VALID_UUID,
};

describe('SchoolClassCreateSchema', () => {
  it('accepts minimal valid payload', () => {
    const result = SchoolClassCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('accepts optional klassenvorstandId uuid', () => {
    const result = SchoolClassCreateSchema.safeParse({ ...validCreate, klassenvorstandId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('rejects empty name with "Pflichtfeld"', () => {
    const result = SchoolClassCreateSchema.safeParse({ ...validCreate, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Pflichtfeld');
    }
  });

  it('rejects yearLevel < 1', () => {
    const result = SchoolClassCreateSchema.safeParse({ ...validCreate, yearLevel: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Jahrgangsstufe >= 1');
    }
  });

  it('rejects yearLevel > 13', () => {
    const result = SchoolClassCreateSchema.safeParse({ ...validCreate, yearLevel: 14 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Jahrgangsstufe <= 13');
    }
  });

  // The schoolYearId guard was relaxed from .uuid() to .min(1) in Plan
  // 12-03 Rule-1 (parity with the API DTO which has to accept seed-fixture
  // string IDs like `seed-year-current`). The schema rejects only empty
  // strings now; arbitrary non-UUID strings like "nope" are valid keys.
  it('rejects empty schoolYearId', () => {
    const result = SchoolClassCreateSchema.safeParse({ ...validCreate, schoolYearId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Ungültige Schuljahr-ID');
    }
  });
});

describe('SchoolClassUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = SchoolClassUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts null klassenvorstandId (removes Klassenvorstand)', () => {
    const result = SchoolClassUpdateSchema.safeParse({ klassenvorstandId: null });
    expect(result.success).toBe(true);
  });

  it('rejects name longer than 50 chars', () => {
    const result = SchoolClassUpdateSchema.safeParse({ name: 'X'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('ClassListFiltersSchema', () => {
  it('accepts minimal schoolId filter', () => {
    const result = ClassListFiltersSchema.safeParse({ schoolId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('accepts yearLevels array', () => {
    const result = ClassListFiltersSchema.safeParse({ schoolId: VALID_UUID, yearLevels: [1, 3, 5] });
    expect(result.success).toBe(true);
  });

  it('rejects invalid yearLevel in array', () => {
    const result = ClassListFiltersSchema.safeParse({ schoolId: VALID_UUID, yearLevels: [14] });
    expect(result.success).toBe(false);
  });

  it('rejects limit > 100', () => {
    const result = ClassListFiltersSchema.safeParse({ schoolId: VALID_UUID, limit: 101 });
    expect(result.success).toBe(false);
  });
});
