import { describe, it, expect } from 'vitest';
import { TimeGridSchema, PeriodSchema } from './time-grid.schema.js';

describe('PeriodSchema', () => {
  const basePeriod = {
    periodNumber: 1,
    startTime: '08:00',
    endTime: '08:50',
    isBreak: false,
  };

  it('accepts a well-formed period', () => {
    expect(PeriodSchema.safeParse(basePeriod).success).toBe(true);
  });

  it('rejects invalid time format "9:00" (missing leading zero) with "HH:MM erwartet"', () => {
    const result = PeriodSchema.safeParse({ ...basePeriod, startTime: '9:00' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('HH:MM erwartet');
    }
  });

  it('rejects when endTime <= startTime with "Ende muss nach Start liegen"', () => {
    const result = PeriodSchema.safeParse({
      ...basePeriod,
      startTime: '09:00',
      endTime: '09:00',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Ende muss nach Start liegen');
    }
  });
});

describe('TimeGridSchema', () => {
  const schoolDays: Array<
    'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
  > = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const sixPeriods = [
    { periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false },
    { periodNumber: 2, startTime: '08:55', endTime: '09:45', isBreak: false },
    { periodNumber: 3, startTime: '09:50', endTime: '10:40', isBreak: false },
    { periodNumber: 4, startTime: '10:45', endTime: '11:35', isBreak: false },
    { periodNumber: 5, startTime: '11:40', endTime: '12:30', isBreak: false },
    { periodNumber: 6, startTime: '12:35', endTime: '13:25', isBreak: false },
  ];

  it('accepts a 6-period grid with valid HH:mm and Mo-Sa schoolDays', () => {
    const result = TimeGridSchema.safeParse({
      periods: sixPeriods,
      schoolDays,
    });
    expect(result.success).toBe(true);
  });

  it('rejects overlapping periods with "Perioden duerfen sich nicht ueberlappen"', () => {
    const overlap = [
      { periodNumber: 1, startTime: '08:00', endTime: '09:00', isBreak: false },
      { periodNumber: 2, startTime: '08:55', endTime: '09:45', isBreak: false },
    ];
    const result = TimeGridSchema.safeParse({
      periods: overlap,
      schoolDays,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Perioden duerfen sich nicht ueberlappen');
    }
  });

  it('rejects time format "9:00" (must be "09:00") with "HH:MM erwartet"', () => {
    const bad = [
      { periodNumber: 1, startTime: '9:00', endTime: '08:50', isBreak: false },
    ];
    const result = TimeGridSchema.safeParse({
      periods: bad,
      schoolDays,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('HH:MM erwartet');
    }
  });

  it('rejects empty schoolDays array', () => {
    const result = TimeGridSchema.safeParse({
      periods: sixPeriods,
      schoolDays: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty periods array', () => {
    const result = TimeGridSchema.safeParse({
      periods: [],
      schoolDays,
    });
    expect(result.success).toBe(false);
  });
});
