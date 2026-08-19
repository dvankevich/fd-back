import { TIME_MS } from "../../../core/time.ts";
import { AUTH_CONFIG } from "../auth.config.ts";

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

export const EXAMPLE = {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjk5...",
  refreshToken: REFRESH_TOKEN_EXAMPLE,
  setCookie: `${COOKIE.name}=${REFRESH_TOKEN_EXAMPLE}; Max-Age=${COOKIE.maxAgeSeconds}; Path=${COOKIE.path}; HttpOnly; SameSite=Strict`,
  clearedCookie: `${COOKIE.name}=; Path=${COOKIE.path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`,
} as const;

export const COOKIE_DESCRIPTION = {
  request: `httpOnly refresh cookie, scoped to ${COOKIE.path}`,
  set: "New refresh token; httpOnly, SameSite=Strict, Secure in production",
  cleared: "Refresh cookie removed (same flags, Secure in production)",
} as const;
