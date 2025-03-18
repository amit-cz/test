/*
  Warnings:

  - You are about to drop the column `studentId` on the `Holiday` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Holiday` DROP COLUMN `studentId`,
    ADD COLUMN `studentIds` JSON NOT NULL;
