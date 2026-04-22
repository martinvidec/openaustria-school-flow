import { describe, it, expect } from 'vitest';
import {
  TeachingReductionSchema,
  ReductionTypeEnum,
} from './teaching-reduction.schema.js';

describe('TeachingReductionSchema', () => {
  it('accepts a Kustodiat reduction', () => {
    const result = TeachingReductionSchema.safeParse({
      reductionType: 'KUSTODIAT',
      werteinheiten: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative Werteinheiten with "Wert muss >= 0 sein"', () => {
    const result = TeachingReductionSchema.safeParse({
      reductionType: 'KLASSENVORSTAND',
      werteinheiten: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Wert muss >= 0 sein');
    }
  });

  it('rejects OTHER without description with "Anmerkung ist bei \\"Sonstiges\\" erforderlich"', () => {
    const result = TeachingReductionSchema.safeParse({
      reductionType: 'OTHER',
      werteinheiten: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Anmerkung ist bei "Sonstiges" erforderlich');
    }
  });

  it('accepts OTHER with description', () => {
    const result = TeachingReductionSchema.safeParse({
      reductionType: 'OTHER',
      werteinheiten: 1,
      description: 'Sonderaufgabe Personalrat',
    });
    expect(result.success).toBe(true);
  });

  it('rejects description > 120 chars', () => {
    const result = TeachingReductionSchema.safeParse({
      reductionType: 'KUSTODIAT',
      werteinheiten: 1,
      description: 'x'.repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid reductionType', () => {
    const result = TeachingReductionSchema.safeParse({
      reductionType: 'SONSTIGES',
      werteinheiten: 1,
    });
    expect(result.success).toBe(false);
  });

  it('ReductionTypeEnum exposes 6 backend enum values', () => {
    const cases = [
      'KUSTODIAT',
      'KLASSENVORSTAND',
      'MENTOR',
      'PERSONALVERTRETUNG',
      'ADMINISTRATION',
      'OTHER',
    ];
    for (const c of cases) {
      expect(ReductionTypeEnum.safeParse(c).success).toBe(true);
    }
  });
});
