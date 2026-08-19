import { describe, it, expect, vi, afterEach } from "vitest";
import { AUTH_CONFIG } from "../../src/config/auth.ts";
import { TIME_MS } from "../../src/constants/time.ts";
import { AuthenticatorService } from "../../src/services/authenticator.service.ts";
import { TokenService } from "../../src/services/token.service.ts";
import { extractBearerToken } from "../../src/utils/bearer.ts";
import type { Optional } from "../../src/types/common.ts";
import { systemClock } from "../../src/utils/clock.ts";

const userId = "clx1234567890abcdefghij";
const otherSecret = "another-secret-that-is-at-least-32-chars";

const tokenCodec = new TokenService({ ...AUTH_CONFIG, clock: systemClock });

const createService = ({ ttlMs = 0 }: { ttlMs?: number } = {}) => {
  const exists = vi.fn<(id: string) => Promise<boolean>>().mockResolvedValue(true);
  const service = new AuthenticatorService({
    tokenCodec,
    userLookup: { exists },
    userCache: { ...AUTH_CONFIG.authenticate.userCache, ttlMs },
    clock: systemClock,
  });
  return { service, exists };
};

const validToken = tokenCodec.signAccessToken(userId);

const bearer = (token: string) => `Bearer ${token}`;

const expectUnauthorized = (
  service: AuthenticatorService,
  authorization: Optional<string>,
  message: string,
) => expect(service.authenticate(authorization)).rejects.toMatchObject({ status: 401, message });

describe("extractBearerToken", () => {
  it.each([
    [undefined, undefined],
    ["", undefined],
    ["Basic abc", undefined],
    ["Bearer", undefined],
    ["Bearer a b", undefined],
    ["Bearer abc", "abc"],
    ["bearer   abc  ", "abc"],
    ["  BEARER abc", "abc"],
  ])("maps %j to %j", (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });
});

describe("AuthenticatorService.authenticate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should reject a request without Authorization header", async () => {
    const { service, exists } = createService();

    await expectUnauthorized(service, undefined, "Authentication required");
    expect(exists).not.toHaveBeenCalled();
  });

  it("should reject a non-Bearer scheme", async () => {
    const { service } = createService();

    await expectUnauthorized(service, `Basic ${validToken}`, "Authentication required");
  });

  it("should reject a malformed token", async () => {
    const { service, exists } = createService();

    await expectUnauthorized(service, bearer("not-a-jwt"), "Invalid or expired access token");
    expect(exists).not.toHaveBeenCalled();
  });

  it("should reject a token signed with another secret", async () => {
    const { service } = createService();
    const forgedToken = new TokenService({
      ...AUTH_CONFIG,
      accessToken: { ...AUTH_CONFIG.accessToken, secret: otherSecret },
      clock: systemClock,
    }).signAccessToken(userId);

    await expectUnauthorized(service, bearer(forgedToken), "Invalid or expired access token");
  });

  it("should reject an expired access token", async () => {
    vi.useFakeTimers();
    const { service, exists } = createService();
    const token = tokenCodec.signAccessToken(userId);
    vi.advanceTimersByTime(AUTH_CONFIG.accessToken.ttlMs + TIME_MS.second);

    await expectUnauthorized(service, bearer(token), "Invalid or expired access token");
    expect(exists).not.toHaveBeenCalled();
  });

  it("should reject a valid token whose user no longer exists", async () => {
    const { service, exists } = createService();
    exists.mockResolvedValue(false);

    await expectUnauthorized(service, bearer(validToken), "User not found");
    expect(exists).toHaveBeenCalledWith(userId);
  });

  it("should resolve the payload for a valid token", async () => {
    const { service } = createService();

    await expect(service.authenticate(bearer(validToken))).resolves.toEqual({ sub: userId });
  });

  it("should remember a known user for the cache ttl and re-check afterwards", async () => {
    vi.useFakeTimers();
    const { service, exists } = createService({ ttlMs: TIME_MS.second });
    const token = tokenCodec.signAccessToken(userId);

    await service.authenticate(bearer(token));
    await service.authenticate(bearer(token));
    expect(exists).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(TIME_MS.second + 1);
    await service.authenticate(bearer(token));
    expect(exists).toHaveBeenCalledTimes(2);
  });

  it("should not cache a missing user", async () => {
    const { service, exists } = createService({ ttlMs: TIME_MS.second });
    exists.mockResolvedValue(false);

    await expectUnauthorized(service, bearer(validToken), "User not found");
    await expectUnauthorized(service, bearer(validToken), "User not found");
    expect(exists).toHaveBeenCalledTimes(2);
  });

  it("should re-check the user after evictUser()", async () => {
    const { service, exists } = createService({ ttlMs: TIME_MS.minute });

    await service.authenticate(bearer(validToken));
    service.evictUser(userId);
    await service.authenticate(bearer(validToken));

    expect(exists).toHaveBeenCalledTimes(2);
  });
});
