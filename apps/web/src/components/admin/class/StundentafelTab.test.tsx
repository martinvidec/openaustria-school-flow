import { describe, it } from 'vitest';

describe('StundentafelTab', () => {
  it.todo(
    'renders empty state with CTA "Stundentafel aus Vorlage übernehmen" when zero ClassSubjects',
  );
  it.todo(
    'ApplyStundentafelDialog shows Schultyp dropdown default=School.type + yearLevel readout + read-only preview-table from @schoolflow/shared',
  );
  it.todo('Confirm applies template and renders editable table of ClassSubject rows');
  it.todo('editing weeklyHours flips isCustomized=true and shows amber Angepasst badge');
  it.todo('"+ Fach hinzufügen" appends row via Subject-Combobox; new row defaults weeklyHours=0');
  it.todo('Delete-Row icon removes row from local state and queues DELETE on next save');
  it.todo(
    '"Auf Vorlage zurücksetzen" opens WarnDialog with destructive copy verbatim from 12-UI-SPEC.md and on confirm calls POST /classes/:id/reset-stundentafel',
  );
  it.todo('mobile <640px collapses to stacked Cards with tabular-nums weeklyHours input');
});
