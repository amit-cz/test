/*
  Warnings:

  - You are about to drop the column `studentIds` on the `Holiday` table. All the data in the column will be lost.
  - You are about to drop the `_StudentHoliday` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_StudentHoliday` DROP FOREIGN KEY `_StudentHoliday_A_fkey`;

-- DropForeignKey
ALTER TABLE `_StudentHoliday` DROP FOREIGN KEY `_StudentHoliday_B_fkey`;

-- AlterTable
ALTER TABLE `Holiday` DROP COLUMN `studentIds`;

-- DropTable
DROP TABLE `_StudentHoliday`;

-- CreateTable
CREATE TABLE `StudentHoliday` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `holidayId` INTEGER NOT NULL,

    UNIQUE INDEX `StudentHoliday_studentId_holidayId_key`(`studentId`, `holidayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StudentHoliday` ADD CONSTRAINT `StudentHoliday_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentHoliday` ADD CONSTRAINT `StudentHoliday_holidayId_fkey` FOREIGN KEY (`holidayId`) REFERENCES `Holiday`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
