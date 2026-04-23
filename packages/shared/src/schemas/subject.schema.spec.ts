import { describe, it, expect } from 'vitest';
import {
  SubjectCreateSchema,
  SubjectUpdateSchema,
  SubjectTypeEnum,
} from './subject.schema.js';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('SubjectCreateSchema', () => {
  it('accepts a valid create payload', () => {
    const result = SubjectCreateSchema.safeParse({
      schoolId: VALID_UUID,
      name: 'Deutsch',
      shortName: 'D',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Deutsch');
      expect(result.data.subjectType).toBe('PFLICHT'); // default
    }
  });

  it('rejects empty name with "Pflichtfeld"', () => {
    const result = SubjectCreateSchema.safeParse({
      schoolId: VALID_UUID,
      name: '',
      shortName: 'D',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path[0] === 'name');
      expect(nameIssue?.message).toBe('Pflichtfeld');
    }
  });

  it('auto-transforms shortName to uppercase', () => {
    const result = SubjectCreateSchema.safeParse({
      schoolId: VALID_UUID,
      name: 'Mathematik',
      shortName: 'm',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shortName).toBe('M');
    }
  });

  it('auto-transforms multi-char shortName to uppercase', () => {
    const result = SubjectCreateSchema.safeParse({
      schoolId: VALID_UUID,
      name: 'Geschichte',
      shortName: 'gsp',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shortName).toBe('GSP');
    }
  });

  it('rejects shortName longer than 8 chars', () => {
    const result = SubjectCreateSchema.safeParse({
      schoolId: VALID_UUID,
      name: 'x',
      shortName: 'ABCDEFGHI', // 9 chars
    });
    expect(result.success).toBe(false);
  });

  it('defaults subjectType to PFLICHT when omitted', () => {
    const result = SubjectCreateSchema.safeParse({
      schoolId: VALID_UUID,
      name: 'Deutsch',
      shortName: 'D',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subjectType).toBe('PFLICHT');
    }
  });

  it('accepts WAHLPFLICHT | FREIGEGENSTAND | UNVERBINDLICH subjectType values', () => {
    for (const v of ['WAHLPFLICHT', 'FREIGEGENSTAND', 'UNVERBINDLICH'] as const) {
      const r = SubjectCreateSchema.safeParse({
        schoolId: VALID_UUID,
        name: 'x',
        shortName: 'X',
        subjectType: v,
      });
      expect(r.success).toBe(true);
    }
  });

  it('rejects unknown subjectType', () => {
    const r = SubjectCreateSchema.safeParse({
      schoolId: VALID_UUID,
      name: 'x',
      shortName: 'X',
      subjectType: 'UNKNOWN',
    });
    expect(r.success).toBe(false);
  });
});

describe('SubjectUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const r = SubjectUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('still uppercases shortName when provided', () => {
    const r = SubjectUpdateSchema.safeParse({ shortName: 'phy' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.shortName).toBe('PHY');
    }
  });
});

describe('SubjectTypeEnum', () => {
  it('enumerates 4 known subject types', () => {
    expect(SubjectTypeEnum.options).toEqual([
      'PFLICHT',
      'WAHLPFLICHT',
      'FREIGEGENSTAND',
      'UNVERBINDLICH',
    ]);
  });
});
