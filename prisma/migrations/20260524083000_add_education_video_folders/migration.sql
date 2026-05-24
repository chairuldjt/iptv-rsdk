CREATE TABLE `EducationFolder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EducationFolder_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EducationVideo`
    ADD COLUMN `folderId` INTEGER NULL,
    ADD COLUMN `thumbnailUrl` TEXT NULL;

CREATE INDEX `EducationVideo_folderId_idx` ON `EducationVideo`(`folderId`);
CREATE INDEX `EducationVideo_updatedAt_idx` ON `EducationVideo`(`updatedAt`);

ALTER TABLE `EducationVideo`
    ADD CONSTRAINT `EducationVideo_folderId_fkey`
    FOREIGN KEY (`folderId`) REFERENCES `EducationFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
