import { UnauthorizedError } from "../../../core/exceptions/errors.ts";
import logger from "../../../core/logger.ts";
import type { Optional } from "../../../core/types/common.ts";
import { toAuthUser } from "../domain/auth-user.mapper.ts";
import { AUTH_MESSAGE } from "../domain/auth.messages.ts";
import type {
  AuthUser,
  AuthUserRepository,
  PasswordHasher,
  RotatedSession,
  TokenPair,
} from "../domain/auth.ports.ts";
import type { SessionService } from "./session.service.ts";

type SessionIssuer = Pick<SessionService, "issue" | "rotate" | "revoke" | "revokeAll" | "deleteExpired">;

type AuthServiceOptions = {
  users: AuthUserRepository;
  passwords: PasswordHasher;
  sessions: SessionIssuer;
};

export type AuthSession = { user: AuthUser; tokens: TokenPair };

export type RegisterInput = { email: string; password: string; name: string };

export type LoginInput = { email: string; password: string };

export type LogoutInput = { userId: string; refreshToken: Optional<string> };

export class AuthService {
  private readonly users: AuthUserRepository;
  private readonly passwords: PasswordHasher;
  private readonly sessions: SessionIssuer;

  constructor({ users, passwords, sessions }: AuthServiceOptions) {
    this.users = users;
    this.passwords = passwords;
    this.sessions = sessions;
  }

  async register({ email, password, name }: RegisterInput): Promise<AuthSession> {
    logger.debug({ email }, "Register attempt");

    const user = await this.users.create({ email, name, password: await this.passwords.hash(password) });
    const tokens = await this.sessions.issue(user.id);

    logger.info({ userId: user.id }, "User registered");

    return { user, tokens };
  }

  async login({ email, password }: LoginInput): Promise<AuthSession> {
    logger.debug({ email }, "Login attempt");

    const account = await this.users.findAccountByEmail(email);
    const passwordMatches = await this.passwords.verify(password, account?.password);
    if (!account || !passwordMatches) {
      throw new UnauthorizedError(AUTH_MESSAGE.invalidCredentials);
    }

    await this.sessions.deleteExpired(account.id);
    const tokens = await this.sessions.issue(account.id);

    logger.info({ userId: account.id }, "User logged in");

    return { user: toAuthUser(account), tokens };
  }

  async refresh(presentedToken: string): Promise<RotatedSession> {
    logger.debug("Refresh token attempt");

    const rotated = await this.sessions.rotate(presentedToken);

    logger.info({ userId: rotated.userId }, "Tokens refreshed");

    return rotated;
  }

  async logout({ userId, refreshToken }: LogoutInput): Promise<number> {
    logger.debug({ userId }, "Logout attempt");

    const revokedSessions = refreshToken
      ? await this.sessions.revoke({ userId, refreshToken })
      : await this.sessions.revokeAll(userId);

    logger.info({ userId, revokedSessions }, "User logged out");

    return revokedSessions;
  }
}
