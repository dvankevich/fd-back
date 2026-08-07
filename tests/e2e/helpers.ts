import type { APIRequestContext } from "@playwright/test";
import prisma from "./db.ts";

export const userA = {
  email: "e2e_owner@example.com",
  password: "securepass123",
  name: "E2E Owner",
};

export const userB = {
  email: "e2e_other@example.com",
  password: "securepass123",
  name: "E2E Other",
};

export async function cleanDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function register(
  request: APIRequestContext,
  user = userA,
) {
  const res = await request.post("/api/auth/register", {
    data: {
      email: user.email,
      password: user.password,
      name: user.name,
    },
  });
  return res;
}

export async function registerAndGetToken(
  request: APIRequestContext,
  user = userA,
) {
  const res = await register(request, user);
  const body = await res.json();

  if (!res.ok()) {
    throw new Error(
      `Register failed: ${res.status()} ${JSON.stringify(body)}`,
    );
  }

  return {
    accessToken: body.accessToken as string,
    userId: body.user.id as string,
    refreshToken: body.refreshToken as string,
  };
}
