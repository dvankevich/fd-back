import { z } from "zod";
import { registry } from "../../../core/openapi/registry.ts";
import { ErrorSchema, ValidationErrorSchema, jsonResponse } from "../../../core/openapi/responses.ts";
import { RATE_LIMIT_MESSAGE } from "../../../core/http/rate-limit.middleware.ts";
import { COOKIE, COOKIE_DESCRIPTION, EXAMPLE } from "./auth.examples.ts";
import { LoginSchema } from "./input-dto/login.input-dto.ts";
import { RefreshTokenBodySchema } from "./input-dto/refresh-token.input-dto.ts";
import { RegisterSchema } from "./input-dto/register.input-dto.ts";
import { AuthResponseSchema, TokensSchema } from "./view-dto/tokens.view-dto.ts";

const RateLimitHeaders = z.object({
  RateLimit: z.string().openapi({ description: "draft-8 rate limit state", example: '"auth";r=0;t=900' }),
  "RateLimit-Policy": z.string().openapi({ description: "draft-8 rate limit policy", example: '"auth";q=10;w=900' }),
  "Retry-After": z.string().openapi({ description: "Seconds until the window resets", example: "900" }),
});

const AUTH_RESPONSE = {
  validation: jsonResponse("Validation error", ValidationErrorSchema),
  tooManyRequests: {
    description: "Too many requests from this IP in the current window",
    content: { "application/json": { schema: ErrorSchema, example: RATE_LIMIT_MESSAGE } },
    headers: RateLimitHeaders,
  },
} as const;

const RefreshCookieSchema = z.object({
  [COOKIE.name]: z.string().min(1).optional().openapi({ description: COOKIE_DESCRIPTION.request }),
});

const RefreshCookieHeaders = z.object({
  "Set-Cookie": z.string().openapi({ description: COOKIE_DESCRIPTION.set, example: EXAMPLE.setCookie }),
});

const ClearedCookieHeaders = z.object({
  "Set-Cookie": z.string().openapi({ description: COOKIE_DESCRIPTION.cleared, example: EXAMPLE.clearedCookie }),
});

const MaybeClearedCookieHeaders = z.object({
  "Set-Cookie": z.string().optional().openapi({
    description: `${COOKIE_DESCRIPTION.cleared} when the session is gone; absent when only the request was rejected`,
    example: EXAMPLE.clearedCookie,
  }),
});

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  description: "Creates a new user account and returns access + refresh tokens. Rate limited per IP.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: RegisterSchema },
      },
    },
  },
  responses: {
    201: { ...jsonResponse("User registered successfully", AuthResponseSchema), headers: RefreshCookieHeaders },
    409: jsonResponse("Email already taken", ErrorSchema),
    422: AUTH_RESPONSE.validation,
    429: AUTH_RESPONSE.tooManyRequests,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Auth"],
  summary: "Login user",
  description: "Authenticates user by email and returns access + refresh tokens. Rate limited per IP.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: LoginSchema },
      },
    },
  },
  responses: {
    200: { ...jsonResponse("Login successful", AuthResponseSchema), headers: RefreshCookieHeaders },
    401: jsonResponse("Invalid credentials", ErrorSchema),
    422: AUTH_RESPONSE.validation,
    429: AUTH_RESPONSE.tooManyRequests,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh token pair",
  description:
    `Issues a new token pair. Pass refreshToken in JSON body **or** via httpOnly cookie \`${COOKIE.name}\`. ` +
    "Both are supported; a token in the body takes precedence over the cookie. New refresh token is set as httpOnly cookie and also returned in the body. " +
    "Each refresh token is single-use: presenting an already rotated token again returns 401, and if that " +
    "happens outside a short grace window all sessions of the user are revoked (reuse detection). " +
    "When the session is gone (unknown or expired token, or reuse detected after the grace window) the 401 also clears the cookie.",
  request: {
    cookies: RefreshCookieSchema,
    body: {
      content: {
        "application/json": { schema: RefreshTokenBodySchema },
      },
    },
  },
  responses: {
    200: { ...jsonResponse("Tokens refreshed successfully", TokensSchema), headers: RefreshCookieHeaders },
    401: {
      ...jsonResponse("Refresh token missing, invalid, expired, already used, or reuse detected", ErrorSchema),
      headers: MaybeClearedCookieHeaders,
    },
    422: AUTH_RESPONSE.validation,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Auth"],
  summary: "Logout user",
  description:
    "Requires a valid access token. With a refresh token in the JSON body or the httpOnly cookie (body takes precedence), " +
    "revokes that session only; without one, or when the presented token is not a live session of the user, " +
    "revokes all sessions of the user. Clears the cookie either way.",
  security: [{ bearerAuth: [] }],
  request: {
    cookies: RefreshCookieSchema,
    body: {
      content: {
        "application/json": { schema: RefreshTokenBodySchema },
      },
    },
  },
  responses: {
    204: { description: "Logged out successfully", headers: ClearedCookieHeaders },
    401: jsonResponse("Missing or invalid access token", ErrorSchema),
    422: AUTH_RESPONSE.validation,
  },
});
