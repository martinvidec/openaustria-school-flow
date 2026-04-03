import { describe, it, expect } from 'vitest';
import {
  calculateWeightedAverage,
  formatGradeDisplay,
  parseGradeInput,
  VALID_GRADE_VALUES,
} from '../grade-average.util';

describe('grade-average.util', () => {
  describe('calculateWeightedAverage', () => {
    it('should calculate weighted average for all three categories', () => {
      const grades = [
        { value: 1.0, category: 'SCHULARBEIT' as const },
        { value: 2.0, category: 'MUENDLICH' as const },
        { value: 3.0, category: 'MITARBEIT' as const },
      ];
      const weights = { schularbeitPct: 40, muendlichPct: 30, mitarbeitPct: 30 };
      expect(calculateWeightedAverage(grades, weights)).toBe(1.9);
    });

    it('should return null for empty grades array', () => {
      const weights = { schularbeitPct: 40, muendlichPct: 30, mitarbeitPct: 30 };
      expect(calculateWeightedAverage([], weights)).toBeNull();
    });

    it('should handle categories with no grades (skip missing categories)', () => {
      // Only SCHULARBEIT grades -- re-normalize to 100% SCHULARBEIT
      const grades = [
        { value: 2.0, category: 'SCHULARBEIT' as const },
        { value: 3.0, category: 'SCHULARBEIT' as const },
      ];
      const weights = { schularbeitPct: 40, muendlichPct: 30, mitarbeitPct: 30 };
      // Average of SCHULARBEIT = (2.0 + 3.0) / 2 = 2.5
      // Re-normalized: only SCHULARBEIT exists, weight becomes 100%
      // Result: 2.5
      expect(calculateWeightedAverage(grades, weights)).toBe(2.5);
    });
  });

  describe('formatGradeDisplay', () => {
    it('should format 1.75 as "2+"', () => {
      expect(formatGradeDisplay(1.75)).toBe('2+');
    });

    it('should format 2.25 as "2-"', () => {
      expect(formatGradeDisplay(2.25)).toBe('2-');
    });

    it('should format 3.0 as "3"', () => {
      expect(formatGradeDisplay(3.0)).toBe('3');
    });

    it('should format 0.75 as "1+"', () => {
      expect(formatGradeDisplay(0.75)).toBe('1+');
    });

    it('should format 5.25 as "5-"', () => {
      expect(formatGradeDisplay(5.25)).toBe('5-');
    });
  });

  describe('parseGradeInput', () => {
    it('should parse "2+" to 1.75', () => {
      expect(parseGradeInput('2+')).toBe(1.75);
    });

    it('should parse "3" to 3.0', () => {
      expect(parseGradeInput('3')).toBe(3.0);
    });

    it('should return null for "invalid"', () => {
      expect(parseGradeInput('invalid')).toBeNull();
    });
  });

  describe('VALID_GRADE_VALUES', () => {
    it('should contain exactly 15 values (0.75 through 5.25)', () => {
      expect(VALID_GRADE_VALUES).toHaveLength(15);
      expect([...VALID_GRADE_VALUES]).toEqual([
        0.75, 1.0, 1.25, 1.75, 2.0, 2.25, 2.75, 3.0, 3.25, 3.75, 4.0, 4.25, 4.75, 5.0, 5.25,
      ]);
    });
  });
});
