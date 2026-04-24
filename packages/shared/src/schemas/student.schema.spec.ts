import { describe, it, expect } from 'vitest';
import {
  StudentStammdatenSchema,
  StudentCreateSchema,
  StudentUpdateSchema,
  StudentListFiltersSchema,
  StudentArchiveFilterEnum,
} from './student.schema.js';

const validStammdaten = {
  firstName: 'Lisa',
  lastName: 'Huber',
};

describe('StudentStammdatenSchema', () => {
  it('accepts minimal valid Stammdaten', () => {
    const result = StudentStammdatenSchema.safeParse(validStammdaten);
    expect(result.success).toBe(true);
  });

  it('rejects empty firstName with "Pflichtfeld"', () => {
    const result = StudentStammdatenSchema.safeParse({ ...validStammdaten, firstName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Pflichtfeld');
    }
  });

  it('rejects empty lastName with "Pflichtfeld"', () => {
    const result = StudentStammdatenSchema.safeParse({ ...validStammdaten, lastName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Pflichtfeld');
    }
  });

  it('rejects invalid email with "Gültige E-Mail-Adresse eingeben"', () => {
    const result = StudentStammdatenSchema.safeParse({ ...validStammdaten, email: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        'Gültige E-Mail-Adresse eingeben',
      );
    }
  });

  it('accepts empty string as email (optional or literal "")', () => {
    const result = StudentStammdatenSchema.safeParse({ ...validStammdaten, email: '' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for classId', () => {
    const result = StudentStammdatenSchema.safeParse({
      ...validStammdaten,
      classId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Ungültige Klassen-ID');
    }
  });
});

describe('StudentCreateSchema', () => {
  it('requires schoolId (uuid)', () => {
    const result = StudentCreateSchema.safeParse(validStammdaten);
    expect(result.success).toBe(false);
  });

  it('accepts valid create payload with schoolId', () => {
    const result = StudentCreateSchema.safeParse({
      ...validStammdaten,
      schoolId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentIds).toEqual([]);
    }
  });

  it('defaults parentIds to empty array when omitted', () => {
    const result = StudentCreateSchema.safeParse({
      ...validStammdaten,
      schoolId: '11111111-1111-4111-8111-111111111111',
    });
    if (result.success) {
      expect(result.data.parentIds).toEqual([]);
    }
  });

  it('accepts parentIds array of UUIDs', () => {
    const result = StudentCreateSchema.safeParse({
      ...validStammdaten,
      schoolId: '11111111-1111-4111-8111-111111111111',
      parentIds: [
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID parentId entries', () => {
    const result = StudentCreateSchema.safeParse({
      ...validStammdaten,
      schoolId: '11111111-1111-4111-8111-111111111111',
      parentIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });
});

describe('StudentUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = StudentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with just firstName', () => {
    const result = StudentUpdateSchema.safeParse({ firstName: 'Neu' });
    expect(result.success).toBe(true);
  });

  it('rejects partial update with invalid email', () => {
    const result = StudentUpdateSchema.safeParse({ email: 'not-email' });
    expect(result.success).toBe(false);
  });
});

describe('StudentListFiltersSchema', () => {
  const validSchoolId = '11111111-1111-4111-8111-111111111111';

  it('defaults archived to "active"', () => {
    const result = StudentListFiltersSchema.safeParse({ schoolId: validSchoolId });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archived).toBe('active');
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('accepts archived=archived or all', () => {
    expect(
      StudentListFiltersSchema.safeParse({ schoolId: validSchoolId, archived: 'archived' })
        .success,
    ).toBe(true);
    expect(
      StudentListFiltersSchema.safeParse({ schoolId: validSchoolId, archived: 'all' }).success,
    ).toBe(true);
  });

  it('rejects invalid archived enum value', () => {
    const result = StudentListFiltersSchema.safeParse({
      schoolId: validSchoolId,
      archived: 'pending',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing schoolId', () => {
    const result = StudentListFiltersSchema.safeParse({ archived: 'active' });
    expect(result.success).toBe(false);
  });

  it('enforces limit <= 100', () => {
    const result = StudentListFiltersSchema.safeParse({
      schoolId: validSchoolId,
      limit: 500,
    });
    expect(result.success).toBe(false);
  });
});

describe('StudentArchiveFilterEnum', () => {
  it('accepts active, archived, all', () => {
    expect(StudentArchiveFilterEnum.safeParse('active').success).toBe(true);
    expect(StudentArchiveFilterEnum.safeParse('archived').success).toBe(true);
    expect(StudentArchiveFilterEnum.safeParse('all').success).toBe(true);
  });

  it('rejects unknown filter value', () => {
    expect(StudentArchiveFilterEnum.safeParse('deleted').success).toBe(false);
  });
});
