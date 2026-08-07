import { env } from "../config/env.ts";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Response } from "express";
import prisma from "../../prisma/client.ts";
import bcrypt from "bcrypt";
import {
  ACCESS_TOKEN_LIFETIME,
  REFRESH_TOKEN_LIFETIME,
} from "../constants/time.ts";

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createTokens = async (userId: string) => {
  const accessToken = jwt.sign(
    { sub: userId },
    env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_LIFETIME / 1000 },
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");

  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME),
    },
  });

  return { accessToken, refreshToken };
};

export const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_LIFETIME,
  });
};
