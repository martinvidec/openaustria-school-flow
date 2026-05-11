-- AlterTable
ALTER TABLE "school_classes" ADD COLUMN     "home_room_id" TEXT;

-- AddForeignKey
ALTER TABLE "school_classes" ADD CONSTRAINT "school_classes_home_room_id_fkey" FOREIGN KEY ("home_room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
