-- CreateTable
CREATE TABLE "group_derivation_rules" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "group_type" "GroupType" NOT NULL,
    "group_name" TEXT NOT NULL,
    "level" TEXT,
    "student_ids" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_derivation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_derivation_rules_class_id_idx" ON "group_derivation_rules"("class_id");

-- AddForeignKey
ALTER TABLE "group_derivation_rules" ADD CONSTRAINT "group_derivation_rules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
