-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 19, 2026 at 01:33 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hkanban`
--

-- --------------------------------------------------------

--
-- Table structure for table `apikey`
--

CREATE TABLE `apikey` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `api_key` varchar(255) NOT NULL,
  `created_at` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `apikey`
--

INSERT INTO `apikey` (`id`, `manager_id`, `api_key`, `created_at`) VALUES
(1, 25, '8719a0ba-57374a9b-d3baed55-df6dca58-9a29cfa2-e9de315d-be36991b-d01a4603', '2026-01-24T22:10:22.064Z'),
(2, 25, 'cd4df245-148b0359-8186f23f-31219519-0c09f6f9-303e8661-d89b19ac-22640486', '2026-01-24T22:10:22.069Z');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `manager_id`, `name`, `description`, `icon`, `createdAt`, `updatedAt`) VALUES
(1, 25, 'Appearal', NULL, NULL, '2026-02-03 18:44:34.992', '2026-02-03 18:44:34.987');

-- --------------------------------------------------------

--
-- Table structure for table `device`
--

CREATE TABLE `device` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `mac_address` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `device`
--

INSERT INTO `device` (`id`, `manager_id`, `mac_address`, `status`) VALUES
(7, 25, 'e10000031cb5', 'active'),
(8, 25, 'e10000031c76', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `gateway`
--

CREATE TABLE `gateway` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `mac_address` varchar(20) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `gateway`
--

INSERT INTO `gateway` (`id`, `name`, `mac_address`, `manager_id`, `created_at`) VALUES
(15, 'Gergory', 'AC233FC23A64', 25, '2026-01-31 03:33:22.503');

-- --------------------------------------------------------

--
-- Table structure for table `minew_config`
--

CREATE TABLE `minew_config` (
  `id` int(11) NOT NULL,
  `configKey` varchar(255) NOT NULL,
  `configValue` text NOT NULL,
  `description` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `minew_config`
--

INSERT INTO `minew_config` (`id`, `configKey`, `configValue`, `description`, `createdAt`, `updatedAt`) VALUES
(1, 'default_store_id', '2015980079456194560', 'Default Minew store ID for all products', '2026-02-13 04:12:36.131', '2026-02-13 04:12:36.131');

-- --------------------------------------------------------

--
-- Table structure for table `minew_sync_queue`
--

CREATE TABLE `minew_sync_queue` (
  `id` int(11) NOT NULL,
  `entityType` varchar(50) NOT NULL,
  `entityId` int(11) NOT NULL,
  `operation` varchar(50) NOT NULL,
  `payload` text NOT NULL,
  `retryCount` int(11) NOT NULL DEFAULT 0,
  `maxRetries` int(11) NOT NULL DEFAULT 3,
  `lastError` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `scheduledAt` datetime(3) NOT NULL,
  `processedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `minew_sync_queue`
--

INSERT INTO `minew_sync_queue` (`id`, `entityType`, `entityId`, `operation`, `payload`, `retryCount`, `maxRetries`, `lastError`, `status`, `scheduledAt`, `processedAt`, `createdAt`, `updatedAt`) VALUES
(1, 'product', 11, 'create', '{\"id\":\"11\",\"name\":\"aaaa\",\"price\":\"300\"}', 0, 3, NULL, 'pending', '2026-02-13 04:04:27.972', NULL, '2026-02-13 04:04:27.973', '2026-02-13 04:04:27.973');

-- --------------------------------------------------------

--
-- Table structure for table `minew_token_cache`
--

