import { describe, it, expect } from 'vitest';
import { AUSTRIAN_STUNDENTAFELN, type StundentafelTemplate } from './austrian-stundentafeln.js';

describe('AUSTRIAN_STUNDENTAFELN', () => {
  it('contains templates for AHS_UNTER years 1-4', () => {
    const ahsYears = AUSTRIAN_STUNDENTAFELN
      .filter((t) => t.schoolType === 'AHS_UNTER')
      .map((t) => t.yearLevel)
      .sort();
    expect(ahsYears).toContain(1);
    expect(ahsYears).toContain(4);
  });

  it('contains templates for MS years 1-4', () => {
    const msYears = AUSTRIAN_STUNDENTAFELN
      .filter((t) => t.schoolType === 'MS')
      .map((t) => t.yearLevel)
      .sort();
    expect(msYears).toEqual([1, 2, 3, 4]);
  });

  it('each template totalWeeklyHours equals sum of subject weeklyHours', () => {
    for (const t of AUSTRIAN_STUNDENTAFELN) {
      const sum = t.subjects.reduce((a, s) => a + s.weeklyHours, 0);
      expect(sum).toBe(t.totalWeeklyHours);
    }
  });

  it('each subject has a non-empty shortName and a valid lehrverpflichtungsgruppe', () => {
    const VALID_LVG = ['I', 'II', 'III', 'IV', 'IVa', 'IVb', 'V', 'Va', 'VI'];
    for (const t of AUSTRIAN_STUNDENTAFELN) {
      for (const s of t.subjects) {
        expect(s.shortName.length).toBeGreaterThan(0);
        expect(VALID_LVG).toContain(s.lehrverpflichtungsgruppe);
      }
    }
  });

  it('exports the StundentafelTemplate type shape', () => {
    // Type-level verification via runtime shape check
    const t: StundentafelTemplate = AUSTRIAN_STUNDENTAFELN[0];
    expect(t).toHaveProperty('schoolType');
    expect(t).toHaveProperty('yearLevel');
    expect(t).toHaveProperty('displayName');
    expect(t).toHaveProperty('subjects');
    expect(t).toHaveProperty('totalWeeklyHours');
  });
});
