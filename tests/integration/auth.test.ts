import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../app.ts";
import prisma from "../../prisma/client.ts";
import { AUTH_CONFIG } from "../../src/config/auth.ts";
import { TIME_MS } from "../../src/constants/time.ts";
import { AuthResponseSchema, TokensSchema } from "../../src/validators/auth.validator.ts";
import {
  authUserShape,
  backdateRotation,
  cleanAuthTables,
  countActiveSessions,
  countSessions,
  expireSession,
  findStoredToken,
  loginSession,
  loginUser,
  logoutWith,
  refreshCookie,
  refreshWith,
  registerSession,
  registerUser,
  testUser,
  tokenPairShape,
} from "./helpers/auth.ts";

describe("Auth API (integration)", () => {
  beforeEach(async () => {
    await cleanAuthTables();
  });

  afterAll(async () => {
    await cleanAuthTables();
    await prisma.$disconnect();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user and set the refresh cookie", async () => {
      const res = await registerUser().expect(201);

      expect(res.body).toMatchObject({ ...tokenPairShape, user: authUserShape(testUser) });
      expect(refreshCookie(res)).toMatch(/^refreshToken=/);

      const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
      expect(dbUser?.password).toBeDefined();
      expect(dbUser?.password).not.toBe(testUser.password);
    });

    it("should scope the refresh cookie to /api/auth as HttpOnly and SameSite=Strict for the session ttl", async () => {
      const res = await registerUser().expect(201);

      expect(refreshCookie(res)).toMatch(/HttpOnly/i);
      expect(refreshCookie(res)).toMatch(/SameSite=Strict/i);
      expect(refreshCookie(res)).toMatch(/Path=\/api\/auth/);
      expect(refreshCookie(res)).toMatch(new RegExp(`Max-Age=${AUTH_CONFIG.session.ttlMs / TIME_MS.second}`));
    });

    it("should return 409 if the email is already taken", async () => {
      await registerSession();

      const res = await registerUser({ ...testUser, password: "anotherpass123", name: "Another User" }).expect(409);

      expect(res.body).toEqual({ error: "Email already taken" });
    });

    it("should treat the email case-insensitively and store it lowercased", async () => {
      await registerSession();

      const res = await registerUser({ ...testUser, email: "  TEST@Example.com " }).expect(409);
      expect(res.body).toEqual({ error: "Email already taken" });

      const users = await prisma.user.findMany({ where: { name: testUser.name } });
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe("test@example.com");
    });

    it("should return 409 for concurrent registrations with the same email", async () => {
      const attempts = await Promise.all(Array.from({ length: 4 }, () => registerUser()));

      expect(attempts.map((res) => res.status).sort()).toEqual([201, 409, 409, 409]);
      for (const conflict of attempts.filter((res) => res.status === 409)) {
        expect(conflict.body).toEqual({ error: "Email already taken" });
      }
      expect(await prisma.user.count({ where: { email: testUser.email } })).toBe(1);
    });

    it("should return 422 for an invalid body", async () => {
      const res = await registerUser({ email: "not-email", password: "123", name: "" }).expect(422);

      expect(res.body.error).toBe("Validation failed");
      expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(["email", "password", "name"]));
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await registerSession();
    });

    it("should login with correct credentials", async () => {
      const res = await loginUser().expect(200);

      expect(res.body).toMatchObject({ ...tokenPairShape, user: authUserShape(testUser) });
      expect(refreshCookie(res)).toMatch(/^refreshToken=/);
    });

    it("should login with the email in a different case", async () => {
      const res = await loginUser({ ...testUser, email: testUser.email.toUpperCase() }).expect(200);

      expect(AuthResponseSchema.parse(res.body).user.email).toBe(testUser.email);
    });

    it("should purge the expired sessions of the user on login", async () => {
      const stale = await loginSession();
      await expireSession(stale.refreshToken);

      await loginUser().expect(200);

      expect(await findStoredToken(stale.refreshToken)).toBeNull();
    });

    it("should return 401 for a wrong password", async () => {
      const res = await loginUser({ ...testUser, password: "wrongpassword" }).expect(401);

      expect(res.body).toEqual({ error: "Invalid credentials" });
    });

    it("should return 401 for an unknown email", async () => {
      const res = await loginUser({ ...testUser, email: "unknown@example.com" }).expect(401);

      expect(res.body).toEqual({ error: "Invalid credentials" });
    });

    it("should return 422 for empty credentials", async () => {
      const res = await loginUser({ email: "", password: "" }).expect(422);

      expect(res.body.error).toBe("Validation failed");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should rotate the pair when the refresh token comes in the body", async () => {
      const session = await registerSession();

      const res = await refreshWith(session.refreshToken).expect(200);

      const rotated = TokensSchema.parse(res.body);
      expect(rotated.refreshToken).not.toBe(session.refreshToken);
      expect(refreshCookie(res)).toMatch(/^refreshToken=/);

      const oldToken = await findStoredToken(session.refreshToken);
      expect(oldToken?.rotatedAt).toBeInstanceOf(Date);
    });

    it("should rotate the pair when the refresh token comes from the cookie", async () => {
      const session = await registerSession();

      const res = await request(app).post("/api/auth/refresh").set("Cookie", session.cookies).expect(200);

      expect(res.body).toMatchObject(tokenPairShape);
    });

    it("should return 401 when no refresh token is presented", async () => {
      const res = await request(app).post("/api/auth/refresh").expect(401);

      expect(res.body).toEqual({ error: "Refresh token required" });
    });

    it("should return 401 for an unknown refresh token and clear the cookie", async () => {
      const res = await refreshWith("non-existent-token").expect(401);

      expect(res.body).toEqual({ error: "Invalid refresh token" });
      expect(refreshCookie(res)).toMatch(/^refreshToken=;.*Path=\/api\/auth/);
    });

    it("should prefer the body token over the cookie", async () => {
      const session = await registerSession();

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", "refreshToken=garbage")
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      expect(res.body).toMatchObject(tokenPairShape);
    });

    it("should return 422 for a non-string refresh token", async () => {
      const res = await request(app).post("/api/auth/refresh").send({ refreshToken: 5 }).expect(422);

      expect(res.body.error).toBe("Validation failed");
    });

    it("should refuse a rotated refresh token and keep the replacement session alive", async () => {
      const session = await registerSession();
      await refreshWith(session.refreshToken).expect(200);

      const res = await refreshWith(session.refreshToken).expect(401);

      expect(res.body).toEqual({ error: "Invalid refresh token" });
      expect(refreshCookie(res)).toBeUndefined();
      expect(await countActiveSessions(session.user.id)).toBe(1);
    });

    it("should revoke all sessions when a rotated token is reused after the grace window", async () => {
      const session = await registerSession();
      await loginSession();
      await refreshWith(session.refreshToken).expect(200);
      await backdateRotation(session.refreshToken, AUTH_CONFIG.session.reuseGraceMs + 1000);

      const res = await refreshWith(session.refreshToken).expect(401);

      expect(res.body).toEqual({ error: "Refresh token reuse detected" });
      expect(refreshCookie(res)).toMatch(/^refreshToken=;.*Path=\/api\/auth/);
      expect(await countSessions(session.user.id)).toBe(0);
    });

    it("should return 401 for an expired refresh token, clear the cookie and purge the row", async () => {
      const session = await registerSession();
      await expireSession(session.refreshToken);

      const res = await refreshWith(session.refreshToken).expect(401);

      expect(res.body).toEqual({ error: "Refresh token expired" });
      expect(refreshCookie(res)).toMatch(/^refreshToken=;.*Path=\/api\/auth/);
      expect(await findStoredToken(session.refreshToken)).toBeNull();
    });

    it("should refuse the refresh token of a logged out session", async () => {
      const session = await registerSession();
      await logoutWith(session).expect(204);

      const res = await refreshWith(session.refreshToken).expect(401);

      expect(res.body).toEqual({ error: "Invalid refresh token" });
    });

    it("should let only one of two concurrent refreshes with the same token succeed", async () => {
      const session = await registerSession();

      const results = await Promise.all([
        refreshWith(session.refreshToken),
        refreshWith(session.refreshToken),
      ]);

      expect(results.map((res) => res.status).sort()).toEqual([200, 401]);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should require an access token", async () => {
      const res = await logoutWith({}).expect(401);

      expect(res.body).toEqual({ error: "Authentication required" });
    });

    it("should reject an invalid access token", async () => {
      const res = await logoutWith({ accessToken: "not-a-token" }).expect(401);

      expect(res.body).toEqual({ error: "Invalid or expired access token" });
    });

    it("should revoke only the presented session when the refresh token is in the body", async () => {
      const registered = await registerSession();
      const loggedIn = await loginSession();

      const res = await logoutWith(registered).expect(204);

      expect(refreshCookie(res)).toMatch(/^refreshToken=;.*Path=\/api\/auth/);
      expect(await findStoredToken(registered.refreshToken)).toBeNull();
      expect(await findStoredToken(loggedIn.refreshToken)).not.toBeNull();
      expect(await countSessions(registered.user.id)).toBe(1);
    });

    it("should prefer the body token over the cookie on logout", async () => {
      const registered = await registerSession();
      const loggedIn = await loginSession();

      await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${registered.accessToken}`)
        .set("Cookie", loggedIn.cookies)
        .send({ refreshToken: registered.refreshToken })
        .expect(204);

      expect(await findStoredToken(registered.refreshToken)).toBeNull();
      expect(await findStoredToken(loggedIn.refreshToken)).not.toBeNull();
    });

    it("should revoke only the presented session when the refresh token comes from the cookie", async () => {
      const registered = await registerSession();
      const loggedIn = await loginSession();

      await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${loggedIn.accessToken}`)
        .set("Cookie", loggedIn.cookies)
        .expect(204);

      expect(await findStoredToken(loggedIn.refreshToken)).toBeNull();
      expect(await findStoredToken(registered.refreshToken)).not.toBeNull();
    });

    it("should revoke all sessions when no refresh token is presented", async () => {
      const registered = await registerSession();
      await loginSession();
      expect(await countSessions(registered.user.id)).toBe(2);

      await logoutWith({ accessToken: registered.accessToken }).expect(204);

      expect(await countSessions(registered.user.id)).toBe(0);
    });

    it("should not touch another user's session even if their refresh token is sent", async () => {
      const registered = await registerSession();
      const otherUser = await registerSession({ ...testUser, email: "other@example.com", name: "Other" });

      await logoutWith({ accessToken: registered.accessToken, refreshToken: otherUser.refreshToken }).expect(204);

      expect(await findStoredToken(otherUser.refreshToken)).not.toBeNull();
      expect(await countSessions(registered.user.id)).toBe(0);
    });

    it("should revoke all sessions when the presented refresh token was already rotated", async () => {
      const registered = await registerSession();
      const loggedIn = await loginSession();
      const rotated = await refreshWith(registered.refreshToken).expect(200);
      expect(await countSessions(registered.user.id)).toBe(3);

      await logoutWith({ accessToken: registered.accessToken, refreshToken: registered.refreshToken }).expect(204);

      expect(await countSessions(registered.user.id)).toBe(0);
      expect(await findStoredToken(rotated.body.refreshToken)).toBeNull();
      expect(await findStoredToken(loggedIn.refreshToken)).toBeNull();
    });
  });
});
