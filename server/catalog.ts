import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { cartItems, categories, orderItems, products, type Category, type Product } from "../drizzle/schema";
import { getDb } from "./db";

export const categorySeeds = [
  { slug: "stationery", name: "Stationery", description: "Everyday magic", color: "pink", sortOrder: 1 },
  { slug: "gifts", name: "Gifts", description: "Good things", color: "yellow", sortOrder: 2 },
  { slug: "toys", name: "Toys", description: "Play nicely", color: "lavender", sortOrder: 3 },
  { slug: "aesthetic", name: "Aesthetic", description: "Pretty useful", color: "mint", sortOrder: 4 },
  { slug: "custom", name: "Custom", description: "Make it yours", color: "purple", sortOrder: 5 },
  { slug: "printing", name: "Printing", description: "Ready when you are", color: "cyan", sortOrder: 6 },
  { slug: "imported", name: "Imported", description: "Found abroad", color: "peach", sortOrder: 7 },
];

export const productSeeds = [
  { sku: "SKU-SGF-001", slug: "soft-grid-journal", name: "Soft Grid Journal", category: "stationery", pricePaise: 34900, oldPricePaise: 42000, ratingTenths: 49, badge: "BESTSELLER", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85", swatch: "#F6A8C9", description: "A calm place for lists, sketches and all the ideas that arrive at once.", shortDescription: "Grid journal with flat-lay binding", stock: 28, sortOrder: 1, isFeatured: 1 },
  { sku: "SKU-OGP-002", slug: "orchard-gel-pens", name: "Orchard Gel Pens", category: "stationery", pricePaise: 18900, ratingTenths: 48, badge: "NEW", image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=85", swatch: "#DDF46A", description: "A five-piece color story with a smooth, almost-too-good ink flow.", shortDescription: "5-piece color smooth gel pen set", stock: 42, sortOrder: 2, isFeatured: 1 },
  { sku: "SKU-TTK-003", slug: "tiny-treasure-kit", name: "Tiny Treasure Kit", category: "gifts", pricePaise: 79000, ratingTenths: 47, badge: "LIMITED", image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=85", swatch: "#C9B5F5", description: "A considered little gift set for desks, birthdays and just-because days.", shortDescription: "Curated desk and birthday gift pack", stock: 9, sortOrder: 3, isFeatured: 1 },
  { sku: "SKU-SWT-004", slug: "studio-wash-tape", name: "Studio Washi Set", category: "aesthetic", pricePaise: 29500, ratingTenths: 49, badge: "TRENDING", image: "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?auto=format&fit=crop&w=900&q=85", swatch: "#8FE4D1", description: "Three low-tack tapes for tidy pages, parcels and tiny visual detours.", shortDescription: "3-pack decorative Japanese washi tapes", stock: 17, sortOrder: 4, isFeatured: 0 },
  { sku: "SKU-CHL-005", slug: "citrus-highlighter-set", name: "Citrus Highlighter Set", category: "stationery", pricePaise: 22000, ratingTenths: 46, image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=85", swatch: "#FFF28A", description: "Quietly bright, easy to spot, and kind to the page underneath.", shortDescription: "Pastel highlighters that don't bleed", stock: 6, sortOrder: 5, isFeatured: 0 },
  { sku: "SKU-DSS-006", slug: "daydream-stickers", name: "Daydream Sticker Sheet", category: "custom", pricePaise: 14900, ratingTenths: 48, badge: "NEW", image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=900&q=85", swatch: "#DCC9F7", description: "Glossy little accents for bottles, journals, laptops and happy mail.", shortDescription: "Waterproof vinyl kiss-cut stickers", stock: 31, sortOrder: 6, isFeatured: 0 },
];

let seedPromise: Promise<void> | null = null;

export async function ensureCatalogSeeded() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const db = await getDb();
    if (!db) return;

    const existingCategory = await db.select({ id: categories.id }).from(categories).limit(1);
    const existingProduct = await db.select({ id: products.id }).from(products).limit(1);
    if (existingCategory.length > 0 || existingProduct.length > 0) return;

    await db.insert(categories).values(categorySeeds);
    const savedCategories = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
    const categoryIds = new Map(savedCategories.map((category) => [category.slug, category.id]));

    await db.insert(products).values(productSeeds.map((product) => {
      const categoryId = categoryIds.get(product.category);
      if (!categoryId) throw new Error(`Missing seed category: ${product.category}`);
      return { ...product, categoryId };
    }));
  })().catch((error) => {
    seedPromise = null;
    console.error("[Catalog] Seed failed:", error);
    throw error;
  });
  return seedPromise;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a unique slug for a product, ensuring no collision with existing products.
 */
export async function generateUniqueProductSlug(name: string, excludeProductId?: number): Promise<string> {
  const baseSlug = slugify(name) || "product";
  const db = await getDb();
  if (!db) return baseSlug;

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, candidate));

    const conflict = existing.find((p) => p.id !== excludeProductId);
    if (!conflict) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

/**
 * Generate a unique slug for a category, ensuring no collision with existing categories.
 */
export async function generateUniqueCategorySlug(name: string, excludeCategoryId?: number): Promise<string> {
  const baseSlug = slugify(name) || "category";
  const db = await getDb();
  if (!db) return baseSlug;

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, candidate));

    const conflict = existing.find((c) => c.id !== excludeCategoryId);
    if (!conflict) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

// ============================================================================
// STOREFRONT CATALOG PROCEDURES
// ============================================================================

export async function listCatalogProducts(input?: { search?: string; category?: string; sort?: string }) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isPublished, 1))
    .orderBy(asc(products.sortOrder));

  const search = input?.search?.trim().toLowerCase();
  const category = input?.category?.trim().toLowerCase();

  return rows
    .filter(({ product, category: rowCategory }) => {
      const matchesSearch = !search || `${product.name} ${product.sku ?? ""} ${product.shortDescription ?? ""} ${product.description ?? ""}`.toLowerCase().includes(search);
      const matchesCategory = !category || rowCategory?.slug === category || rowCategory?.name.toLowerCase() === category;
      return matchesSearch && matchesCategory;
    })
    .map(({ product, category: rowCategory }) => ({
      id: product.slug,
      productId: product.id,
      sku: product.sku ?? `SKU-${product.id}`,
      slug: product.slug,
      name: product.name,
      category: rowCategory?.name ?? "Other",
      categorySlug: rowCategory?.slug ?? "other",
      categoryId: product.categoryId,
      price: Math.round(product.pricePaise / 100),
      oldPrice: product.oldPricePaise ? Math.round(product.oldPricePaise / 100) : undefined,
      rating: product.ratingTenths / 10,
      badge: product.badge ?? undefined,
      image: product.image,
      additionalImages: product.additionalImages ? product.additionalImages.split(",").map(s => s.trim()).filter(Boolean) : [],
      swatch: product.swatch,
      shortDescription: product.shortDescription ?? undefined,
      description: product.description ?? "",
      stock: product.stock,
      reservedStock: product.reservedStock,
      availableStock: Math.max(0, product.stock - product.reservedStock),
      lowStock: product.stock - product.reservedStock <= product.lowStockThreshold,
      isFeatured: Boolean(product.isFeatured),
    }));
}

