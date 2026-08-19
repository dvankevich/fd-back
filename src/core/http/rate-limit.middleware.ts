import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

export type RateLimitConfig = { windowMs: number; limit: number; enabled: boolean };

export const RATE_LIMIT_MESSAGE = { error: "Too many requests, please try again later" } as const;

const passThrough: RequestHandler = (_req, _res, next) => next();

export const createRateLimiter = ({ windowMs, limit, enabled }: RateLimitConfig): RequestHandler =>
  enabled
    ? rateLimit({
        windowMs,
        limit,
        message: RATE_LIMIT_MESSAGE,
        standardHeaders: "draft-8",
        legacyHeaders: false,
      })
    : passThrough;

