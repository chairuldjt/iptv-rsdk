-- Add app update metadata table for the dashboard update manager.

CREATE TABLE IF NOT EXISTS `AppUpdate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `versionCode` INTEGER NOT NULL,
    `versionName` VARCHAR(191) NOT NULL,
    `apkFileName` VARCHAR(191) NOT NULL,
    `changelog` TEXT NULL,
    `isMandatory` BOOLEAN NOT NULL DEFAULT false,
    `isDeployed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppUpdate_versionCode_key`(`versionCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