export async function listCatalogCategories() {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isPublished, 1)).orderBy(asc(categories.sortOrder));
}

// ============================================================================
// ADMIN PRODUCT CRUD PROCEDURES
// ============================================================================

export type AdminProductFilter = {
  search?: string;
  categoryId?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  stockStatus?: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

export async function listAdminProducts(filter?: AdminProductFilter) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.sortOrder), desc(products.createdAt));

  const search = filter?.search?.trim().toLowerCase();

  return rows
    .filter(({ product, category: rowCategory }) => {
      if (filter?.categoryId && product.categoryId !== filter.categoryId) return false;
      if (filter?.isPublished !== undefined && Boolean(product.isPublished) !== filter.isPublished) return false;
      if (filter?.isFeatured !== undefined && Boolean(product.isFeatured) !== filter.isFeatured) return false;

      const available = product.stock - product.reservedStock;
      if (filter?.stockStatus === "OUT_OF_STOCK" && available > 0) return false;
      if (filter?.stockStatus === "LOW_STOCK" && (available <= 0 || available > product.lowStockThreshold)) return false;
      if (filter?.stockStatus === "IN_STOCK" && available <= product.lowStockThreshold) return false;

      if (search) {
        const hay = `${product.name} ${product.sku ?? ""} ${product.slug} ${rowCategory?.name ?? ""} ${product.description ?? ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }

      return true;
    })
    .map(({ product, category: rowCategory }) => {
      const available = Math.max(0, product.stock - product.reservedStock);
      let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
      if (available <= 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (available <= product.lowStockThreshold) {
        stockStatus = "LOW_STOCK";
      }

      return {
        id: product.id,
        sku: product.sku ?? `SKU-${product.id}`,
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription ?? "",
        description: product.description ?? "",
        categoryId: product.categoryId,
        categoryName: rowCategory?.name ?? "Uncategorized",
        categorySlug: rowCategory?.slug ?? "uncategorized",
        pricePaise: product.pricePaise,
        oldPricePaise: product.oldPricePaise ?? null,
        price: Math.round(product.pricePaise / 100),
        oldPrice: product.oldPricePaise ? Math.round(product.oldPricePaise / 100) : null,
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock: available,
        lowStockThreshold: product.lowStockThreshold,
        stockStatus,
        image: product.image,
        additionalImages: product.additionalImages ? product.additionalImages.split(",").map(s => s.trim()).filter(Boolean) : [],
        swatch: product.swatch,
        badge: product.badge ?? null,
        isPublished: Boolean(product.isPublished),
        isFeatured: Boolean(product.isFeatured),
        sortOrder: product.sortOrder,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });
}

export type CreateProductInput = {
  name: string;
  sku: string;
  slug?: string;
  categoryId: number;
  pricePaise: number;
  oldPricePaise?: number;
  stock: number;
  lowStockThreshold?: number;
  image: string;
  additionalImages?: string[];
  swatch?: string;
  shortDescription?: string;
  description?: string;
  badge?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
};

export async function createProduct(input: CreateProductInput) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });

  const cleanName = input.name.trim();
  if (!cleanName || cleanName.length < 2) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Product name must be at least 2 characters." });
  }

  const cleanSku = input.sku.trim().toUpperCase();
  if (!cleanSku || cleanSku.length < 2) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Product SKU must be at least 2 characters." });
  }

  if (input.pricePaise < 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Product price cannot be negative." });
  }

  if (input.stock < 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Stock quantity cannot be negative." });
  }

  // 1. Verify category exists
  const categoryExists = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId)).limit(1);
  if (categoryExists.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Category with ID ${input.categoryId} does not exist.` });
  }

  // 2. Check SKU uniqueness
  const existingSku = await db.select({ id: products.id }).from(products).where(eq(products.sku, cleanSku)).limit(1);
  if (existingSku.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `SKU "${cleanSku}" is already in use by another product. Each product must have a unique SKU.` });
  }

  // 3. Generate unique slug
  const finalSlug = input.slug ? slugify(input.slug) : await generateUniqueProductSlug(cleanName);

  // Check slug uniqueness
  const existingSlug = await db.select({ id: products.id }).from(products).where(eq(products.slug, finalSlug)).limit(1);
  if (existingSlug.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Slug "${finalSlug}" is already in use.` });
  }

  const newProduct = {
    name: cleanName,
    sku: cleanSku,
    slug: finalSlug,
    categoryId: input.categoryId,
    pricePaise: input.pricePaise,
    oldPricePaise: input.oldPricePaise ?? null,
    stock: input.stock,
    reservedStock: 0,
    lowStockThreshold: input.lowStockThreshold ?? 5,
    image: input.image.trim(),
    additionalImages: input.additionalImages?.length ? input.additionalImages.join(",") : null,
    swatch: input.swatch?.trim() || "#FFF8EF",
    shortDescription: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    badge: input.badge?.trim() || null,
    isPublished: input.isPublished === false ? 0 : 1,
    isFeatured: input.isFeatured ? 1 : 0,
    sortOrder: input.sortOrder ?? 0,
  };

  await db.insert(products).values(newProduct);

  const inserted = await db.select().from(products).where(eq(products.slug, finalSlug)).limit(1);
  return inserted[0];
}

export type UpdateProductInput = {
  id: number;
  name?: string;
  sku?: string;
  slug?: string;
  categoryId?: number;
  pricePaise?: number;
  oldPricePaise?: number | null;
  stock?: number;
  lowStockThreshold?: number;
  image?: string;
  additionalImages?: string[];
  swatch?: string;
  shortDescription?: string | null;
  description?: string | null;
  badge?: string | null;
  isPublished?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
};

export async function updateProduct(input: UpdateProductInput) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });

  const existing = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Product with ID ${input.id} not found.` });
  }
  const current = existing[0];

  const updates: Partial<typeof products.$inferInsert> = {};

  if (input.name !== undefined) {
    const cleanName = input.name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Product name must be at least 2 characters." });
    }
    updates.name = cleanName;
  }

  if (input.sku !== undefined) {
    const cleanSku = input.sku.trim().toUpperCase();
    if (!cleanSku || cleanSku.length < 2) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Product SKU must be at least 2 characters." });
    }
    // Check SKU uniqueness among other products
    const duplicateSku = await db.select({ id: products.id }).from(products).where(and(eq(products.sku, cleanSku), ne(products.id, input.id))).limit(1);
    if (duplicateSku.length > 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `SKU "${cleanSku}" is already in use by another product.` });
    }
    updates.sku = cleanSku;
  }

  if (input.slug !== undefined) {
    const cleanSlug = slugify(input.slug);
    if (!cleanSlug) throw new TRPCError({ code: "BAD_REQUEST", message: "Slug must be valid URL characters." });
    const duplicateSlug = await db.select({ id: products.id }).from(products).where(and(eq(products.slug, cleanSlug), ne(products.id, input.id))).limit(1);
    if (duplicateSlug.length > 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Slug "${cleanSlug}" is already in use.` });
    }
    updates.slug = cleanSlug;
  }

  if (input.categoryId !== undefined) {
    const categoryExists = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId)).limit(1);
    if (categoryExists.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Category with ID ${input.categoryId} does not exist.` });
    }
    updates.categoryId = input.categoryId;
  }

  if (input.pricePaise !== undefined) {
    if (input.pricePaise < 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Price cannot be negative." });
    }
    updates.pricePaise = input.pricePaise;
  }

  if (input.oldPricePaise !== undefined) {
    updates.oldPricePaise = input.oldPricePaise ?? null;
  }

  if (input.stock !== undefined) {
    if (input.stock < 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Stock cannot be negative." });
    }
    updates.stock = input.stock;
  }

  if (input.lowStockThreshold !== undefined) {
    if (input.lowStockThreshold < 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Low stock threshold cannot be negative." });
    }
    updates.lowStockThreshold = input.lowStockThreshold;
  }

  if (input.image !== undefined) updates.image = input.image.trim();
  if (input.additionalImages !== undefined) updates.additionalImages = input.additionalImages.length ? input.additionalImages.join(",") : null;
  if (input.swatch !== undefined) updates.swatch = input.swatch.trim() || current.swatch;
  if (input.shortDescription !== undefined) updates.shortDescription = input.shortDescription?.trim() || null;
  if (input.description !== undefined) updates.description = input.description?.trim() || null;
  if (input.badge !== undefined) updates.badge = input.badge?.trim() || null;
  if (input.isPublished !== undefined) updates.isPublished = input.isPublished ? 1 : 0;
  if (input.isFeatured !== undefined) updates.isFeatured = input.isFeatured ? 1 : 0;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  await db.update(products).set(updates).where(eq(products.id, input.id));

  const updated = await db.select().from(products).where(eq(products.id, input.id)).limit(1);
  return updated[0];
}

