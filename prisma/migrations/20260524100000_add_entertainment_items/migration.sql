CREATE TABLE `EntertainmentItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NOT NULL DEFAULT '',
    `url` TEXT NULL,
    `contentType` VARCHAR(191) NOT NULL DEFAULT 'webview',
    `thumbnailUrl` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EntertainmentItem_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `EntertainmentItem` (`title`, `subtitle`, `url`, `contentType`, `thumbnailUrl`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES
  ('SoundCloud', 'Musik dan audio streaming', 'https://soundcloud.com', 'webview', '/uploads/entertainment-thumbnails/default-soundcloud.svg', true, 10, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('YouTube', 'YouTube TV mode', 'https://www.youtube.com/tv', 'webview', '/uploads/entertainment-thumbnails/default-youtube.svg', true, 20, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
