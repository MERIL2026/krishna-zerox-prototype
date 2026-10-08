// server/apiHandler.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "webdev_app_session";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "customer", "admin", "owner", "staff"]).default("customer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  image: text("image"),
  color: varchar("color", { length: 24 }).notNull().default("cream"),
  sortOrder: int("sortOrder").notNull().default(0),
  isPublished: int("isPublished").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 80 }),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  shortDescription: text("shortDescription"),
  categoryId: int("categoryId").notNull(),
  pricePaise: int("pricePaise").notNull(),
  oldPricePaise: int("oldPricePaise"),
  ratingTenths: int("ratingTenths").notNull().default(0),
  badge: varchar("badge", { length: 32 }),
  image: text("image").notNull(),
  additionalImages: text("additionalImages"),
  swatch: varchar("swatch", { length: 24 }).notNull().default("#FFF8EF"),
  description: text("description"),
  stock: int("stock").notNull().default(0),
  reservedStock: int("reservedStock").notNull().default(0),
  lowStockThreshold: int("lowStockThreshold").notNull().default(5),
  isPublished: int("isPublished").notNull().default(1),
  isFeatured: int("isFeatured").notNull().default(0),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  skuIdx: index("products_sku_idx").on(table.sku),
  categoryIdx: index("products_category_idx").on(table.categoryId)
}));
var carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("sessionId", { length: 128 }),
  status: mysqlEnum("status", ["ACTIVE", "CONVERTED", "ABANDONED"]).notNull().default("ACTIVE"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({ customerStatusIdx: index("carts_customer_status_idx").on(table.customerId, table.status), sessionStatusIdx: index("carts_session_status_idx").on(table.sessionId, table.status) }));
var cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cartId").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: int("quantity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({ cartProductUnique: uniqueIndex("cart_items_cart_product_unique").on(table.cartId, table.productId), cartIdx: index("cart_items_cart_idx").on(table.cartId) }));
var orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 40 }).notNull().unique(),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "restrict" }),
  subtotalPaise: int("subtotalPaise").notNull(),
  discountPaise: int("discountPaise").notNull().default(0),
  deliveryFeePaise: int("deliveryFeePaise").notNull().default(0),
  taxPaise: int("taxPaise").notNull().default(0),
  totalPaise: int("totalPaise").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  paymentStatus: mysqlEnum("paymentStatus", ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"]).notNull().default("UNPAID"),
  orderStatus: mysqlEnum("orderStatus", ["PENDING", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"]).notNull().default("PENDING"),
  fulfillmentType: mysqlEnum("fulfillmentType", ["STORE_PICKUP", "SELF_PICKUP", "DELIVERY"]).notNull(),
  deliveryAddress: text("deliveryAddress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({ customerIdx: index("orders_customer_idx").on(table.customerId), statusIdx: index("orders_status_idx").on(table.orderStatus), createdIdx: index("orders_created_idx").on(table.createdAt) }));
var orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "restrict" }),
  productNameSnapshot: varchar("productNameSnapshot", { length: 180 }).notNull(),
  skuSnapshot: varchar("skuSnapshot", { length: 80 }),
  unitPricePaise: int("unitPricePaise").notNull(),
  quantity: int("quantity").notNull(),
  subtotalPaise: int("subtotalPaise").notNull()
}, (table) => ({ orderIdx: index("order_items_order_idx").on(table.orderId) }));
var orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  oldStatus: varchar("oldStatus", { length: 32 }),
  newStatus: varchar("newStatus", { length: 32 }).notNull(),
  changedBy: int("changedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({ orderHistoryIdx: index("order_status_history_order_idx").on(table.orderId, table.createdAt) }));

// server/_core/env.ts
var ENV = {
  get appId() {
    return process.env.MANUS_PROJECT_ID ?? "";
  },
  get cookieSecret() {
    return process.env.MANUS_JWT_SECRET ?? "";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get oAuthServerUrl() {
    return process.env.MANUS_OAUTH_API_URL ?? "";
  },
  // Preserve the legacy hint when supplied; otherwise roles remain application data.
  get ownerOpenId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get forgeApiUrl() {
    return process.env.MANUS_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.MANUS_API_KEY ?? "";
  }
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "owner";
      updateSet.role = "owner";
    } else if (!values.role) {
      values.role = "customer";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/cookies.ts
function getSessionCookieOptions(_req) {
  return { httpOnly: true, path: "/", sameSite: "none", secure: true };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: MANUS_OAUTH_API_URL is not configured! Set MANUS_OAUTH_API_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) throw new Error("MANUS_JWT_SECRET is unavailable");
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || (!isNonEmptyString(appId) || appId !== ENV.appId) || typeof name !== "string") {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken && req.path.startsWith("/api/scheduled/")) {
      const ticket = cookies.get("app_session_id");
      const identity = await this.verifySession(ticket);
      if (identity?.openId.startsWith(CRON_OPEN_ID_PREFIX)) sessionToken = ticket;
    }
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce, returnTo } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const safeReturnTo = typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      res.redirect(302, safeReturnTo);
    } catch (error) {
      console.error("[OAuth] Callback failed", error instanceof Error ? error.message : "unknown error");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/publicConfig.ts
function publicPlatformConfig(env = process.env) {
  return {
    projectId: env.MANUS_PROJECT_ID ?? "",
    oauthPortalUrl: env.MANUS_OAUTH_PORTAL_URL ?? "",
    apiUrl: env.MANUS_API_URL ?? "",
    apiBrowserKey: env.MANUS_API_BROWSER_KEY ?? ""
  };
}
function publicPlatformScript(env = process.env) {
  const json = JSON.stringify(publicPlatformConfig(env)).replaceAll("<", "\\u003c");
  return `window.__MANUS_CONFIG__=${json};`;
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";

// server/_core/permissions.ts
var rolePermissions = {
  owner: ["admin:read", "products:write", "inventory:write", "orders:read", "orders:write", "printing:read", "printing:write", "customers:read", "analytics:read", "loyalty:write", "staff:write"],
  admin: ["admin:read", "products:write", "inventory:write", "orders:read", "orders:write", "printing:read", "printing:write", "customers:read", "analytics:read", "loyalty:write"],
  staff: ["admin:read", "orders:read", "printing:read", "printing:write"],
  user: [],
  customer: []
};
function hasPermission(user, permission) {
  return Boolean(user && rolePermissions[user.role]?.includes(permission));
}

// server/_core/trpc.ts
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!hasPermission(ctx.user, "admin:read")) {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);
var permissionProcedure = (permission) => t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!hasPermission(ctx.user, permission)) {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/catalog.ts
import { and, asc, desc, eq as eq2, ne } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
var categorySeeds = [
  { slug: "stationery", name: "Stationery", description: "Everyday magic", color: "pink", sortOrder: 1 },
  { slug: "gifts", name: "Gifts", description: "Good things", color: "yellow", sortOrder: 2 },
  { slug: "toys", name: "Toys", description: "Play nicely", color: "lavender", sortOrder: 3 },
  { slug: "aesthetic", name: "Aesthetic", description: "Pretty useful", color: "mint", sortOrder: 4 },
  { slug: "custom", name: "Custom", description: "Make it yours", color: "purple", sortOrder: 5 },
  { slug: "printing", name: "Printing", description: "Ready when you are", color: "cyan", sortOrder: 6 },
  { slug: "imported", name: "Imported", description: "Found abroad", color: "peach", sortOrder: 7 }
];
var productSeeds = [
  { sku: "SKU-SGF-001", slug: "soft-grid-journal", name: "Soft Grid Journal", category: "stationery", pricePaise: 34900, oldPricePaise: 42e3, ratingTenths: 49, badge: "BESTSELLER", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85", swatch: "#F6A8C9", description: "A calm place for lists, sketches and all the ideas that arrive at once.", shortDescription: "Grid journal with flat-lay binding", stock: 28, sortOrder: 1, isFeatured: 1 },
  { sku: "SKU-OGP-002", slug: "orchard-gel-pens", name: "Orchard Gel Pens", category: "stationery", pricePaise: 18900, ratingTenths: 48, badge: "NEW", image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=85", swatch: "#DDF46A", description: "A five-piece color story with a smooth, almost-too-good ink flow.", shortDescription: "5-piece color smooth gel pen set", stock: 42, sortOrder: 2, isFeatured: 1 },
  { sku: "SKU-TTK-003", slug: "tiny-treasure-kit", name: "Tiny Treasure Kit", category: "gifts", pricePaise: 79e3, ratingTenths: 47, badge: "LIMITED", image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=85", swatch: "#C9B5F5", description: "A considered little gift set for desks, birthdays and just-because days.", shortDescription: "Curated desk and birthday gift pack", stock: 9, sortOrder: 3, isFeatured: 1 },
  { sku: "SKU-SWT-004", slug: "studio-wash-tape", name: "Studio Washi Set", category: "aesthetic", pricePaise: 29500, ratingTenths: 49, badge: "TRENDING", image: "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?auto=format&fit=crop&w=900&q=85", swatch: "#8FE4D1", description: "Three low-tack tapes for tidy pages, parcels and tiny visual detours.", shortDescription: "3-pack decorative Japanese washi tapes", stock: 17, sortOrder: 4, isFeatured: 0 },
  { sku: "SKU-CHL-005", slug: "citrus-highlighter-set", name: "Citrus Highlighter Set", category: "stationery", pricePaise: 22e3, ratingTenths: 46, image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=85", swatch: "#FFF28A", description: "Quietly bright, easy to spot, and kind to the page underneath.", shortDescription: "Pastel highlighters that don't bleed", stock: 6, sortOrder: 5, isFeatured: 0 },
  { sku: "SKU-DSS-006", slug: "daydream-stickers", name: "Daydream Sticker Sheet", category: "custom", pricePaise: 14900, ratingTenths: 48, badge: "NEW", image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=900&q=85", swatch: "#DCC9F7", description: "Glossy little accents for bottles, journals, laptops and happy mail.", shortDescription: "Waterproof vinyl kiss-cut stickers", stock: 31, sortOrder: 6, isFeatured: 0 }
];
var seedPromise = null;
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
function slugify(text2) {
  return text2.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
async function generateUniqueProductSlug(name, excludeProductId) {
  const baseSlug = slugify(name) || "product";
  const db = await getDb();
  if (!db) return baseSlug;
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.select({ id: products.id }).from(products).where(eq2(products.slug, candidate));
    const conflict = existing.find((p) => p.id !== excludeProductId);
    if (!conflict) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}
async function generateUniqueCategorySlug(name, excludeCategoryId) {
  const baseSlug = slugify(name) || "category";
  const db = await getDb();
  if (!db) return baseSlug;
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.select({ id: categories.id }).from(categories).where(eq2(categories.slug, candidate));
    const conflict = existing.find((c) => c.id !== excludeCategoryId);
    if (!conflict) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}
async function listCatalogProducts(input) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ product: products, category: categories }).from(products).leftJoin(categories, eq2(products.categoryId, categories.id)).where(eq2(products.isPublished, 1)).orderBy(asc(products.sortOrder));
  const search = input?.search?.trim().toLowerCase();
  const category = input?.category?.trim().toLowerCase();
  return rows.filter(({ product, category: rowCategory }) => {
    const matchesSearch = !search || `${product.name} ${product.sku ?? ""} ${product.shortDescription ?? ""} ${product.description ?? ""}`.toLowerCase().includes(search);
    const matchesCategory = !category || rowCategory?.slug === category || rowCategory?.name.toLowerCase() === category;
    return matchesSearch && matchesCategory;
  }).map(({ product, category: rowCategory }) => ({
    id: product.slug,
    productId: product.id,
    sku: product.sku ?? `SKU-${product.id}`,
    slug: product.slug,
    name: product.name,
    category: rowCategory?.name ?? "Other",
    categorySlug: rowCategory?.slug ?? "other",
    categoryId: product.categoryId,
    price: Math.round(product.pricePaise / 100),
    oldPrice: product.oldPricePaise ? Math.round(product.oldPricePaise / 100) : void 0,
    rating: product.ratingTenths / 10,
    badge: product.badge ?? void 0,
    image: product.image,
    additionalImages: product.additionalImages ? product.additionalImages.split(",").map((s) => s.trim()).filter(Boolean) : [],
    swatch: product.swatch,
    shortDescription: product.shortDescription ?? void 0,
    description: product.description ?? "",
    stock: product.stock,
    reservedStock: product.reservedStock,
    availableStock: Math.max(0, product.stock - product.reservedStock),
    lowStock: product.stock - product.reservedStock <= product.lowStockThreshold,
    isFeatured: Boolean(product.isFeatured)
  }));
}
async function listCatalogCategories() {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq2(categories.isPublished, 1)).orderBy(asc(categories.sortOrder));
}
async function listAdminProducts(filter) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ product: products, category: categories }).from(products).leftJoin(categories, eq2(products.categoryId, categories.id)).orderBy(asc(products.sortOrder), desc(products.createdAt));
  const search = filter?.search?.trim().toLowerCase();
  return rows.filter(({ product, category: rowCategory }) => {
    if (filter?.categoryId && product.categoryId !== filter.categoryId) return false;
    if (filter?.isPublished !== void 0 && Boolean(product.isPublished) !== filter.isPublished) return false;
    if (filter?.isFeatured !== void 0 && Boolean(product.isFeatured) !== filter.isFeatured) return false;
    const available = product.stock - product.reservedStock;
    if (filter?.stockStatus === "OUT_OF_STOCK" && available > 0) return false;
    if (filter?.stockStatus === "LOW_STOCK" && (available <= 0 || available > product.lowStockThreshold)) return false;
    if (filter?.stockStatus === "IN_STOCK" && available <= product.lowStockThreshold) return false;
    if (search) {
      const hay = `${product.name} ${product.sku ?? ""} ${product.slug} ${rowCategory?.name ?? ""} ${product.description ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  }).map(({ product, category: rowCategory }) => {
    const available = Math.max(0, product.stock - product.reservedStock);
    let stockStatus = "IN_STOCK";
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
      additionalImages: product.additionalImages ? product.additionalImages.split(",").map((s) => s.trim()).filter(Boolean) : [],
      swatch: product.swatch,
      badge: product.badge ?? null,
      isPublished: Boolean(product.isPublished),
      isFeatured: Boolean(product.isFeatured),
      sortOrder: product.sortOrder,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  });
}
async function createProduct(input) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const cleanName = input.name.trim();
  if (!cleanName || cleanName.length < 2) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "Product name must be at least 2 characters." });
  }
  const cleanSku = input.sku.trim().toUpperCase();
  if (!cleanSku || cleanSku.length < 2) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "Product SKU must be at least 2 characters." });
  }
  if (input.pricePaise < 0) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "Product price cannot be negative." });
  }
  if (input.stock < 0) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "Stock quantity cannot be negative." });
  }
  const categoryExists = await db.select({ id: categories.id }).from(categories).where(eq2(categories.id, input.categoryId)).limit(1);
  if (categoryExists.length === 0) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: `Category with ID ${input.categoryId} does not exist.` });
  }
  const existingSku = await db.select({ id: products.id }).from(products).where(eq2(products.sku, cleanSku)).limit(1);
  if (existingSku.length > 0) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: `SKU "${cleanSku}" is already in use by another product. Each product must have a unique SKU.` });
  }
  const finalSlug = input.slug ? slugify(input.slug) : await generateUniqueProductSlug(cleanName);
  const existingSlug = await db.select({ id: products.id }).from(products).where(eq2(products.slug, finalSlug)).limit(1);
  if (existingSlug.length > 0) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: `Slug "${finalSlug}" is already in use.` });
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
    sortOrder: input.sortOrder ?? 0
  };
  await db.insert(products).values(newProduct);
  const inserted = await db.select().from(products).where(eq2(products.slug, finalSlug)).limit(1);
  return inserted[0];
}
async function updateProduct(input) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const existing = await db.select().from(products).where(eq2(products.id, input.id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError3({ code: "NOT_FOUND", message: `Product with ID ${input.id} not found.` });
  }
  const current = existing[0];
  const updates = {};
  if (input.name !== void 0) {
    const cleanName = input.name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Product name must be at least 2 characters." });
    }
    updates.name = cleanName;
  }
  if (input.sku !== void 0) {
    const cleanSku = input.sku.trim().toUpperCase();
    if (!cleanSku || cleanSku.length < 2) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Product SKU must be at least 2 characters." });
    }
    const duplicateSku = await db.select({ id: products.id }).from(products).where(and(eq2(products.sku, cleanSku), ne(products.id, input.id))).limit(1);
    if (duplicateSku.length > 0) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: `SKU "${cleanSku}" is already in use by another product.` });
    }
    updates.sku = cleanSku;
  }
  if (input.slug !== void 0) {
    const cleanSlug = slugify(input.slug);
    if (!cleanSlug) throw new TRPCError3({ code: "BAD_REQUEST", message: "Slug must be valid URL characters." });
    const duplicateSlug = await db.select({ id: products.id }).from(products).where(and(eq2(products.slug, cleanSlug), ne(products.id, input.id))).limit(1);
    if (duplicateSlug.length > 0) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: `Slug "${cleanSlug}" is already in use.` });
    }
    updates.slug = cleanSlug;
  }
  if (input.categoryId !== void 0) {
    const categoryExists = await db.select({ id: categories.id }).from(categories).where(eq2(categories.id, input.categoryId)).limit(1);
    if (categoryExists.length === 0) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: `Category with ID ${input.categoryId} does not exist.` });
    }
    updates.categoryId = input.categoryId;
  }
  if (input.pricePaise !== void 0) {
    if (input.pricePaise < 0) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Price cannot be negative." });
    }
    updates.pricePaise = input.pricePaise;
  }
  if (input.oldPricePaise !== void 0) {
    updates.oldPricePaise = input.oldPricePaise ?? null;
  }
  if (input.stock !== void 0) {
    if (input.stock < 0) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Stock cannot be negative." });
    }
    updates.stock = input.stock;
  }
  if (input.lowStockThreshold !== void 0) {
    if (input.lowStockThreshold < 0) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Low stock threshold cannot be negative." });
    }
    updates.lowStockThreshold = input.lowStockThreshold;
  }
  if (input.image !== void 0) updates.image = input.image.trim();
  if (input.additionalImages !== void 0) updates.additionalImages = input.additionalImages.length ? input.additionalImages.join(",") : null;
  if (input.swatch !== void 0) updates.swatch = input.swatch.trim() || current.swatch;
  if (input.shortDescription !== void 0) updates.shortDescription = input.shortDescription?.trim() || null;
  if (input.description !== void 0) updates.description = input.description?.trim() || null;
  if (input.badge !== void 0) updates.badge = input.badge?.trim() || null;
  if (input.isPublished !== void 0) updates.isPublished = input.isPublished ? 1 : 0;
  if (input.isFeatured !== void 0) updates.isFeatured = input.isFeatured ? 1 : 0;
  if (input.sortOrder !== void 0) updates.sortOrder = input.sortOrder;
  await db.update(products).set(updates).where(eq2(products.id, input.id));
  const updated = await db.select().from(products).where(eq2(products.id, input.id)).limit(1);
  return updated[0];
}
async function deleteProduct(id) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const existing = await db.select().from(products).where(eq2(products.id, id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError3({ code: "NOT_FOUND", message: `Product with ID ${id} not found.` });
  }
  const hasOrders = await db.select({ id: orderItems.id }).from(orderItems).where(eq2(orderItems.productId, id)).limit(1);
  const hasCarts = await db.select({ id: cartItems.id }).from(cartItems).where(eq2(cartItems.productId, id)).limit(1);
  if (hasOrders.length > 0 || hasCarts.length > 0) {
    await db.update(products).set({ isPublished: 0 }).where(eq2(products.id, id));
    return {
      success: true,
      archived: true,
      deleted: false,
      message: "Product has associated orders or cart items and has been safely archived (unpublished) to preserve data integrity."
    };
  }
  await db.delete(products).where(eq2(products.id, id));
  return {
    success: true,
    archived: false,
    deleted: true,
    message: "Product deleted permanently."
  };
}
async function archiveProduct(id, isPublished) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const existing = await db.select().from(products).where(eq2(products.id, id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError3({ code: "NOT_FOUND", message: `Product with ID ${id} not found.` });
  }
  await db.update(products).set({ isPublished: isPublished ? 1 : 0 }).where(eq2(products.id, id));
  return { success: true, isPublished };
}
async function listAdminCategories() {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return [];
  const allCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  const allProducts = await db.select({ categoryId: products.categoryId }).from(products);
  const productCounts = /* @__PURE__ */ new Map();
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
    updatedAt: c.updatedAt
  }));
}
async function createCategory(input) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const cleanName = input.name.trim();
  if (!cleanName || cleanName.length < 2) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "Category name must be at least 2 characters." });
  }
  const finalSlug = input.slug ? slugify(input.slug) : await generateUniqueCategorySlug(cleanName);
  const existing = await db.select({ id: categories.id }).from(categories).where(eq2(categories.slug, finalSlug)).limit(1);
  if (existing.length > 0) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: `Category slug "${finalSlug}" is already in use.` });
  }
  const newCategory = {
    name: cleanName,
    slug: finalSlug,
    description: input.description?.trim() || null,
    color: input.color?.trim() || "cream",
    image: input.image?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
    isPublished: input.isPublished === false ? 0 : 1
  };
  await db.insert(categories).values(newCategory);
  const inserted = await db.select().from(categories).where(eq2(categories.slug, finalSlug)).limit(1);
  return inserted[0];
}
async function updateCategory(input) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const existing = await db.select().from(categories).where(eq2(categories.id, input.id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError3({ code: "NOT_FOUND", message: `Category with ID ${input.id} not found.` });
  }
  const updates = {};
  if (input.name !== void 0) {
    const cleanName = input.name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Category name must be at least 2 characters." });
    }
    updates.name = cleanName;
  }
  if (input.slug !== void 0) {
    const cleanSlug = slugify(input.slug);
    if (!cleanSlug) throw new TRPCError3({ code: "BAD_REQUEST", message: "Slug must be valid URL characters." });
    const duplicate = await db.select({ id: categories.id }).from(categories).where(and(eq2(categories.slug, cleanSlug), ne(categories.id, input.id))).limit(1);
    if (duplicate.length > 0) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: `Category slug "${cleanSlug}" is already in use.` });
    }
    updates.slug = cleanSlug;
  }
  if (input.description !== void 0) updates.description = input.description?.trim() || null;
  if (input.color !== void 0) updates.color = input.color.trim();
  if (input.image !== void 0) updates.image = input.image?.trim() || null;
  if (input.sortOrder !== void 0) updates.sortOrder = input.sortOrder;
  if (input.isPublished !== void 0) updates.isPublished = input.isPublished ? 1 : 0;
  await db.update(categories).set(updates).where(eq2(categories.id, input.id));
  const updated = await db.select().from(categories).where(eq2(categories.id, input.id)).limit(1);
  return updated[0];
}
async function deleteCategory(id) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const existing = await db.select().from(categories).where(eq2(categories.id, id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError3({ code: "NOT_FOUND", message: `Category with ID ${id} not found.` });
  }
  const category = existing[0];
  const productsInCategory = await db.select({ id: products.id }).from(products).where(eq2(products.categoryId, id));
  if (productsInCategory.length > 0) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: `Cannot delete category "${category.name}" because ${productsInCategory.length} product(s) belong to it. Please reassign or delete these products first, or unpublish (archive) the category instead.`
    });
  }
  await db.delete(categories).where(eq2(categories.id, id));
  return { success: true, message: `Category "${category.name}" deleted successfully.` };
}
async function archiveCategory(id, isPublished) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  const existing = await db.select().from(categories).where(eq2(categories.id, id)).limit(1);
  if (existing.length === 0) {
    throw new TRPCError3({ code: "NOT_FOUND", message: `Category with ID ${id} not found.` });
  }
  await db.update(categories).set({ isPublished: isPublished ? 1 : 0 }).where(eq2(categories.id, id));
  return { success: true, isPublished };
}
async function getInventoryOverview() {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) return { totalProducts: 0, lowStock: 0, outOfStock: 0 };
  const rows = await db.select({ stock: products.stock, threshold: products.lowStockThreshold }).from(products);
  return {
    totalProducts: rows.length,
    lowStock: rows.filter((row) => row.stock > 0 && row.stock <= row.threshold).length,
    outOfStock: rows.filter((row) => row.stock <= 0).length
  };
}
async function updateProductStock(slug, stock) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  await db.update(products).set({ stock }).where(eq2(products.slug, slug));
  return { success: true };
}
async function updateProductVisibility(slug, isPublished) {
  await ensureCatalogSeeded();
  const db = await getDb();
  if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
  await db.update(products).set({ isPublished: isPublished ? 1 : 0 }).where(eq2(products.slug, slug));
  return { success: true };
}

// server/commerce.ts
import { and as and2, asc as asc2, desc as desc2, eq as eq3, sql as sql2 } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
var DELIVERY_FEE_PAISE = 5e3;
function money(value) {
  return Math.max(0, Math.round(value));
}
function orderNumber() {
  return `PL-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
async function activeCart(db, userId, create = true) {
  const found = await db.select().from(carts).where(and2(eq3(carts.customerId, userId), eq3(carts.status, "ACTIVE"))).orderBy(desc2(carts.updatedAt)).limit(1);
  if (found[0] || !create) return found[0];
  await db.insert(carts).values({ customerId: userId, status: "ACTIVE" });
  const created = await db.select().from(carts).where(and2(eq3(carts.customerId, userId), eq3(carts.status, "ACTIVE"))).orderBy(desc2(carts.createdAt)).limit(1);
  return created[0];
}
async function cartState(db, cart) {
  const rows = await db.select({ item: cartItems, product: products }).from(cartItems).innerJoin(products, eq3(cartItems.productId, products.id)).where(eq3(cartItems.cartId, cart.id)).orderBy(asc2(cartItems.id));
  const items = rows.map(({ item, product }) => ({
    id: product.slug,
    productId: product.id,
    name: product.name,
    category: "Product",
    price: Math.round(product.pricePaise / 100),
    pricePaise: product.pricePaise,
    image: product.image,
    swatch: product.swatch,
    description: product.description ?? "",
    quantity: item.quantity,
    availableStock: Math.max(0, product.stock - product.reservedStock),
    isPublished: product.isPublished === 1
  }));
  const subtotalPaise = items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  return { id: cart.id, status: cart.status, items, subtotalPaise, totalPaise: subtotalPaise, currency: "INR" };
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Commerce database is unavailable" });
  return db;
}
async function requireProduct(db, slug) {
  const row = await db.select().from(products).where(eq3(products.slug, slug)).limit(1);
  const product = row[0];
  if (!product || product.isPublished !== 1) throw new TRPCError4({ code: "BAD_REQUEST", message: "This product is no longer available." });
  return product;
}
function validateQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new TRPCError4({ code: "BAD_REQUEST", message: "Choose a quantity between 1 and 100." });
}
async function getCart(user) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id);
  if (!cart) return { id: null, status: "ACTIVE", items: [], subtotalPaise: 0, totalPaise: 0, currency: "INR" };
  return cartState(db, cart);
}
async function addCartItem(user, slug, quantity) {
  validateQuantity(quantity);
  const db = await requireDb();
  const product = await requireProduct(db, slug);
  const available = product.stock - product.reservedStock;
  const cart = await activeCart(db, user.id, true);
  if (!cart) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Could not create cart" });
  const existing = await db.select().from(cartItems).where(and2(eq3(cartItems.cartId, cart.id), eq3(cartItems.productId, product.id))).limit(1);
  const nextQuantity = (existing[0]?.quantity ?? 0) + quantity;
  if (nextQuantity > available) throw new TRPCError4({ code: "BAD_REQUEST", message: `Only ${Math.max(0, available)} units are currently available.` });
  if (existing[0]) await db.update(cartItems).set({ quantity: nextQuantity }).where(eq3(cartItems.id, existing[0].id));
  else await db.insert(cartItems).values({ cartId: cart.id, productId: product.id, quantity });
  return cartState(db, cart);
}
async function updateCartItem(user, slug, quantity) {
  validateQuantity(quantity);
  const db = await requireDb();
  const product = await requireProduct(db, slug);
  const available = product.stock - product.reservedStock;
  if (quantity > available) throw new TRPCError4({ code: "BAD_REQUEST", message: `Only ${Math.max(0, available)} units are currently available.` });
  const cart = await activeCart(db, user.id, false);
  if (!cart) throw new TRPCError4({ code: "NOT_FOUND", message: "Your cart is empty." });
  const existing = await db.select({ item: cartItems }).from(cartItems).innerJoin(products, eq3(cartItems.productId, products.id)).where(and2(eq3(cartItems.cartId, cart.id), eq3(products.slug, slug))).limit(1);
  if (!existing[0]) throw new TRPCError4({ code: "NOT_FOUND", message: "That item is not in your cart." });
  await db.update(cartItems).set({ quantity }).where(eq3(cartItems.id, existing[0].item.id));
  return cartState(db, cart);
}
async function removeCartItem(user, slug) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id, false);
  if (!cart) return getCart(user);
  const existing = await db.select({ item: cartItems }).from(cartItems).innerJoin(products, eq3(cartItems.productId, products.id)).where(and2(eq3(cartItems.cartId, cart.id), eq3(products.slug, slug))).limit(1);
  if (existing[0]) await db.delete(cartItems).where(eq3(cartItems.id, existing[0].item.id));
  return cartState(db, cart);
}
async function clearCart(user) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id, false);
  if (cart) await db.delete(cartItems).where(eq3(cartItems.cartId, cart.id));
  return getCart(user);
}
async function mergeGuestCart(user, guestItems) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id, true);
  if (!cart) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Could not create cart" });
  for (const item of guestItems) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) continue;
    const row = await db.select().from(products).where(eq3(products.slug, item.productSlug)).limit(1);
    const product = row[0];
    if (!product || product.isPublished !== 1) continue;
    const available = Math.max(0, product.stock - product.reservedStock);
    if (available <= 0) continue;
    const existing = await db.select().from(cartItems).where(and2(eq3(cartItems.cartId, cart.id), eq3(cartItems.productId, product.id))).limit(1);
    const cappedQuantity = Math.min(100, Math.min(available, (existing[0]?.quantity ?? 0) + item.quantity));
    if (cappedQuantity <= 0) continue;
    if (existing[0]) {
      await db.update(cartItems).set({ quantity: cappedQuantity }).where(eq3(cartItems.id, existing[0].id));
    } else {
      await db.insert(cartItems).values({ cartId: cart.id, productId: product.id, quantity: cappedQuantity });
    }
  }
  return cartState(db, cart);
}
async function createOrder(user, input) {
  const db = await requireDb();
  const cart = await activeCart(db, user.id, false);
  if (!cart) throw new TRPCError4({ code: "BAD_REQUEST", message: "Your cart is empty." });
  if (input.fulfillmentType === "DELIVERY" && !input.deliveryAddress?.trim()) throw new TRPCError4({ code: "BAD_REQUEST", message: "Add a delivery address to continue." });
  return db.transaction(async (tx) => {
    const rows = await tx.select({ item: cartItems, product: products }).from(cartItems).innerJoin(products, eq3(cartItems.productId, products.id)).where(eq3(cartItems.cartId, cart.id)).orderBy(asc2(cartItems.id));
    if (rows.length === 0) throw new TRPCError4({ code: "BAD_REQUEST", message: "Your cart is empty." });
    const lineItems = [];
    for (const { item, product } of rows) {
      if (product.isPublished !== 1) throw new TRPCError4({ code: "BAD_REQUEST", message: `${product.name} is no longer available.` });
      if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new TRPCError4({ code: "BAD_REQUEST", message: "Invalid cart quantity." });
      const updateRes = await tx.update(products).set({ reservedStock: sql2`${products.reservedStock} + ${item.quantity}` }).where(and2(eq3(products.id, product.id), sql2`${products.stock} - ${products.reservedStock} >= ${item.quantity}`));
      const affectedRows = Array.isArray(updateRes) ? updateRes[0]?.affectedRows ?? 0 : updateRes?.affectedRows ?? 0;
      if (!affectedRows) throw new TRPCError4({ code: "BAD_REQUEST", message: `Only ${Math.max(0, product.stock - product.reservedStock)} units of ${product.name} are currently available.` });
      lineItems.push({ product, quantity: item.quantity, subtotalPaise: product.pricePaise * item.quantity });
    }
    const subtotalPaise = lineItems.reduce((sum, line) => sum + line.subtotalPaise, 0);
    const deliveryFeePaise = input.fulfillmentType === "DELIVERY" ? DELIVERY_FEE_PAISE : 0;
    const totalPaise = money(subtotalPaise + deliveryFeePaise);
    const number = orderNumber();
    await tx.insert(orders).values({ orderNumber: number, customerId: user.id, subtotalPaise, discountPaise: 0, deliveryFeePaise, taxPaise: 0, totalPaise, currency: "INR", paymentStatus: "UNPAID", orderStatus: "PENDING", fulfillmentType: input.fulfillmentType, deliveryAddress: input.deliveryAddress?.trim() || null });
    const savedOrder = await tx.select().from(orders).where(eq3(orders.orderNumber, number)).limit(1);
    const order = savedOrder[0];
    if (!order) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Order could not be created." });
    await tx.insert(orderItems).values(lineItems.map(({ product, quantity, subtotalPaise: subtotalPaise2 }) => ({ orderId: order.id, productId: product.id, productNameSnapshot: product.name, skuSnapshot: product.slug, unitPricePaise: product.pricePaise, quantity, subtotalPaise: subtotalPaise2 })));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, oldStatus: null, newStatus: "PENDING", changedBy: user.id });
    await tx.update(carts).set({ status: "CONVERTED" }).where(eq3(carts.id, cart.id));
    return { orderNumber: order.orderNumber, id: order.id, subtotalPaise, deliveryFeePaise, totalPaise, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus, fulfillmentType: order.fulfillmentType };
  });
}
async function listCustomerOrders(user) {
  const db = await requireDb();
  return db.select().from(orders).where(eq3(orders.customerId, user.id)).orderBy(desc2(orders.createdAt));
}
async function getCustomerOrder(user, orderId) {
  const db = await requireDb();
  const found = await db.select().from(orders).where(and2(eq3(orders.id, orderId), eq3(orders.customerId, user.id))).limit(1);
  if (!found[0]) throw new TRPCError4({ code: "NOT_FOUND", message: "Order not found." });
  const items = await db.select().from(orderItems).where(eq3(orderItems.orderId, orderId));
  const history = await db.select().from(orderStatusHistory).where(eq3(orderStatusHistory.orderId, orderId)).orderBy(asc2(orderStatusHistory.createdAt));
  return { order: found[0], items, history };
}
async function listAdminOrders() {
  const db = await requireDb();
  return db.select().from(orders).orderBy(desc2(orders.createdAt));
}
async function getAdminOrder(orderId) {
  const db = await requireDb();
  const found = await db.select().from(orders).where(eq3(orders.id, orderId)).limit(1);
  if (!found[0]) throw new TRPCError4({ code: "NOT_FOUND", message: "Order not found." });
  const items = await db.select().from(orderItems).where(eq3(orderItems.orderId, orderId));
  const history = await db.select().from(orderStatusHistory).where(eq3(orderStatusHistory.orderId, orderId)).orderBy(asc2(orderStatusHistory.createdAt));
  return { order: found[0], items, history };
}
async function updateOrderStatus(user, orderId, status) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const found = await tx.select().from(orders).where(eq3(orders.id, orderId)).limit(1);
    const order = found[0];
    if (!order) throw new TRPCError4({ code: "NOT_FOUND", message: "Order not found." });
    await tx.update(orders).set({ orderStatus: status }).where(eq3(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({ orderId, oldStatus: order.orderStatus, newStatus: status, changedBy: user.id });
    if (status === "CANCELLED" || status === "REFUNDED") {
      const items = await tx.select().from(orderItems).where(eq3(orderItems.orderId, orderId));
      for (const item of items) await tx.update(products).set({ reservedStock: sql2`GREATEST(0, ${products.reservedStock} - ${item.quantity})` }).where(eq3(products.id, item.productId));
    }
    return { success: true };
  });
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  catalog: router({
    // Storefront public endpoints
    list: publicProcedure.input(z2.object({ search: z2.string().optional(), category: z2.string().optional(), sort: z2.string().optional() }).optional()).query(({ input }) => listCatalogProducts(input)),
    categories: publicProcedure.query(() => listCatalogCategories()),
    // Admin product endpoints
    adminList: permissionProcedure("admin:read").input(
      z2.object({
        search: z2.string().optional(),
        categoryId: z2.number().int().positive().optional(),
        isPublished: z2.boolean().optional(),
        isFeatured: z2.boolean().optional(),
        stockStatus: z2.enum(["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional()
      }).optional()
    ).query(({ input }) => listAdminProducts(input)),
    createProduct: permissionProcedure("products:write").input(
      z2.object({
        name: z2.string().min(2, "Product name must be at least 2 characters").max(180),
        sku: z2.string().min(2, "SKU must be at least 2 characters").max(80),
        slug: z2.string().optional(),
        categoryId: z2.number().int().positive("A valid category must be selected"),
        pricePaise: z2.number().int().min(0, "Price cannot be negative"),
        oldPricePaise: z2.number().int().min(0).optional(),
        stock: z2.number().int().min(0, "Stock cannot be negative"),
        lowStockThreshold: z2.number().int().min(0).default(5),
        image: z2.string().min(3, "Image URL is required"),
        additionalImages: z2.array(z2.string()).optional(),
        swatch: z2.string().optional(),
        shortDescription: z2.string().max(300).optional(),
        description: z2.string().optional(),
        badge: z2.string().max(32).optional(),
        isPublished: z2.boolean().default(true),
        isFeatured: z2.boolean().default(false),
        sortOrder: z2.number().int().default(0)
      })
    ).mutation(({ input }) => createProduct(input)),
    updateProduct: permissionProcedure("products:write").input(
      z2.object({
        id: z2.number().int().positive(),
        name: z2.string().min(2).max(180).optional(),
        sku: z2.string().min(2).max(80).optional(),
        slug: z2.string().optional(),
        categoryId: z2.number().int().positive().optional(),
        pricePaise: z2.number().int().min(0).optional(),
        oldPricePaise: z2.number().int().min(0).nullable().optional(),
        stock: z2.number().int().min(0).optional(),
        lowStockThreshold: z2.number().int().min(0).optional(),
        image: z2.string().min(3).optional(),
        additionalImages: z2.array(z2.string()).optional(),
        swatch: z2.string().optional(),
        shortDescription: z2.string().max(300).nullable().optional(),
        description: z2.string().nullable().optional(),
        badge: z2.string().max(32).nullable().optional(),
        isPublished: z2.boolean().optional(),
        isFeatured: z2.boolean().optional(),
        sortOrder: z2.number().int().optional()
      })
    ).mutation(({ input }) => updateProduct(input)),
    deleteProduct: permissionProcedure("products:write").input(z2.object({ id: z2.number().int().positive() })).mutation(({ input }) => deleteProduct(input.id)),
    archiveProduct: permissionProcedure("products:write").input(z2.object({ id: z2.number().int().positive(), isPublished: z2.boolean() })).mutation(({ input }) => archiveProduct(input.id, input.isPublished)),
    // Admin category endpoints
    adminCategories: permissionProcedure("admin:read").query(() => listAdminCategories()),
    createCategory: permissionProcedure("products:write").input(
      z2.object({
        name: z2.string().min(2, "Category name must be at least 2 characters").max(120),
        slug: z2.string().optional(),
        description: z2.string().max(500).optional(),
        color: z2.string().default("cream"),
        image: z2.string().optional(),
        sortOrder: z2.number().int().default(0),
        isPublished: z2.boolean().default(true)
      })
    ).mutation(({ input }) => createCategory(input)),
    updateCategory: permissionProcedure("products:write").input(
      z2.object({
        id: z2.number().int().positive(),
        name: z2.string().min(2).max(120).optional(),
        slug: z2.string().optional(),
        description: z2.string().max(500).nullable().optional(),
        color: z2.string().optional(),
        image: z2.string().nullable().optional(),
        sortOrder: z2.number().int().optional(),
        isPublished: z2.boolean().optional()
      })
    ).mutation(({ input }) => updateCategory(input)),
    deleteCategory: permissionProcedure("products:write").input(z2.object({ id: z2.number().int().positive() })).mutation(({ input }) => deleteCategory(input.id)),
    archiveCategory: permissionProcedure("products:write").input(z2.object({ id: z2.number().int().positive(), isPublished: z2.boolean() })).mutation(({ input }) => archiveCategory(input.id, input.isPublished)),
    // Inventory procedures
    inventoryOverview: permissionProcedure("inventory:write").query(() => getInventoryOverview()),
    updateStock: permissionProcedure("inventory:write").input(z2.object({ slug: z2.string().min(1), stock: z2.number().int().min(0).max(1e6) })).mutation(({ input }) => updateProductStock(input.slug, input.stock)),
    togglePublished: permissionProcedure("products:write").input(z2.object({ slug: z2.string().min(1), isPublished: z2.boolean() })).mutation(({ input }) => updateProductVisibility(input.slug, input.isPublished))
  }),
  cart: router({
    get: protectedProcedure.query(({ ctx }) => getCart(ctx.user)),
    addItem: protectedProcedure.input(z2.object({ productSlug: z2.string().min(1), quantity: z2.number().int().min(1).max(100) })).mutation(({ ctx, input }) => addCartItem(ctx.user, input.productSlug, input.quantity)),
    updateItem: protectedProcedure.input(z2.object({ productSlug: z2.string().min(1), quantity: z2.number().int().min(1).max(100) })).mutation(({ ctx, input }) => updateCartItem(ctx.user, input.productSlug, input.quantity)),
    removeItem: protectedProcedure.input(z2.object({ productSlug: z2.string().min(1) })).mutation(({ ctx, input }) => removeCartItem(ctx.user, input.productSlug)),
    clear: protectedProcedure.mutation(({ ctx }) => clearCart(ctx.user)),
    mergeGuestCart: protectedProcedure.input(z2.object({ items: z2.array(z2.object({ productSlug: z2.string().min(1), quantity: z2.number().int().min(1).max(100) })) })).mutation(({ ctx, input }) => mergeGuestCart(ctx.user, input.items))
  }),
  orders: router({
    create: protectedProcedure.input(z2.object({ fulfillmentType: z2.enum(["STORE_PICKUP", "SELF_PICKUP", "DELIVERY"]), deliveryAddress: z2.string().max(500).optional() })).mutation(({ ctx, input }) => createOrder(ctx.user, input)),
    mine: protectedProcedure.query(({ ctx }) => listCustomerOrders(ctx.user)),
    get: protectedProcedure.input(z2.object({ orderId: z2.number().int().positive() })).query(({ ctx, input }) => getCustomerOrder(ctx.user, input.orderId)),
    adminList: permissionProcedure("orders:read").query(() => listAdminOrders()),
    adminGet: permissionProcedure("orders:read").input(z2.object({ orderId: z2.number().int().positive() })).query(({ input }) => getAdminOrder(input.orderId)),
    updateStatus: permissionProcedure("orders:write").input(
      z2.object({
        orderId: z2.number().int().positive(),
        status: z2.enum(["PENDING", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"])
      })
    ).mutation(({ ctx, input }) => updateOrderStatus(ctx.user, input.orderId, input.status))
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/apiHandler.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/platform/config.js", (_req, res) => {
  res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
});
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var apiHandler_default = app;
export {
  apiHandler_default as default
};
