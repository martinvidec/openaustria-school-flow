import { describe, it, expect } from 'vitest';
import { AssignGroupMemberSchema } from './group-membership.schema.js';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('AssignGroupMemberSchema', () => {
  it('accepts minimal valid payload and defaults isAutoAssigned=false', () => {
    const result = AssignGroupMemberSchema.safeParse({ studentId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAutoAssigned).toBe(false);
    }
  });

  it('accepts explicit isAutoAssigned=true', () => {
    const result = AssignGroupMemberSchema.safeParse({
      studentId: VALID_UUID,
      isAutoAssigned: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid studentId with "Ungültige Schüler-ID"', () => {
    const result = AssignGroupMemberSchema.safeParse({ studentId: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain('Ungültige Schüler-ID');
    }
  });

  it('rejects missing studentId', () => {
    const result = AssignGroupMemberSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean isAutoAssigned', () => {
    const result = AssignGroupMemberSchema.safeParse({
      studentId: VALID_UUID,
      isAutoAssigned: 'yes',
    });
    expect(result.success).toBe(false);
  });
});
