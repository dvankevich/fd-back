import request from "supertest";
import type { Response } from "supertest";
import { expect } from "vitest";
import app from "../../../app.ts";
import prisma from "../../../src/core/database/prisma.client.ts";
import { authContainer } from "../../../src/modules/auth/auth.module.ts";
import type { Optional } from "../../../src/core/types/common.ts";
import type { RegisterBody } from "../../../src/modules/auth/api/input-dto/register.input-dto.ts";
import {
  AuthResponseSchema,
  type AuthResponse,
} from "../../../src/modules/auth/api/view-dto/tokens.view-dto.ts";

export const testUser: RegisterBody = {
  email: "test@example.com",
  password: "securepass123",
  name: "Test User",
};

export const tokenPairShape = {
  accessToken: expect.any(String),
  refreshToken: expect.any(String),
};

export const authUserShape = (user: RegisterBody) => ({
  id: expect.any(String),
  email: user.email,
  name: user.name,
  avatar: null,
});

export const setCookies = (res: Response): string[] => res.get("Set-Cookie") ?? [];

export const refreshCookie = (res: Response): Optional<string> =>
  setCookies(res).find((cookie) => cookie.startsWith("refreshToken="));

export const cookieHeader = (res: Response): string =>
  setCookies(res)
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

export const registerUser = (user: RegisterBody = testUser) =>
  request(app).post("/api/auth/register").send(user);

export const loginUser = ({ email, password }: Pick<RegisterBody, "email" | "password"> = testUser) =>
  request(app).post("/api/auth/login").send({ email, password });

export const refreshWith = (refreshToken?: string) =>
  request(app).post("/api/auth/refresh").send({ refreshToken });

export const logoutWith = ({
  accessToken,
  refreshToken,
}: {
  accessToken?: string;
  refreshToken?: string;
}) => {
  const req = request(app).post("/api/auth/logout");
  return accessToken ? req.set("Authorization", `Bearer ${accessToken}`).send({ refreshToken }) : req.send({ refreshToken });
};

export type Session = AuthResponse & { cookies: string };

export const registerSession = async (user: RegisterBody = testUser): Promise<Session> => {
  const res = await registerUser(user).expect(201);
  return { ...AuthResponseSchema.parse(res.body), cookies: cookieHeader(res) };
};

export const loginSession = async (user: RegisterBody = testUser): Promise<Session> => {
  const res = await loginUser(user).expect(200);
  return { ...AuthResponseSchema.parse(res.body), cookies: cookieHeader(res) };
};

export const findStoredToken = (refreshToken: string) =>
  prisma.refreshToken.findUnique({ where: { tokenHash: authContainer.tokenService.hashRefreshToken(refreshToken) } });

export const backdateRotation = (refreshToken: string, byMs: number) =>
  prisma.refreshToken.update({
    where: { tokenHash: authContainer.tokenService.hashRefreshToken(refreshToken) },
    data: { rotatedAt: new Date(Date.now() - byMs) },
  });

export const expireSession = (refreshToken: string) =>
  prisma.refreshToken.update({
    where: { tokenHash: authContainer.tokenService.hashRefreshToken(refreshToken) },
    data: { expiresAt: new Date(Date.now() - 1) },
  });

export const countSessions = (userId: string) => prisma.refreshToken.count({ where: { userId } });

export const countActiveSessions = (userId: string) =>
  prisma.refreshToken.count({ where: { userId, rotatedAt: null } });

export const cleanAuthTables = async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
};
