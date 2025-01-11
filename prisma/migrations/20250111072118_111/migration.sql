-- AlterTable
ALTER TABLE "match_record" ADD COLUMN     "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3);
