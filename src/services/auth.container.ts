import prisma from "../../prisma/client.ts";
import type { PrismaClient } from "../../generated/prisma/client.ts";
import { AUTH_CONFIG, type AuthConfig } from "../config/auth.ts";
import type { Clock } from "../types/common.ts";
import { systemClock } from "../utils/clock.ts";
import { RefreshCookie } from "../utils/refreshCookie.ts";
import type { PasswordHasher, SessionRepository, TokenIssuer, UserLookup } from "./auth.ports.ts";
import { AuthenticatorService } from "./authenticator.service.ts";
import { PasswordService } from "./password.service.ts";
import { PrismaSessionRepository } from "./session.repository.ts";
import { SessionService } from "./session.service.ts";
import { TokenService } from "./token.service.ts";
import { PrismaUserLookup } from "./user.repository.ts";

export type AuthContainer = {
  passwordService: PasswordHasher;
  tokenService: TokenIssuer;
  sessionRepository: SessionRepository;
  userLookup: UserLookup;
  sessionService: Pick<SessionService, "issue" | "rotate" | "revoke" | "revokeAll" | "deleteExpired">;
  authenticatorService: Pick<AuthenticatorService, "authenticate" | "evictUser">;
  refreshCookie: Pick<RefreshCookie, "read" | "set" | "clear">;
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
  const userLookup = overrides.userLookup ?? new PrismaUserLookup(db);
  const sessionService =
    overrides.sessionService ??
    new SessionService({ sessions: sessionRepository, tokenIssuer: tokenService, policy: config.session, clock });
  const authenticatorService =
    overrides.authenticatorService ??
    new AuthenticatorService({ tokenCodec: tokenService, userLookup, userCache: config.authenticate.userCache, clock });
  const refreshCookie =
    overrides.refreshCookie ?? new RefreshCookie({ ...config.cookie, maxAgeMs: config.session.ttlMs });

  return {
    passwordService,
    tokenService,
    sessionRepository,
    userLookup,
    sessionService,
    authenticatorService,
    refreshCookie,
  };
};

export const authContainer = createAuthContainer();
