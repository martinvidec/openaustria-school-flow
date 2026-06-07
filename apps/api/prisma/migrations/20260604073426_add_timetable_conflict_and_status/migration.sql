-- AlterEnum
ALTER TYPE "SolveStatus" ADD VALUE 'COMPLETED_WITH_CONFLICTS';

-- CreateTable
CREATE TABLE "timetable_conflicts" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "conflict_type" TEXT NOT NULL,
    "class_subject_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "period_number" INTEGER NOT NULL,
    "week_type" TEXT NOT NULL DEFAULT 'BOTH',
    "conflicts_with_class_subject_id" TEXT,
    "teacher_label" TEXT,
    "subject_label" TEXT,
    "class_label" TEXT,
    "room_label" TEXT,
    "conflicts_with_label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution_action" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timetable_conflicts_run_id_idx" ON "timetable_conflicts"("run_id");

-- AddForeignKey
ALTER TABLE "timetable_conflicts" ADD CONSTRAINT "timetable_conflicts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "timetable_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
