-- Incremental migration: Zoho Books import (apply once on existing DBs)
SET foreign_key_checks = 0;

-- Deal: source + Zoho linkage
ALTER TABLE `Deal`
  ADD COLUMN IF NOT EXISTS `source` ENUM('MANUAL','ZOHO_IMPORT') NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS `zohoInvoiceId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `zohoInvoiceNumber` VARCHAR(191) NULL;

ALTER TABLE `Deal` ADD UNIQUE INDEX IF NOT EXISTS `Deal_zohoInvoiceId_key` (`zohoInvoiceId`);

-- AuditLog action enum: add ZOHO_IMPORT
ALTER TABLE `AuditLog`
  MODIFY COLUMN `action` ENUM('CREATE','UPDATE','DELETE','APPROVE','REJECT','LOGIN','PAYOUT','SETTINGS_CHANGE','RETURN','ZOHO_IMPORT') NOT NULL;

-- ZohoConnection
CREATE TABLE IF NOT EXISTS `ZohoConnection` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NULL,
  `apiDomain` VARCHAR(191) NULL,
  `accountsDomain` VARCHAR(191) NULL,
  `refreshTokenEnc` TEXT NOT NULL,
  `accessToken` TEXT NULL,
  `accessTokenExpiresAt` DATETIME(3) NULL,
  `scopes` TEXT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `connectedById` VARCHAR(191) NOT NULL,
  `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ZohoConnection_connectedById_fkey` (`connectedById`),
  CONSTRAINT `ZohoConnection_connectedById_fkey` FOREIGN KEY (`connectedById`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
