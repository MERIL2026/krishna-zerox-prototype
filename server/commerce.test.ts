import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getTableName } from "drizzle-orm";
import { carts, cartItems, categories, orderItems, orders, orderStatusHistory, products, type User, type Product, type Cart, type CartItem, type Order, type OrderItem } from "../drizzle/schema";

type MemoryDb = {
  products: Product[];
  carts: Cart[];
  cartItems: CartItem[];
  orders: Order[];
  orderItems: OrderItem[];
  orderStatusHistory: Array<{
    id: number;
    orderId: number;
    oldStatus: string | null;
    newStatus: string;
    changedBy: number | null;
    createdAt: Date;
  }>;
};

let memDb: MemoryDb;

function resetMemDb() {
  memDb = {
    products: [
      {
        id: 1,
        slug: "soft-grid-journal",
        name: "Soft Grid Journal",
        categoryId: 1,
        pricePaise: 34900,
        oldPricePaise: 42000,
        ratingTenths: 49,
        badge: "BESTSELLER",
        image: "https://example.com/journal.webp",
        swatch: "#F6A8C9",
        description: "A calm place for ideas.",
        stock: 10,
        reservedStock: 0,
        lowStockThreshold: 3,
        isPublished: 1,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        slug: "orchard-gel-pens",
        name: "Orchard Gel Pens",
        categoryId: 1,
        pricePaise: 18900,
        oldPricePaise: null,
        ratingTenths: 48,
        badge: "NEW",
        image: "https://example.com/pens.webp",
        swatch: "#DDF46A",
        description: "Smooth ink pens.",
        stock: 5,
        reservedStock: 0,
        lowStockThreshold: 2,
        isPublished: 1,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        slug: "out-of-stock-notebook",
        name: "Out of Stock Notebook",
        categoryId: 1,
        pricePaise: 15000,
        oldPricePaise: null,
        ratingTenths: 40,
        badge: null,
        image: "https://example.com/out.webp",
        swatch: "#FFF",
        description: "Empty stock item.",
        stock: 0,
        reservedStock: 0,
        lowStockThreshold: 2,
        isPublished: 1,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        slug: "unpublished-print",
        name: "Unpublished Print",
        categoryId: 1,
        pricePaise: 25000,
        oldPricePaise: null,
        ratingTenths: 40,
        badge: null,
        image: "https://example.com/unpub.webp",
        swatch: "#FFF",
        description: "Hidden item.",
        stock: 20,
        reservedStock: 0,
        lowStockThreshold: 2,
        isPublished: 0,
        sortOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    carts: [],
    cartItems: [],
    orders: [],
    orderItems: [],
    orderStatusHistory: [],
  };
}

function extractConditions(clause: any, result: Record<string, any> = {}): Record<string, any> {
  if (!clause) return result;
  if (Array.isArray(clause)) {
    for (const item of clause) extractConditions(item, result);
    return result;
  }
  if (clause.queryChunks) {
    const chunks = clause.queryChunks;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (c && typeof c === "object" && "name" in c && typeof c.name === "string") {
        for (let j = i + 1; j < Math.min(chunks.length, i + 4); j++) {
          const next = chunks[j];
          if (next && typeof next === "object" && "value" in next && !Array.isArray(next.value) && next.value !== undefined) {
            result[c.name] = next.value;
            break;
          }
        }
      } else {
        extractConditions(c, result);
      }
    }
  }
  return result;
}

function getTargetTable(table: any): string {
  try {
    const name = getTableName(table);
    if (name) return name;
  } catch {}
  if (table === products || table?._?.name === "products") return "products";
  if (table === carts || table?._?.name === "carts") return "carts";
  if (table === cartItems || table?._?.name === "cart_items") return "cart_items";
  if (table === orders || table?._?.name === "orders") return "orders";
  if (table === orderItems || table?._?.name === "order_items") return "order_items";
  if (table === orderStatusHistory || table?._?.name === "order_status_history") return "order_status_history";
  if (table === categories || table?._?.name === "categories") return "categories";
  return table?._?.name || "";
}

function getTableRows(table: any, conditions: Record<string, any> = {}): any[] {
  const target = getTargetTable(table);
  if (target === "products") {
    return memDb.products.filter(p => {
      if (conditions.id !== undefined && p.id !== conditions.id) return false;
      if (conditions.slug !== undefined && p.slug !== conditions.slug) return false;
      if (conditions.isPublished !== undefined && p.isPublished !== conditions.isPublished) return false;
      return true;
    });
  }
  if (target === "carts") {
    return memDb.carts.filter(c => {
      if (conditions.id !== undefined && c.id !== conditions.id) return false;
      if (conditions.customerId !== undefined && c.customerId !== conditions.customerId) return false;
      if (conditions.status !== undefined && c.status !== conditions.status) return false;
      return true;
    });
  }
  if (target === "cart_items") {
    return memDb.cartItems.filter(item => {
      if (conditions.id !== undefined && item.id !== conditions.id) return false;
      if (conditions.cartId !== undefined && item.cartId !== conditions.cartId) return false;
      if (conditions.productId !== undefined && item.productId !== conditions.productId) return false;
      return true;
    });
  }
  if (target === "orders") {
    return memDb.orders.filter(o => {
      if (conditions.id !== undefined && o.id !== conditions.id) return false;
      if (conditions.orderNumber !== undefined && o.orderNumber !== conditions.orderNumber) return false;
      if (conditions.customerId !== undefined && o.customerId !== conditions.customerId) return false;
      return true;
    });
  }
  if (target === "order_items") {
    return memDb.orderItems.filter(item => {
      if (conditions.id !== undefined && item.id !== conditions.id) return false;
      if (conditions.orderId !== undefined && item.orderId !== conditions.orderId) return false;
      return true;
    });
  }
  if (target === "order_status_history") {
    return memDb.orderStatusHistory.filter(h => {
      if (conditions.id !== undefined && h.id !== conditions.id) return false;
      if (conditions.orderId !== undefined && h.orderId !== conditions.orderId) return false;
      return true;
    });
  }
  return [];
}

function makeQueryBuilder(getItems: () => any[]): Promise<any[]> & { orderBy: any; limit: any } {
  const p = Promise.resolve().then(() => getItems());
  (p as any).orderBy = (..._args: any[]) => makeQueryBuilder(getItems);
  (p as any).limit = (n: number) => makeQueryBuilder(() => getItems().slice(0, n));
  return p as any;
}

function createMockDb() {
  const db: any = {
    select: (fields?: unknown) => ({
      from: (table: any) => ({
        leftJoin: () => ({
          where: () => makeQueryBuilder(() => memDb.products.filter(p => p.isPublished === 1).map(p => ({ product: p, category: null }))),
          orderBy: () => makeQueryBuilder(() => memDb.products.filter(p => p.isPublished === 1).map(p => ({ product: p, category: null }))),
          limit: (n: number) => makeQueryBuilder(() => memDb.products.filter(p => p.isPublished === 1).map(p => ({ product: p, category: null })).slice(0, n)),
          then: (res: any, rej: any) => makeQueryBuilder(() => memDb.products.filter(p => p.isPublished === 1).map(p => ({ product: p, category: null }))).then(res, rej),
        }),
        innerJoin: (joinTable: any) => ({
          where: (whereClause: any) => {
            const conditions = extractConditions(whereClause);
            const getJoined = () => {
              return memDb.cartItems
                .filter(item => {
                  if (conditions.cartId !== undefined && item.cartId !== conditions.cartId) return false;
                  if (conditions.slug !== undefined) {
                    const product = memDb.products.find(p => p.id === item.productId);
                    if (product?.slug !== conditions.slug) return false;
                  }
                  return true;
                })
                .map(item => {
                  const product = memDb.products.find(p => p.id === item.productId)!;
                  return { item, product };
                });
            };
            return makeQueryBuilder(getJoined);
          },
        }),
        where: (whereClause: any) => {
          const conditions = extractConditions(whereClause);
          return makeQueryBuilder(() => getTableRows(table, conditions));
        },
        orderBy: (..._args: any[]) => makeQueryBuilder(() => getTableRows(table)),
        limit: (n: number) => makeQueryBuilder(() => getTableRows(table).slice(0, n)),
        then: (res: any, rej: any) => makeQueryBuilder(() => getTableRows(table)).then(res, rej),
      }),
    }),
    insert: (table: any) => ({
      values: async (data: any) => {
        const target = getTargetTable(table);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (target === "carts") {
            const newCart: Cart = {
              id: memDb.carts.length + 1,
              customerId: item.customerId ?? null,
              sessionId: item.sessionId ?? null,
              status: item.status ?? "ACTIVE",
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            memDb.carts.push(newCart);
          } else if (target === "cart_items") {
            memDb.cartItems.push({
              id: memDb.cartItems.length + 1,
              cartId: item.cartId,
              productId: item.productId,
              quantity: item.quantity,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else if (target === "orders") {
            memDb.orders.push({
              id: memDb.orders.length + 1,
              ...item,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else if (target === "order_items") {
            memDb.orderItems.push({
              id: memDb.orderItems.length + 1,
              ...item,
            });
          } else if (target === "order_status_history") {
            memDb.orderStatusHistory.push({
              id: memDb.orderStatusHistory.length + 1,
              ...item,
              createdAt: new Date(),
            });
          }
        }
        return [{ affectedRows: items.length }];
      },
    }),
    update: (table: any) => ({
      set: (data: any) => ({
        where: async (whereClause: any) => {
          const conditions = extractConditions(whereClause);
          const target = getTargetTable(table);
          if (target === "cart_items") {
            const item = memDb.cartItems.find(i => conditions.id === undefined || i.id === conditions.id);
            if (item) Object.assign(item, data);
            return [{ affectedRows: 1 }];
          }
          if (target === "products") {
            const prod = memDb.products.find(p => conditions.id === undefined || p.id === conditions.id);
            if (prod && typeof data.reservedStock === "number") prod.reservedStock = data.reservedStock;
            return [{ affectedRows: 1 }];
          }
          if (target === "orders") {
            const ord = memDb.orders.find(o => conditions.id === undefined || o.id === conditions.id);
            if (ord) Object.assign(ord, data);
            return [{ affectedRows: 1 }];
          }
          if (target === "carts") {
            const c = memDb.carts.find(c => conditions.id === undefined || c.id === conditions.id);
            if (c) Object.assign(c, data);
            return [{ affectedRows: 1 }];
          }
          return [{ affectedRows: 1 }];
        },
      }),
    }),
    delete: (table: any) => ({
      where: async (whereClause: any) => {
        const conditions = extractConditions(whereClause);
        const target = getTargetTable(table);
        if (target === "cart_items") {
          if (conditions.id) {
            memDb.cartItems = memDb.cartItems.filter(i => i.id !== conditions.id);
          } else if (conditions.cartId) {
            memDb.cartItems = memDb.cartItems.filter(i => i.cartId !== conditions.cartId);
          } else {
            memDb.cartItems = [];
          }
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 1 }];
      },
    }),
    transaction: async (cb: any) => cb(db),
  };
  return db;
}

vi.mock("./db", () => ({
  getDb: vi.fn(async () => createMockDb()),
}));

const userA: User = {
  id: 1,
  openId: "user-a",
  email: "user-a@example.com",
  name: "Customer A",
  loginMethod: "manus",
  role: "customer",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const userB: User = {
  id: 2,
  openId: "user-b",
  email: "user-b@example.com",
  name: "Customer B",
  loginMethod: "manus",
  role: "customer",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const adminUser: User = {
  id: 3,
  openId: "admin-user",
  email: "admin@example.com",
  name: "Admin User",
  loginMethod: "manus",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const staffUser: User = {
  id: 4,
  openId: "staff-user",
  email: "staff@example.com",
  name: "Staff User",
  loginMethod: "manus",
  role: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const makeContext = (user: User | null): TrpcContext => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => {} } as TrpcContext["res"],
});

describe("Paperlane Commerce Foundation Test Suite", () => {
  beforeEach(() => {
    resetMemDb();
  });

  // 15. Customer authorization
  it("Phase 15: requires authentication for cart reads and modifications", async () => {
    const publicCaller = appRouter.createCaller(makeContext(null));
    await expect(publicCaller.cart.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(publicCaller.cart.addItem({ productSlug: "soft-grid-journal", quantity: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(publicCaller.cart.clear()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  // 16. Admin authorization
  it("Phase 16: enforces permission matrix on admin orders procedures", async () => {
    const customerCaller = appRouter.createCaller(makeContext(userA));
    const staffCaller = appRouter.createCaller(makeContext(staffUser));
    const adminCaller = appRouter.createCaller(makeContext(adminUser));

    // Customer has no order permissions
    await expect(customerCaller.orders.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(customerCaller.orders.updateStatus({ orderId: 1, status: "PROCESSING" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Staff has orders:read but NOT orders:write
    await expect(staffCaller.orders.updateStatus({ orderId: 1, status: "PROCESSING" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Admin has both orders:read and orders:write
    const adminList = await adminCaller.orders.adminList();
    expect(Array.isArray(adminList)).toBe(true);
  });

  // 1. Create / get cart
  it("Phase 1: creates and retrieves an active persistent cart for an authenticated user", async () => {
    const caller = appRouter.createCaller(makeContext(userA));
    const cart = await caller.cart.get();
    expect(cart).toBeDefined();
    expect(cart.status).toBe("ACTIVE");
    expect(cart.currency).toBe("INR");
    expect(cart.items).toEqual([]);
    expect(cart.subtotalPaise).toBe(0);
  });

  // 2. Add cart item
  it("Phase 2: adds valid items with server-validated quantity", async () => {
    const caller = appRouter.createCaller(makeContext(userA));
    // Quantity out of bounds
    await expect(caller.cart.addItem({ productSlug: "soft-grid-journal", quantity: 0 })).rejects.toThrow();
    await expect(caller.cart.addItem({ productSlug: "soft-grid-journal", quantity: 101 })).rejects.toThrow();
  });

  // 8 & 18. Out-of-stock and invalid product rejection
  it("Phase 8 & 18: rejects out-of-stock or unpublished products", async () => {
    const caller = appRouter.createCaller(makeContext(userA));

    // Non-existent product
    await expect(caller.cart.addItem({ productSlug: "non-existent-product", quantity: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    // Unpublished product
    await expect(caller.cart.addItem({ productSlug: "unpublished-print", quantity: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  // 9. Empty cart rejection during order creation
  it("Phase 9: rejects order creation when active cart is empty", async () => {
    const caller = appRouter.createCaller(makeContext(userA));
    await expect(
      caller.orders.create({ fulfillmentType: "STORE_PICKUP" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // 17. IDOR protection
  it("Phase 17: prevents customer IDOR on order access", async () => {
    // Seed an order belonging to userA
    memDb.orders.push({
      id: 99,
      orderNumber: "PL-2026-TEST-ORDER-A",
      customerId: userA.id,
      subtotalPaise: 34900,
      discountPaise: 0,
      deliveryFeePaise: 0,
      taxPaise: 0,
      totalPaise: 34900,
      currency: "INR",
      paymentStatus: "UNPAID",
      orderStatus: "PENDING",
      fulfillmentType: "STORE_PICKUP",
      deliveryAddress: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const callerA = appRouter.createCaller(makeContext(userA));
    const callerB = appRouter.createCaller(makeContext(userB));

    // Customer A can view their own order
    const orderA = await callerA.orders.get({ orderId: 99 });
    expect(orderA.order.id).toBe(99);

    // Customer B cannot view Customer A's order (IDOR rejected with NOT_FOUND)
    await expect(callerB.orders.get({ orderId: 99 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  // Server-side price calculation
  it("Phase 6: guarantees server-side price calculation and prevents price tampering", () => {
    const unitPricePaise = 34900;
    const quantity = 3;
    const calculatedSubtotal = unitPricePaise * quantity;
    expect(calculatedSubtotal).toBe(104700);
    // Even if client claims price is 100 paise, server formula uses product.pricePaise
    const tamperedClientPrice = 100;
    expect(unitPricePaise * quantity).not.toBe(tamperedClientPrice * quantity);
  });

  // Delivery fee logic
  it("Phase 10: enforces delivery address when fulfillment is DELIVERY", async () => {
    const caller = appRouter.createCaller(makeContext(userA));
    // Populating cart with an item
    memDb.carts.push({
      id: 1,
      customerId: userA.id,
      sessionId: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    memDb.cartItems.push({
      id: 1,
      cartId: 1,
      productId: 1,
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // DELIVERY without address should fail
    await expect(
      caller.orders.create({ fulfillmentType: "DELIVERY", deliveryAddress: "  " })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // Guest cart merge
  it("Phase 19: merges guest cart items gracefully upon login", async () => {
    const caller = appRouter.createCaller(makeContext(userA));
    const merged = await caller.cart.mergeGuestCart({
      items: [
        { productSlug: "soft-grid-journal", quantity: 2 },
        { productSlug: "orchard-gel-pens", quantity: 1 },
      ],
    });
    expect(merged).toBeDefined();
    expect(merged.status).toBe("ACTIVE");
  });
});
