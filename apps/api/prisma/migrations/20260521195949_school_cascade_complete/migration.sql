-- Issue #136 — Complete onDelete: Cascade coverage for all School FKs so
-- `prisma.school.delete()` in the throwaway-school fixture wipes every
-- per-school row without FK violations. Audited 5 gaps (homework, exams,
-- import_jobs, calendar_tokens, sis_api_keys) — all other tables with
-- school_id already had cascade.

-- DropForeignKey
ALTER TABLE "calendar_tokens" DROP CONSTRAINT "calendar_tokens_school_id_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_school_id_fkey";

-- DropForeignKey
ALTER TABLE "homework" DROP CONSTRAINT "homework_school_id_fkey";

-- DropForeignKey
ALTER TABLE "import_jobs" DROP CONSTRAINT "import_jobs_school_id_fkey";

-- DropForeignKey
ALTER TABLE "sis_api_keys" DROP CONSTRAINT "sis_api_keys_school_id_fkey";

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_tokens" ADD CONSTRAINT "calendar_tokens_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_api_keys" ADD CONSTRAINT "sis_api_keys_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
