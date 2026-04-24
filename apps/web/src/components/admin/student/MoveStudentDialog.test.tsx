import { describe, it } from 'vitest';

/**
 * Wave 0 TDD stubs — Phase 12-01 Plan Task 1.
 */
describe('MoveStudentDialog', () => {
  it.todo('mode="single" renders single-student heading, class-picker and Notiz textarea');
  it.todo(
    'mode="bulk" renders avatar-stack preview of selection (max 5 visible + "+N weitere") and plural heading',
  );
  it.todo('blocks Verschieben button until targetClassId is selected (zodResolver MoveStudentSchema)');
  it.todo('bulk apply runs sequential PUT /students/:id with progress counter "{done}/{total}"');
  it.todo(
    'on 4xx error during bulk stops at current index and shows toast "{done}/{total} verschoben. Fehler bei {name}."',
  );
  it.todo(
    'Silent-4xx invariant: explicit onError fires toast, never swallows via .catch(()=>{})',
  );
});
