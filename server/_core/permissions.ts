import type { User } from "../../drizzle/schema";

export type Permission =
  | "admin:read"
  | "products:write"
  | "inventory:write"
  | "orders:read"
  | "orders:write"
  | "printing:read"
  | "printing:write"
  | "customers:read"
  | "analytics:read"
  | "loyalty:write"
  | "staff:write";

const rolePermissions: Record<string, readonly Permission[]> = {
  owner: ["admin:read", "products:write", "inventory:write", "orders:read", "orders:write", "printing:read", "printing:write", "customers:read", "analytics:read", "loyalty:write", "staff:write"],
  admin: ["admin:read", "products:write", "inventory:write", "orders:read", "orders:write", "printing:read", "printing:write", "customers:read", "analytics:read", "loyalty:write"],
  staff: ["admin:read", "orders:read", "printing:read", "printing:write"],
  user: [],
  customer: [],
};

export function hasPermission(user: User | null, permission: Permission) {
  return Boolean(user && rolePermissions[user.role]?.includes(permission));
}

export function permissionsForRole(role: User["role"]) {
  return rolePermissions[role] ?? [];
}
