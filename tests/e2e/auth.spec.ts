import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  register,
  registerAndGetToken,
  userA,
} from "./helpers.ts";

test.describe("Auth E2E", () => {
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test("register → me → logout flow", async ({ request }) => {
    // Register
    const registerRes = await register(request);
    expect(registerRes.status()).toBe(201);

    const registerBody = await registerRes.json();
    expect(registerBody.accessToken).toBeTruthy();
    expect(registerBody.user.email).toBe(userA.email);
    expect(registerBody.user.name).toBe(userA.name);
    expect(registerBody.user.avatar).toBeNull();

    // Me
    const meRes = await request.get("/api/auth/me", {
      headers: { Authorization: `Bearer ${registerBody.accessToken}` },
    });
    expect(meRes.status()).toBe(200);

    const me = await meRes.json();
    expect(me.email).toBe(userA.email);
    expect(me.name).toBe(userA.name);

    // Logout
    const logoutRes = await request.post("/api/auth/logout", {
      data: { refreshToken: registerBody.refreshToken },
    });
    expect(logoutRes.status()).toBe(204);
  });

  test("login with wrong password returns 401", async ({ request }) => {
    await register(request);

    const res = await request.post("/api/auth/login", {
      data: { email: userA.email, password: "wrongpassword" },
    });

    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid credentials" });
  });

  test("refresh rotates refresh token", async ({ request }) => {
    const { refreshToken } = await registerAndGetToken(request);

    const res = await request.post("/api/auth/refresh", {
      data: { refreshToken },
    });

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.refreshToken).not.toBe(refreshToken);
  });
});
