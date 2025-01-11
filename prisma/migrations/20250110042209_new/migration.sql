-- AlterTable
ALTER TABLE "users" ADD COLUMN     "superuserid" TEXT;

-- CreateTable
CREATE TABLE "superusers" (
    "id" SERIAL NOT NULL,
    "account" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "superusers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "superusers_account_key" ON "superusers"("account");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_superuserid_fkey" FOREIGN KEY ("superuserid") REFERENCES "superusers"("account") ON DELETE SET NULL ON UPDATE CASCADE;
