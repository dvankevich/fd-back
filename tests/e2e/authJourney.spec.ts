import { test, expect, type APIRequestContext } from "@playwright/test";
import { AUTH_CONFIG } from "../../src/config/auth.ts";
import { TIME_MS } from "../../src/constants/time.ts";
import prisma from "./db.ts";
import {
  cleanDatabase,
  countSessions,
  findStoredToken,
  login,
  loginSession,
  logout,
  me,
  owner,
  refresh,
  refreshedTokens,
  register,
  registerSession,
  setCookieHeader,
  storedRefreshCookie,
} from "./helpers.ts";

const other = { email: "e2e_other@example.com", password: "otherpass123", name: "E2E Other" };

const cookieMaxAge = AUTH_CONFIG.session.ttlMs / TIME_MS.second;

test.describe("Auth journey (e2e)", () => {
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test("one browser: register, use, refresh from cookie, survive a replay, logout, login again", async ({
    request,
  }) => {
    const registered = await test.step("register returns tokens, user and an httpOnly cookie", async () => {
      const res = await register(request);
      expect(res.status()).toBe(201);
      const setCookie = setCookieHeader(res);
      expect(setCookie).toMatch(/^refreshToken=[0-9a-f]{80};/);
      expect(setCookie).toContain(`Max-Age=${cookieMaxAge}`);
      expect(setCookie).toContain("Path=/api/auth");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Strict");
      const session = await registerSession(request, { ...owner, email: "e2e_journey@example.com" });
      expect(session.user).toMatchObject({ email: "e2e_journey@example.com", name: owner.name, avatar: null });
      const stored = await storedRefreshCookie(request);
      expect(stored).toMatchObject({ value: session.refreshToken, httpOnly: true, path: "/api/auth" });
      return session;
    });

    await test.step("the access token opens a private route, nothing else does", async () => {
      expect((await me(request, registered.accessToken)).status()).toBe(200);
      expect((await me(request)).status()).toBe(401);
      expect(await (await me(request, "garbage")).json()).toEqual({ error: "Invalid or expired access token" });
    });

    const rotated = await test.step("refresh with the cookie alone rotates the pair and the cookie", async () => {
      const tokens = await refreshedTokens(request);
      expect(tokens.refreshToken).not.toBe(registered.refreshToken);
      expect((await storedRefreshCookie(request))?.value).toBe(tokens.refreshToken);
      expect((await me(request, tokens.accessToken)).status()).toBe(200);
      expect(await countSessions(registered.user.id)).toBe(2);
      return tokens;
    });

    await test.step("replaying the previous token inside the grace window is a plain 401", async () => {
      const res = await refresh(request, registered.refreshToken);
      expect(res.status()).toBe(401);
      expect(await res.json()).toEqual({ error: "Invalid refresh token" });
      expect(setCookieHeader(res)).toBeUndefined();
      expect((await storedRefreshCookie(request))?.value).toBe(rotated.refreshToken);
      expect((await refresh(request)).status()).toBe(200);
    });

    await test.step("logout with the cookie alone ends this session and drops the cookie", async () => {
      const current = (await storedRefreshCookie(request))?.value;
      const res = await logout(request, { accessToken: rotated.accessToken });
      expect(res.status()).toBe(204);
      expect(setCookieHeader(res)).toMatch(/^refreshToken=;/);
      expect(await storedRefreshCookie(request)).toBeUndefined();
      expect(current).toBeDefined();
      if (current) {
        expect(await findStoredToken(current)).toBeNull();
        expect(await (await refresh(request, current)).json()).toEqual({ error: "Invalid refresh token" });
      }
      expect(await (await refresh(request)).json()).toEqual({ error: "Refresh token required" });
    });

    await test.step("the access token stays valid until it expires, a fresh login starts a new session", async () => {
      expect((await me(request, rotated.accessToken)).status()).toBe(200);
      const session = await loginSession(request, { email: "e2e_journey@example.com", password: owner.password });
      expect((await me(request, session.accessToken)).status()).toBe(200);
      expect((await storedRefreshCookie(request))?.value).toBe(session.refreshToken);
      const rows = await prisma.refreshToken.findMany({ where: { userId: session.user.id } });
      expect(rows.filter((row) => row.rotatedAt === null)).toHaveLength(1);
      expect(rows.filter((row) => row.rotatedAt !== null)).toHaveLength(2);
    });
  });

  test("two devices: sessions are independent, logout of one keeps the other, logout without any token ends all", async ({
    request: laptop,
    playwright,
    baseURL,
  }) => {
    const phone = await playwright.request.newContext({ baseURL });
    const bare = await playwright.request.newContext({ baseURL });
    try {
      const onLaptop = await registerSession(laptop);
      const onPhone = await loginSession(phone);
      expect(await countSessions(onLaptop.user.id)).toBe(2);

      const laptopRotated = await refreshedTokens(laptop);
      expect((await refresh(phone)).status()).toBe(200);
      expect(await countSessions(onLaptop.user.id)).toBe(4);

      expect((await logout(laptop, { accessToken: laptopRotated.accessToken })).status()).toBe(204);
      expect(await (await refresh(laptop)).json()).toEqual({ error: "Refresh token required" });
      const phoneRotated = await refreshedTokens(phone);
      expect((await me(phone, phoneRotated.accessToken)).status()).toBe(200);

      expect((await logout(bare, { accessToken: onPhone.accessToken })).status()).toBe(204);
      expect(await countSessions(onLaptop.user.id)).toBe(0);
      expect(await (await refresh(phone)).json()).toEqual({ error: "Invalid refresh token" });
      expect(await storedRefreshCookie(phone)).toBeUndefined();
    } finally {
      await phone.dispose();
      await bare.dispose();
    }
  });

  test("a body token beats the cookie on refresh and on logout", async ({ request: laptop, playwright, baseURL }) => {
    const phone = await playwright.request.newContext({ baseURL });
    try {
      const onLaptop = await registerSession(laptop);
      const onPhone = await loginSession(phone);

      const rotatedPhone = await refreshedTokens(laptop, onPhone.refreshToken);
      expect(await findStoredToken(onLaptop.refreshToken)).toMatchObject({ rotatedAt: null });
      expect((await storedRefreshCookie(laptop))?.value).toBe(rotatedPhone.refreshToken);

      expect((await logout(laptop, { accessToken: onLaptop.accessToken, refreshToken: onLaptop.refreshToken })).status()).toBe(204);
      expect(await findStoredToken(onLaptop.refreshToken)).toBeNull();
      expect(await findStoredToken(rotatedPhone.refreshToken)).not.toBeNull();
    } finally {
      await phone.dispose();
    }
  });

  test("a stolen token replayed after the grace window logs out every device", async ({
    request: laptop,
    playwright,
    baseURL,
  }) => {
    const attacker = await playwright.request.newContext({ baseURL });
    const phone = await playwright.request.newContext({ baseURL });
    try {
      const onLaptop = await registerSession(laptop);
      await loginSession(phone);
      const stolen = onLaptop.refreshToken;

      await refreshedTokens(laptop);
      await prisma.refreshToken.updateMany({
        where: { userId: onLaptop.user.id, rotatedAt: { not: null } },
        data: { rotatedAt: new Date(Date.now() - AUTH_CONFIG.session.reuseGraceMs - TIME_MS.second) },
      });

      const replay = await refresh(attacker, stolen);
      expect(replay.status()).toBe(401);
      expect(await replay.json()).toEqual({ error: "Refresh token reuse detected" });
      expect(setCookieHeader(replay)).toMatch(/^refreshToken=;/);

      expect(await countSessions(onLaptop.user.id)).toBe(0);
      expect(await (await refresh(laptop)).json()).toEqual({ error: "Invalid refresh token" });
      expect(await (await refresh(phone)).json()).toEqual({ error: "Invalid refresh token" });
      expect(await storedRefreshCookie(laptop)).toBeUndefined();

      const again = await loginSession(laptop);
      expect((await me(laptop, again.accessToken)).status()).toBe(200);
    } finally {
      await attacker.dispose();
      await phone.dispose();
    }
  });

  test("an expired session is refused, purged and its cookie dropped", async ({ request }) => {
    const session = await registerSession(request);
    await prisma.refreshToken.updateMany({
      where: { userId: session.user.id },
      data: { expiresAt: new Date(Date.now() - TIME_MS.second) },
    });

    const res = await refresh(request);
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Refresh token expired" });
    expect(await storedRefreshCookie(request)).toBeUndefined();
    expect(await countSessions(session.user.id)).toBe(0);
  });

  test("a deleted user is locked out even with a valid access token", async ({ request }) => {
    const session = await registerSession(request);
    await prisma.user.delete({ where: { id: session.user.id } });

    const res = await me(request, session.accessToken);
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "User not found" });
    expect(await (await refresh(request)).json()).toEqual({ error: "Invalid refresh token" });
  });

  test("two concurrent refreshes with one token let exactly one win", async ({ playwright, baseURL }) => {
    const first = await playwright.request.newContext({ baseURL });
    const second = await playwright.request.newContext({ baseURL });
    try {
      const session = await registerSession(first);

      const results = await Promise.all([refresh(first, session.refreshToken), refresh(second, session.refreshToken)]);

      expect(results.map((res) => res.status()).sort()).toEqual([200, 401]);
      expect(await countSessions(session.user.id)).toBe(2);
    } finally {
      await first.dispose();
      await second.dispose();
    }
  });

  test("bad input is rejected the same way for everyone", async ({ request }) => {
    await registerSession(request);

    const invalidRegister = await register(request, { email: "nope", password: "short", name: "" });
    expect(invalidRegister.status()).toBe(422);
    expect(await invalidRegister.json()).toMatchObject({
      error: "Validation failed",
      details: { email: expect.any(Array), password: expect.any(Array), name: expect.any(Array) },
    });

    const wrongPassword = await login(request, { email: owner.email, password: "wrongpassword" });
    const unknownEmail = await login(request, { email: other.email, password: other.password });
    expect(wrongPassword.status()).toBe(401);
    expect(unknownEmail.status()).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());

    const badRefresh = await request.post("/api/auth/refresh", { data: { refreshToken: 42 } });
    expect(badRefresh.status()).toBe(422);

    const foreignLogout = await logout(request, { accessToken: "not-a-token", refreshToken: "whatever" });
    expect(foreignLogout.status()).toBe(401);
  });

  test("another user's refresh token cannot be used against my session", async ({
    request: mine,
    playwright,
    baseURL,
  }) => {
    const theirs = await playwright.request.newContext({ baseURL });
    try {
      const my = await registerSession(mine);
      const their = await registerSession(theirs, other);

      expect((await logout(mine, { accessToken: my.accessToken, refreshToken: their.refreshToken })).status()).toBe(204);

      expect(await findStoredToken(their.refreshToken)).not.toBeNull();
      expect(await countSessions(my.user.id)).toBe(0);
      expect((await refresh(theirs)).status()).toBe(200);
    } finally {
      await theirs.dispose();
    }
  });
});
