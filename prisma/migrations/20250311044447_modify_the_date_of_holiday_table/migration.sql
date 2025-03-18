/*
  Warnings:

  - You are about to alter the column `start_date` on the `Holiday` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Date`.
  - You are about to alter the column `end_date` on the `Holiday` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Date`.

*/
-- AlterTable
ALTER TABLE `Holiday` MODIFY `start_date` DATE NOT NULL,
    MODIFY `end_date` DATE NULL;
