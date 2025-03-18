-- DropIndex
DROP INDEX `Holiday_name_key` ON `Holiday`;

-- AlterTable
ALTER TABLE `Holiday` MODIFY `start_date` VARCHAR(191) NOT NULL,
    MODIFY `end_date` VARCHAR(191) NULL;
