import { describe, it, expect } from 'vitest';
import { AssignParentSchema, UnlinkParentSchema } from './assign-parent.schema.js';

const validUuid = '11111111-1111-4111-8111-111111111111';

describe('AssignParentSchema', () => {
  it('accepts a valid parentId', () => {
    expect(AssignParentSchema.safeParse({ parentId: validUuid }).success).toBe(true);
  });

  it('rejects missing parentId', () => {
    expect(AssignParentSchema.safeParse({}).success).toBe(false);
  });

  it('rejects non-UUID parentId with "Ungültige Eltern-ID"', () => {
    const result = AssignParentSchema.safeParse({ parentId: 'not-a-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Ungültige Eltern-ID');
    }
  });
});

describe('UnlinkParentSchema', () => {
  it('accepts valid studentId + parentId', () => {
    const result = UnlinkParentSchema.safeParse({
      studentId: validUuid,
      parentId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects when studentId missing', () => {
    expect(UnlinkParentSchema.safeParse({ parentId: validUuid }).success).toBe(false);
  });

  it('rejects non-UUID studentId', () => {
    expect(
      UnlinkParentSchema.safeParse({ studentId: 'nope', parentId: validUuid }).success,
    ).toBe(false);
  });
});