/**
 * Delete a product safely: if referenced by historical order items or active cart items,
 * it is archived/unpublished rather than destructively removed.
 */
export async function deleteProduct(id: number) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });

  const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Product with ID ${id} not found.` });
  }

  // Check if product is referenced in order_items or cart_items
  const hasOrders = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, id)).limit(1);
  const hasCarts = await db.select({ id: cartItems.id }).from(cartItems).where(eq(cartItems.productId, id)).limit(1);

  if (hasOrders.length > 0 || hasCarts.length > 0) {
    // Unpublish / archive rather than deleting
    await db.update(products).set({ isPublished: 0 }).where(eq(products.id, id));
    return {
      success: true,
      archived: true,
      deleted: false,
      message: "Product has associated orders or cart items and has been safely archived (unpublished) to preserve data integrity.",
    };
  }

  // Safe to delete permanently
  await db.delete(products).where(eq(products.id, id));
  return {
    success: true,
    archived: false,
    deleted: true,
    message: "Product deleted permanently.",
  };
}

export async function archiveProduct(id: number, isPublished: boolean) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });

  const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Product with ID ${id} not found.` });
  }

  await db.update(products).set({ isPublished: isPublished ? 1 : 0 }).where(eq(products.id, id));
  return { success: true, isPublished } as const;
}

