/*
  Warnings:

  - A unique constraint covering the columns `[studentId]` on the table `parent_student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[parentId]` on the table `parent_student` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE `Holiday` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `start_date` VARCHAR(191) NOT NULL,
    `end_date` VARCHAR(191) NULL,
    `studentId` INTEGER NOT NULL,

    UNIQUE INDEX `Holiday_name_key`(`name`),
    UNIQUE INDEX `Holiday_start_date_key`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_StudentHoliday` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_StudentHoliday_AB_unique`(`A`, `B`),
    INDEX `_StudentHoliday_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `parent_student_studentId_key` ON `parent_student`(`studentId`);

-- CreateIndex
CREATE UNIQUE INDEX `parent_student_parentId_key` ON `parent_student`(`parentId`);

-- AddForeignKey
ALTER TABLE `_StudentHoliday` ADD CONSTRAINT `_StudentHoliday_A_fkey` FOREIGN KEY (`A`) REFERENCES `Holiday`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_StudentHoliday` ADD CONSTRAINT `_StudentHoliday_B_fkey` FOREIGN KEY (`B`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
