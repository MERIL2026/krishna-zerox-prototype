import { and, asc, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { cartItems, carts, orderItems, orders, orderStatusHistory, products, type Order, type User } from "../drizzle/schema";
import { getDb } from "./db";

const DELIVERY_FEE_PAISE = 5000;
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type FulfillmentType = "STORE_PICKUP" | "SELF_PICKUP" | "DELIVERY";

function money(value: number) {
  return Math.max(0, Math.round(value));
}

function orderNumber() {
  return `PL-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function activeCart(db: Db, userId: number, create = true) {
  const found = await db.select().from(carts).where(and(eq(carts.customerId, userId), eq(carts.status, "ACTIVE"))).orderBy(desc(carts.updatedAt)).limit(1);
  if (found[0] || !create) return found[0];
  await db.insert(carts).values({ customerId: userId, status: "ACTIVE" });
  const created = await db.select().from(carts).where(and(eq(carts.customerId, userId), eq(carts.status, "ACTIVE"))).orderBy(desc(carts.createdAt)).limit(1);
  return created[0];
}

async function cartState(db: Db, cart: NonNullable<Awaited<ReturnType<typeof activeCart>>>) {
  const rows = await db.select({ item: cartItems, product: products }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.cartId, cart.id)).orderBy(asc(cartItems.id));
  const items = rows.map(({ item, product }) => ({
    id: product.slug,
    productId: product.id,
    name: product.name,
    category: "Product",
    price: Math.round(product.pricePaise / 100),
    pricePaise: product.pricePaise,
    image: product.image,
    swatch: product.swatch,
    description: product.description ?? "",
    quantity: item.quantity,
    availableStock: Math.max(0, product.stock - product.reservedStock),
    isPublished: product.isPublished === 1,
  }));
  const subtotalPaise = items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  return { id: cart.id, status: cart.status, items, subtotalPaise, totalPaise: subtotalPaise, currency: "INR" };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Commerce database is unavailable" });
  return db;
}

async function requireProduct(db: Db, slug: string) {
  const row = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  const product = row[0];
  if (!product || product.isPublished !== 1) throw new TRPCError({ code: "BAD_REQUEST", message: "This product is no longer available." });
  return product;
}

function validateQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a quantity between 1 and 100." });
}

export async function getCart(user: User) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id);
  if (!cart) return { id: null, status: "ACTIVE" as const, items: [], subtotalPaise: 0, totalPaise: 0, currency: "INR" };
  return cartState(db, cart);
}

export async function addCartItem(user: User, slug: string, quantity: number) {
  validateQuantity(quantity);
  const db = await requireDb();
  const product = await requireProduct(db, slug);
  const available = product.stock - product.reservedStock;
  const cart = await activeCart(db, user.id, true);
  if (!cart) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create cart" });
  const existing = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, product.id))).limit(1);
  const nextQuantity = (existing[0]?.quantity ?? 0) + quantity;
  if (nextQuantity > available) throw new TRPCError({ code: "BAD_REQUEST", message: `Only ${Math.max(0, available)} units are currently available.` });
  if (existing[0]) await db.update(cartItems).set({ quantity: nextQuantity }).where(eq(cartItems.id, existing[0].id));
  else await db.insert(cartItems).values({ cartId: cart.id, productId: product.id, quantity });
  return cartState(db, cart);
}

export async function updateCartItem(user: User, slug: string, quantity: number) {
  validateQuantity(quantity);
  const db = await requireDb();
  const product = await requireProduct(db, slug);
  const available = product.stock - product.reservedStock;
  if (quantity > available) throw new TRPCError({ code: "BAD_REQUEST", message: `Only ${Math.max(0, available)} units are currently available.` });
  const cart = await activeCart(db, user.id, false);
  if (!cart) throw new TRPCError({ code: "NOT_FOUND", message: "Your cart is empty." });
  const existing = await db.select({ item: cartItems }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(and(eq(cartItems.cartId, cart.id), eq(products.slug, slug))).limit(1);
  if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "That item is not in your cart." });
  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, existing[0].item.id));
  return cartState(db, cart);
}

export async function removeCartItem(user: User, slug: string) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id, false);
  if (!cart) return getCart(user);
  const existing = await db.select({ item: cartItems }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(and(eq(cartItems.cartId, cart.id), eq(products.slug, slug))).limit(1);
  if (existing[0]) await db.delete(cartItems).where(eq(cartItems.id, existing[0].item.id));
  return cartState(db, cart);
}

export async function clearCart(user: User) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id, false);
  if (cart) await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
  return getCart(user);
}

export async function mergeGuestCart(user: User, guestItems: Array<{ productSlug: string; quantity: number }>) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id, true);
  if (!cart) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create cart" });

  for (const item of guestItems) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;
    const row = await db.select().from(products).where(eq(products.slug, item.productSlug)).limit(1);
    const product = row[0];
    if (!product || product.isPublished !== 1) continue;
    const available = Math.max(0, product.stock - product.reservedStock);
    if (available <= 0) continue;

    const existing = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, product.id))).limit(1);
    const cappedQuantity = Math.min(100, Math.min(available, (existing[0]?.quantity ?? 0) + item.quantity));
    if (cappedQuantity <= 0) continue;

    if (existing[0]) {
      await db.update(cartItems).set({ quantity: cappedQuantity }).where(eq(cartItems.id, existing[0].id));
    } else {
      await db.insert(cartItems).values({ cartId: cart.id, productId: product.id, quantity: cappedQuantity });
    }
  }

  return cartState(db, cart);
}

export async function createOrder(user: User, input: { fulfillmentType: FulfillmentType; deliveryAddress?: string }) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id, false);
  if (!cart) throw new TRPCError({ code: "BAD_REQUEST", message: "Your cart is empty." });
  if (input.fulfillmentType === "DELIVERY" && !input.deliveryAddress?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Add a delivery address to continue." });

  return db.transaction(async (tx) => {
    const rows = await tx.select({ item: cartItems, product: products }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.cartId, cart.id)).orderBy(asc(cartItems.id));
    if (rows.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Your cart is empty." });

    const lineItems = [] as Array<{ product: typeof products.$inferSelect; quantity: number; subtotalPaise: number }>;
    for (const { item, product } of rows) {
      if (product.isPublished !== 1) throw new TRPCError({ code: "BAD_REQUEST", message: `${product.name} is no longer available.` });
      if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid cart quantity." });
      const updateRes = await tx.update(products).set({ reservedStock: sql`${products.reservedStock} + ${item.quantity}` }).where(and(eq(products.id, product.id), sql`${products.stock} - ${products.reservedStock} >= ${item.quantity}`));
      const affectedRows = Array.isArray(updateRes) ? (updateRes[0] as any)?.affectedRows ?? 0 : (updateRes as any)?.affectedRows ?? 0;
      if (!affectedRows) throw new TRPCError({ code: "BAD_REQUEST", message: `Only ${Math.max(0, product.stock - product.reservedStock)} units of ${product.name} are currently available.` });
      lineItems.push({ product, quantity: item.quantity, subtotalPaise: product.pricePaise * item.quantity });
    }

    const subtotalPaise = lineItems.reduce((sum, line) => sum + line.subtotalPaise, 0);
    const deliveryFeePaise = input.fulfillmentType === "DELIVERY" ? DELIVERY_FEE_PAISE : 0;
    const totalPaise = money(subtotalPaise + deliveryFeePaise);
    const number = orderNumber();
    await tx.insert(orders).values({ orderNumber: number, customerId: user.id, subtotalPaise, discountPaise: 0, deliveryFeePaise, taxPaise: 0, totalPaise, currency: "INR", paymentStatus: "UNPAID", orderStatus: "PENDING", fulfillmentType: input.fulfillmentType, deliveryAddress: input.deliveryAddress?.trim() || null });
    const savedOrder = await tx.select().from(orders).where(eq(orders.orderNumber, number)).limit(1);
    const order = savedOrder[0];
    if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order could not be created." });
    await tx.insert(orderItems).values(lineItems.map(({ product, quantity, subtotalPaise }) => ({ orderId: order.id, productId: product.id, productNameSnapshot: product.name, skuSnapshot: product.slug, unitPricePaise: product.pricePaise, quantity, subtotalPaise })));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, oldStatus: null, newStatus: "PENDING", changedBy: user.id });
    await tx.update(carts).set({ status: "CONVERTED" }).where(eq(carts.id, cart.id));
    return { orderNumber: order.orderNumber, id: order.id, subtotalPaise, deliveryFeePaise, totalPaise, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus, fulfillmentType: order.fulfillmentType };
  });
}

export async function listCustomerOrders(user: User) {
  const db = await requireDb();
  return db.select().from(orders).where(eq(orders.customerId, user.id)).orderBy(desc(orders.createdAt));
}

export async function getCustomerOrder(user: User, orderId: number) {
  const db = await requireDb();
  const found = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, user.id))).limit(1);
  if (!found[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(asc(orderStatusHistory.createdAt));
  return { order: found[0], items, history };
}

export async function listAdminOrders() {
  const db = await requireDb();
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getAdminOrder(orderId: number) {
  const db = await requireDb();
  const found = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!found[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(asc(orderStatusHistory.createdAt));
  return { order: found[0], items, history };
}

export async function updateOrderStatus(user: User, orderId: number, status: Order["orderStatus"]) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const found = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = found[0];
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
    await tx.update(orders).set({ orderStatus: status }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({ orderId, oldStatus: order.orderStatus, newStatus: status, changedBy: user.id });
    if (status === "CANCELLED" || status === "REFUNDED") {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) await tx.update(products).set({ reservedStock: sql`GREATEST(0, ${products.reservedStock} - ${item.quantity})` }).where(eq(products.id, item.productId));
    }
    return { success: true } as const;
  });
}
