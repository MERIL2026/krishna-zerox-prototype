import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, User, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// In-memory fallback user store when DATABASE_URL is not configured
const inMemoryUsers = new Map<string, User>();

// Seed default demo personas in memory
const now = new Date();
inMemoryUsers.set("demo-owner-meril", {
  id: 1,
  openId: "demo-owner-meril",
  name: "Meril Patel",
  email: "meril@paperlane.local",
  loginMethod: "demo",
  role: "owner",
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
});
inMemoryUsers.set("demo-admin-meril", {
  id: 2,
  openId: "demo-admin-meril",
  name: "Meril Patel (Admin)",
  email: "admin@paperlane.local",
  loginMethod: "demo",
  role: "admin",
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
});
inMemoryUsers.set("demo-staff-operator", {
  id: 3,
  openId: "demo-staff-operator",
  name: "Shop Staff",
  email: "staff@paperlane.local",
  loginMethod: "demo",
  role: "staff",
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
});
inMemoryUsers.set("demo-customer-riya", {
  id: 4,
  openId: "demo-customer-riya",
  name: "Riya Sharma",
  email: "riya@paperlane.local",
  loginMethod: "demo",
  role: "customer",
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
});

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const values: InsertUser = {
    openId: user.openId,
  };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };

  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'owner';
    updateSet.role = 'owner';
  } else if (!values.role) {
    values.role = 'customer';
  }

  if (!values.lastSignedIn) {
    values.lastSignedIn = new Date();
  }

  if (Object.keys(updateSet).length === 0) {
    updateSet.lastSignedIn = new Date();
  }

  // Always sync to in-memory store
  const existingInMemory = inMemoryUsers.get(user.openId);
  const updatedUser: User = {
    id: existingInMemory ? existingInMemory.id : inMemoryUsers.size + 1,
    openId: user.openId,
    name: (values.name as string | null) ?? existingInMemory?.name ?? null,
    email: (values.email as string | null) ?? existingInMemory?.email ?? null,
    loginMethod: (values.loginMethod as string | null) ?? existingInMemory?.loginMethod ?? null,
    role: (values.role as User["role"]) ?? existingInMemory?.role ?? "customer",
    createdAt: existingInMemory?.createdAt ?? new Date(),
    updatedAt: new Date(),
    lastSignedIn: (values.lastSignedIn as Date) ?? new Date(),
  };
  inMemoryUsers.set(user.openId, updatedUser);

  const db = await getDb();
  if (!db) {
    // In-memory store handles persistence when DATABASE_URL is not set
    return;
  }

  try {
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    return inMemoryUsers.get(openId);
  }

  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (result.length > 0) {
      inMemoryUsers.set(openId, result[0]);
      return result[0];
    }
    return inMemoryUsers.get(openId);
  } catch (error) {
    console.warn("[Database] Failed to query user, using in-memory store:", error);
    return inMemoryUsers.get(openId);
  }
}


// TODO: add feature queries here as your schema grows.
