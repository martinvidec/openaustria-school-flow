-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('VS', 'MS', 'AHS_UNTER', 'AHS_OBER', 'BHS');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('MUTATION', 'SENSITIVE_READ');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('TEACHER', 'STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "AvailabilityRuleType" AS ENUM ('MAX_DAYS_PER_WEEK', 'BLOCKED_PERIOD', 'BLOCKED_DAY_PART', 'PREFERRED_FREE_DAY');

-- CreateEnum
CREATE TYPE "ReductionType" AS ENUM ('KUSTODIAT', 'KLASSENVORSTAND', 'MENTOR', 'PERSONALVERTRETUNG', 'ADMINISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('RELIGION', 'WAHLPFLICHT', 'LEISTUNG', 'LANGUAGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('PFLICHT', 'WAHLPFLICHT', 'FREIGEGENSTAND', 'UNVERBINDLICH');

-- CreateEnum
CREATE TYPE "ProcessingPurpose" AS ENUM ('STUNDENPLANERSTELLUNG', 'KOMMUNIKATION', 'NOTENVERARBEITUNG', 'FOTOFREIGABE', 'KONTAKTDATEN_WEITERGABE', 'LERNPLATTFORM', 'STATISTIK');

-- CreateEnum
CREATE TYPE "DsgvoJobType" AS ENUM ('DATA_EXPORT', 'DATA_DELETION', 'RETENTION_CLEANUP');

-- CreateEnum
CREATE TYPE "DsgvoJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "school_type" "SchoolType" NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_grids" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,

    CONSTRAINT "time_grids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "time_grid_id" TEXT NOT NULL,
    "period_number" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "is_break" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "duration_min" INTEGER NOT NULL,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_days" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "school_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_years" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "semester_break" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "school_year_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autonomous_days" (
    "id" TEXT NOT NULL,
    "school_year_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "autonomous_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "conditions" JSONB,
    "inverted" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "conditions" JSONB,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "category" "AuditCategory" NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "keycloak_user_id" TEXT,
    "person_type" "PersonType" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "date_of_birth" TEXT,
    "social_security_number" TEXT,
    "health_data" TEXT,
    "is_anonymized" BOOLEAN NOT NULL DEFAULT false,
    "anonymized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "personal_number" TEXT,
    "years_of_service" INTEGER,
    "is_permanent" BOOLEAN NOT NULL DEFAULT false,
    "employment_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "home_school_id" TEXT,
    "werteinheiten_target" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "class_id" TEXT,
    "student_number" TEXT,
    "enrollment_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_students" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,

    CONSTRAINT "parent_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "rule_type" "AvailabilityRuleType" NOT NULL,
    "day_of_week" "DayOfWeek",
    "period_numbers" INTEGER[],
    "max_value" INTEGER,
    "day_part" TEXT,
    "is_hard" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_reductions" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "reduction_type" "ReductionType" NOT NULL,
    "werteinheiten" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "school_year_id" TEXT,

    CONSTRAINT "teaching_reductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_classes" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year_level" INTEGER NOT NULL,
    "school_year_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_type" "GroupType" NOT NULL,
    "level" TEXT,
    "subject_id" TEXT,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_memberships" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "is_auto_assigned" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "subject_type" "SubjectType" NOT NULL,
    "lehrverpflichtungsgruppe" TEXT,
    "werteinheiten_factor" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subjects" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "group_id" TEXT,
    "weekly_hours" INTEGER NOT NULL,
    "is_customized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_subjects" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "purpose" "ProcessingPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "granted_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "legal_basis" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "data_category" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dsfa_entries" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "data_categories" TEXT[],
    "risk_assessment" TEXT,
    "mitigation_measures" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dsfa_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vvz_entries" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "activity_name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "legal_basis" TEXT NOT NULL,
    "data_categories" TEXT[],
    "affected_persons" TEXT[],
    "retention_period" TEXT,
    "technical_measures" TEXT,
    "organizational_measures" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vvz_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dsgvo_jobs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "person_id" TEXT,
    "job_type" "DsgvoJobType" NOT NULL,
    "status" "DsgvoJobStatus" NOT NULL DEFAULT 'QUEUED',
    "bullmq_job_id" TEXT,
    "result_data" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dsgvo_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "time_grids_school_id_key" ON "time_grids"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "periods_time_grid_id_period_number_key" ON "periods"("time_grid_id", "period_number");

-- CreateIndex
CREATE UNIQUE INDEX "school_days_school_id_day_of_week_key" ON "school_days"("school_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "school_years_school_id_key" ON "school_years"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_overrides_user_id_action_subject_key" ON "permission_overrides"("user_id", "action", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "audit_entries_user_id_idx" ON "audit_entries"("user_id");

-- CreateIndex
CREATE INDEX "audit_entries_resource_resource_id_idx" ON "audit_entries"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_entries_created_at_idx" ON "audit_entries"("created_at");

-- CreateIndex
CREATE INDEX "audit_entries_category_idx" ON "audit_entries"("category");

-- CreateIndex
CREATE UNIQUE INDEX "persons_keycloak_user_id_key" ON "persons"("keycloak_user_id");

-- CreateIndex
CREATE INDEX "persons_school_id_idx" ON "persons"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_person_id_key" ON "teachers"("person_id");

-- CreateIndex
CREATE INDEX "teachers_school_id_idx" ON "teachers"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_person_id_key" ON "students"("person_id");

-- CreateIndex
CREATE INDEX "students_school_id_idx" ON "students"("school_id");

-- CreateIndex
CREATE INDEX "students_class_id_idx" ON "students"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_person_id_key" ON "parents"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_students_parent_id_student_id_key" ON "parent_students"("parent_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_classes_school_id_name_school_year_id_key" ON "school_classes"("school_id", "name", "school_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_memberships_group_id_student_id_key" ON "group_memberships"("group_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_school_id_short_name_key" ON "subjects"("school_id", "short_name");

-- CreateIndex
CREATE UNIQUE INDEX "class_subjects_class_id_subject_id_group_id_key" ON "class_subjects"("class_id", "subject_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subjects_teacher_id_subject_id_key" ON "teacher_subjects"("teacher_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_person_id_purpose_key" ON "consent_records"("person_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_school_id_data_category_key" ON "retention_policies"("school_id", "data_category");

-- CreateIndex
CREATE INDEX "dsgvo_jobs_person_id_idx" ON "dsgvo_jobs"("person_id");

-- CreateIndex
CREATE INDEX "dsgvo_jobs_status_idx" ON "dsgvo_jobs"("status");

-- AddForeignKey
ALTER TABLE "time_grids" ADD CONSTRAINT "time_grids_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periods" ADD CONSTRAINT "periods_time_grid_id_fkey" FOREIGN KEY ("time_grid_id") REFERENCES "time_grids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_days" ADD CONSTRAINT "school_days_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_years" ADD CONSTRAINT "school_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autonomous_days" ADD CONSTRAINT "autonomous_days_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_reductions" ADD CONSTRAINT "teaching_reductions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_classes" ADD CONSTRAINT "school_classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsfa_entries" ADD CONSTRAINT "dsfa_entries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vvz_entries" ADD CONSTRAINT "vvz_entries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsgvo_jobs" ADD CONSTRAINT "dsgvo_jobs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
