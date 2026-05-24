-- Add publish controls for the Web Repository education playlist.
-- Existing rows stay visible to Android clients by default.

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationVideo' AND COLUMN_NAME = 'isPublished'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `EducationVideo` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT true', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationVideo' AND INDEX_NAME = 'EducationVideo_isPublished_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `EducationVideo_isPublished_idx` ON `EducationVideo`(`isPublished`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationFolder' AND COLUMN_NAME = 'isPublished'
);
SET @sql = IF(@column_exists = 0, 'ALTER TABLE `EducationFolder` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT true', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EducationFolder' AND INDEX_NAME = 'EducationFolder_isPublished_idx'
);
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `EducationFolder_isPublished_idx` ON `EducationFolder`(`isPublished`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