CREATE TABLE `minew_token_cache` (
  `id` int(11) NOT NULL,
  `token` text NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `lastRefreshedAt` datetime(3) NOT NULL,
  `username` varchar(255) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `minew_token_cache`
--

INSERT INTO `minew_token_cache` (`id`, `token`, `expiresAt`, `lastRefreshedAt`, `username`, `createdAt`, `updatedAt`) VALUES
(224, 'eyJhbGciOiJSUzUxMiJ9.eyJzdWIiOiIyMDE1OTY4OTc3MDgzMTc0OTEyIiwiZXhwIjoxNzcxNTI2NzU4fQ.JIdRMTSlYWdjj4InkVGLD38LdtmTcIpxM5CBRPlTbAVz39JhktBzqH2anUVUxep2W9Oed0LO803stiAOOHiAZ2p-x0N3y938Gc1Wa_u5j-bAdosDXC_OehiQyBrZOczFjn5wKKJQ89gv3CPzwtzlFDNreh0MHyj80WMyDDKXCRc', '2026-02-19 17:45:57.596', '2026-02-18 18:45:57.597', 'SQUARE', '2026-02-18 18:45:57.598', '2026-02-18 18:45:57.598');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `orderNumber` varchar(50) NOT NULL,
  `supplierId` int(11) NOT NULL,
  `status` varchar(50) NOT NULL,
  `orderDate` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `expectedDelivery` datetime(3) DEFAULT NULL,
  `actualDelivery` datetime(3) DEFAULT NULL,
  `trackingNumber` varchar(255) DEFAULT NULL,
  `trackingUrl` varchar(500) DEFAULT NULL,
  `receivedById` int(11) DEFAULT NULL,
  `receivedAt` datetime(3) DEFAULT NULL,
  `receiptNotes` text DEFAULT NULL,
  `totalAmount` decimal(10,2) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `orderId` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `replenishmentRequestId` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unitPrice` decimal(10,2) DEFAULT NULL,
  `totalPrice` decimal(10,2) DEFAULT NULL,
  `receivedQuantity` int(11) DEFAULT NULL,
  `damageQuantity` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `categoryId` int(11) NOT NULL,
  `supplierId` int(11) DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `reorderThreshold` int(11) DEFAULT NULL,
  `standardOrderQty` int(11) DEFAULT NULL,
  `unitPrice` decimal(10,2) DEFAULT NULL,
  `qrCodeUrl` varchar(500) DEFAULT NULL,
  `qrCodeImagePath` varchar(500) DEFAULT NULL,
  `einkDeviceId` varchar(100) DEFAULT NULL,
  `hasEinkDevice` tinyint(4) NOT NULL DEFAULT 0,
  `isActive` tinyint(4) NOT NULL DEFAULT 1,
  `createdById` int(11) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `minewSynced` tinyint(4) NOT NULL DEFAULT 0 COMMENT 'Minew sync status: 0=not synced, 1=synced',
  `minewSyncedAt` datetime(3) DEFAULT NULL,
  `minewGoodsId` varchar(255) DEFAULT NULL COMMENT 'Minew cloud product ID',
  `minewSyncError` text DEFAULT NULL COMMENT 'Last sync error message',
  `minewBoundAt` datetime(3) DEFAULT NULL,
  `minewBoundLabel` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `manager_id`, `name`, `description`, `sku`, `categoryId`, `supplierId`, `location`, `reorderThreshold`, `standardOrderQty`, `unitPrice`, `qrCodeUrl`, `qrCodeImagePath`, `einkDeviceId`, `hasEinkDevice`, `isActive`, `createdById`, `createdAt`, `updatedAt`, `minewSynced`, `minewSyncedAt`, `minewGoodsId`, `minewSyncError`, `minewBoundAt`, `minewBoundLabel`) VALUES
(15, 25, 'Short shirt', 'for Gregory', 'TWL-QQQ_111', 1, 1, 'floor-3', 1, 100, 1000.00, '0x111111111', NULL, 'e10000031cb5', 1, 1, 1, '2026-02-14 03:07:21.532', '2026-02-14 03:07:23.739', 1, '2026-02-14 03:07:23.739', '15', NULL, '2026-02-14 03:08:16.461', 'e10000031cb5'),
(16, 25, 'Towel', 'linen', 'TWL-QQQ_222', 1, 1, 'floor-2', 2, 500, 100.00, '0x222222', NULL, 'e10000031c76', 1, 1, 1, '2026-02-14 03:14:51.685', '2026-02-14 03:14:54.752', 1, '2026-02-14 03:14:54.752', '16', NULL, '2026-02-14 03:16:33.479', 'e10000031c76');

-- --------------------------------------------------------

--
-- Table structure for table `replenishment_requests`
--

CREATE TABLE `replenishment_requests` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `requestedById` int(11) NOT NULL,
  `requestMethod` varchar(20) NOT NULL,
  `deviceInfo` varchar(255) DEFAULT NULL,
  `requestedQty` int(11) DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `priority` varchar(20) NOT NULL DEFAULT 'NORMAL',
  `approvedById` int(11) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `completedAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_history`
--

CREATE TABLE `stock_history` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `eventType` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `userId` int(11) DEFAULT NULL,
  `orderId` int(11) DEFAULT NULL,
  `requestId` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contactName` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `isActive` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `manager_id`, `name`, `contactName`, `phone`, `email`, `address`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 25, 'Alibaba', 'karan guptage', NULL, 'superadmin@facturexl.com', 'Samnatha Street, Tracy, CA, USA, 95391\nAndover Street, Lawrence, KS, USA, 66049', 1, '2026-02-03 18:45:17.274', '2026-02-03 18:45:17.272');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `isActive` tinyint(4) DEFAULT 0,
  `passwordRequest` varchar(255) DEFAULT NULL,
  `isPasswordRequest` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `manager_id`, `username`, `password`, `isActive`, `passwordRequest`, `isPasswordRequest`) VALUES
