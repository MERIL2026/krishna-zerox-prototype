import { asc, eq } from "drizzle-orm";
import { categories, products } from "../drizzle/schema";
import { getDb } from "./db";

const categorySeeds = [
  { slug: "stationery", name: "Stationery", description: "Everyday magic", color: "pink", sortOrder: 1 },
  { slug: "gifts", name: "Gifts", description: "Good things", color: "yellow", sortOrder: 2 },
  { slug: "toys", name: "Toys", description: "Play nicely", color: "lavender", sortOrder: 3 },
  { slug: "aesthetic", name: "Aesthetic", description: "Pretty useful", color: "mint", sortOrder: 4 },
  { slug: "custom", name: "Custom", description: "Make it yours", color: "purple", sortOrder: 5 },
  { slug: "printing", name: "Printing", description: "Ready when you are", color: "cyan", sortOrder: 6 },
  { slug: "imported", name: "Imported", description: "Found abroad", color: "peach", sortOrder: 7 },
];

const productSeeds = [
  { slug: "soft-grid-journal", name: "Soft Grid Journal", category: "stationery", pricePaise: 34900, oldPricePaise: 42000, ratingTenths: 49, badge: "BESTSELLER", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85", swatch: "#F6A8C9", description: "A calm place for lists, sketches and all the ideas that arrive at once.", stock: 28, sortOrder: 1 },
  { slug: "orchard-gel-pens", name: "Orchard Gel Pens", category: "stationery", pricePaise: 18900, ratingTenths: 48, badge: "NEW", image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=85", swatch: "#DDF46A", description: "A five-piece color story with a smooth, almost-too-good ink flow.", stock: 42, sortOrder: 2 },
  { slug: "tiny-treasure-kit", name: "Tiny Treasure Kit", category: "gifts", pricePaise: 79000, ratingTenths: 47, badge: "LIMITED", image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=85", swatch: "#C9B5F5", description: "A considered little gift set for desks, birthdays and just-because days.", stock: 9, sortOrder: 3 },
  { slug: "studio-wash-tape", name: "Studio Washi Set", category: "aesthetic", pricePaise: 29500, ratingTenths: 49, badge: "TRENDING", image: "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?auto=format&fit=crop&w=900&q=85", swatch: "#8FE4D1", description: "Three low-tack tapes for tidy pages, parcels and tiny visual detours.", stock: 17, sortOrder: 4 },
  { slug: "citrus-highlighter-set", name: "Citrus Highlighter Set", category: "stationery", pricePaise: 22000, ratingTenths: 46, image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=85", swatch: "#FFF28A", description: "Quietly bright, easy to spot, and kind to the page underneath.", stock: 6, sortOrder: 5 },
  { slug: "daydream-stickers", name: "Daydream Sticker Sheet", category: "custom", pricePaise: 14900, ratingTenths: 48, badge: "NEW", image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=900&q=85", swatch: "#DCC9F7", description: "Glossy little accents for bottles, journals, laptops and happy mail.", stock: 31, sortOrder: 6 },
];

let seedPromise: Promise<void> | null = null;

async function ensureCatalogSeeded() {
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

export async function listCatalogProducts(input?: { search?: string; category?: string }) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isPublished, 1))
    .orderBy(asc(products.sortOrder));

  const search = input?.search?.trim().toLowerCase();
  const category = input?.category?.trim().toLowerCase();
  return rows
    .filter(({ product, category: rowCategory }) => {
      const matchesSearch = !search || `${product.name} ${product.description ?? ""}`.toLowerCase().includes(search);
      const matchesCategory = !category || rowCategory?.slug === category || rowCategory?.name.toLowerCase() === category;
      return matchesSearch && matchesCategory;
    })
    .map(({ product, category: rowCategory }) => ({
      id: product.slug,
      name: product.name,
      category: rowCategory?.name ?? "Other",
      categorySlug: rowCategory?.slug ?? "other",
      price: Math.round(product.pricePaise / 100),
      oldPrice: product.oldPricePaise ? Math.round(product.oldPricePaise / 100) : undefined,
      rating: product.ratingTenths / 10,
      badge: product.badge ?? undefined,
      image: product.image,
      swatch: product.swatch,
      description: product.description ?? "",
      stock: product.stock,
      reservedStock: product.reservedStock,
      availableStock: Math.max(0, product.stock - product.reservedStock),
      lowStock: product.stock - product.reservedStock <= product.lowStockThreshold,
    }));
}

export async function listCatalogCategories() {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isPublished, 1)).orderBy(asc(categories.sortOrder));
}

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
  if (!db) throw new Error("Database is not available");
  await db.update(products).set({ stock }).where(eq(products.slug, slug));
  return { success: true } as const;
}

export async function updateProductVisibility(slug: string, isPublished: boolean) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(products).set({ isPublished: isPublished ? 1 : 0 }).where(eq(products.slug, slug));
  return { success: true } as const;
}
