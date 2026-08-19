import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { AUTH_CONFIG } from "../auth.config.ts";
import { TIME_MS } from "../../../core/time.ts";
import { TokenService } from "./token.service.ts";
import { systemClock } from "../../../core/clock.ts";

const SECRET = "unit-test-secret-that-is-at-least-32-chars";
const OTHER_SECRET = "another-secret-that-is-at-least-32-chars";
const userId = "clx1234567890abcdefghij";

const withSecret = (secret: string) =>
  new TokenService({ ...AUTH_CONFIG, accessToken: { ...AUTH_CONFIG.accessToken, secret }, clock: systemClock });

const { issuer, audience } = AUTH_CONFIG.accessToken;

const TOKEN_SECONDS = { quarterHour: 900, day: 86_400 } as const;

describe("TokenService", () => {
  const service = withSecret(SECRET);

  it("should sign an access token that verifies back to the same user", () => {
    const token = service.signAccessToken(userId);

    expect(service.verifyAccessToken(token)).toEqual({ sub: userId });
    expect(jwt.verify(token, SECRET)).toMatchObject({ sub: userId });
  });

  it("should reject a token signed with another secret", () => {
    const forgedToken = withSecret(OTHER_SECRET).signAccessToken(userId);

    expect(service.verifyAccessToken(forgedToken)).toBeNull();
  });

  it("should reject a malformed token", () => {
    expect(service.verifyAccessToken("not-a-jwt")).toBeNull();
  });

  it("should reject an expired token", () => {
    const expiredToken = jwt.sign({ sub: userId }, SECRET, { expiresIn: -10, issuer, audience });

    expect(service.verifyAccessToken(expiredToken)).toBeNull();
  });

  it("should reject a token without a string sub", () => {
    const tokenWithoutSub = jwt.sign({ role: "user" }, SECRET, { issuer, audience });

    expect(service.verifyAccessToken(tokenWithoutSub)).toBeNull();
  });

  it("should reject a token issued for another audience with the same secret", () => {
    const passwordResetToken = jwt.sign({ sub: userId }, SECRET, {
      issuer,
      audience: "foodies-password-reset",
      expiresIn: TOKEN_SECONDS.quarterHour,
    });

    expect(service.verifyAccessToken(passwordResetToken)).toBeNull();
  });

  it("should reject a token from another issuer with the same secret", () => {
    const foreignToken = jwt.sign({ sub: userId }, SECRET, {
      issuer: "other-api",
      audience,
      expiresIn: TOKEN_SECONDS.quarterHour,
    });

    expect(service.verifyAccessToken(foreignToken)).toBeNull();
  });

  it("should reject a token that never expires", () => {
    const eternalToken = jwt.sign({ sub: userId }, SECRET, { issuer, audience, noTimestamp: true });

    expect(service.verifyAccessToken(eternalToken)).toBeNull();
  });

  it("should reject a token older than the access token ttl even if its own exp is far away", () => {
    const staleBy = AUTH_CONFIG.accessToken.ttlMs + TIME_MS.second;
    const issuedAt = Math.floor((Date.now() - staleBy) / TIME_MS.second);
    const longLivedToken = jwt.sign({ sub: userId, iat: issuedAt, exp: issuedAt + TOKEN_SECONDS.day }, SECRET, {
      issuer,
      audience,
    });

    expect(service.verifyAccessToken(longLivedToken)).toBeNull();
  });

  it("should sign and verify against the injected clock", () => {
    const frozen = new Date("2026-08-19T12:00:00.000Z");
    const frozenService = new TokenService({
      ...AUTH_CONFIG,
      accessToken: { ...AUTH_CONFIG.accessToken, secret: SECRET },
      clock: () => frozen,
    });
    const token = frozenService.signAccessToken(userId);

    expect(frozenService.verifyAccessToken(token)).toEqual({ sub: userId });
    expect(jwt.decode(token)).toMatchObject({
      iat: Math.floor(frozen.getTime() / TIME_MS.second),
      iss: issuer,
      aud: audience,
    });
  });

  it("should reject a token signed with another algorithm even with the right secret", () => {
    const hs512Token = jwt.sign({ sub: userId }, SECRET, { algorithm: "HS512", issuer, audience });

    expect(service.verifyAccessToken(hs512Token)).toBeNull();
  });

  it("should reject an unsigned token", () => {
    const unsignedToken = jwt.sign({ sub: userId }, "", { algorithm: "none", issuer, audience });

    expect(service.verifyAccessToken(unsignedToken)).toBeNull();
  });

  it("should generate hex refresh tokens of the configured length", () => {
    const refreshToken = service.generateRefreshToken();

    expect(refreshToken).toMatch(new RegExp(`^[a-f0-9]{${AUTH_CONFIG.refreshToken.bytes * 2}}$`));
    expect(service.generateRefreshToken()).not.toBe(refreshToken);
  });

  it("should hash refresh tokens deterministically with sha256", () => {
    const refreshToken = service.generateRefreshToken();
    const hash = service.hashRefreshToken(refreshToken);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(service.hashRefreshToken(refreshToken)).toBe(hash);
    expect(hash).not.toBe(refreshToken);
  });
});
