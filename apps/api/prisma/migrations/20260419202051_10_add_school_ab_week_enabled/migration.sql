-- Phase 10 Plan 01a -- Migration 1/2 -- D-04 SCHOOL-04
-- Add School.abWeekEnabled as the per-school default for new TimetableRuns.
-- New rows default to false (A/B weeks disabled). Existing rows inherit
-- the default via NOT NULL DEFAULT, no backfill required.

-- AlterTable
ALTER TABLE "schools" ADD COLUMN "ab_week_enabled" BOOLEAN NOT NULL DEFAULT false;
