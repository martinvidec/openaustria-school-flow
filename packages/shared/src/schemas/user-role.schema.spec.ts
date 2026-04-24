import { describe, it, expect } from 'vitest';
import { updateUserRolesSchema } from './user-role.schema.js';

describe('updateUserRolesSchema', () => {
  it('accepts an empty array (used to clear all roles)', () => {
    expect(updateUserRolesSchema.safeParse({ roleNames: [] }).success).toBe(true);
  });

  it('accepts up to 5 non-empty role names', () => {
    const result = updateUserRolesSchema.safeParse({
      roleNames: ['admin', 'schulleitung', 'lehrer', 'eltern', 'schueler'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects more than 5 role names', () => {
    const result = updateUserRolesSchema.safeParse({
      roleNames: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty-string role names', () => {
    const result = updateUserRolesSchema.safeParse({ roleNames: [''] });
    expect(result.success).toBe(false);
  });

  it('rejects a non-array roleNames value', () => {
    const result = updateUserRolesSchema.safeParse({ roleNames: 'admin' });
    expect(result.success).toBe(false);
  });
});