(1, 25, 'spider', '$pbkdf2-sha256$29000$pRpSItipviERdpQ0na820X4XwNjHH.sM3UyBZ/bkv2w$.gTDlZeTSoK.BKBaiZzva/TKzDL5DcD7BIqiaIq16Xg', 1, NULL, 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `apikey`
--
ALTER TABLE `apikey`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `categories_manager_id_idx` (`manager_id`),
  ADD KEY `categories_manager_id_name_idx` (`manager_id`,`name`);

--
-- Indexes for table `device`
--
ALTER TABLE `device`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `gateway`
--
ALTER TABLE `gateway`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_manager_mac` (`manager_id`,`mac_address`),
  ADD KEY `gateway_manager_id_idx` (`manager_id`);

--
-- Indexes for table `minew_config`
--
ALTER TABLE `minew_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `minew_config_configKey_key` (`configKey`),
  ADD KEY `minew_config_configKey_idx` (`configKey`);

--
-- Indexes for table `minew_sync_queue`
--
ALTER TABLE `minew_sync_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `minew_sync_queue_status_scheduledAt_idx` (`status`,`scheduledAt`),
  ADD KEY `minew_sync_queue_entityType_entityId_idx` (`entityType`,`entityId`);

--
-- Indexes for table `minew_token_cache`
--
ALTER TABLE `minew_token_cache`
  ADD PRIMARY KEY (`id`),
  ADD KEY `minew_token_cache_expiresAt_idx` (`expiresAt`),
  ADD KEY `minew_token_cache_username_idx` (`username`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_manager_ordernumber` (`manager_id`,`orderNumber`),
  ADD KEY `orders_manager_id_idx` (`manager_id`),
  ADD KEY `orders_manager_id_orderDate_idx` (`manager_id`,`orderDate`),
  ADD KEY `orders_manager_id_status_idx` (`manager_id`,`status`),
  ADD KEY `orders_receivedById_idx` (`receivedById`),
  ADD KEY `orders_supplierId_idx` (`supplierId`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_items_manager_id_idx` (`manager_id`),
  ADD KEY `order_items_manager_id_orderId_idx` (`manager_id`,`orderId`),
  ADD KEY `order_items_orderId_idx` (`orderId`),
  ADD KEY `order_items_productId_idx` (`productId`),
  ADD KEY `order_items_replenishmentRequestId_idx` (`replenishmentRequestId`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_manager_eink` (`manager_id`,`einkDeviceId`),
  ADD UNIQUE KEY `unique_manager_qrcode` (`manager_id`,`qrCodeUrl`),
  ADD UNIQUE KEY `unique_manager_sku` (`manager_id`,`sku`),
  ADD KEY `products_categoryId_fkey` (`categoryId`),
  ADD KEY `products_manager_id_categoryId_idx` (`manager_id`,`categoryId`),
  ADD KEY `products_manager_id_idx` (`manager_id`),
  ADD KEY `products_manager_id_isActive_idx` (`manager_id`,`isActive`),
  ADD KEY `products_manager_id_supplierId_idx` (`manager_id`,`supplierId`),
  ADD KEY `products_supplierId_fkey` (`supplierId`),
  ADD KEY `products_createdById_idx` (`createdById`);

--
-- Indexes for table `replenishment_requests`
--
ALTER TABLE `replenishment_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `replenishment_requests_approvedById_idx` (`approvedById`),
  ADD KEY `replenishment_requests_manager_id_createdAt_idx` (`manager_id`,`createdAt`),
  ADD KEY `replenishment_requests_manager_id_idx` (`manager_id`),
  ADD KEY `replenishment_requests_manager_id_productId_idx` (`manager_id`,`productId`),
  ADD KEY `replenishment_requests_manager_id_status_idx` (`manager_id`,`status`),
  ADD KEY `replenishment_requests_productId_idx` (`productId`),
  ADD KEY `replenishment_requests_requestedById_idx` (`requestedById`);

--
-- Indexes for table `stock_history`
--
ALTER TABLE `stock_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_history_manager_id_eventType_idx` (`manager_id`,`eventType`),
  ADD KEY `stock_history_manager_id_idx` (`manager_id`),
  ADD KEY `stock_history_manager_id_productId_idx` (`manager_id`,`productId`),
  ADD KEY `stock_history_manager_id_timestamp_idx` (`manager_id`,`timestamp`),
  ADD KEY `stock_history_productId_idx` (`productId`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `suppliers_manager_id_idx` (`manager_id`),
  ADD KEY `suppliers_manager_id_isActive_idx` (`manager_id`,`isActive`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `apikey`
--
ALTER TABLE `apikey`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `device`
--
ALTER TABLE `device`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `gateway`
--
ALTER TABLE `gateway`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `minew_config`
--
ALTER TABLE `minew_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `minew_sync_queue`
--
ALTER TABLE `minew_sync_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `minew_token_cache`
--
ALTER TABLE `minew_token_cache`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=225;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `replenishment_requests`
--
ALTER TABLE `replenishment_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `stock_history`
--
ALTER TABLE `stock_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_replenishmentRequestId_fkey` FOREIGN KEY (`replenishmentRequestId`) REFERENCES `replenishment_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `products_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `products_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `replenishment_requests`
--
ALTER TABLE `replenishment_requests`
  ADD CONSTRAINT `replenishment_requests_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `replenishment_requests_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `replenishment_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
