-- CreateTable
CREATE TABLE `bts_stations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mcc` INTEGER NOT NULL,
    `mnc` INTEGER NOT NULL,
    `lac` INTEGER NOT NULL,
    `cid` INTEGER NOT NULL,
    `lat` DECIMAL(10, 8) NOT NULL,
    `lon` DECIMAL(11, 8) NOT NULL,
    `radio` VARCHAR(191) NULL,
    `range` INTEGER NULL,
    `address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bts_stations_mcc_mnc_lac_cid_idx`(`mcc`, `mnc`, `lac`, `cid`),
    UNIQUE INDEX `bts_stations_mcc_mnc_lac_cid_key`(`mcc`, `mnc`, `lac`, `cid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
