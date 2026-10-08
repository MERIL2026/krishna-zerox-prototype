/**
 * api/handler.ts
 * Vercel serverless entry-point for the Express/tRPC backend.
 *
 * This file intentionally does NOT call server.listen() — Vercel invokes
 * the exported Express app directly via its Node.js serverless runtime.
 * It is kept separate from server/_core/index.ts (which starts the HTTP
 * server for self-hosted / local-dev mode) so neither path contains dead code.
 */

import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth.js";
import { publicPlatformScript } from "../server/_core/publicConfig.js";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";

const app = express();

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ── Health + public config ───────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/platform/config.js", (_req, res) => {
  res
    .set("Cache-Control", "no-store")
    .type("application/javascript")
    .send(publicPlatformScript());
});

// ── OAuth ────────────────────────────────────────────────────────────────────
registerOAuthRoutes(app);

// ── tRPC ─────────────────────────────────────────────────────────────────────
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Export the Express app — Vercel calls it as a serverless function.
export default app;
