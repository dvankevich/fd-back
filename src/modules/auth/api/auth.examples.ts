import { BODY_PARSE_FAILURE } from "../../../core/http/error-handler.middleware.ts";
import { TIME_MS } from "../../../core/time.ts";
import { AUTH_CONFIG } from "../auth.config.ts";
import type { AuthUser, TokenPair } from "../domain/auth.ports.ts";

const HEX_ALPHABET = "0123456789abcdef";
const HEX_PER_BYTE = 2;

const REFRESH_TOKEN_EXAMPLE = HEX_ALPHABET.repeat(
  (AUTH_CONFIG.refreshToken.bytes * HEX_PER_BYTE) / HEX_ALPHABET.length,
);

export const COOKIE = {
  name: AUTH_CONFIG.cookie.name,
  path: AUTH_CONFIG.cookie.options.path,
  maxAgeSeconds: AUTH_CONFIG.session.ttlMs / TIME_MS.second,
} as const;

const RATE_LIMIT = {
  windowSeconds: AUTH_CONFIG.rateLimit.windowMs / TIME_MS.second,
  windowMinutes: AUTH_CONFIG.rateLimit.windowMs / TIME_MS.minute,
  limit: AUTH_CONFIG.rateLimit.limit,
} as const;

const RATE_LIMIT_POLICY_NAME = `"${RATE_LIMIT.limit}-in-${RATE_LIMIT.windowMinutes}min"`;

const COOKIE_EXPIRES_EXAMPLE = "Wed, 26 Aug 2026 12:00:00 GMT";

export const EXAMPLE = {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjk5...",
  refreshToken: REFRESH_TOKEN_EXAMPLE,
  setCookie: `${COOKIE.name}=${REFRESH_TOKEN_EXAMPLE}; Max-Age=${COOKIE.maxAgeSeconds}; Path=${COOKIE.path}; Expires=${COOKIE_EXPIRES_EXAMPLE}; HttpOnly; SameSite=Strict`,
  clearedCookie: `${COOKIE.name}=; Path=${COOKIE.path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`,
  rateLimit: `${RATE_LIMIT_POLICY_NAME}; r=${RATE_LIMIT.limit - 1}; t=${RATE_LIMIT.windowSeconds}`,
  rateLimitExhausted: `${RATE_LIMIT_POLICY_NAME}; r=0; t=${RATE_LIMIT.windowSeconds}`,
  rateLimitPolicy: `${RATE_LIMIT_POLICY_NAME}; q=${RATE_LIMIT.limit}; w=${RATE_LIMIT.windowSeconds}; pk=:MTJjYTE3YjQ5YWYy:`,
  retryAfter: String(RATE_LIMIT.windowSeconds),
} as const;

const EXAMPLE_USER: AuthUser = {
  id: "clx8p2k1v0000qz7h9m4n2t5b",
  name: "Olena Kravets",
  email: "olena@example.com",
  avatar: null,
};

const EXAMPLE_TOKENS: TokenPair = {
  accessToken: EXAMPLE.accessToken,
  refreshToken: EXAMPLE.refreshToken,
};

export const RESPONSE_EXAMPLE = {
  tokens: EXAMPLE_TOKENS,
  auth: { ...EXAMPLE_TOKENS, user: EXAMPLE_USER },
} as const;

export const VALIDATION_DETAILS_EXAMPLE = {
  register: {
    email: ["Invalid email address"],
    password: ["Too small: expected string to have >=8 characters"],
    name: ["Too small: expected string to have >=1 characters"],
  },
  login: {
    email: ["Invalid email address"],
    password: ["Invalid input: expected string, received undefined"],
  },
  refreshToken: {
    refreshToken: ["Too small: expected string to have >=1 characters"],
  },
  malformedJson: BODY_PARSE_FAILURE.details,
} as const;

export const COOKIE_DESCRIPTION = {
  request: `httpOnly refresh cookie, scoped to ${COOKIE.path}`,
  set: "New refresh token; httpOnly, SameSite=Strict, Secure in production",
  cleared: "Refresh cookie removed (same flags, Secure in production)",
} as const;
