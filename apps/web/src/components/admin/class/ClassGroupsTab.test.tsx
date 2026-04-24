import { describe, it } from 'vitest';

describe('ClassGroupsTab', () => {
  it.todo(
    'GroupRuleBuilderTable renders rows with Typ/Name/Level/StudentFilter/Delete + "+ Regel hinzufügen" + "Regeln anwenden"',
  );
  it.todo(
    '"Regeln anwenden" opens ApplyRulesPreviewDialog with dry-run preview sections (new groups, new memberships, conflicts)',
  );
  it.todo(
    'Confirm in preview dialog triggers POST /groups/apply-rules/:classId and refreshes group overrides panel',
  );
  it.todo('GroupOverridesPanel renders expandable Cards per Group with Auto/Manuell badges');
  it.todo('Add-Student Combobox in group adds membership with isAutoAssigned=false (manual override)');
  it.todo(
    'Remove auto-assigned membership shows Info-Hinweis "Wird bei nächster Regel-Anwendung wieder hinzugefügt."',
  );
  it.todo(
    'CRUD rule operations round-trip via GET/POST/PUT/DELETE /classes/:classId/derivation-rules',
  );
});
