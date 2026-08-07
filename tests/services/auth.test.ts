import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

vi.hoisted(() => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-key-at-least-32-characters-long";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
});

import prisma from "../../prisma/client.ts";
import {
  createTokens,
  setRefreshTokenCookie,
  hashPassword,
  verifyPassword,
  hashToken,
} from "../../src/services/auth.ts";
import { REFRESH_TOKEN_LIFETIME } from "../../src/constants/time.ts";
import { env } from "../../src/config/env.ts";

// Mock Prisma
vi.mock("../../prisma/client.ts", () => ({
  default: {
    refreshToken: {
      create: vi.fn(),
    },
  },
}));

describe("createTokens", () => {
  const userId = "clx1234567890abcdefghij"; // string id
  const mockCreate = vi.mocked(prisma.refreshToken.create);

  beforeEach(() => {
    mockCreate.mockResolvedValue({
      id: "token-id-1",
      userId,
      token: "mocked",
      expiresAt: new Date(),
      createdAt: new Date(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return accessToken and refreshToken", async () => {
    const tokens = await createTokens(userId);

    expect(tokens).toHaveProperty("accessToken");
    expect(tokens).toHaveProperty("refreshToken");
    expect(typeof tokens.accessToken).toBe("string");
    expect(typeof tokens.refreshToken).toBe("string");
  });

  it("should create a valid JWT access token with correct sub", async () => {
    const { accessToken } = await createTokens(userId);
    const decoded = jwt.verify(accessToken, env.JWT_SECRET) as jwt.JwtPayload;

    expect(decoded.sub).toBe(userId);
  });

  it("should generate a random refresh token (hex, 80 chars)", async () => {
    const { refreshToken } = await createTokens(userId);
    expect(refreshToken).toMatch(/^[a-f0-9]{80}$/);
  });

  it("should save refresh token to database with correct data", async () => {
    const before = Date.now();
    const { refreshToken } = await createTokens(userId);
    const after = Date.now();

    expect(mockCreate).toHaveBeenCalledTimes(1);

    const callArg = mockCreate.mock.calls[0][0].data;

    expect(callArg.userId).toBe(userId);
    expect(callArg.token).toBe(hashToken(refreshToken));
    expect(callArg.expiresAt).toBeInstanceOf(Date);

    const expiresAt = (callArg.expiresAt as Date).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + REFRESH_TOKEN_LIFETIME);
    expect(expiresAt).toBeLessThanOrEqual(after + REFRESH_TOKEN_LIFETIME);
  });
});

describe("setRefreshTokenCookie", () => {
  it("should set httpOnly cookie with correct options", () => {
    const res = {
      cookie: vi.fn(),
    } as any;

    const token = "test-refresh-token";
    setRefreshTokenCookie(res, token);

    expect(res.cookie).toHaveBeenCalledWith("refreshToken", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_TOKEN_LIFETIME,
    });
  });
});

describe("password hashing", () => {
  const password = "securepass123";

  it("should hash password", async () => {
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("should verify correct password", async () => {
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const hash = await hashPassword(password);
    const isValid = await verifyPassword("wrongpassword", hash);
    expect(isValid).toBe(false);
  });

  it("should generate different hashes for the same password", async () => {
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});
