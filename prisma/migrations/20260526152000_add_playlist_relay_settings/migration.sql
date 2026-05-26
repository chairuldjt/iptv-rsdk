ALTER TABLE `Playlist`
  ADD COLUMN `relayEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `relayConfig` TEXT NULL;
