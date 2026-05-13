-- AlterTable
ALTER TABLE "class_subjects" ADD COLUMN     "cycle_length" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "cycle_slot_mask" INTEGER;
