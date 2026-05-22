ALTER TABLE `DeviceConfig` MODIFY COLUMN `syncMode` VARCHAR(191) NULL DEFAULT 'custom';

UPDATE `DeviceConfig`
SET
  `syncMode` = 'custom',
  `customM3uUrl` = 'http://10.0.0.1/iptv/iptv_rsdk.m3u'
WHERE
  (`syncMode` IS NULL OR `syncMode` = 'api')
  AND (`customM3uUrl` IS NULL OR `customM3uUrl` = '');
