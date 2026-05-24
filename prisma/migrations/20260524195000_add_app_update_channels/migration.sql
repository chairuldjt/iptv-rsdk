ALTER TABLE `AppUpdate`
    ADD COLUMN `updateChannel` VARCHAR(191) NOT NULL DEFAULT 'production',
    ADD COLUMN `packageName` VARCHAR(191) NULL;

DROP INDEX `AppUpdate_versionCode_key` ON `AppUpdate`;

CREATE UNIQUE INDEX `AppUpdate_updateChannel_versionCode_key` ON `AppUpdate`(`updateChannel`, `versionCode`);
CREATE INDEX `AppUpdate_updateChannel_isDeployed_versionCode_idx` ON `AppUpdate`(`updateChannel`, `isDeployed`, `versionCode`);
