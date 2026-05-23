-- Add education playlist playback configuration columns for existing production databases.
-- The Prisma schema already expects these fields on DeviceConfig.

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'educationRepeatMode'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `educationRepeatMode` VARCHAR(191) NOT NULL DEFAULT ''all''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'educationPlayOrder'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `educationPlayOrder` VARCHAR(191) NOT NULL DEFAULT ''alphabetical''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DeviceConfig' AND COLUMN_NAME = 'educationForceSync'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `DeviceConfig` ADD COLUMN `educationForceSync` BOOLEAN NOT NULL DEFAULT false', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
