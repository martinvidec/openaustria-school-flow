import { describe, it } from 'vitest';

/**
 * Wave 0 TDD stubs — Phase 11 Plan 11-02 SUBJECT-02.
 * Real assertions land in Plan 11-03 (E2E sweep + FE spec lift) per the
 * Phase 4/6/7 Nyquist TDD pattern used in 11-01.
 */
describe('SubjectFormDialog', () => {
  it.todo('renders Name + Kürzel fields and hides Farbe field (post-research descope)');
  it.todo('auto-transforms Kürzel to uppercase on blur');
  it.todo('shows inline "Dieses Kürzel ist bereits vergeben." error on 409 response');
  it.todo('shows color-palette info note referring to future phase');
  it.todo('disables Speichern until Zod-valid');
});
