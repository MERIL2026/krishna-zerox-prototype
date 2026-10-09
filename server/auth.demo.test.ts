import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import { sdk } from "./_core/sdk";
import { resetRateLimit } from "./_core/security";
import type { TrpcContext } from "./_core/context";
import { hasPermission } from "./_core/permissions";
import { TRPCError } from "@trpc/server";

type CookieCall = {
  name: string;
  val: string;
  options: Record<string, unknown>;
};

function createMockContext(ip = "127.0.0.1", cookieHeader = ""): {
  ctx: TrpcContext;
  cookiesSet: CookieCall[];
  cookiesCleared: Array<{ name: string; options: Record<string, unknown> }>;
} {
  const cookiesSet: CookieCall[] = [];
  const cookiesCleared: Array<{ name: string; options: Record<string, unknown> }> = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {
        cookie: cookieHeader,
        "x-forwarded-for": ip,
      },
      socket: { remoteAddress: ip },
    } as unknown as TrpcContext["req"],
    res: {
      cookie: (name: string, val: string, options: Record<string, unknown>) => {
        cookiesSet.push({ name, val, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        cookiesCleared.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };

  return { ctx, cookiesSet, cookiesCleared };
}

describe("Demo Admin Authentication Flow", () => {
  beforeEach(() => {
    resetRateLimit("127.0.0.1");
    resetRateLimit("192.168.1.100");
  });

  it("authenticates Owner successfully with correct passcode and sets session cookie", async () => {
    const { ctx, cookiesSet } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.demoLogin({
      role: "owner",
      passcode: "krishna2026",
    });

    expect(result.success).toBe(true);
    expect(result.user?.role).toBe("owner");
    expect(result.user?.openId).toBe("demo-owner-meril");
    expect(result.user?.name).toBe("Meril Patel");

    expect(cookiesSet).toHaveLength(1);
    expect(cookiesSet[0]?.name).toBe(COOKIE_NAME);
    expect(cookiesSet[0]?.options.httpOnly).toBe(true);

    // Verify session token is valid and verifiable by sdk
    const sessionToken = cookiesSet[0]?.val;
    const verified = await sdk.verifySession(sessionToken);
    expect(verified).not.toBeNull();
    expect(verified?.openId).toBe("demo-owner-meril");
  });

  it("authenticates Staff successfully and verifies staff permissions", async () => {
    const { ctx, cookiesSet } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.demoLogin({
      role: "staff",
      passcode: "krishna2026",
    });

    expect(result.success).toBe(true);
    expect(result.user?.role).toBe("staff");
    expect(hasPermission(result.user, "admin:read")).toBe(true);
    expect(hasPermission(result.user, "products:write")).toBe(false);
  });

  it("authenticates Customer successfully and verifies customer lacks admin access", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.demoLogin({
      role: "customer",
      passcode: "krishna2026",
    });

    expect(result.success).toBe(true);
    expect(result.user?.role).toBe("customer");
    expect(hasPermission(result.user, "admin:read")).toBe(false);
  });

  it("rejects invalid passcode with UNAUTHORIZED", async () => {
    const { ctx, cookiesSet } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.demoLogin({
        role: "owner",
        passcode: "wrong-passcode",
      })
    ).rejects.toThrowError(/Invalid passcode/);

    expect(cookiesSet).toHaveLength(0);
  });

  it("enforces rate limiting after 5 consecutive failed attempts", async () => {
    const ip = "192.168.1.100";
    const { ctx } = createMockContext(ip);
    const caller = appRouter.createCaller(ctx);

    // 5 invalid attempts
    for (let i = 0; i < 5; i++) {
      try {
        await caller.auth.demoLogin({ role: "owner", passcode: "bad" });
      } catch (e) {
        expect(e).toBeInstanceOf(TRPCError);
      }
    }

    // 6th attempt should be blocked by rate limiter
    await expect(
      caller.auth.demoLogin({ role: "owner", passcode: "krishna2026" })
    ).rejects.toThrowError(/Too many login attempts/);
  });
});
