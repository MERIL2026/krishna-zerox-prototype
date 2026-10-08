import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, permissionProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getInventoryOverview, listCatalogCategories, listCatalogProducts, updateProductStock, updateProductVisibility } from "./catalog";
import { addCartItem, clearCart, createOrder, getAdminOrder, getCart, getCustomerOrder, listAdminOrders, listCustomerOrders, mergeGuestCart, removeCartItem, updateCartItem, updateOrderStatus } from "./commerce";

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
    list: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional()).query(({ input }) => listCatalogProducts(input)),
    categories: publicProcedure.query(() => listCatalogCategories()),
    inventoryOverview: permissionProcedure("inventory:write").query(() => getInventoryOverview()),
    updateStock: permissionProcedure("inventory:write").input(z.object({ slug: z.string().min(1), stock: z.number().int().min(0).max(1_000_000) })).mutation(({ input }) => updateProductStock(input.slug, input.stock)),
    togglePublished: permissionProcedure("products:write").input(z.object({ slug: z.string().min(1), isPublished: z.boolean() })).mutation(({ input }) => updateProductVisibility(input.slug, input.isPublished)),
  }),
  cart: router({
    get: protectedProcedure.query(({ ctx }) => getCart(ctx.user)),
    addItem: protectedProcedure.input(z.object({ productSlug: z.string().min(1), quantity: z.number().int().min(1).max(100) })).mutation(({ ctx, input }) => addCartItem(ctx.user, input.productSlug, input.quantity)),
    updateItem: protectedProcedure.input(z.object({ productSlug: z.string().min(1), quantity: z.number().int().min(1).max(100) })).mutation(({ ctx, input }) => updateCartItem(ctx.user, input.productSlug, input.quantity)),
    removeItem: protectedProcedure.input(z.object({ productSlug: z.string().min(1) })).mutation(({ ctx, input }) => removeCartItem(ctx.user, input.productSlug)),
    clear: protectedProcedure.mutation(({ ctx }) => clearCart(ctx.user)),
    mergeGuestCart: protectedProcedure.input(z.object({ items: z.array(z.object({ productSlug: z.string().min(1), quantity: z.number().int().min(1).max(100) })) })).mutation(({ ctx, input }) => mergeGuestCart(ctx.user, input.items)),
  }),
  orders: router({
    create: protectedProcedure.input(z.object({ fulfillmentType: z.enum(["STORE_PICKUP", "SELF_PICKUP", "DELIVERY"]), deliveryAddress: z.string().max(500).optional() })).mutation(({ ctx, input }) => createOrder(ctx.user, input)),
    mine: protectedProcedure.query(({ ctx }) => listCustomerOrders(ctx.user)),
    get: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(({ ctx, input }) => getCustomerOrder(ctx.user, input.orderId)),
    adminList: permissionProcedure("orders:read").query(() => listAdminOrders()),
    adminGet: permissionProcedure("orders:read").input(z.object({ orderId: z.number().int().positive() })).query(({ input }) => getAdminOrder(input.orderId)),
    updateStatus: permissionProcedure("orders:write").input(z.object({ orderId: z.number().int().positive(), status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"]) })).mutation(({ ctx, input }) => updateOrderStatus(ctx.user, input.orderId, input.status)),
  }),
});

export type AppRouter = typeof appRouter;
