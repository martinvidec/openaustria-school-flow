import { describe, it } from 'vitest';

describe('ClassStammdatenTab', () => {
  it.todo(
    'renders name/yearLevel/schoolYear inputs; yearLevel+schoolYear are read-only when detail is in edit mode',
  );
  it.todo('TeacherSearchPopover opens on Klassenvorstand picker and debounces search 300ms');
  it.todo('Clear-Icon on Klassenvorstand submits klassenvorstandId=null via PUT /classes/:id');
  it.todo('SolverReRunBanner visible after any save');
  it.todo('blocks submit when name is empty via zodResolver Pflichtfeld');
});
