-- Incremental migration: Returns & commission clawback (apply once on existing DBs)
SET foreign_key_checks = 0;

CREATE TABLE IF NOT EXISTS `Return` (
  `id` VARCHAR(191) NOT NULL,
  `returnNumber` VARCHAR(191) NOT NULL,
  `dealId` VARCHAR(191) NOT NULL,
  `returnDate` DATETIME(3) NOT NULL,
  `returnedSalesAmount` DECIMAL(12,2) NOT NULL,
  `costRecovered` DECIMAL(12,2) NOT NULL,
  `returnCosts` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `reversedProfit` DECIMAL(12,2) NOT NULL,
  `reason` TEXT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Return_returnNumber_key` (`returnNumber`),
  KEY `Return_dealId_idx` (`dealId`),
  KEY `Return_returnDate_idx` (`returnDate`),
  KEY `Return_createdById_fkey` (`createdById`),
  CONSTRAINT `Return_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal` (`id`),
  CONSTRAINT `Return_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `Commission`
  ADD COLUMN IF NOT EXISTS `returnId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `type` ENUM('EARNING','CLAWBACK') NOT NULL DEFAULT 'EARNING';

ALTER TABLE `Commission` ADD INDEX IF NOT EXISTS `Commission_returnId_idx` (`returnId`);
ALTER TABLE `Commission` ADD CONSTRAINT `Commission_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `Return` (`id`);

ALTER TABLE `AuditLog`
  MODIFY COLUMN `action` ENUM('CREATE','UPDATE','DELETE','APPROVE','REJECT','LOGIN','PAYOUT','SETTINGS_CHANGE','RETURN') NOT NULL;

SET foreign_key_checks = 1;
