import { describe, it, expect } from 'vitest';
import { linkPersonSchema } from './person-link.schema.js';

describe('linkPersonSchema', () => {
  it('accepts TEACHER personType with non-empty personId', () => {
    const result = linkPersonSchema.safeParse({
      personType: 'TEACHER',
      personId: 'person-1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts STUDENT personType', () => {
    const result = linkPersonSchema.safeParse({
      personType: 'STUDENT',
      personId: 'person-2',
    });
    expect(result.success).toBe(true);
  });

  it('accepts PARENT personType', () => {
    const result = linkPersonSchema.safeParse({
      personType: 'PARENT',
      personId: 'person-3',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown personType', () => {
    const result = linkPersonSchema.safeParse({
      personType: 'ADMIN',
      personId: 'person-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty personId', () => {
    const result = linkPersonSchema.safeParse({
      personType: 'TEACHER',
      personId: '',
    });
    expect(result.success).toBe(false);
  });
});
