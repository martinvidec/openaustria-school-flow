-- Phase 13-01 Task 1: add updated_at + reason to permission_overrides.
--
-- updated_at uses DEFAULT CURRENT_TIMESTAMP so existing rows backfill to now()
-- and Prisma's @updatedAt semantics (application-level updates on write) take
-- over for subsequent writes. reason is nullable text (admin can skip on
-- legacy imports; fresh writes validate via Zod permission-override schema).
--
-- AlterTable
ALTER TABLE "permission_overrides" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "permission_overrides" ADD COLUMN "reason" TEXT;
