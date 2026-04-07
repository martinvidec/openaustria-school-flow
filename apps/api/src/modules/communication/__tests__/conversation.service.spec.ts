import { describe, it } from 'vitest';

describe('ConversationService', () => {
  // COMM-01: Broadcast messaging
  it.todo('creates a CLASS-scoped conversation with scope expansion to students, parents, and teachers');
  it.todo('creates a YEAR_GROUP-scoped conversation expanding to all classes in that year level');
  it.todo('creates a SCHOOL-scoped conversation expanding to all persons with keycloakUserId');
  it.todo('populates ConversationMember rows for all expanded recipients');
  // COMM-02: Direct messages
  it.todo('creates a DIRECT conversation with directPairKey dedup (sorted userId pair)');
  it.todo('returns existing DIRECT conversation if directPairKey already exists');
  // RBAC
  it.todo('rejects CLASS broadcast from teacher not assigned to that class');
  it.todo('rejects YEAR_GROUP/SCHOOL broadcast from non-admin/schulleitung role');
});
