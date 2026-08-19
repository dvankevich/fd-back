import { test, expect } from "@playwright/test";
import { authHeaders, cleanDatabase, owner, register, registerSession } from "./helpers.ts";

test.describe("Auth API (e2e)", () => {
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test("register → me → logout → refresh with the revoked token fails", async ({ request }) => {
    const session = await registerSession(request);
    expect(session.user.email).toBe(owner.email);
    expect(session.user.name).toBe(owner.name);
    expect(session.user.avatar).toBeNull();

    const meRes = await request.get("/api/users/me", { headers: authHeaders(session.accessToken) });
    expect(meRes.status()).toBe(200);
    expect(await meRes.json()).toMatchObject({ email: owner.email, name: owner.name });

    const logoutRes = await request.post("/api/auth/logout", {
      headers: authHeaders(session.accessToken),
      data: { refreshToken: session.refreshToken },
    });
    expect(logoutRes.status()).toBe(204);

    const refreshRes = await request.post("/api/auth/refresh", {
      data: { refreshToken: session.refreshToken },
    });
    expect(refreshRes.status()).toBe(401);
  });

  test("logout without access token returns 401", async ({ request }) => {
    const res = await request.post("/api/auth/logout");
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Authentication required" });
  });

  test("register is case-insensitive on email", async ({ request }) => {
    await registerSession(request);

    const res = await register(request, { ...owner, email: owner.email.toUpperCase() });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: "Email already taken" });
  });

  test("login with wrong password returns 401", async ({ request }) => {
    await registerSession(request);

    const res = await request.post("/api/auth/login", {
      data: { email: owner.email, password: "wrongpassword" },
    });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid credentials" });
  });

  test("refresh rotates the refresh token", async ({ request }) => {
    const { refreshToken } = await registerSession(request);

    const res = await request.post("/api/auth/refresh", { data: { refreshToken } });
    expect(res.status()).toBe(200);

    const rotated = await res.json();
    expect(rotated.accessToken).toBeTruthy();
    expect(rotated.refreshToken).toBeTruthy();
    expect(rotated.refreshToken).not.toBe(refreshToken);
  });
});
