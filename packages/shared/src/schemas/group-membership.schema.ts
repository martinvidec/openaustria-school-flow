import { z } from 'zod';

/**
 * GroupMembership schemas — Phase 12-02 (CLASS-04, D-11).
 *
 * Manual group-member override payloads (GroupOverridesPanel).
 * UI always creates manual memberships with isAutoAssigned=false.
 */

export const AssignGroupMemberSchema = z.object({
  studentId: z.string().uuid('Ungültige Schüler-ID'),
  isAutoAssigned: z.boolean().default(false),
});

export type AssignGroupMemberInput = z.infer<typeof AssignGroupMemberSchema>;
