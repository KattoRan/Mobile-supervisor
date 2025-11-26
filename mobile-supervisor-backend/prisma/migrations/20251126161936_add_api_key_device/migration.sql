/*
  Warnings:

  - A unique constraint covering the columns `[api_key]` on the table `devices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `api_key` to the `devices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `devices` ADD COLUMN `api_key` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `devices_api_key_key` ON `devices`(`api_key`);
