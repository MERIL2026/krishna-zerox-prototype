import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "http";
import type { AddressInfo } from "net";
import superjson from "superjson";
import app from "./apiHandler";
import { COOKIE_NAME } from "../shared/const";

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("End-to-End Real HTTP Authentication Lifecycle", () => {
  it("GET /api/health responds with 200 and status ok", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("GET /api/platform/config.js returns javascript with public configuration", async () => {
    const res = await fetch(`${baseUrl}/api/platform/config.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/javascript");
    const text = await res.text();
    expect(text).toContain("window.__MANUS_CONFIG__");
  });

  it("auth.me returns null for unauthenticated client", async () => {
    const inputParam = encodeURIComponent(JSON.stringify({ "0": superjson.serialize(undefined) }));
    const res = await fetch(`${baseUrl}/api/trpc/auth.me?batch=1&input=${inputParam}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].result.data.json).toBeNull();
  });

  it("auth.demoLogin rejects wrong passcode with UNAUTHORIZED", async () => {
    const res = await fetch(`${baseUrl}/api/trpc/auth.demoLogin?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "0": superjson.serialize({
          role: "owner",
          passcode: "incorrect-passcode",
        }),
      }),
    });

    const data = await res.json();
    expect(data[0].error).toBeDefined();
    expect(data[0].error.json.message).toContain("Invalid passcode");
  });

  it("Customer Flow: login, cookie extraction, session verification, and block from admin APIs", async () => {
    // 1. Perform login as customer
    const loginRes = await fetch(`${baseUrl}/api/trpc/auth.demoLogin?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "0": superjson.serialize({
          role: "customer",
          passcode: "krishna2026",
        }),
      }),
    });

    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData[0].result.data.json.success).toBe(true);
    expect(loginData[0].result.data.json.user.role).toBe("customer");

    // Extract cookie from Set-Cookie header
    const setCookieHeader = loginRes.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain(COOKIE_NAME);

    // Parse the session cookie value
    const match = setCookieHeader!.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    expect(match).not.toBeNull();
    const cookieHeader = `${COOKIE_NAME}=${match![1]}`;

    // 2. Test auth.me with the customer cookie
    const inputParam = encodeURIComponent(JSON.stringify({ "0": superjson.serialize(undefined) }));
    const meRes = await fetch(`${baseUrl}/api/trpc/auth.me?batch=1&input=${inputParam}`, {
      headers: { Cookie: cookieHeader },
    });
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData[0].result.data.json.role).toBe("customer");

    // 3. Test that customer is blocked from admin procedures
    const adminInput = encodeURIComponent(JSON.stringify({ "0": superjson.serialize({}) }));
    const adminRes = await fetch(`${baseUrl}/api/trpc/catalog.adminList?batch=1&input=${adminInput}`, {
      headers: { Cookie: cookieHeader },
    });
    const adminData = await adminRes.json();
    expect(adminData[0].error).toBeDefined();
    expect(adminData[0].error.json.message).toContain("You do not have required permission");
  });

  it("Owner Flow: login, access admin APIs, verify session persistence, and logout", async () => {
    // 1. Login as owner
    const loginRes = await fetch(`${baseUrl}/api/trpc/auth.demoLogin?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "0": superjson.serialize({
          role: "owner",
          passcode: "krishna2026",
        }),
      }),
    });

    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData[0].result.data.json.success).toBe(true);
    expect(loginData[0].result.data.json.user.role).toBe("owner");

    // Extract session cookie
    const setCookieHeader = loginRes.headers.get("set-cookie");
    const match = setCookieHeader!.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    expect(match).not.toBeNull();
    const cookieHeader = `${COOKIE_NAME}=${match![1]}`;

    // 2. Query auth.me with owner cookie
    const meInput = encodeURIComponent(JSON.stringify({ "0": superjson.serialize(undefined) }));
    const meRes = await fetch(`${baseUrl}/api/trpc/auth.me?batch=1&input=${meInput}`, {
      headers: { Cookie: cookieHeader },
    });
    const meData = await meRes.json();
    expect(meData[0].result.data.json.role).toBe("owner");
    expect(meData[0].result.data.json.name).toBe("Meril Patel");

    // 3. Query admin procedure (catalog.adminList)
    const adminInput = encodeURIComponent(JSON.stringify({ "0": superjson.serialize({}) }));
    const adminRes = await fetch(`${baseUrl}/api/trpc/catalog.adminList?batch=1&input=${adminInput}`, {
      headers: { Cookie: cookieHeader },
    });
    expect(adminRes.status).toBe(200);
    const adminData = await adminRes.json();
    expect(adminData[0].result).toBeDefined();

    // 4. Logout
    const logoutRes = await fetch(`${baseUrl}/api/trpc/auth.logout?batch=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ "0": superjson.serialize(undefined) }),
    });
    expect(logoutRes.status).toBe(200);
    const logoutCookie = logoutRes.headers.get("set-cookie");
    expect(logoutCookie).toContain(`${COOKIE_NAME}=;`);
  });
});
