-- Bring older production databases up to the current schema before adding indexes.
-- The initial migration predates global playlists, custom sync, and education SMB fields.

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Playlist' AND COLUMN_NAME = 'isGlobal'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `Playlist` ADD COLUMN `isGlobal` BOOLEAN NULL DEFAULT false', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `Playlist` MODIFY COLUMN `sourceUrl` TEXT NULL;
ALTER TABLE `Channel` MODIFY COLUMN `logoUrl` TEXT NULL;
ALTER TABLE `Channel` MODIFY COLUMN `streamUrl` TEXT NOT NULL;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'syncMode'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `syncMode` VARCHAR(191) NULL DEFAULT ''api''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'customM3uUrl'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `customM3uUrl` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'clearCacheTrigger'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `clearCacheTrigger` BOOLEAN NULL DEFAULT false', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'educationVideoPath'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `educationVideoPath` VARCHAR(191) NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'educationSmbUsername'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `educationSmbUsername` VARCHAR(191) NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'educationSmbPassword'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `educationSmbPassword` VARCHAR(191) NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'educationSmbDomain'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `educationSmbDomain` VARCHAR(191) NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add indexes for production dashboard/API query paths.
SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Playlist' AND INDEX_NAME = 'Playlist_isGlobal_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `Playlist_isGlobal_idx` ON `Playlist`(`isGlobal`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Playlist' AND INDEX_NAME = 'Playlist_updatedAt_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `Playlist_updatedAt_idx` ON `Playlist`(`updatedAt`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Category' AND INDEX_NAME = 'Category_playlistId_sortOrder_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `Category_playlistId_sortOrder_idx` ON `Category`(`playlistId`, `sortOrder`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Channel' AND INDEX_NAME = 'Channel_playlistId_isActive_sortOrder_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `Channel_playlistId_isActive_sortOrder_idx` ON `Channel`(`playlistId`, `isActive`, `sortOrder`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Channel' AND INDEX_NAME = 'Channel_categoryId_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `Channel_categoryId_idx` ON `Channel`(`categoryId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Device' AND INDEX_NAME = 'Device_isActive_lastOnline_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `Device_isActive_lastOnline_idx` ON `Device`(`isActive`, `lastOnline`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Device' AND INDEX_NAME = 'Device_lastOnline_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `Device_lastOnline_idx` ON `Device`(`lastOnline`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Device' AND INDEX_NAME = 'Device_macAddress_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `Device_macAddress_idx` ON `Device`(`macAddress`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceLog' AND INDEX_NAME = 'DeviceLog_deviceId_createdAt_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `DeviceLog_deviceId_createdAt_idx` ON `DeviceLog`(`deviceId`, `createdAt`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceLog' AND INDEX_NAME = 'DeviceLog_createdAt_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `DeviceLog_createdAt_idx` ON `DeviceLog`(`createdAt`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
