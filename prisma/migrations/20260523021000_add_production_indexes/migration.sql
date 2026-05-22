-- Add indexes for production dashboard/API query paths.
CREATE INDEX `Playlist_isGlobal_idx` ON `Playlist`(`isGlobal`);
CREATE INDEX `Playlist_updatedAt_idx` ON `Playlist`(`updatedAt`);

CREATE INDEX `Category_playlistId_sortOrder_idx` ON `Category`(`playlistId`, `sortOrder`);

CREATE INDEX `Channel_playlistId_isActive_sortOrder_idx` ON `Channel`(`playlistId`, `isActive`, `sortOrder`);
CREATE INDEX `Channel_categoryId_idx` ON `Channel`(`categoryId`);

CREATE INDEX `Device_isActive_lastOnline_idx` ON `Device`(`isActive`, `lastOnline`);
CREATE INDEX `Device_lastOnline_idx` ON `Device`(`lastOnline`);
CREATE INDEX `Device_macAddress_idx` ON `Device`(`macAddress`);

CREATE INDEX `DeviceLog_deviceId_createdAt_idx` ON `DeviceLog`(`deviceId`, `createdAt`);
CREATE INDEX `DeviceLog_createdAt_idx` ON `DeviceLog`(`createdAt`);
