import { describe, it, expect } from 'vitest';
import {
  StammdatenSchema,
  TeacherCreateSchema,
  TeacherUpdateSchema,
  LehrverpflichtungSchema,
  TeacherStatusEnum,
} from './teacher.schema.js';

describe('StammdatenSchema', () => {
  const valid = {
    firstName: 'Maria',
    lastName: 'Huber',
    email: 'maria.huber@schule.at',
  };

  it('accepts a valid Stammdaten record', () => {
    const result = StammdatenSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects empty firstName with "Pflichtfeld"', () => {
    const result = StammdatenSchema.safeParse({ ...valid, firstName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Pflichtfeld');
    }
  });

  it('rejects empty lastName with "Pflichtfeld"', () => {
    const result = StammdatenSchema.safeParse({ ...valid, lastName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Pflichtfeld');
    }
  });

  it('rejects invalid email format with "Gültige E-Mail-Adresse eingeben"', () => {
    const result = StammdatenSchema.safeParse({ ...valid, email: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Gültige E-Mail-Adresse eingeben');
    }
  });

  it('rejects firstName > 100 chars', () => {
    const result = StammdatenSchema.safeParse({ ...valid, firstName: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('defaults status to ACTIVE when omitted', () => {
    const result = StammdatenSchema.safeParse(valid);
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE');
    }
  });

  it('TeacherStatusEnum accepts ACTIVE and ARCHIVED', () => {
    expect(TeacherStatusEnum.safeParse('ACTIVE').success).toBe(true);
    expect(TeacherStatusEnum.safeParse('ARCHIVED').success).toBe(true);
    expect(TeacherStatusEnum.safeParse('DELETED').success).toBe(false);
  });
});

describe('TeacherCreateSchema', () => {
  it('requires schoolId (uuid)', () => {
    const result = TeacherCreateSchema.safeParse({
      firstName: 'Maria',
      lastName: 'Huber',
      email: 'm@schule.at',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid create payload', () => {
    const result = TeacherCreateSchema.safeParse({
      firstName: 'Maria',
      lastName: 'Huber',
      email: 'm@schule.at',
      schoolId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.employmentPercentage).toBe(100);
    }
  });
});

describe('LehrverpflichtungSchema', () => {
  it('accepts valid payload', () => {
    const result = LehrverpflichtungSchema.safeParse({
      employmentPercentage: 50,
      werteinheitenTarget: 20,
      subjectIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects employmentPercentage > 100', () => {
    const result = LehrverpflichtungSchema.safeParse({
      employmentPercentage: 101,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Wert muss zwischen 0 und 100 liegen');
    }
  });

  it('rejects negative employmentPercentage', () => {
    const result = LehrverpflichtungSchema.safeParse({
      employmentPercentage: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('TeacherUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = TeacherUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial Stammdaten update', () => {
    const result = TeacherUpdateSchema.safeParse({ firstName: 'Neu' });
    expect(result.success).toBe(true);
  });

  it('rejects partial update with invalid email', () => {
    const result = TeacherUpdateSchema.safeParse({ email: 'not-email' });
    expect(result.success).toBe(false);
  });
});
