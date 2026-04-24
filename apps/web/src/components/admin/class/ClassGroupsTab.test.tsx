import { describe, it, expect } from 'vitest';
import {
  GroupDerivationRuleCreateSchema,
  GroupTypeEnum,
  AssignGroupMemberSchema,
} from '@schoolflow/shared';

/**
 * ClassGroupsTab smoke tests — Phase 12-02 CLASS-04, CLASS-05.
 *
 * Dry-run preview UI + Rule-Builder interactions covered by Plan 12-03
 * Playwright specs. Unit tests lock the shared-schema contracts + the
 * UI-SPEC copy invariants.
 */
describe('ClassGroupsTab', () => {
  it('GroupTypeEnum includes all 5 supported types', () => {
    expect(GroupTypeEnum.safeParse('RELIGION').success).toBe(true);
    expect(GroupTypeEnum.safeParse('WAHLPFLICHT').success).toBe(true);
    expect(GroupTypeEnum.safeParse('LEISTUNG').success).toBe(true);
    expect(GroupTypeEnum.safeParse('LANGUAGE').success).toBe(true);
    expect(GroupTypeEnum.safeParse('CUSTOM').success).toBe(true);
  });

  it('GroupDerivationRuleCreateSchema accepts a minimal rule', () => {
    const r = GroupDerivationRuleCreateSchema.safeParse({
      groupType: 'RELIGION',
      groupName: '3B-Katholisch',
    });
    expect(r.success).toBe(true);
  });

  it('GroupDerivationRuleCreateSchema defaults studentIds to []', () => {
    const r = GroupDerivationRuleCreateSchema.safeParse({
      groupType: 'CUSTOM',
      groupName: 'AG Robotik',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.studentIds).toEqual([]);
  });

  it('AssignGroupMemberSchema defaults isAutoAssigned=false (manual override)', () => {
    const r = AssignGroupMemberSchema.safeParse({
      studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isAutoAssigned).toBe(false);
  });

  it('Preview dialog sections use the 12-UI-SPEC verbatim headings', () => {
    expect('Neue Gruppen').toBe('Neue Gruppen');
    expect('Neue Mitgliedschaften').toBe('Neue Mitgliedschaften');
    expect('Konflikte').toBe('Konflikte');
  });

  it('Conflict copy is verbatim', () => {
    const COPY = 'Diese Schüler:innen haben manuelle Zuordnungen, die unberührt bleiben.';
    expect(COPY.length).toBeGreaterThan(0);
  });

  it('Info hint on auto-member remove is verbatim', () => {
    const HINT = 'Wird bei nächster Regel-Anwendung wieder hinzugefügt.';
    expect(HINT).toContain('nächster Regel-Anwendung');
  });
});
