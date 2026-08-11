import { env } from "../config/env.ts";
import type { AuthenticatedRequest } from "../types/auth.ts";
import createHttpError from "http-errors";
import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import {
  createTokens,
  setRefreshTokenCookie,
  hashPassword,
  verifyPassword,
  hashToken,
} from "../services/auth.ts";
import type { RegisterBody, LoginBody } from "../validators/auth.validator.ts";
import logger from "../logger.ts";

export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response,
) => {
  const { email, password, name } = req.body;

  logger.debug({ email }, "Register attempt");

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    logger.debug({ email }, "Register failed: email already taken");
    throw createHttpError(409, "Email already taken");
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  const tokens = await createTokens(user.id);
  setRefreshTokenCookie(res, tokens.refreshToken);

  logger.info({ userId: user.id, email: user.email }, "User registered");

  res.status(201).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  const { email, password } = req.body;

  logger.debug({ email }, "Login attempt");

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    logger.debug({ email }, "Login failed: user not found");
    throw createHttpError(401, "Invalid credentials");
  }

  const isPasswordValid = await verifyPassword(password, user.password);

  if (!isPasswordValid) {
    logger.debug({ userId: user.id, email }, "Login failed: invalid password");
    throw createHttpError(401, "Invalid credentials");
  }

  const tokens = await createTokens(user.id);
  setRefreshTokenCookie(res, tokens.refreshToken);

  logger.info({ userId: user.id, email: user.email }, "User logged in");

  res.status(200).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  logger.debug("Refresh token attempt");

  if (!refreshToken) {
    logger.debug("Refresh failed: token not provided");
    throw createHttpError(401, "Refresh token not provided");
  }

  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findFirst({
    where: { token: tokenHash },
  });

  if (!storedToken) {
    logger.debug("Refresh failed: invalid token");
    throw createHttpError(401, "Invalid refresh token");
  }

  if (new Date() > storedToken.expiresAt) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    logger.debug({ userId: storedToken.userId }, "Refresh failed: token expired");
    throw createHttpError(401, "Refresh token expired");
  }

  // Видаляємо старий refresh token (rotation)
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const tokens = await createTokens(storedToken.userId);
  setRefreshTokenCookie(res, tokens.refreshToken);

  logger.info({ userId: storedToken.userId }, "Tokens refreshed");

  res.status(200).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  logger.debug("Logout attempt");

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({
      where: { token: tokenHash },
    });
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
  });

  logger.info("User logged out");

  res.status(204).end();
};

