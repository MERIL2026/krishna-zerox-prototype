import { describe, expect, it } from "vitest";
import { hasPermission } from "./_core/permissions";
import type { User } from "../drizzle/schema";

const userFor = (role: User["role"]) => ({ role } as User);

describe("role permissions", () => {
  it("gives owners full operational access", () => {
    expect(hasPermission(userFor("owner"), "staff:write")).toBe(true);
    expect(hasPermission(userFor("owner"), "printing:write")).toBe(true);
  });

  it("keeps customers outside admin permissions", () => {
    expect(hasPermission(userFor("customer"), "admin:read")).toBe(false);
    expect(hasPermission(userFor("customer"), "inventory:write")).toBe(false);
  });

  it("limits staff to the current operations and printing surface", () => {
    expect(hasPermission(userFor("staff"), "printing:write")).toBe(true);
    expect(hasPermission(userFor("staff"), "products:write")).toBe(false);
    expect(hasPermission(userFor("staff"), "staff:write")).toBe(false);
  });
});
