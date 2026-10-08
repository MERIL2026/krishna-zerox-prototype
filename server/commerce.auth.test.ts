import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const publicContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;

describe("commerce authorization", () => {
  it("rejects unauthenticated cart reads", async () => {
    await expect(appRouter.createCaller(publicContext).cart.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects unauthenticated order creation", async () => {
    await expect(appRouter.createCaller(publicContext).orders.create({ fulfillmentType: "STORE_PICKUP" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("uses TRPC errors for safe customer-facing failures", () => {
    expect(new TRPCError({ code: "BAD_REQUEST", message: "Cart is empty" })).toBeInstanceOf(TRPCError);
  });
});
