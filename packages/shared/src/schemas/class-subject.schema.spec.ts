import { describe, it, expect } from 'vitest';
import {
  ApplyStundentafelSchema,
  ClassSubjectRowSchema,
  UpdateClassSubjectsSchema,
} from './class-subject.schema.js';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('ApplyStundentafelSchema', () => {
  it('accepts valid schoolType', () => {
    const result = ApplyStundentafelSchema.safeParse({ schoolType: 'AHS_UNTER' });
    expect(result.success).toBe(true);
  });

  it('rejects empty schoolType with "Schultyp wählen"', () => {
    const result = ApplyStundentafelSchema.safeParse({ schoolType: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Schultyp wählen');
    }
  });

  it('rejects missing schoolType', () => {
    const result = ApplyStundentafelSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ClassSubjectRowSchema', () => {
  const validRow = { subjectId: VALID_UUID, weeklyHours: 4 };

  it('accepts minimal valid row', () => {
    const result = ClassSubjectRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it('accepts full row with id + isCustomized + preferDoublePeriod', () => {
    const result = ClassSubjectRowSchema.safeParse({
      id: VALID_UUID,
      subjectId: VALID_UUID,
      weeklyHours: 2,
      isCustomized: true,
      preferDoublePeriod: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid subjectId uuid with "Fach wählen"', () => {
    const result = ClassSubjectRowSchema.safeParse({ ...validRow, subjectId: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Fach wählen');
    }
  });

  it('rejects weeklyHours < 0', () => {
    const result = ClassSubjectRowSchema.safeParse({ ...validRow, weeklyHours: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Wert muss >= 0 sein');
    }
  });

  it('rejects weeklyHours > 30', () => {
    const result = ClassSubjectRowSchema.safeParse({ ...validRow, weeklyHours: 31 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Wert muss <= 30 sein');
    }
  });
});

describe('UpdateClassSubjectsSchema', () => {
  it('accepts empty rows array (allows clearing)', () => {
    const result = UpdateClassSubjectsSchema.safeParse({ rows: [] });
    expect(result.success).toBe(true);
  });

  it('accepts multiple rows', () => {
    const result = UpdateClassSubjectsSchema.safeParse({
      rows: [
        { subjectId: VALID_UUID, weeklyHours: 4 },
        { subjectId: VALID_UUID, weeklyHours: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects rows with invalid entry', () => {
    const result = UpdateClassSubjectsSchema.safeParse({
      rows: [{ subjectId: 'nope', weeklyHours: 4 }],
    });
    expect(result.success).toBe(false);
  });
});
