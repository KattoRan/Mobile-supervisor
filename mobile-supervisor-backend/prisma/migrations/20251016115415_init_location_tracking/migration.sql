/*
  Warnings:

  - The primary key for the `LocationHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[deviceCode]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deviceCode` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Device` ADD COLUMN `deviceCode` VARCHAR(191) NOT NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lastSeen` DATETIME(3) NULL,
    ADD COLUMN `meta` JSON NULL;

-- AlterTable
ALTER TABLE `LocationHistory` DROP PRIMARY KEY,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `heading` DOUBLE NULL,
    ADD COLUMN `speed` DOUBLE NULL,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE UNIQUE INDEX `Device_deviceCode_key` ON `Device`(`deviceCode`);

-- CreateIndex
CREATE UNIQUE INDEX `Device_phoneNumber_key` ON `Device`(`phoneNumber`);

-- CreateIndex
CREATE INDEX `LocationHistory_deviceId_timestamp_idx` ON `LocationHistory`(`deviceId`, `timestamp`);
