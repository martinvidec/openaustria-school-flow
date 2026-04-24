import { describe, it, expect } from 'vitest';
import {
  GroupTypeEnum,
  GroupDerivationRuleCreateSchema,
  GroupDerivationRuleUpdateSchema,
} from './group-derivation-rule.schema.js';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('GroupTypeEnum', () => {
  it('accepts RELIGION | WAHLPFLICHT | LEISTUNG | LANGUAGE | CUSTOM', () => {
    expect(GroupTypeEnum.safeParse('RELIGION').success).toBe(true);
    expect(GroupTypeEnum.safeParse('WAHLPFLICHT').success).toBe(true);
    expect(GroupTypeEnum.safeParse('LEISTUNG').success).toBe(true);
    expect(GroupTypeEnum.safeParse('LANGUAGE').success).toBe(true);
    expect(GroupTypeEnum.safeParse('CUSTOM').success).toBe(true);
  });

  it('rejects unknown enum value', () => {
    expect(GroupTypeEnum.safeParse('PONIES').success).toBe(false);
  });
});

describe('GroupDerivationRuleCreateSchema', () => {
  const validRule = {
    groupType: 'RELIGION' as const,
    groupName: 'Röm.-Kath.',
  };

  it('accepts minimal valid rule', () => {
    const result = GroupDerivationRuleCreateSchema.safeParse(validRule);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.studentIds).toEqual([]);
    }
  });

  it('accepts full rule with level and studentIds', () => {
    const result = GroupDerivationRuleCreateSchema.safeParse({
      ...validRule,
      level: 'Katholisch',
      studentIds: [VALID_UUID],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty groupName with "Pflichtfeld"', () => {
    const result = GroupDerivationRuleCreateSchema.safeParse({ ...validRule, groupName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Pflichtfeld');
    }
  });

  it('rejects invalid studentIds uuid', () => {
    const result = GroupDerivationRuleCreateSchema.safeParse({
      ...validRule,
      studentIds: ['nope'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Ungültige Schüler-ID');
    }
  });

  it('rejects groupType outside enum', () => {
    const result = GroupDerivationRuleCreateSchema.safeParse({
      ...validRule,
      groupType: 'UNICORN',
    });
    expect(result.success).toBe(false);
  });
});

describe('GroupDerivationRuleUpdateSchema', () => {
  it('accepts empty object (all fields optional via partial)', () => {
    const result = GroupDerivationRuleUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with only groupName', () => {
    const result = GroupDerivationRuleUpdateSchema.safeParse({ groupName: 'Renamed' });
    expect(result.success).toBe(true);
  });
});
