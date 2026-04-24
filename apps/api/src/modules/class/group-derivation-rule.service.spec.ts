import { describe, it } from 'vitest';

// Phase 12-02 Wave 0 stubs — turned green in Task 2 alongside
// `GroupDerivationRuleService`.

describe('GroupDerivationRuleService', () => {
  describe('create', () => {
    it.todo('persists a rule with classId + groupType + groupName + optional level');
    it.todo('defaults studentIds to [] when omitted');
  });

  describe('findByClass', () => {
    it.todo('returns ordered list for classId ordered by createdAt asc');
  });

  describe('update', () => {
    it.todo('throws NotFoundException when ruleId is unknown');
    it.todo('preserves existing studentIds when dto omits them');
  });

  describe('remove', () => {
    it.todo('deletes the rule by id');
  });

  describe('cascade-delete', () => {
    it.todo('deleted when parent SchoolClass is removed (Prisma onDelete:Cascade)');
  });
});
