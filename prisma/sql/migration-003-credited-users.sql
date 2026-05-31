-- Incremental migration: multi-salesperson credit (equal pool split)
ALTER TABLE `Deal` ADD COLUMN IF NOT EXISTS `creditedUserIds` JSON NULL;
