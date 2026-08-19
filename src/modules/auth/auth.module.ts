import type { RequestHandler } from "express";
import { systemClock } from "../../core/clock.ts";
import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import { API_PREFIX, type ApiModule } from "../../core/http/api-module.ts";
import type { Clock } from "../../core/types/common.ts";
import { AuthController } from "./api/auth.controller.ts";
import { createAuthRouter } from "./api/auth.routes.ts";
import { createAuthenticate } from "./api/authenticate.middleware.ts";
import { RefreshCookie } from "./api/refresh-cookie.ts";
import { AUTH_CONFIG, type AuthConfig } from "./auth.config.ts";
import { AuthService } from "./application/auth.service.ts";
import { AuthenticatorService } from "./application/authenticator.service.ts";
import { SessionService } from "./application/session.service.ts";
import type {
  AuthUserRepository,
  PasswordHasher,
  SessionRepository,
  TokenIssuer,
} from "./domain/auth.ports.ts";
import { PrismaAuthUserRepository } from "./infrastructure/auth-users.repository.ts";
import { PasswordService } from "./infrastructure/password.service.ts";
import { PrismaSessionRepository } from "./infrastructure/session.repository.ts";
import { TokenService } from "./infrastructure/token.service.ts";
import "./api/auth.openapi.ts";

export type AuthContainer = {
  config: AuthConfig;
  passwordService: PasswordHasher;
  tokenService: TokenIssuer;
  sessionRepository: SessionRepository;
  userRepository: AuthUserRepository;
  sessionService: Pick<SessionService, "issue" | "rotate" | "revoke" | "revokeAll" | "deleteExpired">;
  authenticatorService: Pick<AuthenticatorService, "authenticate" | "evictUser">;
  refreshCookie: Pick<RefreshCookie, "read" | "set" | "clear">;
  authService: AuthService;
};

type AuthContainerOptions = {
  config?: AuthConfig;
  db?: PrismaClient;
  clock?: Clock;
  overrides?: Partial<AuthContainer>;
};

export const createAuthContainer = ({
  config = AUTH_CONFIG,
  db = prisma,
  clock = systemClock,
  overrides = {},
}: AuthContainerOptions = {}): AuthContainer => {
  const passwordService = overrides.passwordService ?? new PasswordService(config.password);
  const tokenService = overrides.tokenService ?? new TokenService({ ...config, clock });
  const sessionRepository = overrides.sessionRepository ?? new PrismaSessionRepository(db);
  const userRepository = overrides.userRepository ?? new PrismaAuthUserRepository(db);
  const sessionService =
    overrides.sessionService ??
    new SessionService({ sessions: sessionRepository, tokenIssuer: tokenService, policy: config.session, clock });
  const authenticatorService =
    overrides.authenticatorService ??
    new AuthenticatorService({ tokenCodec: tokenService, userLookup: userRepository, userCache: config.authenticate.userCache, clock });
  const refreshCookie =
    overrides.refreshCookie ?? new RefreshCookie({ ...config.cookie, maxAgeMs: config.session.ttlMs });
  const authService =
    overrides.authService ??
    new AuthService({ users: userRepository, passwords: passwordService, sessions: sessionService });

  return {
    config,
    passwordService,
    tokenService,
    sessionRepository,
    userRepository,
    sessionService,
    authenticatorService,
    refreshCookie,
    authService,
  };
};

export const authContainer = createAuthContainer();

export type AuthModule = ApiModule & { container: AuthContainer; authenticate: RequestHandler };

export const createAuthModule = (container: AuthContainer = authContainer): AuthModule => {
  const authenticate = createAuthenticate(container.authenticatorService);
  const controller = new AuthController({
    auth: container.authService,
    refreshCookie: container.refreshCookie,
  });

  return {
    path: `${API_PREFIX}/auth`,
    router: createAuthRouter({ controller, authenticate, rateLimit: container.config.rateLimit }),
    authenticate,
    container,
  };
};

export const authModule = createAuthModule();
