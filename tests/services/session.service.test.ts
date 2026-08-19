import { describe, it, expect } from "vitest";
import { AUTH_CONFIG } from "../../src/config/auth.ts";
import { TIME_MS } from "../../src/constants/time.ts";
import type {
  NewSession,
  SessionRepository,
  SessionWriter,
  StoredSession,
} from "../../src/services/auth.ports.ts";
import {
  SESSION_END_REASON,
  SessionEndedError,
  SessionService,
  isSessionEnded,
} from "../../src/services/session.service.ts";
import { TokenService } from "../../src/services/token.service.ts";
import { systemClock } from "../../src/utils/clock.ts";

const SECRET = "unit-test-secret-that-is-at-least-32-chars";
const userId = "clx1234567890abcdefghij";
const otherUserId = "clxother00000000000000";
const startedAt = new Date("2026-08-18T12:00:00.000Z");

const tokenIssuer = new TokenService({
  ...AUTH_CONFIG,
  accessToken: { ...AUTH_CONFIG.accessToken, secret: SECRET },
  clock: systemClock,
});

type SessionRow = StoredSession & { tokenHash: string };

class InMemorySessionRepository implements SessionRepository {
  readonly rows: SessionRow[] = [];
  private nextId = 1;
  transactionRuns = 0;

  async insert({ userId, tokenHash, expiresAt }: NewSession): Promise<void> {
    this.rows.push({ id: `session-${this.nextId++}`, userId, tokenHash, expiresAt, rotatedAt: null });
  }

  async markRotated({ id, at }: { id: string; at: Date }): Promise<boolean> {
    const row = this.rows.find((candidate) => candidate.id === id && candidate.rotatedAt === null);
    if (!row) {
      return false;
    }
    row.rotatedAt = at;
    return true;
  }

  async findByHash(tokenHash: string): Promise<StoredSession | null> {
    const row = this.rows.find((candidate) => candidate.tokenHash === tokenHash);
    return row ? { id: row.id, userId: row.userId, expiresAt: row.expiresAt, rotatedAt: row.rotatedAt } : null;
  }

  async deleteLive({ userId, tokenHash }: { userId: string; tokenHash: string }): Promise<number> {
    return this.remove((row) => row.userId === userId && row.tokenHash === tokenHash && row.rotatedAt === null);
  }

  async deleteAllForUser(userId: string): Promise<number> {
    return this.remove((row) => row.userId === userId);
  }

  async deleteExpired({ userId, before }: { userId: string; before: Date }): Promise<number> {
    return this.remove((row) => row.userId === userId && row.expiresAt < before);
  }

  transaction<T>(_userId: string, run: (writer: SessionWriter) => Promise<T>): Promise<T> {
    this.transactionRuns += 1;
    return run(this);
  }

  rowFor(refreshToken: string): SessionRow | undefined {
    return this.rows.find((row) => row.tokenHash === tokenIssuer.hashRefreshToken(refreshToken));
  }

  private remove(match: (row: SessionRow) => boolean): number {
    const before = this.rows.length;
    this.rows.splice(0, this.rows.length, ...this.rows.filter((row) => !match(row)));
    return before - this.rows.length;
  }
}

const createService = () => {
  const sessions = new InMemorySessionRepository();
  let now = startedAt;
  const clock = () => now;
  const advance = (ms: number) => {
    now = new Date(now.getTime() + ms);
  };
  const service = new SessionService({ sessions, tokenIssuer, policy: AUTH_CONFIG.session, clock });
  return { service, sessions, advance };
};

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error("expected rejection");
    },
    (err: unknown) => err,
  );

