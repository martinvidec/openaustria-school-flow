-- Issue #137 — Throwaway-school cleanup discovered a "diamond" cascade
-- gap: School deletion cascades to BOTH the school_classes / class_subjects
-- chain AND directly to exams + homework (post-#136). PostgreSQL processes
-- these cascades non-deterministically, so when the SchoolClass branch
-- fires first it tries to delete the class while exams.class_id (RESTRICT)
-- still references the not-yet-cascaded exam row → FK violation.
--
-- Fix: make exams + homework cascade-delete via their class / class_subject
-- parents too, so any order PG picks for the diamond resolves cleanly.
-- Semantic intent matches: deleting a SchoolClass or ClassSubject already
-- implies its exams + homework are obsolete (no academic schedule to
-- attach them to).

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_class_id_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_class_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "homework" DROP CONSTRAINT "homework_class_subject_id_fkey";

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
