import { describe, it } from 'vitest';

/**
 * Wave 0 TDD stubs — Phase 11 Plan 11-02 SUBJECT-03.
 * Real assertions land in Plan 11-03 (E2E sweep + FE spec lift).
 */
describe('StundentafelVorlagenSection', () => {
  it.todo('renders one Tab per Schultyp using SCHOOL_TYPES_LABELS for labels');
  it.todo('reads AUSTRIAN_STUNDENTAFELN from @schoolflow/shared (not apps/api path)');
  it.todo('renders Table with columns Fach | Kürzel | Jg. 1 | Jg. 2 | Jg. 3 | Jg. 4 and footer totals');
  it.todo('footer shows "Wochenstunden gesamt pro Jahrgang: {a} · {b} · {c} · {d}"');
  it.todo('table is read-only (no inputs, no action buttons)');
});
