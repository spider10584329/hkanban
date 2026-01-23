-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 23, 2026 at 06:10 PM
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
-- Database: `kanban`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `apikey`
--

INSERT INTO `apikey` (`id`, `manager_id`, `api_key`, `created_at`) VALUES
(4, 25, '936840be-a60f0546-21476597-22a3db77-1f2479af-569eb470-88c45dc0-f03efb96', '2026-01-22T12:23:05.471Z');

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
(1, 25, 'DSFDS', 'SADASDADSASD', NULL, '2026-01-20 13:53:55.464', '2026-01-20 13:53:55.463');

-- --------------------------------------------------------

--
-- Table structure for table `device_status`
--

CREATE TABLE `device_status` (
  `id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `deviceId` varchar(100) NOT NULL,
  `deviceType` varchar(50) NOT NULL,
  `deviceName` varchar(255) DEFAULT NULL,
  `firmwareVersion` varchar(50) DEFAULT NULL,
  `batteryLevel` int(11) DEFAULT NULL,
  `isOnline` tinyint(4) NOT NULL DEFAULT 1,
  `lastSyncAt` datetime(3) DEFAULT NULL,
  `lastButtonPress` datetime(3) DEFAULT NULL,
  `currentDisplay` varchar(100) DEFAULT NULL,
  `displayMessage` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `installationDate` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `device_status`
--

INSERT INTO `device_status` (`id`, `manager_id`, `deviceId`, `deviceType`, `deviceName`, `firmwareVersion`, `batteryLevel`, `isOnline`, `lastSyncAt`, `lastButtonPress`, `currentDisplay`, `displayMessage`, `location`, `installationDate`, `createdAt`, `updatedAt`) VALUES
(4, 25, 'AC233FC0001', 'E-ink 2.13', 'Room 201', NULL, NULL, 0, NULL, NULL, NULL, NULL, 'floor 2', '2026-01-21 09:01:39.343', '2026-01-21 09:01:39.345', '2026-01-21 09:01:39.343');

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

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `manager_id`, `orderNumber`, `supplierId`, `status`, `orderDate`, `expectedDelivery`, `actualDelivery`, `trackingNumber`, `trackingUrl`, `receivedById`, `receivedAt`, `receiptNotes`, `totalAmount`, `createdAt`, `updatedAt`) VALUES
(1, 25, 'ORD-00001', 1, 'DELIVERED', '2026-01-21 09:31:07.083', '2026-01-21 00:00:00.000', '2026-01-21 09:31:33.545', NULL, NULL, 1, '2026-01-21 09:31:33.545', NULL, 0.00, '2026-01-21 09:31:07.083', '2026-01-21 09:31:33.545'),
(2, 25, 'ORD-00002', 1, 'DELIVERED', '2026-01-21 09:41:04.094', '2026-01-21 00:00:00.000', '2026-01-21 09:42:09.000', NULL, NULL, 1, '2026-01-21 09:42:09.000', NULL, 0.00, '2026-01-21 09:41:04.094', '2026-01-21 09:42:09.000');

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

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `manager_id`, `orderId`, `productId`, `replenishmentRequestId`, `quantity`, `unitPrice`, `totalPrice`, `receivedQuantity`, `damageQuantity`, `notes`, `createdAt`, `updatedAt`) VALUES
(1, 25, 1, 3, 4, 5, 0.00, 0.00, NULL, NULL, NULL, '2026-01-21 09:31:07.092', '2026-01-21 09:31:07.067'),
(2, 25, 2, 3, 5, 10, 0.00, 0.00, NULL, NULL, NULL, '2026-01-21 09:41:04.097', '2026-01-21 09:41:04.091');

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
  `storageRequirements` text DEFAULT NULL,
  `reorderThreshold` int(11) DEFAULT NULL,
  `standardOrderQty` int(11) DEFAULT NULL,
  `unitPrice` decimal(10,2) DEFAULT NULL,
  `qrCodeUrl` varchar(500) DEFAULT NULL,
  `qrCodeImagePath` varchar(500) DEFAULT NULL,
  `einkDeviceId` varchar(100) DEFAULT NULL,
  `hasEinkDevice` tinyint(4) NOT NULL DEFAULT 0,
  `isActive` tinyint(4) NOT NULL DEFAULT 1,
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `manager_id`, `name`, `description`, `sku`, `categoryId`, `supplierId`, `location`, `storageRequirements`, `reorderThreshold`, `standardOrderQty`, `unitPrice`, `qrCodeUrl`, `qrCodeImagePath`, `einkDeviceId`, `hasEinkDevice`, `isActive`, `createdById`, `createdAt`, `updatedAt`) VALUES
(3, 25, 'ADADS', NULL, 'TWL-TL-001', 1, 1, 'floor 2', NULL, NULL, NULL, NULL, 'www-1234', NULL, 'AC233FC0001', 1, 1, 1, '2026-01-21 09:02:38.646', '2026-01-21 09:02:38.644');

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

--
-- Dumping data for table `replenishment_requests`
--

INSERT INTO `replenishment_requests` (`id`, `manager_id`, `productId`, `requestedById`, `requestMethod`, `deviceInfo`, `requestedQty`, `location`, `notes`, `status`, `priority`, `approvedById`, `approvedAt`, `rejectionReason`, `createdAt`, `updatedAt`, `completedAt`) VALUES
(3, 25, 3, 2, 'QR_SCAN', 'Mobile Scanner', 5, 'floor 2', NULL, 'COMPLETED', 'HIGH', 1, '2026-01-21 09:03:21.816', NULL, '2026-01-21 09:03:03.033', '2026-01-21 09:06:49.320', '2026-01-21 09:06:49.320'),
(4, 25, 3, 2, 'QR_SCAN', 'Mobile Scanner', 5, 'floor 2', NULL, 'COMPLETED', 'NORMAL', 1, '2026-01-21 09:16:54.975', NULL, '2026-01-21 09:16:44.680', '2026-01-21 09:31:33.568', '2026-01-21 09:31:33.568'),
(5, 25, 3, 2, 'QR_SCAN', 'Mobile Scanner', 10, 'floor 2', NULL, 'COMPLETED', 'HIGH', 1, '2026-01-21 09:40:01.098', NULL, '2026-01-21 09:39:12.057', '2026-01-21 09:42:09.016', '2026-01-21 09:42:09.016'),
(6, 25, 3, 2, 'QR_SCAN', 'Mobile Scanner', 5, 'floor 2', NULL, 'PENDING', 'NORMAL', NULL, NULL, NULL, '2026-01-22 12:13:29.828', '2026-01-22 12:13:29.825', NULL);

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
(1, 25, 'pp DEMI', 'milos micic', '+381 611182394', 'pjh@gmail.com', 'sdffds fdsfdsfdsf', 1, '2026-01-20 14:19:38.183', '2026-01-21 09:30:55.323');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(20) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `isActive` tinyint(4) DEFAULT 0,
  `passwordRequest` varchar(255) DEFAULT NULL,
  `isPasswordRequest` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `manager_id`, `username`, `password`, `isActive`, `passwordRequest`, `isPasswordRequest`) VALUES
(1, 25, 'pjh', '$pbkdf2-sha256$29000$sUqDowAB4CxQ3N0Tm/QMpGtypIXIVD67uzziyF2MpZo$O62vW02Io3orHVEiAsx.iJhk4PoDLH997ZnVr2XtRKE', 1, '0', 0),
(2, 25, 'aaa', '$pbkdf2-sha256$29000$BACCBbOF2bblUmbtE/KhdGM3iOxARqEPn2adkVkPvQ0$6rxHJkGedKZVRwuvqaf4Gv1X59o5.LynKFZRH.iIFNA', 1, NULL, 0);

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
-- Indexes for table `device_status`
--
ALTER TABLE `device_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_manager_device` (`manager_id`,`deviceId`),
  ADD KEY `device_status_manager_id_idx` (`manager_id`),
  ADD KEY `device_status_manager_id_isOnline_idx` (`manager_id`,`isOnline`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_manager_ordernumber` (`manager_id`,`orderNumber`),
  ADD KEY `orders_manager_id_idx` (`manager_id`),
  ADD KEY `orders_manager_id_status_idx` (`manager_id`,`status`),
  ADD KEY `orders_manager_id_orderDate_idx` (`manager_id`,`orderDate`),
  ADD KEY `orders_supplierId_idx` (`supplierId`),
  ADD KEY `orders_receivedById_idx` (`receivedById`);

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
  ADD UNIQUE KEY `unique_manager_sku` (`manager_id`,`sku`),
  ADD UNIQUE KEY `unique_manager_qrcode` (`manager_id`,`qrCodeUrl`),
  ADD UNIQUE KEY `unique_manager_eink` (`manager_id`,`einkDeviceId`),
  ADD KEY `products_manager_id_idx` (`manager_id`),
  ADD KEY `products_manager_id_categoryId_idx` (`manager_id`,`categoryId`),
  ADD KEY `products_manager_id_supplierId_idx` (`manager_id`,`supplierId`),
  ADD KEY `products_manager_id_isActive_idx` (`manager_id`,`isActive`),
  ADD KEY `products_createdById_idx` (`createdById`),
  ADD KEY `products_categoryId_fkey` (`categoryId`),
  ADD KEY `products_supplierId_fkey` (`supplierId`);

--
-- Indexes for table `replenishment_requests`
--
ALTER TABLE `replenishment_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `replenishment_requests_manager_id_idx` (`manager_id`),
  ADD KEY `replenishment_requests_manager_id_status_idx` (`manager_id`,`status`),
  ADD KEY `replenishment_requests_manager_id_productId_idx` (`manager_id`,`productId`),
  ADD KEY `replenishment_requests_manager_id_createdAt_idx` (`manager_id`,`createdAt`),
  ADD KEY `replenishment_requests_productId_idx` (`productId`),
  ADD KEY `replenishment_requests_requestedById_idx` (`requestedById`),
  ADD KEY `replenishment_requests_approvedById_idx` (`approvedById`);

--
-- Indexes for table `stock_history`
--
ALTER TABLE `stock_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_history_manager_id_idx` (`manager_id`),
  ADD KEY `stock_history_manager_id_productId_idx` (`manager_id`,`productId`),
  ADD KEY `stock_history_manager_id_eventType_idx` (`manager_id`,`eventType`),
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `device_status`
--
ALTER TABLE `device_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `replenishment_requests`
--
ALTER TABLE `replenishment_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  MODIFY `id` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  ADD CONSTRAINT `products_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
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
