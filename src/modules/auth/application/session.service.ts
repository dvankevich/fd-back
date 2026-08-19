import { UnauthorizedError } from "../../../core/exceptions/errors.ts";
import logger from "../../../core/logger.ts";
import type { Clock } from "../../../core/types/common.ts";
import type { AuthConfig } from "../auth.config.ts";
import type {
  RotatedSession,
  SessionRepository,
  SessionWriter,
  StoredSession,
  TokenIssuer,
  TokenPair,
} from "../domain/auth.ports.ts";
import {
  SESSION_END_REASON,
  SESSION_ERROR,
  SessionEndedError,
} from "../domain/session-ended.error.ts";

type SessionServiceOptions = {
  sessions: SessionRepository;
  tokenIssuer: TokenIssuer;
  policy: AuthConfig["session"];
  clock: Clock;
};

type RevokeSessionArgs = { userId: string; refreshToken: string };

type IssueArgs = { writer: Pick<SessionWriter, "insert">; userId: string; now: Date };

const rejectedWithoutEndingSession = () => new UnauthorizedError(SESSION_ERROR.invalid);

export class SessionService {
  private readonly sessions: SessionRepository;
  private readonly tokenIssuer: TokenIssuer;
  private readonly policy: AuthConfig["session"];
  private readonly clock: Clock;

  constructor({ sessions, tokenIssuer, policy, clock }: SessionServiceOptions) {
    this.sessions = sessions;
    this.tokenIssuer = tokenIssuer;
    this.policy = policy;
    this.clock = clock;
  }

  issue(userId: string): Promise<TokenPair> {
    return this.issueWith({ writer: this.sessions, userId, now: this.clock() });
  }

  async rotate(presentedToken: string): Promise<RotatedSession> {
    const now = this.clock();
    const session = await this.sessions.findByHash(this.tokenIssuer.hashRefreshToken(presentedToken));

    if (!session) {
      throw new SessionEndedError(SESSION_END_REASON.invalid);
    }

    await this.rejectExpired(session, now);
    await this.rejectRotated(session, now);
    await this.purgeExpired(session.userId, now);

    const pair = await this.sessions.transaction(session.userId, async (writer) => {
      const rotated = await writer.markRotated({ id: session.id, at: now });
      if (!rotated) {
        throw rejectedWithoutEndingSession();
      }
      return this.issueWith({ writer, userId: session.userId, now });
    });

    return { ...pair, userId: session.userId };
  }

  async revoke({ userId, refreshToken }: RevokeSessionArgs): Promise<number> {
    const tokenHash = this.tokenIssuer.hashRefreshToken(refreshToken);
    const revoked = await this.sessions.deleteLive({ userId, tokenHash });
    if (revoked > 0) {
      return revoked;
    }
    logger.info({ userId }, "Logout with a token that is not a live session, revoking all sessions");
    return this.revokeAll(userId);
  }

  revokeAll(userId: string): Promise<number> {
    return this.sessions.deleteAllForUser(userId);
  }

  deleteExpired(userId: string): Promise<number> {
    return this.purgeExpired(userId, this.clock());
  }

  private purgeExpired(userId: string, before: Date): Promise<number> {
    return this.sessions.deleteExpired({ userId, before });
  }

  private async issueWith({ writer, userId, now }: IssueArgs): Promise<TokenPair> {
    const refreshToken = this.tokenIssuer.generateRefreshToken();
    await writer.insert({
      userId,
      tokenHash: this.tokenIssuer.hashRefreshToken(refreshToken),
      expiresAt: new Date(now.getTime() + this.policy.ttlMs),
    });
    return { accessToken: this.tokenIssuer.signAccessToken(userId), refreshToken };
  }

  private async rejectExpired(session: StoredSession, now: Date): Promise<void> {
    if (now <= session.expiresAt) {
      return;
    }
    await this.purgeExpired(session.userId, now);
    throw new SessionEndedError(SESSION_END_REASON.expired);
  }

  private async rejectRotated(session: StoredSession, now: Date): Promise<void> {
    if (!session.rotatedAt) {
      return;
    }
    const sinceRotationMs = now.getTime() - session.rotatedAt.getTime();
    if (sinceRotationMs <= this.policy.reuseGraceMs) {
      logger.info({ userId: session.userId, sinceRotationMs }, "Refresh token reused inside grace window");
      throw rejectedWithoutEndingSession();
    }
    await this.revokeAll(session.userId);
    logger.warn({ userId: session.userId }, "Refresh token reuse detected, all sessions revoked");
    throw new SessionEndedError(SESSION_END_REASON.reuse);
  }
}
