import { describe, it, expect } from 'vitest';
import {
  AvailabilityRuleSchema,
  AvailabilityRuleTypeEnum,
  DayOfWeekEnum,
} from './availability.schema.js';

describe('AvailabilityRuleSchema', () => {
  it('accepts a BLOCKED_PERIOD rule', () => {
    const result = AvailabilityRuleSchema.safeParse({
      ruleType: 'BLOCKED_PERIOD',
      dayOfWeek: 'MONDAY',
      periodNumbers: [1, 2],
      isHard: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a MAX_DAYS_PER_WEEK rule without dayOfWeek', () => {
    const result = AvailabilityRuleSchema.safeParse({
      ruleType: 'MAX_DAYS_PER_WEEK',
      maxValue: 4,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid ruleType', () => {
    const result = AvailabilityRuleSchema.safeParse({
      ruleType: 'UNAVAILABLE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid dayOfWeek', () => {
    const result = AvailabilityRuleSchema.safeParse({
      ruleType: 'BLOCKED_PERIOD',
      dayOfWeek: 'Montag',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative periodNumbers', () => {
    const result = AvailabilityRuleSchema.safeParse({
      ruleType: 'BLOCKED_PERIOD',
      dayOfWeek: 'MONDAY',
      periodNumbers: [-1],
    });
    expect(result.success).toBe(false);
  });

  it('defaults isHard to true when omitted', () => {
    const result = AvailabilityRuleSchema.safeParse({
      ruleType: 'BLOCKED_PERIOD',
      dayOfWeek: 'MONDAY',
      periodNumbers: [1],
    });
    if (result.success) {
      expect(result.data.isHard).toBe(true);
    }
  });

  it('DayOfWeekEnum covers MON-SAT (no SUNDAY per Austrian school week)', () => {
    expect(DayOfWeekEnum.safeParse('MONDAY').success).toBe(true);
    expect(DayOfWeekEnum.safeParse('SATURDAY').success).toBe(true);
    expect(DayOfWeekEnum.safeParse('SUNDAY').success).toBe(false);
  });

  it('AvailabilityRuleTypeEnum exposes 4 backend enum values', () => {
    const cases = ['MAX_DAYS_PER_WEEK', 'BLOCKED_PERIOD', 'BLOCKED_DAY_PART', 'PREFERRED_FREE_DAY'];
    for (const c of cases) {
      expect(AvailabilityRuleTypeEnum.safeParse(c).success).toBe(true);
    }
  });
});
