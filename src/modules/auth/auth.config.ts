import type { CookieOptions } from "express";
import type { Algorithm } from "jsonwebtoken";
import { TIME_MS } from "../../core/time.ts";
import { env } from "../../config/env.ts";

export type AuthConfig = {
  password: { rounds: number };
  accessToken: { secret: string; ttlMs: number; algorithm: Algorithm; issuer: string; audience: string };
  refreshToken: { bytes: number };
  session: { ttlMs: number; reuseGraceMs: number };
  cookie: { name: string; options: CookieOptions };
  authenticate: { userCache: { ttlMs: number; maxEntries: number } };
  rateLimit: { windowMs: number; limit: number; enabled: boolean };
};

export const AUTH_CONFIG = {
  password: { rounds: 10 },
  accessToken: {
    secret: env.JWT_SECRET,
    ttlMs: 15 * TIME_MS.minute,
    algorithm: "HS256",
    issuer: "foodies-api",
    audience: "foodies-client",
  },
  refreshToken: { bytes: 40 },
  session: { ttlMs: 7 * TIME_MS.day, reuseGraceMs: 10 * TIME_MS.second },
  cookie: {
    name: "refreshToken",
    options: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    },
  },
  authenticate: { userCache: { ttlMs: 30 * TIME_MS.second, maxEntries: 10_000 } },
  rateLimit: {
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    limit: env.AUTH_RATE_LIMIT_MAX,
    enabled: env.NODE_ENV !== "test",
  },
} as const satisfies AuthConfig;
