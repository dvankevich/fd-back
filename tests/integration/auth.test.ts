import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../app.ts";
import prisma from "../../prisma/client.ts";
import { hashToken } from "../../src/services/auth.ts";

const userData = {
  email: "test@example.com",
  password: "securepass123",
  name: "Test User",
};

async function cleanDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

describe("Auth API (integration)", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ---------- REGISTER ----------
  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: userData.email,
          name: userData.name,
          avatar: null,
        },
      });

      const cookies = res.headers["set-cookie"] as string[] | string | undefined;
      expect(cookies).toBeDefined();
      const cookieList = Array.isArray(cookies) ? cookies : [cookies!];
      expect(cookieList.some((c) => c.startsWith("refreshToken="))).toBe(true);

      const dbUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.password).not.toBe(userData.password); // захешований
    });

    it("should return 409 if email already taken", async () => {
      await request(app).post("/api/auth/register").send(userData);

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: userData.email,
          password: "anotherpass123",
          name: "Another User",
        })
        .expect(409);

      expect(res.body).toEqual({
        error: "Email already taken",
      });
    });

    it("should return 422 for invalid body", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "not-email",
          password: "123",
          name: "",
        })
        .expect(422);

      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toBeDefined();
    });
  });

  // ---------- LOGIN ----------
  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send(userData);
    });

    it("should login with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: userData.email,
          name: userData.name,
          avatar: null,
        },
      });
    });

    it("should return 401 for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(res.body).toEqual({ error: "Invalid credentials" });
    });

    it("should return 401 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "unknown@example.com",
          password: "securepass123",
        })
        .expect(401);

      expect(res.body).toEqual({ error: "Invalid credentials" });
    });

    it("should return 422 for empty credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "", password: "" })
        .expect(422);

      expect(res.body.error).toBe("Validation failed");
    });
  });

  // ---------- ME ----------
  describe("GET /api/auth/me", () => {
    it("should return current user with valid token", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send(userData);

      const { accessToken } = registerRes.body;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        name: userData.name,
        avatar: null,
        createdAt: expect.any(String),
      });
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/auth/me").expect(401);
      expect(res.body).toEqual({ error: "Authentication required" });
    });

    it("should return 401 with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(401);

      expect(res.body).toEqual({ error: "Invalid or expired token" });
    });
  });

  // ---------- REFRESH ----------
  describe("POST /api/auth/refresh", () => {
    it("should refresh tokens with valid refresh token (body)", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send(userData);

      const { refreshToken } = registerRes.body;

      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // Старий refresh token (хеш) має бути видалений (rotation)
      const oldToken = await prisma.refreshToken.findFirst({
        where: { token: hashToken(refreshToken) },
      });
      expect(oldToken).toBeNull();
    });

    it("should refresh tokens with cookie", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send(userData);

      const cookies = registerRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookies)
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it("should return 401 if refresh token is missing", async () => {
      const res = await request(app).post("/api/auth/refresh").expect(401);
      expect(res.body).toEqual({ error: "Refresh token not provided" });
    });

    it("should return 401 for invalid refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "non-existent-token" })
        .expect(401);

      expect(res.body).toEqual({ error: "Invalid refresh token" });
    });
  });

  // ---------- LOGOUT ----------
  describe("POST /api/auth/logout", () => {
    it("should logout and clear refresh token", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send(userData);

      const { refreshToken } = registerRes.body;

      await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken })
        .expect(204);

      const tokenInDb = await prisma.refreshToken.findFirst({
        where: { token: hashToken(refreshToken) },
      });
      expect(tokenInDb).toBeNull();
    });

    it("should succeed even without refresh token", async () => {
      await request(app).post("/api/auth/logout").expect(204);
    });
  });
});
