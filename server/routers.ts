import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { permissionProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  archiveCategory,
  archiveProduct,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getInventoryOverview,
  listAdminCategories,
  listAdminProducts,
  listCatalogCategories,
  listCatalogProducts,
  updateCategory,
  updateProduct,
  updateProductStock,
  updateProductVisibility,
} from "./catalog";
import {
  addCartItem,
  clearCart,
  createOrder,
  getAdminOrder,
  getCart,
  getCustomerOrder,
  listAdminOrders,
  listCustomerOrders,
  mergeGuestCart,
  removeCartItem,
  updateCartItem,
  updateOrderStatus,
} from "./commerce";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    // Storefront public endpoints
    list: publicProcedure
      .input(z.object({ search: z.string().optional(), category: z.string().optional(), sort: z.string().optional() }).optional())
      .query(({ input }) => listCatalogProducts(input)),
    categories: publicProcedure.query(() => listCatalogCategories()),

    // Admin product endpoints
    adminList: permissionProcedure("admin:read")
      .input(
        z.object({
          search: z.string().optional(),
          categoryId: z.number().int().positive().optional(),
          isPublished: z.boolean().optional(),
          isFeatured: z.boolean().optional(),
          stockStatus: z.enum(["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
        }).optional()
      )
      .query(({ input }) => listAdminProducts(input)),

    createProduct: permissionProcedure("products:write")
      .input(
        z.object({
          name: z.string().min(2, "Product name must be at least 2 characters").max(180),
          sku: z.string().min(2, "SKU must be at least 2 characters").max(80),
          slug: z.string().optional(),
          categoryId: z.number().int().positive("A valid category must be selected"),
          pricePaise: z.number().int().min(0, "Price cannot be negative"),
          oldPricePaise: z.number().int().min(0).optional(),
          stock: z.number().int().min(0, "Stock cannot be negative"),
          lowStockThreshold: z.number().int().min(0).default(5),
          image: z.string().min(3, "Image URL is required"),
          additionalImages: z.array(z.string()).optional(),
          swatch: z.string().optional(),
          shortDescription: z.string().max(300).optional(),
          description: z.string().optional(),
          badge: z.string().max(32).optional(),
          isPublished: z.boolean().default(true),
          isFeatured: z.boolean().default(false),
          sortOrder: z.number().int().default(0),
        })
      )
      .mutation(({ input }) => createProduct(input)),

    updateProduct: permissionProcedure("products:write")
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(2).max(180).optional(),
          sku: z.string().min(2).max(80).optional(),
          slug: z.string().optional(),
          categoryId: z.number().int().positive().optional(),
          pricePaise: z.number().int().min(0).optional(),
          oldPricePaise: z.number().int().min(0).nullable().optional(),
          stock: z.number().int().min(0).optional(),
          lowStockThreshold: z.number().int().min(0).optional(),
          image: z.string().min(3).optional(),
          additionalImages: z.array(z.string()).optional(),
          swatch: z.string().optional(),
          shortDescription: z.string().max(300).nullable().optional(),
          description: z.string().nullable().optional(),
          badge: z.string().max(32).nullable().optional(),
          isPublished: z.boolean().optional(),
          isFeatured: z.boolean().optional(),
          sortOrder: z.number().int().optional(),
        })
      )
      .mutation(({ input }) => updateProduct(input)),

    deleteProduct: permissionProcedure("products:write")
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => deleteProduct(input.id)),

    archiveProduct: permissionProcedure("products:write")
      .input(z.object({ id: z.number().int().positive(), isPublished: z.boolean() }))
      .mutation(({ input }) => archiveProduct(input.id, input.isPublished)),

    // Admin category endpoints
    adminCategories: permissionProcedure("admin:read")
      .query(() => listAdminCategories()),

    createCategory: permissionProcedure("products:write")
      .input(
        z.object({
          name: z.string().min(2, "Category name must be at least 2 characters").max(120),
          slug: z.string().optional(),
          description: z.string().max(500).optional(),
          color: z.string().default("cream"),
          image: z.string().optional(),
          sortOrder: z.number().int().default(0),
          isPublished: z.boolean().default(true),
        })
      )
      .mutation(({ input }) => createCategory(input)),

    updateCategory: permissionProcedure("products:write")
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(2).max(120).optional(),
          slug: z.string().optional(),
          description: z.string().max(500).nullable().optional(),
          color: z.string().optional(),
          image: z.string().nullable().optional(),
          sortOrder: z.number().int().optional(),
          isPublished: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => updateCategory(input)),

    deleteCategory: permissionProcedure("products:write")
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => deleteCategory(input.id)),

    archiveCategory: permissionProcedure("products:write")
      .input(z.object({ id: z.number().int().positive(), isPublished: z.boolean() }))
      .mutation(({ input }) => archiveCategory(input.id, input.isPublished)),

    // Inventory procedures
    inventoryOverview: permissionProcedure("inventory:write").query(() => getInventoryOverview()),
    updateStock: permissionProcedure("inventory:write")
      .input(z.object({ slug: z.string().min(1), stock: z.number().int().min(0).max(1_000_000) }))
      .mutation(({ input }) => updateProductStock(input.slug, input.stock)),
    togglePublished: permissionProcedure("products:write")
      .input(z.object({ slug: z.string().min(1), isPublished: z.boolean() }))
      .mutation(({ input }) => updateProductVisibility(input.slug, input.isPublished)),
  }),
  cart: router({
    get: protectedProcedure.query(({ ctx }) => getCart(ctx.user)),
    addItem: protectedProcedure
      .input(z.object({ productSlug: z.string().min(1), quantity: z.number().int().min(1).max(100) }))
      .mutation(({ ctx, input }) => addCartItem(ctx.user, input.productSlug, input.quantity)),
    updateItem: protectedProcedure
      .input(z.object({ productSlug: z.string().min(1), quantity: z.number().int().min(1).max(100) }))
      .mutation(({ ctx, input }) => updateCartItem(ctx.user, input.productSlug, input.quantity)),
    removeItem: protectedProcedure
      .input(z.object({ productSlug: z.string().min(1) }))
      .mutation(({ ctx, input }) => removeCartItem(ctx.user, input.productSlug)),
    clear: protectedProcedure.mutation(({ ctx }) => clearCart(ctx.user)),
    mergeGuestCart: protectedProcedure
      .input(z.object({ items: z.array(z.object({ productSlug: z.string().min(1), quantity: z.number().int().min(1).max(100) })) }))
      .mutation(({ ctx, input }) => mergeGuestCart(ctx.user, input.items)),
  }),
  orders: router({
    create: protectedProcedure
      .input(z.object({ fulfillmentType: z.enum(["STORE_PICKUP", "SELF_PICKUP", "DELIVERY"]), deliveryAddress: z.string().max(500).optional() }))
      .mutation(({ ctx, input }) => createOrder(ctx.user, input)),
    mine: protectedProcedure.query(({ ctx }) => listCustomerOrders(ctx.user)),
    get: protectedProcedure
      .input(z.object({ orderId: z.number().int().positive() }))
      .query(({ ctx, input }) => getCustomerOrder(ctx.user, input.orderId)),
    adminList: permissionProcedure("orders:read").query(() => listAdminOrders()),
    adminGet: permissionProcedure("orders:read")
      .input(z.object({ orderId: z.number().int().positive() }))
      .query(({ input }) => getAdminOrder(input.orderId)),
    updateStatus: permissionProcedure("orders:write")
      .input(
        z.object({
          orderId: z.number().int().positive(),
          status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"]),
        })
      )
      .mutation(({ ctx, input }) => updateOrderStatus(ctx.user, input.orderId, input.status)),
  }),
});

export type AppRouter = typeof appRouter;
