import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "customer", "admin", "owner", "staff"]).default("customer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 24 }).notNull().default("cream"),
  sortOrder: int("sortOrder").notNull().default(0),
  isPublished: int("isPublished").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  categoryId: int("categoryId").notNull(),
  pricePaise: int("pricePaise").notNull(),
  oldPricePaise: int("oldPricePaise"),
  ratingTenths: int("ratingTenths").notNull().default(0),
  badge: varchar("badge", { length: 32 }),
  image: text("image").notNull(),
  swatch: varchar("swatch", { length: 24 }).notNull().default("#FFF8EF"),
  description: text("description"),
  stock: int("stock").notNull().default(0),
  reservedStock: int("reservedStock").notNull().default(0),
  lowStockThreshold: int("lowStockThreshold").notNull().default(5),
  isPublished: int("isPublished").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("sessionId", { length: 128 }),
  status: mysqlEnum("status", ["ACTIVE", "CONVERTED", "ABANDONED"]).notNull().default("ACTIVE"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ customerStatusIdx: index("carts_customer_status_idx").on(table.customerId, table.status), sessionStatusIdx: index("carts_session_status_idx").on(table.sessionId, table.status) }));

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cartId").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: int("quantity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ cartProductUnique: uniqueIndex("cart_items_cart_product_unique").on(table.cartId, table.productId), cartIdx: index("cart_items_cart_idx").on(table.cartId) }));

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 40 }).notNull().unique(),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "restrict" }),
  subtotalPaise: int("subtotalPaise").notNull(),
  discountPaise: int("discountPaise").notNull().default(0),
  deliveryFeePaise: int("deliveryFeePaise").notNull().default(0),
  taxPaise: int("taxPaise").notNull().default(0),
  totalPaise: int("totalPaise").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  paymentStatus: mysqlEnum("paymentStatus", ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"]).notNull().default("UNPAID"),
  orderStatus: mysqlEnum("orderStatus", ["PENDING", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"]).notNull().default("PENDING"),
  fulfillmentType: mysqlEnum("fulfillmentType", ["STORE_PICKUP", "SELF_PICKUP", "DELIVERY"]).notNull(),
  deliveryAddress: text("deliveryAddress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ customerIdx: index("orders_customer_idx").on(table.customerId), statusIdx: index("orders_status_idx").on(table.orderStatus), createdIdx: index("orders_created_idx").on(table.createdAt) }));

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "restrict" }),
  productNameSnapshot: varchar("productNameSnapshot", { length: 180 }).notNull(),
  skuSnapshot: varchar("skuSnapshot", { length: 80 }),
  unitPricePaise: int("unitPricePaise").notNull(),
  quantity: int("quantity").notNull(),
  subtotalPaise: int("subtotalPaise").notNull(),
}, (table) => ({ orderIdx: index("order_items_order_idx").on(table.orderId) }));

export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  oldStatus: varchar("oldStatus", { length: 32 }),
  newStatus: varchar("newStatus", { length: 32 }).notNull(),
  changedBy: int("changedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ orderHistoryIdx: index("order_status_history_order_idx").on(table.orderId, table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
