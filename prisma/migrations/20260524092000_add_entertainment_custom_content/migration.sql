ALTER TABLE `DeviceConfig`
    ADD COLUMN `entertainmentCustomTitle` VARCHAR(191) NOT NULL DEFAULT 'Custom Konten',
    ADD COLUMN `entertainmentCustomUrl` TEXT NULL;
