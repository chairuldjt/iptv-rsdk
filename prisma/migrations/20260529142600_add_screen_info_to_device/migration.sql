-- AddColumn screenWidth, screenHeight, screenDpi to Device
ALTER TABLE `Device` ADD COLUMN `screenWidth` INTEGER NULL;
ALTER TABLE `Device` ADD COLUMN `screenHeight` INTEGER NULL;
ALTER TABLE `Device` ADD COLUMN `screenDpi` INTEGER NULL;