describe("SessionService", () => {
  describe("issue", () => {
    it("should store only the hash with the configured expiry and return a token pair", async () => {
      const { service, sessions } = createService();

      const pair = await service.issue(userId);

      expect(pair.accessToken).toEqual(expect.any(String));
      expect(pair.refreshToken).toHaveLength(AUTH_CONFIG.refreshToken.bytes * 2);
      expect(sessions.rows).toHaveLength(1);
      expect(sessions.rows[0]).toMatchObject({
        userId,
        tokenHash: tokenIssuer.hashRefreshToken(pair.refreshToken),
        expiresAt: new Date(startedAt.getTime() + AUTH_CONFIG.session.ttlMs),
        rotatedAt: null,
      });
      expect(sessions.rows[0]?.tokenHash).not.toBe(pair.refreshToken);
    });

    it("should verify the issued access token for the same user", async () => {
      const { service } = createService();

      const { accessToken } = await service.issue(userId);

      expect(tokenIssuer.verifyAccessToken(accessToken)).toEqual({ sub: userId });
    });
  });

  describe("rotate", () => {
    it("should reject an unknown refresh token as an ended session", async () => {
      const { service } = createService();

      const err = await rejectionOf(service.rotate("unknown"));

      expect(err).toBeInstanceOf(SessionEndedError);
      expect(err).toMatchObject({ status: 401, message: "Invalid refresh token", reason: SESSION_END_REASON.invalid });
    });

    it("should mark the old token rotated, issue a new pair inside a transaction and keep both rows", async () => {
      const { service, sessions, advance } = createService();
      const first = await service.issue(userId);
      advance(TIME_MS.minute);

      const rotated = await service.rotate(first.refreshToken);

      expect(rotated.userId).toBe(userId);
      expect(rotated.refreshToken).not.toBe(first.refreshToken);
      expect(sessions.transactionRuns).toBe(1);
      expect(sessions.rowFor(first.refreshToken)?.rotatedAt).toEqual(new Date(startedAt.getTime() + TIME_MS.minute));
      expect(sessions.rowFor(rotated.refreshToken)).toMatchObject({ userId, rotatedAt: null });
    });

    it("should reject a token reused inside the grace window without touching other sessions", async () => {
      const { service, sessions } = createService();
      const first = await service.issue(userId);
      const other = await service.issue(userId);
      await service.rotate(first.refreshToken);

      const err = await rejectionOf(service.rotate(first.refreshToken));

      expect(err).toMatchObject({ status: 401, message: "Invalid refresh token" });
      expect(isSessionEnded(err)).toBe(false);
      expect(sessions.rowFor(other.refreshToken)).toBeDefined();
      expect(sessions.rows).toHaveLength(3);
    });

    it("should treat a reuse exactly at the grace boundary as inside the window", async () => {
      const { service, sessions, advance } = createService();
      const first = await service.issue(userId);
      await service.rotate(first.refreshToken);
      advance(AUTH_CONFIG.session.reuseGraceMs);

      const err = await rejectionOf(service.rotate(first.refreshToken));

      expect(isSessionEnded(err)).toBe(false);
      expect(sessions.rows.filter((row) => row.userId === userId)).toHaveLength(2);
    });

    it("should tolerate a clock that moved backwards after the rotation", async () => {
      const { service, sessions, advance } = createService();
      const first = await service.issue(userId);
      await service.rotate(first.refreshToken);
      advance(-TIME_MS.second);

      const err = await rejectionOf(service.rotate(first.refreshToken));

      expect(isSessionEnded(err)).toBe(false);
      expect(sessions.rows.filter((row) => row.userId === userId)).toHaveLength(2);
    });

    it("should still accept a token exactly at its expiry instant", async () => {
      const { service, advance } = createService();
      const first = await service.issue(userId);
      advance(AUTH_CONFIG.session.ttlMs);

      await expect(service.rotate(first.refreshToken)).resolves.toMatchObject({ userId });
    });

    it("should stamp the new session with the same instant used for the rotation mark", async () => {
      const { service, sessions, advance } = createService();
      const first = await service.issue(userId);
      advance(TIME_MS.minute);
      const rotatedAt = new Date(startedAt.getTime() + TIME_MS.minute);

      const rotated = await service.rotate(first.refreshToken);

      expect(sessions.rowFor(first.refreshToken)?.rotatedAt).toEqual(rotatedAt);
      expect(sessions.rowFor(rotated.refreshToken)?.expiresAt).toEqual(
        new Date(rotatedAt.getTime() + AUTH_CONFIG.session.ttlMs),
      );
    });

    it("should revoke every session of the user when a rotated token is reused after the grace window", async () => {
      const { service, sessions, advance } = createService();
      const first = await service.issue(userId);
      const foreign = await service.issue(otherUserId);
      await service.rotate(first.refreshToken);
      advance(AUTH_CONFIG.session.reuseGraceMs + 1);

      const err = await rejectionOf(service.rotate(first.refreshToken));

      expect(err).toBeInstanceOf(SessionEndedError);
      expect(err).toMatchObject({ message: "Refresh token reuse detected", reason: SESSION_END_REASON.reuse });
      expect(sessions.rows.filter((row) => row.userId === userId)).toHaveLength(0);
      expect(sessions.rowFor(foreign.refreshToken)).toBeDefined();
    });

    it("should still detect reuse for the whole refresh lifetime", async () => {
      const { service, sessions, advance } = createService();
      const first = await service.issue(userId);
      await service.rotate(first.refreshToken);
      advance(AUTH_CONFIG.session.ttlMs - TIME_MS.minute);

      const err = await rejectionOf(service.rotate(first.refreshToken));

      expect(err).toMatchObject({ reason: SESSION_END_REASON.reuse });
      expect(sessions.rows.filter((row) => row.userId === userId)).toHaveLength(0);
    });

    it("should treat an expired token as expired even when it was rotated, without revoking the user", async () => {
      const { service, sessions, advance } = createService();
      const first = await service.issue(userId);
      const rotated = await service.rotate(first.refreshToken);
      advance(AUTH_CONFIG.session.ttlMs + 1);
      const live = await service.issue(userId);

      const err = await rejectionOf(service.rotate(first.refreshToken));

      expect(err).toMatchObject({ message: "Refresh token expired", reason: SESSION_END_REASON.expired });
      expect(sessions.rowFor(first.refreshToken)).toBeUndefined();
      expect(sessions.rowFor(rotated.refreshToken)).toBeUndefined();
      expect(sessions.rowFor(live.refreshToken)).toBeDefined();
    });

    it("should purge expired rows of the user before rotating", async () => {
      const { service, sessions, advance } = createService();
      const stale = await service.issue(userId);
      advance(AUTH_CONFIG.session.ttlMs - TIME_MS.minute);
      const fresh = await service.issue(userId);
      advance(2 * TIME_MS.minute);

      await service.rotate(fresh.refreshToken);

      expect(sessions.rowFor(stale.refreshToken)).toBeUndefined();
      expect(sessions.rows).toHaveLength(2);
    });

    it("should let only one of two concurrent rotations win", async () => {
      const { service, sessions } = createService();
      const first = await service.issue(userId);

      const outcomes = await Promise.allSettled([
        service.rotate(first.refreshToken),
        service.rotate(first.refreshToken),
      ]);

      const statuses = outcomes.map((outcome) => outcome.status).sort();
      expect(statuses).toEqual(["fulfilled", "rejected"]);
      expect(outcomes).toContainEqual(
        expect.objectContaining({
          status: "rejected",
          reason: expect.objectContaining({ status: 401, message: "Invalid refresh token" }),
        }),
      );
      expect(sessions.rows.filter((row) => row.rotatedAt === null)).toHaveLength(1);
    });
  });

  describe("revoke", () => {
    it("should delete only the presented session of the user", async () => {
      const { service, sessions } = createService();
      const first = await service.issue(userId);
      const second = await service.issue(userId);

      expect(await service.revoke({ userId, refreshToken: first.refreshToken })).toBe(1);

      expect(sessions.rowFor(first.refreshToken)).toBeUndefined();
      expect(sessions.rowFor(second.refreshToken)).toBeDefined();
    });

    it("should keep another user's session for a matching token and revoke the caller's sessions instead", async () => {
      const { service, sessions } = createService();
      const own = await service.issue(userId);
      const foreign = await service.issue(otherUserId);

      expect(await service.revoke({ userId, refreshToken: foreign.refreshToken })).toBe(1);

      expect(sessions.rowFor(foreign.refreshToken)).toBeDefined();
      expect(sessions.rowFor(own.refreshToken)).toBeUndefined();
    });

    it("should revoke every session of the user when the presented token is not a live session", async () => {
      const { service, sessions } = createService();
      const first = await service.issue(userId);
      const second = await service.issue(userId);
      const foreign = await service.issue(otherUserId);
      await service.rotate(first.refreshToken);

      expect(await service.revoke({ userId, refreshToken: first.refreshToken })).toBe(3);

      expect(sessions.rows.filter((row) => row.userId === userId)).toHaveLength(0);
      expect(sessions.rowFor(second.refreshToken)).toBeUndefined();
      expect(sessions.rowFor(foreign.refreshToken)).toBeDefined();
    });

    it("should revoke every session of the user for an unknown token", async () => {
      const { service, sessions } = createService();
      await service.issue(userId);
      await service.issue(userId);

      expect(await service.revoke({ userId, refreshToken: "unknown" })).toBe(2);
      expect(sessions.rows.filter((row) => row.userId === userId)).toHaveLength(0);
    });
  });

  describe("revokeAll", () => {
    it("should delete every session of the user and nobody else's", async () => {
      const { service, sessions } = createService();
      await service.issue(userId);
      await service.issue(userId);
      const foreign = await service.issue(otherUserId);

      expect(await service.revokeAll(userId)).toBe(2);
      expect(sessions.rows).toHaveLength(1);
      expect(sessions.rowFor(foreign.refreshToken)).toBeDefined();
    });
  });

  describe("deleteExpired", () => {
    it("should delete only rows past their expiry for the user", async () => {
      const { service, sessions, advance } = createService();
      const stale = await service.issue(userId);
      const foreignStale = await service.issue(otherUserId);
      advance(AUTH_CONFIG.session.ttlMs + 1);
      const fresh = await service.issue(userId);

      expect(await service.deleteExpired(userId)).toBe(1);
      expect(sessions.rowFor(stale.refreshToken)).toBeUndefined();
      expect(sessions.rowFor(fresh.refreshToken)).toBeDefined();
      expect(sessions.rowFor(foreignStale.refreshToken)).toBeDefined();
    });
  });

  describe("isSessionEnded", () => {
    it("should recognise only SessionEndedError instances", () => {
      expect(isSessionEnded(new SessionEndedError(SESSION_END_REASON.invalid))).toBe(true);
      expect(isSessionEnded(new Error("boom"))).toBe(false);
      expect(isSessionEnded({ status: 401, sessionEnded: true })).toBe(false);
    });
  });
});
