import { describe, it } from 'vitest';

/**
 * Wave 0 TDD stubs — Phase 12-01 Plan Task 1.
 */
describe('StudentParentsTab', () => {
  it.todo(
    'renders empty-state "Keine Erziehungsberechtigten verknüpft" with CTA Erziehungsberechtigte:n verknüpfen',
  );
  it.todo('ParentSearchPopover debounces email input 300ms before firing useParentsByEmail');
  it.todo(
    'on 404 no-match shows "Keine Treffer. Neu:e Erziehungsberechtigte:n anlegen?" + inline-create CTA',
  );
  it.todo('on 200 match shows user-row with CircleCheck and Enter triggers link-confirm dialog');
  it.todo(
    'InlineCreateParentForm with firstName+lastName+email+phone submit creates parent + links in single request, toast success',
  );
  it.todo(
    'Unlink button opens WarnDialog "Verknüpfung entfernen?" with copy matching 12-UI-SPEC.md verbatim; confirms and calls DELETE /students/:id/parents/:parentId',
  );
  it.todo(
    'after unlink Parent row disappears but Parent record preserved (no 204 to DELETE /parents/:id issued)',
  );
});