// ============================================================================
// ADMIN CATEGORY CRUD PROCEDURES
// ============================================================================

export async function listAdminCategories() {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];

  const allCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  const allProducts = await db.select({ categoryId: products.categoryId }).from(products);

  const productCounts = new Map<number, number>();
  for (const p of allProducts) {
    productCounts.set(p.categoryId, (productCounts.get(p.categoryId) ?? 0) + 1);
  }

  return allCategories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description ?? "",
    color: c.color,
    image: c.image ?? null,
    sortOrder: c.sortOrder,
    isPublished: Boolean(c.isPublished),
    productCount: productCounts.get(c.id) ?? 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  image?: string;
  sortOrder?: number;
  isPublished?: boolean;
};

export async function createCategory(input: CreateCategoryInput) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });

  const cleanName = input.name.trim();
  if (!cleanName || cleanName.length < 2) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Category name must be at least 2 characters." });
  }

  const finalSlug = input.slug ? slugify(input.slug) : await generateUniqueCategorySlug(cleanName);

  const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, finalSlug)).limit(1);
  if (existing.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Category slug "${finalSlug}" is already in use.` });
  }

  const newCategory = {
    name: cleanName,
    slug: finalSlug,
    description: input.description?.trim() || null,
    color: input.color?.trim() || "cream",
    image: input.image?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
    isPublished: input.isPublished === false ? 0 : 1,
  };

  await db.insert(categories).values(newCategory);
  const inserted = await db.select().from(categories).where(eq(categories.slug, finalSlug)).limit(1);
  return inserted[0];
}

export type UpdateCategoryInput = {
  id: number;
  name?: string;
  slug?: string;
  description?: string | null;
  color?: string;
  image?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
};

export async function updateCategory(input: UpdateCategoryInput) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });

  const existing = await db.select().from(categories).where(eq(categories.id, input.id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Category with ID ${input.id} not found.` });
  }

  const updates: Partial<typeof categories.$inferInsert> = {};

  if (input.name !== undefined) {
    const cleanName = input.name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Category name must be at least 2 characters." });
    }
    updates.name = cleanName;
  }

  if (input.slug !== undefined) {
    const cleanSlug = slugify(input.slug);
    if (!cleanSlug) throw new TRPCError({ code: "BAD_REQUEST", message: "Slug must be valid URL characters." });
    const duplicate = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.slug, cleanSlug), ne(categories.id, input.id))).limit(1);
    if (duplicate.length > 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Category slug "${cleanSlug}" is already in use.` });
    }
    updates.slug = cleanSlug;
  }

  if (input.description !== undefined) updates.description = input.description?.trim() || null;
  if (input.color !== undefined) updates.color = input.color.trim();
  if (input.image !== undefined) updates.image = input.image?.trim() || null;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isPublished !== undefined) updates.isPublished = input.isPublished ? 1 : 0;

  await db.update(categories).set(updates).where(eq(categories.id, input.id));
  const updated = await db.select().from(categories).where(eq(categories.id, input.id)).limit(1);
  return updated[0];
}

/**
 * Category Safety: Prevents unsafe deletion if products currently belong to this category.
 */
export async function deleteCategory(id: number) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });

  const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Category with ID ${id} not found.` });
  }
  const category = existing[0];

  // Check if products belong to this category
  const productsInCategory = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, id));
  if (productsInCategory.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot delete category "${category.name}" because ${productsInCategory.length} product(s) belong to it. Please reassign or delete these products first, or unpublish (archive) the category instead.`,
    });
  }

  await db.delete(categories).where(eq(categories.id, id));
  return { success: true, message: `Category "${category.name}" deleted successfully.` };
}

export async function archiveCategory(id: number, isPublished: boolean) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });

  const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Category with ID ${id} not found.` });
  }

  await db.update(categories).set({ isPublished: isPublished ? 1 : 0 }).where(eq(categories.id, id));
  return { success: true, isPublished } as const;
}

// ============================================================================
// INVENTORY & UTILITIES
// ============================================================================

export async function getInventoryOverview() {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return { totalProducts: 0, lowStock: 0, outOfStock: 0 };
  const rows = await db.select({ stock: products.stock, threshold: products.lowStockThreshold }).from(products);
  return {
    totalProducts: rows.length,
    lowStock: rows.filter((row) => row.stock > 0 && row.stock <= row.threshold).length,
    outOfStock: rows.filter((row) => row.stock <= 0).length,
  };
}

export async function updateProductStock(slug: string, stock: number) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  await db.update(products).set({ stock }).where(eq(products.slug, slug));
  return { success: true } as const;
}

export async function updateProductVisibility(slug: string, isPublished: boolean) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  await db.update(products).set({ isPublished: isPublished ? 1 : 0 }).where(eq(products.slug, slug));
  return { success: true } as const;
}
