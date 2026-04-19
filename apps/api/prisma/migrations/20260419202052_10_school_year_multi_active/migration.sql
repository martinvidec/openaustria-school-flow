-- Phase 10 Plan 01a -- Migration 2/2 -- D-07 SCHOOL-03
-- Enable plural school years per school with a partial unique invariant:
-- at most one SchoolYear row may be isActive=true per schoolId.
-- Prisma 7's schema language cannot express a WHERE clause on @@unique, so
-- the partial index is declared in raw SQL here.

-- DropConstraint / DropIndex (existing @unique on school_id)
ALTER TABLE "school_years" DROP CONSTRAINT IF EXISTS "school_years_school_id_key";
DROP INDEX IF EXISTS "school_years_school_id_key";

-- AddColumn isActive
ALTER TABLE "school_years" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: every existing row becomes the active year for its school
-- (safe because schoolId WAS unique pre-migration, so at most one row per school)
UPDATE "school_years" SET "is_active" = true;

-- CreateIndex non-unique lookup
CREATE INDEX "school_years_school_id_idx" ON "school_years" ("school_id");

-- CreateIndex partial unique (Prisma 7 schema cannot express WHERE clauses;
-- raw SQL is the only path -- see Phase 10 RESEARCH §1.2)
CREATE UNIQUE INDEX "school_years_active_per_school"
  ON "school_years" ("school_id") WHERE "is_active" = true;
