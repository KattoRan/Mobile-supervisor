/*
  Warnings:

  - The primary key for the `cell_tower_history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `devices` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `location_history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `cell_tower_history` DROP FOREIGN KEY `cell_tower_history_device_id_fkey`;

-- DropForeignKey
ALTER TABLE `devices` DROP FOREIGN KEY `devices_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `location_history` DROP FOREIGN KEY `location_history_device_id_fkey`;

-- DropIndex
DROP INDEX `cell_tower_history_device_id_fkey` ON `cell_tower_history`;

-- DropIndex
DROP INDEX `devices_user_id_fkey` ON `devices`;

-- DropIndex
DROP INDEX `location_history_device_id_fkey` ON `location_history`;

-- AlterTable
ALTER TABLE `cell_tower_history` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `device_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `devices` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `user_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `location_history` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `device_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `devices` ADD CONSTRAINT `devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_history` ADD CONSTRAINT `location_history_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cell_tower_history` ADD CONSTRAINT `cell_tower_history_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
