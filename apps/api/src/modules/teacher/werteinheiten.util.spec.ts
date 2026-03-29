import { describe, it, expect } from 'vitest';
import {
  calculateWerteinheiten,
  calculateMaxTeachingHours,
  LEHRVERPFLICHTUNGSGRUPPEN,
} from './werteinheiten.util';

describe('Werteinheiten', () => {
  describe('LEHRVERPFLICHTUNGSGRUPPEN', () => {
    it('has all 9 Lehrverpflichtungsgruppen keys', () => {
      const expectedKeys = ['I', 'II', 'III', 'IV', 'IVa', 'IVb', 'V', 'Va', 'VI'];
      expect(Object.keys(LEHRVERPFLICHTUNGSGRUPPEN).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('calculateWerteinheiten', () => {
    it('calculates Gruppe I: 4 hours * 1.167 = 4.668', () => {
      expect(calculateWerteinheiten(4, 'I')).toBeCloseTo(4.668, 3);
    });

    it('calculates Gruppe II: 4 hours * 1.105 = 4.42', () => {
      expect(calculateWerteinheiten(4, 'II')).toBeCloseTo(4.42, 3);
    });

    it('calculates Gruppe III: 2 hours * 1.050 = 2.1', () => {
      expect(calculateWerteinheiten(2, 'III')).toBeCloseTo(2.1, 3);
    });

    it('calculates Gruppe IVa: 4 hours * 0.955 = 3.82', () => {
      expect(calculateWerteinheiten(4, 'IVa')).toBeCloseTo(3.82, 3);
    });

    it('throws for unknown Lehrverpflichtungsgruppe', () => {
      expect(() => calculateWerteinheiten(4, 'X')).toThrow();
    });
  });

  describe('calculateMaxTeachingHours', () => {
    it('returns target when no reductions', () => {
      expect(calculateMaxTeachingHours(20, [])).toBe(20);
    });

    it('subtracts multiple reductions from target', () => {
      expect(
        calculateMaxTeachingHours(20, [{ werteinheiten: 2 }, { werteinheiten: 1 }]),
      ).toBe(17);
    });

    it('handles part-time target with reductions', () => {
      expect(
        calculateMaxTeachingHours(16, [{ werteinheiten: 3 }]),
      ).toBe(13);
    });
  });
});
