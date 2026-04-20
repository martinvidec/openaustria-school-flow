-- Phases 3-9 consolidated baseline.
--
-- History: Phases 3-9 evolved the schema incrementally via `prisma db push`
-- (no migration files recorded). This single migration captures the entire
-- delta between the Phase-2 baseline and the schema state that existed at
-- the end of Phase 9, just before Phase 10's two incremental migrations.
--
-- Generated via (orchestrator, 2026-04-20):
--   prisma migrate diff \
--     --from-migrations prisma/migrations \
--     --to-schema prisma/schema.prisma \
--     --script
--
-- (with phase-10 migrations temporarily moved aside and phase-10 schema
--  additions temporarily rolled back so the diff captured ONLY phases 3-9.)
--
-- Going forward, ALL schema changes MUST ship as migration files via
-- `prisma migrate dev`. Do NOT use `prisma db push` on this project.
-- See CLAUDE.md §Database migrations for the guardrail.

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('KLASSENZIMMER', 'TURNSAAL', 'EDV_RAUM', 'WERKRAUM', 'LABOR', 'MUSIKRAUM');

-- CreateEnum
CREATE TYPE "SolveStatus" AS ENUM ('QUEUED', 'SOLVING', 'COMPLETED', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "GradeCategory" AS ENUM ('SCHULARBEIT', 'MUENDLICH', 'MITARBEIT');

-- CreateEnum
CREATE TYPE "ExcuseStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExcuseReason" AS ENUM ('KRANK', 'ARZTTERMIN', 'FAMILIAER', 'SONSTIG');

-- CreateEnum
CREATE TYPE "AbsenceReason" AS ENUM ('KRANK', 'FORTBILDUNG', 'DIENSTREISE', 'SCHULVERANSTALTUNG', 'ARZTTERMIN', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SubstitutionType" AS ENUM ('SUBSTITUTED', 'ENTFALL', 'STILLARBEIT');

-- CreateEnum
CREATE TYPE "SubstitutionStatus" AS ENUM ('PENDING', 'OFFERED', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SUBSTITUTION_OFFER', 'SUBSTITUTION_CONFIRMED', 'SUBSTITUTION_DECLINED', 'ABSENCE_RECORDED', 'LESSON_CANCELLED', 'STILLARBEIT_ASSIGNED', 'MESSAGE_RECEIVED', 'HOMEWORK_ASSIGNED', 'EXAM_SCHEDULED');

-- CreateEnum
CREATE TYPE "ConversationScope" AS ENUM ('DIRECT', 'CLASS', 'YEAR_GROUP', 'SCHOOL');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'POLL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PollType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "ImportFileType" AS ENUM ('UNTIS_XML', 'UNTIS_DIF', 'CSV');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('QUEUED', 'DRY_RUN', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('TEACHERS', 'CLASSES', 'ROOMS', 'STUDENTS', 'TIMETABLE', 'MIXED');

-- CreateEnum
CREATE TYPE "ImportConflictMode" AS ENUM ('SKIP', 'UPDATE', 'FAIL');

-- AlterTable
ALTER TABLE "class_subjects" ADD COLUMN     "prefer_double_period" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "school_classes" ADD COLUMN     "klassenvorstand_id" TEXT;

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room_type" "RoomType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "equipment" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_runs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "status" "SolveStatus" NOT NULL DEFAULT 'QUEUED',
    "hard_score" INTEGER,
    "soft_score" INTEGER,
    "elapsed_seconds" INTEGER,
    "constraint_config" JSONB,
    "violations" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "max_solve_seconds" INTEGER NOT NULL DEFAULT 300,
    "ab_week_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_lessons" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "class_subject_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "period_number" INTEGER NOT NULL,
    "week_type" TEXT NOT NULL DEFAULT 'BOTH',
    "is_manual_edit" BOOLEAN NOT NULL DEFAULT false,
    "edited_by" TEXT,
    "edited_at" TIMESTAMP(3),
    "change_type" TEXT,
    "original_teacher_surname" TEXT,
    "original_room_name" TEXT,

    CONSTRAINT "timetable_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_lesson_edits" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "edited_by" TEXT NOT NULL,
    "edit_action" TEXT NOT NULL,
    "previous_state" JSONB NOT NULL,
    "new_state" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_lesson_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_bookings" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "booked_by" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "period_number" INTEGER NOT NULL,
    "week_type" TEXT NOT NULL DEFAULT 'BOTH',
    "purpose" TEXT,
    "is_ad_hoc" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_bookings" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "room_id" TEXT,
    "booked_by" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "period_number" INTEGER NOT NULL,
    "week_type" TEXT NOT NULL DEFAULT 'BOTH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constraint_templates" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "template_type" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constraint_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_book_entries" (
    "id" TEXT NOT NULL,
    "class_subject_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "period_number" INTEGER NOT NULL,
    "week_type" TEXT NOT NULL DEFAULT 'BOTH',
    "date" TIMESTAMP(3) NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "thema" TEXT,
    "lehrstoff" TEXT,
    "hausaufgabe" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "substitution_id" TEXT,

    CONSTRAINT "class_book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "class_book_entry_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "late_minutes" INTEGER,
    "excuse_id" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_entries" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "class_subject_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "category" "GradeCategory" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_weights" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "class_subject_id" TEXT,
    "schularbeit_pct" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "muendlich_pct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "mitarbeit_pct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_notes" (
    "id" TEXT NOT NULL,
    "class_book_entry_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_excuses" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" "ExcuseReason" NOT NULL,
    "note" TEXT,
    "status" "ExcuseStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_excuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excuse_attachments" (
    "id" TEXT NOT NULL,
    "excuse_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excuse_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_absences" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "date_from" TIMESTAMP(3) NOT NULL,
    "date_to" TIMESTAMP(3) NOT NULL,
    "period_from" INTEGER,
    "period_to" INTEGER,
    "reason" "AbsenceReason" NOT NULL,
    "note" TEXT,
    "status" "AbsenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substitutions" (
    "id" TEXT NOT NULL,
    "absence_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "class_subject_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "period_number" INTEGER NOT NULL,
    "week_type" TEXT NOT NULL DEFAULT 'BOTH',
    "date" TIMESTAMP(3) NOT NULL,
    "type" "SubstitutionType",
    "status" "SubstitutionStatus" NOT NULL DEFAULT 'PENDING',
    "original_teacher_id" TEXT NOT NULL,
    "substitute_teacher_id" TEXT,
    "substitute_room_id" TEXT,
    "offered_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_notes" (
    "id" TEXT NOT NULL,
    "substitution_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handover_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_attachments" (
    "id" TEXT NOT NULL,
    "handover_note_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handover_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "scope" "ConversationScope" NOT NULL,
    "scope_id" TEXT,
    "subject" TEXT,
    "created_by" TEXT NOT NULL,
    "direct_pair_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_recipients" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "message_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" "PollType" NOT NULL,
    "deadline" TIMESTAMP(3),
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "id" TEXT NOT NULL,
    "poll_option_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "class_subject_id" TEXT NOT NULL,
    "class_book_entry_id" TEXT,
    "school_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "class_subject_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "duration" INTEGER,
    "description" TEXT,
    "school_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "file_type" "ImportFileType" NOT NULL,
    "entity_type" "ImportEntityType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "conflict_mode" "ImportConflictMode" NOT NULL DEFAULT 'SKIP',
    "column_mapping" JSONB,
    "status" "ImportStatus" NOT NULL DEFAULT 'QUEUED',
    "bullmq_job_id" TEXT,
    "total_rows" INTEGER,
    "imported_rows" INTEGER,
    "skipped_rows" INTEGER,
    "error_rows" INTEGER,
    "error_details" JSONB,
    "dry_run_result" JSONB,
    "created_by" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_api_keys" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sis_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_school_id_name_key" ON "rooms"("school_id", "name");

-- CreateIndex
CREATE INDEX "timetable_runs_school_id_created_at_idx" ON "timetable_runs"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "timetable_lessons_run_id_idx" ON "timetable_lessons"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_lessons_run_id_room_id_day_of_week_period_number__key" ON "timetable_lessons"("run_id", "room_id", "day_of_week", "period_number", "week_type");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_lessons_run_id_teacher_id_day_of_week_period_numb_key" ON "timetable_lessons"("run_id", "teacher_id", "day_of_week", "period_number", "week_type");

-- CreateIndex
CREATE INDEX "timetable_lesson_edits_run_id_created_at_idx" ON "timetable_lesson_edits"("run_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "room_bookings_room_id_day_of_week_period_number_week_type_key" ON "room_bookings"("room_id", "day_of_week", "period_number", "week_type");

-- CreateIndex
CREATE UNIQUE INDEX "resources_school_id_name_key" ON "resources"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "resource_bookings_resource_id_day_of_week_period_number_wee_key" ON "resource_bookings"("resource_id", "day_of_week", "period_number", "week_type");

-- CreateIndex
CREATE UNIQUE INDEX "class_book_entries_substitution_id_key" ON "class_book_entries"("substitution_id");

-- CreateIndex
CREATE INDEX "class_book_entries_school_id_date_idx" ON "class_book_entries"("school_id", "date");

-- CreateIndex
CREATE INDEX "class_book_entries_teacher_id_idx" ON "class_book_entries"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_book_entries_class_subject_id_date_period_number_week_key" ON "class_book_entries"("class_subject_id", "date", "period_number", "week_type");

-- CreateIndex
CREATE INDEX "attendance_records_student_id_idx" ON "attendance_records"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_class_book_entry_id_student_id_key" ON "attendance_records"("class_book_entry_id", "student_id");

-- CreateIndex
CREATE INDEX "grade_entries_class_subject_id_student_id_idx" ON "grade_entries"("class_subject_id", "student_id");

-- CreateIndex
CREATE INDEX "grade_entries_student_id_idx" ON "grade_entries"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_weights_school_id_class_subject_id_key" ON "grade_weights"("school_id", "class_subject_id");

-- CreateIndex
CREATE INDEX "student_notes_class_book_entry_id_idx" ON "student_notes"("class_book_entry_id");

-- CreateIndex
CREATE INDEX "student_notes_student_id_idx" ON "student_notes"("student_id");

-- CreateIndex
CREATE INDEX "absence_excuses_student_id_idx" ON "absence_excuses"("student_id");

-- CreateIndex
CREATE INDEX "absence_excuses_school_id_status_idx" ON "absence_excuses"("school_id", "status");

-- CreateIndex
CREATE INDEX "teacher_absences_school_id_teacher_id_idx" ON "teacher_absences"("school_id", "teacher_id");

-- CreateIndex
CREATE INDEX "teacher_absences_date_from_date_to_idx" ON "teacher_absences"("date_from", "date_to");

-- CreateIndex
CREATE INDEX "substitutions_lesson_id_date_idx" ON "substitutions"("lesson_id", "date");

-- CreateIndex
CREATE INDEX "substitutions_substitute_teacher_id_date_idx" ON "substitutions"("substitute_teacher_id", "date");

-- CreateIndex
CREATE INDEX "substitutions_original_teacher_id_date_idx" ON "substitutions"("original_teacher_id", "date");

-- CreateIndex
CREATE INDEX "substitutions_absence_id_idx" ON "substitutions"("absence_id");

-- CreateIndex
CREATE UNIQUE INDEX "handover_notes_substitution_id_key" ON "handover_notes"("substitution_id");

-- CreateIndex
CREATE INDEX "handover_notes_author_id_idx" ON "handover_notes"("author_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_direct_pair_key_key" ON "conversations"("direct_pair_key");

-- CreateIndex
CREATE INDEX "conversations_school_id_scope_idx" ON "conversations"("school_id", "scope");

-- CreateIndex
CREATE INDEX "conversations_created_by_idx" ON "conversations"("created_by");

-- CreateIndex
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_members_conversation_id_user_id_key" ON "conversation_members"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "message_recipients_user_id_read_at_idx" ON "message_recipients"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_recipients_message_id_user_id_key" ON "message_recipients"("message_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "polls_message_id_key" ON "polls"("message_id");

-- CreateIndex
CREATE INDEX "poll_votes_user_id_idx" ON "poll_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_votes_poll_option_id_user_id_key" ON "poll_votes"("poll_option_id", "user_id");

-- CreateIndex
CREATE INDEX "homework_class_subject_id_due_date_idx" ON "homework"("class_subject_id", "due_date");

-- CreateIndex
CREATE INDEX "homework_school_id_idx" ON "homework"("school_id");

-- CreateIndex
CREATE INDEX "exams_class_id_date_idx" ON "exams"("class_id", "date");

-- CreateIndex
CREATE INDEX "exams_class_subject_id_idx" ON "exams"("class_subject_id");

-- CreateIndex
CREATE INDEX "exams_school_id_idx" ON "exams"("school_id");

-- CreateIndex
CREATE INDEX "import_jobs_school_id_created_at_idx" ON "import_jobs"("school_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_tokens_token_key" ON "calendar_tokens"("token");

-- CreateIndex
CREATE INDEX "calendar_tokens_user_id_idx" ON "calendar_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sis_api_keys_key_key" ON "sis_api_keys"("key");

-- CreateIndex
CREATE INDEX "sis_api_keys_school_id_idx" ON "sis_api_keys"("school_id");

-- AddForeignKey
ALTER TABLE "school_classes" ADD CONSTRAINT "school_classes_klassenvorstand_id_fkey" FOREIGN KEY ("klassenvorstand_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_runs" ADD CONSTRAINT "timetable_runs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_lessons" ADD CONSTRAINT "timetable_lessons_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "timetable_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_lessons" ADD CONSTRAINT "timetable_lessons_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_templates" ADD CONSTRAINT "constraint_templates_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_book_entries" ADD CONSTRAINT "class_book_entries_substitution_id_fkey" FOREIGN KEY ("substitution_id") REFERENCES "substitutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_class_book_entry_id_fkey" FOREIGN KEY ("class_book_entry_id") REFERENCES "class_book_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_class_book_entry_id_fkey" FOREIGN KEY ("class_book_entry_id") REFERENCES "class_book_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excuse_attachments" ADD CONSTRAINT "excuse_attachments_excuse_id_fkey" FOREIGN KEY ("excuse_id") REFERENCES "absence_excuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_absences" ADD CONSTRAINT "teacher_absences_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_absences" ADD CONSTRAINT "teacher_absences_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_absence_id_fkey" FOREIGN KEY ("absence_id") REFERENCES "teacher_absences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_notes" ADD CONSTRAINT "handover_notes_substitution_id_fkey" FOREIGN KEY ("substitution_id") REFERENCES "substitutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_attachments" ADD CONSTRAINT "handover_attachments_handover_note_id_fkey" FOREIGN KEY ("handover_note_id") REFERENCES "handover_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_option_id_fkey" FOREIGN KEY ("poll_option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_class_book_entry_id_fkey" FOREIGN KEY ("class_book_entry_id") REFERENCES "class_book_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_tokens" ADD CONSTRAINT "calendar_tokens_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sis_api_keys" ADD CONSTRAINT "sis_api_keys_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

