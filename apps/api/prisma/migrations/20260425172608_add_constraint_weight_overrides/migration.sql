-- AlterTable
ALTER TABLE "permission_overrides" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "constraint_weight_overrides" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "constraint_name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "constraint_weight_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "constraint_weight_overrides_school_id_idx" ON "constraint_weight_overrides"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "constraint_weight_overrides_school_id_constraint_name_key" ON "constraint_weight_overrides"("school_id", "constraint_name");

-- AddForeignKey
ALTER TABLE "constraint_weight_overrides" ADD CONSTRAINT "constraint_weight_overrides_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
