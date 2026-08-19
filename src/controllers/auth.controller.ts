import createHttpError from "http-errors";
import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import prisma from "../../prisma/client.ts";
import type { Prisma, User } from "../../generated/prisma/client.ts";
import { HTTP_STATUS } from "../constants/http.ts";
import type { AuthenticatedHandler } from "../middleware/authenticate.ts";
import { authContainer } from "../services/auth.container.ts";
import type { TokenPair } from "../services/auth.ports.ts";
import { isSessionEnded } from "../services/session.service.ts";
import { isUniqueViolation } from "../utils/prismaErrors.ts";
import type {
  AuthResponse,
  AuthUser,
  LoginBody,
  RefreshTokenBody,
  RegisterBody,
  Tokens,
} from "../validators/auth.validator.ts";
import logger from "../logger.ts";

const { passwordService, sessionService, refreshCookie } = authContainer;

const AUTH_MESSAGE = {
  emailTaken: "Email already taken",
  invalidCredentials: "Invalid credentials",
  refreshTokenRequired: "Refresh token required",
} as const;

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const satisfies Prisma.UserSelect;

const toAuthUser = ({ id, name, email, avatar }: Pick<User, keyof typeof authUserSelect>): AuthUser => ({
  id,
  name,
  email,
  avatar,
});

const rethrowEmailTaken = (err: unknown): never => {
  if (isUniqueViolation(err)) {
    throw createHttpError(HTTP_STATUS.conflict, AUTH_MESSAGE.emailTaken);
  }
  throw err;
};

const startSession = async (res: Pick<Response, "cookie">, userId: string): Promise<TokenPair> => {
  const tokens = await sessionService.issue(userId);
  refreshCookie.set(res, tokens.refreshToken);
  return tokens;
};

const clearCookieWhenEnded =
  (res: Pick<Response, "clearCookie">) =>
  (err: unknown): never => {
    if (isSessionEnded(err)) {
      refreshCookie.clear(res);
    }
    throw err;
  };

export const register = async (
  req: Request<ParamsDictionary, AuthResponse, RegisterBody>,
  res: Response<AuthResponse>,
) => {
  const { email, password, name } = req.body;

  logger.debug({ email }, "Register attempt");

  const passwordHash = await passwordService.hash(password);

  const user = await prisma.user
    .create({ data: { email, password: passwordHash, name }, select: authUserSelect })
    .catch(rethrowEmailTaken);
  const tokens = await startSession(res, user.id);

  logger.info({ userId: user.id }, "User registered");

  res.status(HTTP_STATUS.created).json({ ...tokens, user });
};

export const login = async (
  req: Request<ParamsDictionary, AuthResponse, LoginBody>,
  res: Response<AuthResponse>,
) => {
  const { email, password } = req.body;

  logger.debug({ email }, "Login attempt");

  const account = await prisma.user.findUnique({
    where: { email },
    select: { ...authUserSelect, password: true },
  });

  const passwordMatches = await passwordService.verify(password, account?.password);
  if (!account || !passwordMatches) {
    throw createHttpError(HTTP_STATUS.unauthorized, AUTH_MESSAGE.invalidCredentials);
  }

  await sessionService.deleteExpired(account.id);
  const tokens = await startSession(res, account.id);

  logger.info({ userId: account.id }, "User logged in");

  res.status(HTTP_STATUS.ok).json({ ...tokens, user: toAuthUser(account) });
};

export const refresh = async (
  req: Request<ParamsDictionary, Tokens, RefreshTokenBody>,
  res: Response<Tokens>,
) => {
  const presentedToken = refreshCookie.read(req);

  logger.debug("Refresh token attempt");

  if (!presentedToken) {
    throw createHttpError(HTTP_STATUS.unauthorized, AUTH_MESSAGE.refreshTokenRequired);
  }

  const { userId, ...tokens } = await sessionService.rotate(presentedToken).catch(clearCookieWhenEnded(res));
  refreshCookie.set(res, tokens.refreshToken);

  logger.info({ userId }, "Tokens refreshed");

  res.status(HTTP_STATUS.ok).json(tokens);
};

export const logout: AuthenticatedHandler<ParamsDictionary, void, RefreshTokenBody> = async (
  req,
  res,
) => {
  const userId = req.user.sub;

  logger.debug({ userId }, "Logout attempt");

  const refreshToken = refreshCookie.read(req);
  const revokedSessions = refreshToken
    ? await sessionService.revoke({ userId, refreshToken })
    : await sessionService.revokeAll(userId);
  refreshCookie.clear(res);

  logger.info({ userId, revokedSessions }, "User logged out");

  res.status(HTTP_STATUS.noContent).end();
};
