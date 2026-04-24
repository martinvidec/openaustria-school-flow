import { describe, it, expect } from 'vitest';
import { keycloakUserQuerySchema } from './keycloak-user-query.schema.js';

describe('keycloakUserQuerySchema', () => {
  it('applies defaults when the payload is empty', () => {
    const result = keycloakUserQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
      expect(result.data.linked).toBe('all');
      expect(result.data.enabled).toBe('all');
    }
  });

  it('coerces string page+limit values (URL query semantics)', () => {
    const result = keycloakUserQuerySchema.safeParse({ page: '3', limit: '100' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(100);
    }
  });

  it('rejects limit above 500', () => {
    const result = keycloakUserQuerySchema.safeParse({ limit: 501 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid linked enum value', () => {
    const result = keycloakUserQuerySchema.safeParse({ linked: 'maybe' });
    expect(result.success).toBe(false);
  });

  it('accepts a role array filter', () => {
    const result = keycloakUserQuerySchema.safeParse({
      role: ['admin', 'lehrer'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toEqual(['admin', 'lehrer']);
    }
  });
});
