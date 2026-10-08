import { describe, expect, it } from "vitest";
import { encodeOAuthState, decodeOAuthState, type OAuthState } from "../shared/const";
import { publicPlatformConfig, publicPlatformScript } from "./_core/publicConfig";
import { hasPermission } from "./_core/permissions";
import type { User } from "../drizzle/schema";

describe("OAuth state serialization & returnTo handling", () => {
  it("encodes and decodes OAuthState preserving redirectUri, nonce, and returnTo", () => {
    const input: OAuthState = {
      redirectUri: "https://krishnaxerox.in/api/oauth/callback",
      nonce: "test-nonce-12345",
      returnTo: "/admin",
    };

    const encoded = encodeOAuthState(input);
    expect(typeof encoded).toBe("string");

    const decoded = decodeOAuthState(encoded);
    expect(decoded.redirectUri).toBe(input.redirectUri);
    expect(decoded.nonce).toBe(input.nonce);
    expect(decoded.returnTo).toBe("/admin");
  });

  it("handles legacy base64 redirectUri gracefully without crashing", () => {
    const legacyRedirect = "https://krishnaxerox.in/api/oauth/callback";
    const legacyState = btoa(legacyRedirect);

    const decoded = decodeOAuthState(legacyState);
    expect(decoded.redirectUri).toBe(legacyRedirect);
    expect(decoded.nonce).toBeUndefined();
  });

  it("handles malformed/garbage state safely without throwing", () => {
    const decoded = decodeOAuthState("not-valid-base64!!!");
    expect(decoded.redirectUri).toBe("");
    expect(decoded.nonce).toBeUndefined();
  });
});

describe("OAuth public configuration", () => {
  it("exposes portal URL and project ID to browser runtime without exposing secrets", () => {
    const env = {
      MANUS_PROJECT_ID: "proj_paperlane_123",
      MANUS_OAUTH_PORTAL_URL: "https://auth.manus.im",
      MANUS_JWT_SECRET: "secret-never-expose",
      DATABASE_URL: "mysql://user:pass@host/db",
    };

    const cfg = publicPlatformConfig(env);
    expect(cfg.projectId).toBe("proj_paperlane_123");
    expect(cfg.oauthPortalUrl).toBe("https://auth.manus.im");
    expect(cfg).not.toHaveProperty("MANUS_JWT_SECRET");

    const script = publicPlatformScript(env);
    expect(script).toContain("proj_paperlane_123");
    expect(script).toContain("https://auth.manus.im");
    expect(script).not.toContain("secret-never-expose");
    expect(script).not.toContain("mysql://");
  });
});

describe("Admin workspace authorization matrix", () => {
  const operationsRoles: Array<User["role"]> = ["owner", "admin", "staff"];

  it("allows operations access only for staff, admin, and owner", () => {
    operationsRoles.forEach((role) => {
      const isOperationsUser = ["owner", "admin", "staff"].includes(role);
      expect(isOperationsUser).toBe(true);
      expect(hasPermission({ role } as User, "admin:read")).toBe(true);
    });
  });

  it("denies operations access for customer and plain user roles", () => {
    const nonAdminRoles: Array<User["role"]> = ["customer", "user"];
    nonAdminRoles.forEach((role) => {
      const isOperationsUser = ["owner", "admin", "staff"].includes(role);
      expect(isOperationsUser).toBe(false);
      expect(hasPermission({ role } as User, "admin:read")).toBe(false);
    });
  });
});
