import { describe, it, expect } from 'vitest';
import { SchoolYearSchema } from './school-year.schema';

describe('SchoolYearSchema', () => {
  const valid = {
    name: '2026/2027',
    startDate: new Date('2026-09-01'),
    semesterBreak: new Date('2027-02-05'),
    endDate: new Date('2027-07-09'),
    isActive: true,
  };

  it('accepts a well-formed school year record', () => {
    const result = SchoolYearSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('coerces ISO date strings into Date objects', () => {
    const result = SchoolYearSchema.safeParse({
      name: '2026/2027',
      startDate: '2026-09-01',
      semesterBreak: '2027-02-05',
      endDate: '2027-07-09',
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects when semesterBreak is before startDate', () => {
    const result = SchoolYearSchema.safeParse({
      ...valid,
      semesterBreak: new Date('2026-08-01'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain(
        'Semesterwechsel muss zwischen Start und Ende liegen',
      );
    }
  });

  it('rejects when semesterBreak is after endDate', () => {
    const result = SchoolYearSchema.safeParse({
      ...valid,
      semesterBreak: new Date('2027-08-01'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain(
        'Semesterwechsel muss zwischen Start und Ende liegen',
      );
    }
  });

  it('rejects when startDate >= endDate with "Ende muss nach Start liegen"', () => {
    const result = SchoolYearSchema.safeParse({
      ...valid,
      startDate: new Date('2027-10-01'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Ende muss nach Start liegen');
    }
  });

  it('rejects empty name with "Name erforderlich"', () => {
    const result = SchoolYearSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Name erforderlich');
    }
  });
});
