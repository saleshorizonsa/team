-- Migration 004: in-app notifications
CREATE TABLE IF NOT EXISTS `Notification` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(191) NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Notification_userId_readAt_idx` (`userId`, `readAt`),
  INDEX `Notification_createdAt_idx` (`createdAt`)
  -- FK to User(id) omitted: existing tables use a different collation than the
  -- server default for new tables (errno 150). Prisma resolves the relation at
  -- the app layer, so the DB-level FK is not required.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
