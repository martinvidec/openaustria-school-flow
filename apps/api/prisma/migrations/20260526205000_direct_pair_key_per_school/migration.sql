-- Issue #150 — scope DIRECT conversation `direct_pair_key` per school.
--
-- Pre-#150 the column had a global UNIQUE constraint, which broke any
-- deployment where a user has Person memberships in multiple schools:
-- the first DIRECT conversation between two such users in school A
-- blocked a second DIRECT conversation between the same pair in school
-- B, and ConversationService.createDirect's find-or-create silently
-- aliased every subsequent attempt back to school A's conversation.
--
-- The composite unique (school_id, direct_pair_key) restores per-tenant
-- isolation. NULL direct_pair_key values (every non-DIRECT row) remain
-- unconstrained because Postgres treats NULL as distinct in unique
-- indexes by default.

-- DropIndex
DROP INDEX "conversations_direct_pair_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "conversations_school_id_direct_pair_key_key" ON "conversations"("school_id", "direct_pair_key");
