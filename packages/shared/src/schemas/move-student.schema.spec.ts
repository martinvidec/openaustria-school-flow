import { describe, it, expect } from 'vitest';
import { MoveStudentSchema, BulkMoveStudentSchema } from './move-student.schema.js';

const validUuid = '11111111-1111-4111-8111-111111111111';
const validUuid2 = '22222222-2222-4222-8222-222222222222';

describe('MoveStudentSchema', () => {
  it('accepts a valid single move payload', () => {
    expect(MoveStudentSchema.safeParse({ targetClassId: validUuid }).success).toBe(true);
  });

  it('accepts optional notiz', () => {
    expect(
      MoveStudentSchema.safeParse({ targetClassId: validUuid, notiz: 'Wechsel Pro Tag X' })
        .success,
    ).toBe(true);
  });

  it('rejects missing targetClassId with "Bitte Ziel-Klasse auswählen"', () => {
    const result = MoveStudentSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        'Bitte Ziel-Klasse auswählen',
      );
    }
  });

  it('rejects notiz > 500 chars', () => {
    const result = MoveStudentSchema.safeParse({
      targetClassId: validUuid,
      notiz: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID targetClassId', () => {
    expect(MoveStudentSchema.safeParse({ targetClassId: 'nope' }).success).toBe(false);
  });
});

describe('BulkMoveStudentSchema', () => {
  it('accepts a valid bulk move payload', () => {
    const result = BulkMoveStudentSchema.safeParse({
      studentIds: [validUuid, validUuid2],
      targetClassId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty studentIds with "Keine Schüler:innen ausgewählt"', () => {
    const result = BulkMoveStudentSchema.safeParse({
      studentIds: [],
      targetClassId: validUuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        'Keine Schüler:innen ausgewählt',
      );
    }
  });

  it('rejects non-UUID entry in studentIds', () => {
    const result = BulkMoveStudentSchema.safeParse({
      studentIds: ['not-a-uuid'],
      targetClassId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional notiz', () => {
    const result = BulkMoveStudentSchema.safeParse({
      studentIds: [validUuid],
      targetClassId: validUuid,
      notiz: 'Massen-Umzug',
    });
    expect(result.success).toBe(true);
  });
});
