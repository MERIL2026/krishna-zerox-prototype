ALTER TABLE `categories` ADD `image` text;--> statement-breakpoint
ALTER TABLE `products` ADD `sku` varchar(80);--> statement-breakpoint
ALTER TABLE `products` ADD `shortDescription` text;--> statement-breakpoint
ALTER TABLE `products` ADD `additionalImages` text;--> statement-breakpoint
ALTER TABLE `products` ADD `isFeatured` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `products_sku_idx` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`categoryId`);
