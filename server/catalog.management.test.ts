import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getTableName } from "drizzle-orm";
import {
  categories,
  products,
  type Category,
  type Product,
  type User,
} from "../drizzle/schema";

type MemoryDb = {
  products: Product[];
  categories: Category[];
};

let memDb: MemoryDb;

function resetMemDb() {
  memDb = {
    categories: [
      {
        id: 1,
        slug: "stationery",
        name: "Stationery",
        description: "Everyday essentials",
        color: "pink",
        image: null,
        sortOrder: 1,
        isPublished: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        slug: "gifts",
        name: "Gifts",
        description: "Thoughtful presents",
        color: "yellow",
        image: null,
        sortOrder: 2,
        isPublished: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        slug: "archived-cat",
        name: "Archived Category",
        description: "Hidden category",
        color: "gray",
        image: null,
        sortOrder: 99,
        isPublished: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    products: [
      {
        id: 1,
        sku: "SKU-SGF-001",
        slug: "soft-grid-journal",
        name: "Soft Grid Journal",
        shortDescription: "A soft cover journal",
        categoryId: 1,
        pricePaise: 34900,
        oldPricePaise: 42000,
        ratingTenths: 49,
        badge: "BESTSELLER",
        image: "https://example.com/journal.webp",
        additionalImages: null,
        swatch: "#F6A8C9",
        description: "A calm place for ideas.",
        stock: 28,
        reservedStock: 0,
        lowStockThreshold: 5,
        isPublished: 1,
        isFeatured: 1,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        sku: "SKU-OGP-002",
        slug: "orchard-gel-pens",
        name: "Orchard Gel Pens",
        shortDescription: "Smooth writing pens",
        categoryId: 1,
        pricePaise: 18900,
        oldPricePaise: null,
        ratingTenths: 48,
        badge: "NEW",
        image: "https://example.com/pens.webp",
        additionalImages: null,
        swatch: "#DDF46A",
        description: "Smooth ink pens.",
        stock: 42,
        reservedStock: 0,
        lowStockThreshold: 5,
        isPublished: 1,
        isFeatured: 0,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        sku: "SKU-HIDDEN-003",
        slug: "hidden-stationery",
        name: "Hidden Stationery",
        shortDescription: "Unpublished item",
        categoryId: 1,
        pricePaise: 9900,
        oldPricePaise: null,
        ratingTenths: 40,
        badge: null,
        image: "https://example.com/hidden.webp",
        additionalImages: null,
        swatch: "#FFF",
        description: "Not for customer eyes.",
        stock: 10,
        reservedStock: 0,
        lowStockThreshold: 2,
        isPublished: 0,
        isFeatured: 0,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
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
  if (table === categories || table?._?.name === "categories") return "categories";
  return table?._?.name || "";
}

function getTableRows(table: any, conditions: Record<string, any> = {}): any[] {
  const target = getTargetTable(table);
  if (target === "products") {
    return memDb.products.filter((p) => {
      if (conditions.id !== undefined && p.id !== conditions.id) return false;
      if (conditions.sku !== undefined && p.sku !== conditions.sku) return false;
      if (conditions.slug !== undefined && p.slug !== conditions.slug) return false;
      if (conditions.categoryId !== undefined && p.categoryId !== conditions.categoryId) return false;
      if (conditions.isPublished !== undefined && p.isPublished !== conditions.isPublished) return false;
      return true;
    });
  }
  if (target === "categories") {
    return memDb.categories.filter((c) => {
      if (conditions.id !== undefined && c.id !== conditions.id) return false;
      if (conditions.slug !== undefined && c.slug !== conditions.slug) return false;
      if (conditions.isPublished !== undefined && c.isPublished !== conditions.isPublished) return false;
      return true;
    });
  }
  return [];
}

vi.mock("./db", () => ({
  getDb: vi.fn(async () => {
    return {
      select: (_fields?: any) => ({
        from: (table: any) => {
          let conditions: Record<string, any> = {};
          let joinedCategory = false;
          const queryObj = {
            leftJoin: (_joinTable: any, _on: any) => {
              joinedCategory = true;
              return queryObj;
            },
            where: (clause: any) => {
              conditions = extractConditions(clause, conditions);
              return queryObj;
            },
            orderBy: (..._order: any[]) => queryObj,
            limit: (n: number) => {
              const rows = getTableRows(table, conditions);
              if (joinedCategory && getTargetTable(table) === "products") {
                return rows.slice(0, n).map((p) => {
                  const cat = memDb.categories.find((c) => c.id === p.categoryId) ?? null;
                  return { product: p, category: cat };
                });
              }
              return rows.slice(0, n);
            },
            then: (resolve: any) => {
              const rows = getTableRows(table, conditions);
              if (joinedCategory && getTargetTable(table) === "products") {
                const combined = rows.map((p) => {
                  const cat = memDb.categories.find((c) => c.id === p.categoryId) ?? null;
                  return { product: p, category: cat };
                });
                return Promise.resolve(combined).then(resolve);
              }
              return Promise.resolve(rows).then(resolve);
            },
          };
          return queryObj;
        },
      }),
      insert: (table: any) => ({
        values: async (data: any) => {
          const target = getTargetTable(table);
          const items = Array.isArray(data) ? data : [data];
          if (target === "products") {
            for (const item of items) {
              const nextId = memDb.products.length ? Math.max(...memDb.products.map((p) => p.id)) + 1 : 1;
              memDb.products.push({
                ...item,
                id: nextId,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          } else if (target === "categories") {
            for (const item of items) {
              const nextId = memDb.categories.length ? Math.max(...memDb.categories.map((c) => c.id)) + 1 : 1;
              memDb.categories.push({
                ...item,
                id: nextId,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }
          return [{ insertId: 99 }];
        },
      }),
      update: (table: any) => ({
        set: (data: any) => ({
          where: async (clause: any) => {
            const conditions = extractConditions(clause);
            const target = getTargetTable(table);
            if (target === "products") {
              for (const p of memDb.products) {
                if (conditions.id !== undefined && p.id === conditions.id) Object.assign(p, data);
                if (conditions.slug !== undefined && p.slug === conditions.slug) Object.assign(p, data);
              }
            } else if (target === "categories") {
              for (const c of memDb.categories) {
                if (conditions.id !== undefined && c.id === conditions.id) Object.assign(c, data);
                if (conditions.slug !== undefined && c.slug === conditions.slug) Object.assign(c, data);
              }
            }
            return [{ affectedRows: 1 }];
          },
        }),
      }),
      delete: (table: any) => ({
        where: async (clause: any) => {
          const conditions = extractConditions(clause);
          const target = getTargetTable(table);
          if (target === "products") {
            memDb.products = memDb.products.filter((p) => p.id !== conditions.id);
          } else if (target === "categories") {
            memDb.categories = memDb.categories.filter((c) => c.id !== conditions.id);
          }
          return [{ affectedRows: 1 }];
        },
      }),
    };
  }),
}));

const mockOwner: User = {
  id: 1,
  openId: "owner_1",
  name: "Owner Meril",
  email: "owner@krishnaxerox.in",
  loginMethod: "manus",
  role: "owner",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockAdmin: User = {
  id: 2,
  openId: "admin_1",
  name: "Admin User",
  email: "admin@krishnaxerox.in",
  loginMethod: "manus",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockStaff: User = {
  id: 3,
  openId: "staff_1",
  name: "Staff Member",
  email: "staff@krishnaxerox.in",
  loginMethod: "manus",
  role: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockCustomer: User = {
  id: 4,
  openId: "cust_1",
  name: "John Customer",
  email: "cust@example.com",
  loginMethod: "manus",
  role: "customer",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function makeContext(user: User | null): TrpcContext {
  return {
    user,
    req: { cookies: {}, headers: {} } as any,
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
  };
}

describe("Product & Category Management (Phase Milestone)", () => {
  beforeEach(() => {
    resetMemDb();
  });

  // 1. Product creation
  it("1. allows an admin/owner to create a new product with valid data", async () => {
    const caller = appRouter.createCaller(makeContext(mockOwner));
    const result = await caller.catalog.createProduct({
      name: "Velvet Cover Sketchbook",
      sku: "SKU-VCS-001",
      categoryId: 1,
      pricePaise: 45000,
      oldPricePaise: 55000,
      stock: 25,
      lowStockThreshold: 4,
      image: "https://example.com/sketchbook.webp",
      shortDescription: "Heavyweight acid-free sketchbook",
      description: "Ideal for charcoal, watercolor, and pen drawings.",
      isPublished: true,
      isFeatured: true,
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Velvet Cover Sketchbook");
    expect(result.sku).toBe("SKU-VCS-001");
    expect(result.slug).toBe("velvet-cover-sketchbook");
    expect(result.pricePaise).toBe(45000);
    expect(result.stock).toBe(25);
    expect(result.isFeatured).toBe(1);

    // Verify product is in memory DB
    const found = memDb.products.find((p) => p.sku === "SKU-VCS-001");
    expect(found).toBeDefined();
  });

  // 2. Product validation
  it("2. validates required fields, negative price, and negative stock", async () => {
    const caller = appRouter.createCaller(makeContext(mockOwner));

    // Empty name
    await expect(
      caller.catalog.createProduct({
        name: "A",
        sku: "SKU-VAL-001",
        categoryId: 1,
        pricePaise: 1000,
        stock: 5,
        image: "https://example.com/item.webp",
      })
    ).rejects.toThrow();

    // Negative price
    await expect(
      caller.catalog.createProduct({
        name: "Test Negative Price",
        sku: "SKU-NEG-001",
        categoryId: 1,
        pricePaise: -500,
        stock: 5,
        image: "https://example.com/item.webp",
      })
    ).rejects.toThrow();

    // Negative stock
    await expect(
      caller.catalog.createProduct({
        name: "Test Negative Stock",
        sku: "SKU-STK-001",
        categoryId: 1,
        pricePaise: 500,
        stock: -10,
        image: "https://example.com/item.webp",
      })
    ).rejects.toThrow();
  });

  // 3. Duplicate SKU rejection
  it("3. rejects creation of product with duplicate SKU", async () => {
    const caller = appRouter.createCaller(makeContext(mockAdmin));

    // Try to create product with existing SKU "SKU-SGF-001"
    await expect(
      caller.catalog.createProduct({
        name: "Duplicate SKU Item",
        sku: "SKU-SGF-001",
        categoryId: 1,
        pricePaise: 25000,
        stock: 10,
        image: "https://example.com/item.webp",
      })
    ).rejects.toThrow(/already in use/i);
  });

  // 4. Product update
  it("4. updates existing product details and pricing immediately", async () => {
    const caller = appRouter.createCaller(makeContext(mockOwner));

    const updated = await caller.catalog.updateProduct({
      id: 1,
      name: "Updated Soft Grid Journal",
      pricePaise: 39900,
      stock: 50,
      badge: "UPDATED",
    });

    expect(updated).toBeDefined();
    expect(updated.name).toBe("Updated Soft Grid Journal");
    expect(updated.pricePaise).toBe(39900);
    expect(updated.stock).toBe(50);

    const inDb = memDb.products.find((p) => p.id === 1);
    expect(inDb?.name).toBe("Updated Soft Grid Journal");
    expect(inDb?.stock).toBe(50);
  });

  // 5. Product archive
  it("5. archives (unpublishes) a product without destroying record", async () => {
    const caller = appRouter.createCaller(makeContext(mockOwner));

    const res = await caller.catalog.archiveProduct({ id: 1, isPublished: false });
    expect(res.success).toBe(true);
    expect(res.isPublished).toBe(false);

    const inDb = memDb.products.find((p) => p.id === 1);
    expect(inDb?.isPublished).toBe(0);
  });

  // 6. Product authorization
  it("6. rejects product CRUD requests from unauthorized users (customers/staff)", async () => {
    const customerCaller = appRouter.createCaller(makeContext(mockCustomer));
    const staffCaller = appRouter.createCaller(makeContext(mockStaff));

    // Customer cannot create
    await expect(
      customerCaller.catalog.createProduct({
        name: "Unauthorized Pen",
        sku: "SKU-UNAUTH-1",
        categoryId: 1,
        pricePaise: 1000,
        stock: 5,
        image: "https://example.com/pen.webp",
      })
    ).rejects.toThrow(TRPCError);

    // Staff cannot update products (products:write is admin/owner only)
    await expect(
      staffCaller.catalog.updateProduct({
        id: 1,
        stock: 99,
      })
    ).rejects.toThrow(TRPCError);

    // Staff cannot archive product
    await expect(
      staffCaller.catalog.archiveProduct({ id: 1, isPublished: false })
    ).rejects.toThrow(TRPCError);
  });

  // 7. Category creation
  it("7. creates a new category with slug generation", async () => {
    const caller = appRouter.createCaller(makeContext(mockAdmin));

    const cat = await caller.catalog.createCategory({
      name: "Desk Organizers",
      color: "mint",
      description: "Trays, cups, and tidy desk accessories",
    });

    expect(cat).toBeDefined();
    expect(cat.name).toBe("Desk Organizers");
    expect(cat.slug).toBe("desk-organizers");
    expect(cat.color).toBe("mint");

    const inDb = memDb.categories.find((c) => c.slug === "desk-organizers");
    expect(inDb).toBeDefined();
  });

  // 8. Category update
  it("8. updates existing category fields", async () => {
    const caller = appRouter.createCaller(makeContext(mockOwner));

    const updated = await caller.catalog.updateCategory({
      id: 2,
      name: "Luxury Gifts & Boxes",
      description: "Premium curated gift packages",
      color: "peach",
    });

    expect(updated).toBeDefined();
    expect(updated.name).toBe("Luxury Gifts & Boxes");
    expect(updated.color).toBe("peach");

    const inDb = memDb.categories.find((c) => c.id === 2);
    expect(inDb?.name).toBe("Luxury Gifts & Boxes");
  });

  // 9. Category archive
  it("9. archives a category successfully", async () => {
    const caller = appRouter.createCaller(makeContext(mockOwner));

    const res = await caller.catalog.archiveCategory({ id: 1, isPublished: false });
    expect(res.success).toBe(true);
    expect(res.isPublished).toBe(false);

    const inDb = memDb.categories.find((c) => c.id === 1);
    expect(inDb?.isPublished).toBe(0);
  });

  // 10. Category authorization
  it("10. prevents unauthorized users from modifying categories", async () => {
    const customerCaller = appRouter.createCaller(makeContext(mockCustomer));

    await expect(
      customerCaller.catalog.createCategory({
        name: "Hacker Category",
      })
    ).rejects.toThrow(TRPCError);
  });

  // 11. Product-category relationship safety
  it("11. prevents deletion of a category that has products attached", async () => {
    const caller = appRouter.createCaller(makeContext(mockOwner));

    // Category 1 has products 1, 2, 3 attached
    await expect(caller.catalog.deleteCategory({ id: 1 })).rejects.toThrow(
      /Cannot delete category.*because.*product\(s\) belong to it/i
    );
  });

  // 12. Storefront catalog retrieval
  it("12. retrieves published catalog products for storefront visitors", async () => {
    const publicCaller = appRouter.createCaller(makeContext(null));

    const items = await publicCaller.catalog.list();
    expect(items.length).toBeGreaterThan(0);
    // Should include published items (e.g. soft-grid-journal)
    const hasSoftGrid = items.some((i) => i.id === "soft-grid-journal");
    expect(hasSoftGrid).toBe(true);
  });

  // 13. Published filtering
  it("13. excludes unpublished products from storefront catalog list", async () => {
    const publicCaller = appRouter.createCaller(makeContext(null));

    const items = await publicCaller.catalog.list();
    // Item 3 ("hidden-stationery") has isPublished = 0
    const hasHidden = items.some((i) => i.id === "hidden-stationery");
    expect(hasHidden).toBe(false);
  });

  // 14. Stock permission protection
  it("14. rejects stock modification from users without inventory:write permission", async () => {
    const customerCaller = appRouter.createCaller(makeContext(mockCustomer));
    const staffCaller = appRouter.createCaller(makeContext(mockStaff));

    // Customer rejected
    await expect(
      customerCaller.catalog.updateStock({ slug: "soft-grid-journal", stock: 100 })
    ).rejects.toThrow(TRPCError);

    // Staff has orders:read & printing:write, but NOT inventory:write -> must be rejected
    await expect(
      staffCaller.catalog.updateStock({ slug: "soft-grid-journal", stock: 100 })
    ).rejects.toThrow(TRPCError);

    // Admin/Owner with inventory:write succeeds
    const adminCaller = appRouter.createCaller(makeContext(mockAdmin));
    const res = await adminCaller.catalog.updateStock({ slug: "soft-grid-journal", stock: 88 });
    expect(res.success).toBe(true);
    expect(memDb.products.find((p) => p.slug === "soft-grid-journal")?.stock).toBe(88);
  });
});
