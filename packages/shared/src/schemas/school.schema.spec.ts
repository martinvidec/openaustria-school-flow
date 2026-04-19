import { describe, it, expect } from 'vitest';
import { SchoolDetailsSchema, SchoolTypeEnum } from './school.schema';

describe('SchoolDetailsSchema', () => {
  const valid = {
    name: 'BG Wien',
    schoolType: 'AHS' as const,
    address: { street: 'Rahlgasse 4', zip: '1060', city: 'Wien' },
  };

  it('accepts a valid Austrian school record', () => {
    const result = SchoolDetailsSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts a valid German PLZ (5 digits)', () => {
    const result = SchoolDetailsSchema.safeParse({
      ...valid,
      address: { ...valid.address, zip: '80331' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name with German message "Name erforderlich"', () => {
    const result = SchoolDetailsSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('Name erforderlich');
    }
  });

  it('rejects PLZ "abc" with "PLZ muss 4 oder 5 Ziffern haben"', () => {
    const result = SchoolDetailsSchema.safeParse({
      ...valid,
      address: { ...valid.address, zip: 'abc' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain('PLZ muss 4 oder 5 Ziffern haben');
    }
  });

  it('rejects an unknown schoolType "XYZ"', () => {
    const result = SchoolDetailsSchema.safeParse({
      ...valid,
      schoolType: 'XYZ',
    });
    expect(result.success).toBe(false);
  });

  it('SchoolTypeEnum exposes all 7 Austrian school types', () => {
    const cases = ['VS', 'NMS', 'AHS', 'BHS', 'BMS', 'PTS', 'ASO'];
    for (const c of cases) {
      expect(SchoolTypeEnum.safeParse(c).success).toBe(true);
    }
  });
});
