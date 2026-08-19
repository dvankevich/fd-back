import { z } from "zod";
import { registry } from "../../../core/openapi/registry.ts";
import {
  errorExamples,
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "../../../core/openapi/responses.ts";
import { RATE_LIMIT_MESSAGE } from "../../../core/http/rate-limit.middleware.ts";
import { AUTH_MESSAGE } from "../domain/auth.messages.ts";
import { SESSION_ERROR } from "../domain/session-ended.error.ts";
import { unauthorizedResponse } from "./auth.responses.ts";
import {
  COOKIE,
  COOKIE_DESCRIPTION,
  EXAMPLE,
  RESPONSE_EXAMPLE,
  VALIDATION_DETAILS_EXAMPLE,
} from "./auth.examples.ts";
import { LoginSchema } from "./input-dto/login.input-dto.ts";
import { RefreshTokenBodySchema } from "./input-dto/refresh-token.input-dto.ts";
import { RegisterSchema } from "./input-dto/register.input-dto.ts";
import { AuthResponseSchema, TokensSchema } from "./view-dto/tokens.view-dto.ts";

const rateLimitHeaders = (state: string) => ({
  RateLimit: z.string().openapi({ description: "draft-8 rate limit state", example: state }),
  "RateLimit-Policy": z
    .string()
    .openapi({ description: "draft-8 rate limit policy", example: EXAMPLE.rateLimitPolicy }),
});

const RETRY_AFTER_HEADER = {
  "Retry-After": z
    .string()
    .openapi({ description: "Seconds until the window resets", example: EXAMPLE.retryAfter }),
};

const REFRESH_COOKIE_HEADER = {
  "Set-Cookie": z.string().openapi({ description: COOKIE_DESCRIPTION.set, example: EXAMPLE.setCookie }),
};

const CLEARED_COOKIE_HEADER = {
  "Set-Cookie": z
    .string()
    .openapi({ description: COOKIE_DESCRIPTION.cleared, example: EXAMPLE.clearedCookie }),
};

const MAYBE_CLEARED_COOKIE_HEADER = {
  "Set-Cookie": z.string().optional().openapi({
    description: `${COOKIE_DESCRIPTION.cleared} when the session is gone; absent when only the request was rejected`,
    example: EXAMPLE.clearedCookie,
  }),
};

const rateLimited = <T extends object>(response: T) => ({
  ...response,
  headers: z.object(rateLimitHeaders(EXAMPLE.rateLimit)),
});

const AUTH_RESPONSE = {
  malformedBody: validationErrorResponse({
    description: "Body is not valid JSON",
    details: VALIDATION_DETAILS_EXAMPLE.malformedJson,
  }),
  refreshTokenValidation: validationErrorResponse({
    description: "Validation error",
    details: VALIDATION_DETAILS_EXAMPLE.refreshToken,
  }),
  tooManyRequests: {
    ...errorResponse({
      description: "Too many requests from this IP in the current window",
      error: RATE_LIMIT_MESSAGE.error,
    }),
    headers: z.object({ ...rateLimitHeaders(EXAMPLE.rateLimitExhausted), ...RETRY_AFTER_HEADER }),
  },
} as const;

const RefreshCookieSchema = z.object({
  [COOKIE.name]: z.string().min(1).optional().openapi({ description: COOKIE_DESCRIPTION.request }),
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
    201: {
      ...jsonResponse({
        description: "User registered successfully",
        schema: AuthResponseSchema,
        example: RESPONSE_EXAMPLE.auth,
      }),
      headers: z.object({ ...REFRESH_COOKIE_HEADER, ...rateLimitHeaders(EXAMPLE.rateLimit) }),
    },
    400: rateLimited(AUTH_RESPONSE.malformedBody),
    409: rateLimited(
      errorResponse({ description: "Email already taken", error: AUTH_MESSAGE.emailTaken }),
    ),
    422: rateLimited(
      validationErrorResponse({
        description: "Validation error",
        details: VALIDATION_DETAILS_EXAMPLE.register,
      }),
    ),
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
    200: {
      ...jsonResponse({
        description: "Login successful",
        schema: AuthResponseSchema,
        example: RESPONSE_EXAMPLE.auth,
      }),
      headers: z.object({ ...REFRESH_COOKIE_HEADER, ...rateLimitHeaders(EXAMPLE.rateLimit) }),
    },
    400: rateLimited(AUTH_RESPONSE.malformedBody),
    401: rateLimited(
      errorResponse({
        description: "Invalid credentials",
        error: AUTH_MESSAGE.invalidCredentials,
      }),
    ),
    422: rateLimited(
      validationErrorResponse({
        description: "Validation error",
        details: VALIDATION_DETAILS_EXAMPLE.login,
      }),
    ),
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
    200: {
      ...jsonResponse({
        description: "Tokens refreshed successfully",
        schema: TokensSchema,
        example: RESPONSE_EXAMPLE.tokens,
      }),
      headers: z.object(REFRESH_COOKIE_HEADER),
    },
    400: AUTH_RESPONSE.malformedBody,
    401: {
      ...errorExamples({
        description: "Refresh token missing, invalid, expired, already used, or reuse detected",
        errors: {
          missing: AUTH_MESSAGE.refreshTokenRequired,
          invalid: SESSION_ERROR.invalid,
          expired: SESSION_ERROR.expired,
          reuse: SESSION_ERROR.reuse,
        },
      }),
      headers: z.object(MAYBE_CLEARED_COOKIE_HEADER),
    },
    422: AUTH_RESPONSE.refreshTokenValidation,
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
    204: { description: "Logged out successfully", headers: z.object(CLEARED_COOKIE_HEADER) },
    400: AUTH_RESPONSE.malformedBody,
    401: unauthorizedResponse,
    422: AUTH_RESPONSE.refreshTokenValidation,
  },
});
