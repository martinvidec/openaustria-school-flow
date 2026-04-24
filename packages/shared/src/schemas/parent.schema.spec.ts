import { describe, it, expect } from 'vitest';
import {
  ParentStammdatenSchema,
  ParentCreateSchema,
  ParentUpdateSchema,
  ParentSearchSchema,
} from './parent.schema.js';

const validStammdaten = {
  firstName: 'Erika',
  lastName: 'Mustermann',
  email: 'erika.mustermann@example.at',
};

describe('ParentStammdatenSchema', () => {
  it('accepts valid Stammdaten', () => {
    expect(ParentStammdatenSchema.safeParse(validStammdaten).success).toBe(true);
  });

  it('requires email (not optional)', () => {
    const result = ParentStammdatenSchema.safeParse({
      firstName: 'Erika',
      lastName: 'Mustermann',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty firstName with "Pflichtfeld"', () => {
    const result = ParentStammdatenSchema.safeParse({ ...validStammdaten, firstName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Pflichtfeld');
    }
  });

  it('rejects invalid email with "Gültige E-Mail-Adresse eingeben"', () => {
    const result = ParentStammdatenSchema.safeParse({ ...validStammdaten, email: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        'Gültige E-Mail-Adresse eingeben',
      );
    }
  });

  it('allows optional phone', () => {
    const result = ParentStammdatenSchema.safeParse({ ...validStammdaten, phone: '+43 1 234567' });
    expect(result.success).toBe(true);
  });
});

describe('ParentCreateSchema', () => {
  it('requires schoolId (uuid)', () => {
    const result = ParentCreateSchema.safeParse(validStammdaten);
    expect(result.success).toBe(false);
  });

  it('accepts valid payload', () => {
    const result = ParentCreateSchema.safeParse({
      ...validStammdaten,
      schoolId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.success).toBe(true);
  });
});

describe('ParentUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = ParentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid email when provided', () => {
    const result = ParentUpdateSchema.safeParse({ email: 'nope' });
    expect(result.success).toBe(false);
  });
});

describe('ParentSearchSchema', () => {
  const validSchoolId = '11111111-1111-4111-8111-111111111111';

  it('requires schoolId', () => {
    const result = ParentSearchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('defaults page=1 and limit=20', () => {
    const result = ParentSearchSchema.safeParse({ schoolId: validSchoolId });
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('accepts optional email + name filters', () => {
    expect(
      ParentSearchSchema.safeParse({
        schoolId: validSchoolId,
        email: 'huber',
        name: 'mustermann',
      }).success,
    ).toBe(true);
  });

  it('enforces limit <= 100', () => {
    const result = ParentSearchSchema.safeParse({ schoolId: validSchoolId, limit: 500 });
    expect(result.success).toBe(false);
  });
});
