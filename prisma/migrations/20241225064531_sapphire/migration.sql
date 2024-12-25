/*
  Warnings:

  - Added the required column `lvl` to the `match_record` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "match_record" ADD COLUMN     "lvl" INTEGER NOT NULL;
