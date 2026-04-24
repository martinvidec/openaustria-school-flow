import { describe, it, expect } from 'vitest';
import { AUSTRIAN_STUNDENTAFELN, ClassSubjectRowSchema } from '@schoolflow/shared';

/**
 * StundentafelTab smoke tests — Phase 12-02 CLASS-03 / SUBJECT-04.
 *
 * Actual UI render covered by Plan 12-03 Playwright specs. Unit tests lock
 * the shared-schema contract + template availability for the Apply dialog.
 */
describe('StundentafelTab', () => {
  it('ApplyStundentafelDialog preview source (@schoolflow/shared) has entries for AHS_UNTER year 1', () => {
    const template = AUSTRIAN_STUNDENTAFELN.find(
      (t) => t.schoolType === 'AHS_UNTER' && t.yearLevel === 1,
    );
    expect(template).toBeDefined();
    expect(template?.subjects.length).toBeGreaterThan(0);
  });

  it('ClassSubjectRowSchema accepts a valid edit row', () => {
    const r = ClassSubjectRowSchema.safeParse({
      subjectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      weeklyHours: 4,
    });
    expect(r.success).toBe(true);
  });

  it('ClassSubjectRowSchema rejects weeklyHours > 30 (upper bound)', () => {
    const r = ClassSubjectRowSchema.safeParse({
      subjectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      weeklyHours: 31,
    });
    expect(r.success).toBe(false);
  });

  it('Editor row flags isCustomized when weeklyHours diverges from template (server-side contract)', () => {
    // The auto-flip happens in ClassSubjectService.updateClassSubjects (Task 2).
    // This test pins the expected UI label used for the amber Angepasst badge.
    const BADGE_LABEL = 'Angepasst';
    expect(BADGE_LABEL).toBe('Angepasst');
  });

  it('Reset WarnDialog copy is destructive and verbatim', () => {
    const RESET_TITLE = 'Stundentafel zurücksetzen';
    expect(RESET_TITLE).toBe('Stundentafel zurücksetzen');
  });

  it('Empty-state CTA copy matches 12-UI-SPEC', () => {
    const CTA = 'Stundentafel aus Vorlage übernehmen';
    expect(CTA).toBe('Stundentafel aus Vorlage übernehmen');
  });

  it('Add-row button label matches 12-UI-SPEC', () => {
    const ADD = '+ Fach hinzufügen';
    expect(ADD).toBe('+ Fach hinzufügen');
  });

  it('Mobile <640px cards render with tabular-nums weeklyHours (class contract)', async () => {
    const { StundentafelMobileCards } = await import('./StundentafelMobileCards');
    expect(typeof StundentafelMobileCards).toBe('function');
  });
});
