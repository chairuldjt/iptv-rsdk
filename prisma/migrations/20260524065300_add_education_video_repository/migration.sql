-- Create new EducationVideo table and add new configuration columns to DeviceConfig

CREATE TABLE `EducationVideo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `videoUrl` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DeviceConfig` 
    ADD COLUMN `educationSource` VARCHAR(191) NOT NULL DEFAULT 'smb',
    ADD COLUMN `educationPlaybackMode` VARCHAR(191) NOT NULL DEFAULT 'copy';
