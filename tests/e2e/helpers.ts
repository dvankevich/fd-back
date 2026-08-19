import type { APIRequestContext, APIResponse } from "@playwright/test";
import { createHash } from "node:crypto";
import prisma from "./db.ts";
import {
  AuthResponseSchema,
  TokensSchema,
  type AuthResponse,
  type LoginBody,
  type RegisterBody,
  type Tokens,
} from "../../src/validators/auth.validator.ts";

export const owner: RegisterBody = {
  email: "e2e_owner@example.com",
  password: "securepass123",
  name: "E2E Owner",
};

export async function cleanDatabase() {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.recipeIngredient.deleteMany(),
    prisma.recipe.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export function register(request: APIRequestContext, user: RegisterBody = owner) {
  return request.post("/api/auth/register", { data: user });
}

export async function registerSession(
  request: APIRequestContext,
  user: RegisterBody = owner,
): Promise<AuthResponse> {
  const res = await register(request, user);
  const body: unknown = await res.json();

  if (!res.ok()) {
    throw new Error(`Register failed: ${res.status()} ${JSON.stringify(body)}`);
  }

  return AuthResponseSchema.parse(body);
}

export function login(request: APIRequestContext, credentials: LoginBody = owner) {
  return request.post("/api/auth/login", { data: credentials });
}

export async function loginSession(request: APIRequestContext, credentials: LoginBody = owner): Promise<AuthResponse> {
  const res = await login(request, credentials);
  const body: unknown = await res.json();

  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${JSON.stringify(body)}`);
  }

  return AuthResponseSchema.parse(body);
}

export function refresh(request: APIRequestContext, refreshToken?: string) {
  return request.post("/api/auth/refresh", { data: refreshToken ? { refreshToken } : {} });
}

export async function refreshedTokens(request: APIRequestContext, refreshToken?: string): Promise<Tokens> {
  const res = await refresh(request, refreshToken);
  const body: unknown = await res.json();

  if (!res.ok()) {
    throw new Error(`Refresh failed: ${res.status()} ${JSON.stringify(body)}`);
  }

  return TokensSchema.parse(body);
}

type LogoutArgs = { accessToken?: string; refreshToken?: string };

export function logout(request: APIRequestContext, { accessToken, refreshToken }: LogoutArgs = {}) {
  return request.post("/api/auth/logout", {
    headers: accessToken ? authHeaders(accessToken) : {},
    data: refreshToken ? { refreshToken } : {},
  });
}

export function me(request: APIRequestContext, accessToken?: string) {
  return request.get("/api/users/me", { headers: accessToken ? authHeaders(accessToken) : {} });
}

export const setCookieHeader = (res: APIResponse) => res.headersArray().find((h) => h.name.toLowerCase() === "set-cookie")?.value;

export const storedRefreshCookie = async (request: APIRequestContext) =>
  (await request.storageState()).cookies.find((cookie) => cookie.name === "refreshToken");

export const tokenHash = (refreshToken: string) => createHash("sha256").update(refreshToken).digest("hex");

export const findStoredToken = (refreshToken: string) =>
  prisma.refreshToken.findUnique({ where: { tokenHash: tokenHash(refreshToken) } });

export const countSessions = (userId: string) => prisma.refreshToken.count({ where: { userId } });
