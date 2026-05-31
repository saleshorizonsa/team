-- Team Trading — full schema (MySQL / MariaDB)
-- Apply once on a fresh database:  mysql -u USER -p DBNAME < prisma/sql/schema.sql
-- Mirrors prisma/schema.prisma. Safe to re-run (IF NOT EXISTS / additive).

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  `commissionSharePercent` DECIMAL(5,2) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Customer` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `contactPerson` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `vatNumber` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `Customer_createdById_fkey` (`createdById`),
  CONSTRAINT `Customer_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Supplier` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `contactPerson` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `vatNumber` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `Supplier_createdById_fkey` (`createdById`),
  CONSTRAINT `Supplier_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Lead` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NULL,
  `contactName` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `source` ENUM('REFERRAL','WEBSITE','CALL','WALK_IN','OTHER') NOT NULL,
  `stage` ENUM('NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST') NOT NULL DEFAULT 'NEW',
  `estimatedValue` DECIMAL(12,2) NOT NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `notes` TEXT NULL,
  `lostReason` VARCHAR(191) NULL,
  `convertedDealId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Lead_convertedDealId_key` (`convertedDealId`),
  KEY `Lead_ownerId_idx` (`ownerId`),
  KEY `Lead_stage_idx` (`stage`),
  KEY `Lead_customerId_fkey` (`customerId`),
  CONSTRAINT `Lead_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`),
  CONSTRAINT `Lead_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Deal` (
  `id` VARCHAR(191) NOT NULL,
  `dealNumber` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `supplierId` VARCHAR(191) NULL,
  `salespersonId` VARCHAR(191) NOT NULL,
  `leadId` VARCHAR(191) NULL,
  `salesTotal` DECIMAL(12,2) NOT NULL,
  `purchaseTotal` DECIMAL(12,2) NOT NULL,
  `transportation` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `vatRatePercent` DECIMAL(5,2) NOT NULL DEFAULT 15,
  `vatAmount` DECIMAL(12,2) NOT NULL,
  `profit` DECIMAL(12,2) NOT NULL,
  `status` ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  `approvedById` VARCHAR(191) NULL,
  `approvedAt` DATETIME(3) NULL,
  `rejectReason` TEXT NULL,
  `notes` TEXT NULL,
  `dealDate` DATETIME(3) NOT NULL,
  `source` ENUM('MANUAL','ZOHO_IMPORT') NOT NULL DEFAULT 'MANUAL',
  `zohoInvoiceId` VARCHAR(191) NULL,
  `zohoInvoiceNumber` VARCHAR(191) NULL,
  `creditedUserIds` JSON NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Deal_dealNumber_key` (`dealNumber`),
  UNIQUE KEY `Deal_zohoInvoiceId_key` (`zohoInvoiceId`),
  KEY `Deal_status_idx` (`status`),
  KEY `Deal_createdById_idx` (`createdById`),
  KEY `Deal_salespersonId_idx` (`salespersonId`),
  KEY `Deal_dealDate_idx` (`dealDate`),
  KEY `Deal_customerId_fkey` (`customerId`),
  KEY `Deal_supplierId_fkey` (`supplierId`),
  KEY `Deal_leadId_fkey` (`leadId`),
  KEY `Deal_approvedById_fkey` (`approvedById`),
  CONSTRAINT `Deal_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer` (`id`),
  CONSTRAINT `Deal_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier` (`id`),
  CONSTRAINT `Deal_salespersonId_fkey` FOREIGN KEY (`salespersonId`) REFERENCES `User` (`id`),
  CONSTRAINT `Deal_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead` (`id`),
  CONSTRAINT `Deal_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User` (`id`),
  CONSTRAINT `Deal_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lead → Deal back-reference (added after Deal exists)
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_convertedDealId_fkey`
  FOREIGN KEY (`convertedDealId`) REFERENCES `Deal` (`id`);

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

CREATE TABLE IF NOT EXISTS `Commission` (
  `id` VARCHAR(191) NOT NULL,
  `dealId` VARCHAR(191) NOT NULL,
  `returnId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN','USER') NOT NULL,
  `type` ENUM('EARNING','CLAWBACK') NOT NULL DEFAULT 'EARNING',
  `percent` DECIMAL(5,2) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `period` VARCHAR(191) NOT NULL,
  `payoutStatus` ENUM('PENDING','PAID') NOT NULL DEFAULT 'PENDING',
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Commission_dealId_idx` (`dealId`),
  KEY `Commission_returnId_idx` (`returnId`),
  KEY `Commission_userId_idx` (`userId`),
  KEY `Commission_period_idx` (`period`),
  KEY `Commission_payoutStatus_idx` (`payoutStatus`),
  CONSTRAINT `Commission_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal` (`id`),
  CONSTRAINT `Commission_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `Return` (`id`),
  CONSTRAINT `Commission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS `Setting` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `value` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Setting_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `action` ENUM('CREATE','UPDATE','DELETE','APPROVE','REJECT','LOGIN','PAYOUT','SETTINGS_CHANGE','RETURN','ZOHO_IMPORT') NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `before` JSON NULL,
  `after` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AuditLog_userId_idx` (`userId`),
  KEY `AuditLog_entityType_entityId_idx` (`entityType`,`entityId`),
  KEY `AuditLog_createdAt_idx` (`createdAt`),
  CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
