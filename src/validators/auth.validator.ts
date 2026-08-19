import { z } from "zod";
import { registry } from "../openapi/registry.ts";
import { AUTH_CONFIG } from "../config/auth.ts";
import { AUTH_LIMITS } from "../constants/auth.ts";
import { TIME_MS } from "../constants/time.ts";
import { RATE_LIMIT_MESSAGE } from "../middleware/rateLimit.ts";

const HEX_ALPHABET = "0123456789abcdef";
const HEX_PER_BYTE = 2;

const REFRESH_TOKEN_EXAMPLE = HEX_ALPHABET.repeat(
  (AUTH_CONFIG.refreshToken.bytes * HEX_PER_BYTE) / HEX_ALPHABET.length,
);

const COOKIE = {
  name: AUTH_CONFIG.cookie.name,
  path: AUTH_CONFIG.cookie.options.path,
  maxAgeSeconds: AUTH_CONFIG.session.ttlMs / TIME_MS.second,
} as const;

const EXAMPLE = {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjk5...",
  refreshToken: REFRESH_TOKEN_EXAMPLE,
  setCookie: `${COOKIE.name}=${REFRESH_TOKEN_EXAMPLE}; Max-Age=${COOKIE.maxAgeSeconds}; Path=${COOKIE.path}; HttpOnly; SameSite=Strict`,
  clearedCookie: `${COOKIE.name}=; Path=${COOKIE.path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`,
} as const;

const COOKIE_DESCRIPTION = {
  request: `httpOnly refresh cookie, scoped to ${COOKIE.path}`,
  set: "New refresh token; httpOnly, SameSite=Strict, Secure in production",
  cleared: "Refresh cookie removed (same flags, Secure in production)",
} as const;

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(AUTH_LIMITS.emailMaxLength))
  .openapi({
    type: "string",
    format: "email",
    maxLength: AUTH_LIMITS.emailMaxLength,
    example: "user01@example.com",
  });

const PasswordSchema = z.string().openapi({ example: "securepass123" });

export const RegisterSchema = registry.register(
  "Register",
  z.object({
    email: EmailSchema,
    password: PasswordSchema.min(AUTH_LIMITS.passwordMinLength)
      .refine(
        (password) => Buffer.byteLength(password, "utf8") <= AUTH_LIMITS.passwordMaxBytes,
        `Password must be at most ${AUTH_LIMITS.passwordMaxBytes} bytes`,
      )
      .openapi({
        description: `At least ${AUTH_LIMITS.passwordMinLength} characters and at most ${AUTH_LIMITS.passwordMaxBytes} bytes (bcrypt limit)`,
      }),
    name: z
      .string()
      .trim()
      .min(1)
      .max(AUTH_LIMITS.nameMaxLength)
      .openapi({ example: "FirstName LastName" }),
  }),
);

export const LoginSchema = registry.register(
  "Login",
  z.object({
    email: EmailSchema,
    password: PasswordSchema.min(1),
  }),
);

export const RefreshTokenBodySchema = registry.register(
  "RefreshTokenBody",
  z.object({
    refreshToken: z.string().min(1).optional().openapi({ example: EXAMPLE.refreshToken }),
  }),
);

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
    name: z.string().openapi({ example: "FirstName LastName" }),
    email: z.email().openapi({ example: "user01@example.com" }),
    avatar: z.string().nullable().openapi({
      example: "https://res.cloudinary.com/.../avatar.jpg",
    }),
    createdAt: z
      .iso.datetime()
      .openapi({ example: "2025-01-10T12:00:00.000Z" }),
  }),
);

export const AuthUserSchema = registry.register(
  "AuthUser",
  UserSchema.omit({ createdAt: true }),
);

export const TokensSchema = registry.register(
  "Tokens",
  z.object({
    accessToken: z.string().openapi({ example: EXAMPLE.accessToken }),
    refreshToken: z.string().openapi({ example: EXAMPLE.refreshToken }),
  }),
);

export const AuthResponseSchema = registry.register(
  "AuthResponse",
  TokensSchema.extend({ user: AuthUserSchema }),
);

export const ErrorSchema = registry.register(
  "Error",
  z.object({
    error: z.string().openapi({ example: "Invalid credentials" }),
  }),
);

export const ValidationErrorSchema = registry.register(
  "ValidationError",
  z.object({
    error: z.string().openapi({ example: "Validation failed" }),
    details: z.record(z.string(), z.array(z.string())).openapi({
      example: {
        email: ["Invalid email address"],
        password: ["Too small: expected string to have >=8 characters"],
      },
    }),
  }),
);

export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;
export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type Tokens = z.infer<typeof TokensSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

const jsonResponse = <T extends z.ZodType>(description: string, schema: T) => ({
  description,
  content: { "application/json": { schema } },
});

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
