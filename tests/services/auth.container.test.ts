import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { AUTH_CONFIG } from "../../src/config/auth.ts";
import { createAuthContainer } from "../../src/services/auth.container.ts";
import type { NewSession, SessionRepository, TokenIssuer, UserLookup } from "../../src/services/auth.ports.ts";

const userId = "clx1234567890abcdefghij";

const fakeRepository = (): SessionRepository => ({
  insert: vi.fn<(session: NewSession) => Promise<void>>().mockResolvedValue(undefined),
  findByHash: vi.fn().mockResolvedValue(null),
  deleteLive: vi.fn().mockResolvedValue(0),
  deleteAllForUser: vi.fn().mockResolvedValue(0),
  deleteExpired: vi.fn().mockResolvedValue(0),
  transaction: vi.fn(),
});

describe("createAuthContainer", () => {
  it("should wire the session service to the given repository, token issuer and clock", async () => {
    const sessionRepository = fakeRepository();
    const tokenService: TokenIssuer = {
      signAccessToken: () => "access",
      verifyAccessToken: () => ({ sub: userId }),
      generateRefreshToken: () => "refresh",
      hashRefreshToken: (token) => `hash:${token}`,
    };
    const now = new Date("2026-08-19T00:00:00.000Z");

    const { sessionService } = createAuthContainer({
      clock: () => now,
      overrides: { sessionRepository, tokenService },
    });

    await expect(sessionService.issue(userId)).resolves.toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(sessionRepository.insert).toHaveBeenCalledWith({
      userId,
      tokenHash: "hash:refresh",
      expiresAt: new Date(now.getTime() + AUTH_CONFIG.session.ttlMs),
    });
  });

  it("should wire the authenticator to the given user lookup", async () => {
    const userLookup: UserLookup = { exists: vi.fn().mockResolvedValue(false) };

    const { authenticatorService, tokenService } = createAuthContainer({
      overrides: { userLookup, sessionRepository: fakeRepository() },
    });
    const token = tokenService.signAccessToken(userId);

    await expect(authenticatorService.authenticate(`Bearer ${token}`)).rejects.toMatchObject({
      status: 401,
      message: "User not found",
    });
    expect(userLookup.exists).toHaveBeenCalledWith(userId);
  });

  it("should build the refresh cookie from the config", () => {
    const { refreshCookie } = createAuthContainer({ overrides: { sessionRepository: fakeRepository() } });
    const res = { cookie: vi.fn<Response["cookie"]>() };

    refreshCookie.set(res, "token");

    expect(res.cookie).toHaveBeenCalledWith(AUTH_CONFIG.cookie.name, "token", {
      ...AUTH_CONFIG.cookie.options,
      maxAge: AUTH_CONFIG.session.ttlMs,
    });
  });

  it("should expose every service and let a whole service be replaced", () => {
    const authenticatorService = createAuthContainer({ overrides: { sessionRepository: fakeRepository() } })
      .authenticatorService;

    const container = createAuthContainer({
      overrides: { authenticatorService, sessionRepository: fakeRepository() },
    });

    expect(container.authenticatorService).toBe(authenticatorService);
    expect(Object.keys(container).sort()).toEqual(
      [
        "authenticatorService",
        "passwordService",
        "refreshCookie",
        "sessionRepository",
        "sessionService",
        "tokenService",
        "userLookup",
      ].sort(),
    );
  });
});
