import { UnauthorizedError } from "../../../core/exceptions/errors.ts";
import logger from "../../../core/logger.ts";
import { TtlCache } from "../../../core/ttl-cache.ts";
import type { Clock, Optional } from "../../../core/types/common.ts";
import type { AuthConfig } from "../auth.config.ts";
import type { AuthPayload } from "../domain/auth-payload.ts";
import type { AccessTokenCodec, UserLookup } from "../domain/auth.ports.ts";
import { AUTH_MESSAGE } from "../domain/auth.messages.ts";
import { extractBearerToken } from "../domain/bearer.ts";

type AuthenticatorOptions = {
  tokenCodec: AccessTokenCodec;
  userLookup: UserLookup;
  userCache: AuthConfig["authenticate"]["userCache"];
  clock: Clock;
};

export class AuthenticatorService {
  private readonly tokenCodec: AccessTokenCodec;
  private readonly userLookup: UserLookup;
  private readonly knownUsers: TtlCache<string, true>;

  constructor({ tokenCodec, userLookup, userCache, clock }: AuthenticatorOptions) {
    this.tokenCodec = tokenCodec;
    this.userLookup = userLookup;
    this.knownUsers = new TtlCache({ ...userCache, clock });
  }

  async authenticate(authorization: Optional<string>): Promise<AuthPayload> {
    const token = extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedError(AUTH_MESSAGE.authenticationRequired);
    }

    const payload = this.tokenCodec.verifyAccessToken(token);
    if (!payload) {
      throw new UnauthorizedError(AUTH_MESSAGE.invalidAccessToken);
    }

    if (!(await this.isKnownUser(payload.sub))) {
      throw new UnauthorizedError(AUTH_MESSAGE.unknownUser);
    }

    return payload;
  }

  async identify(authorization: Optional<string>): Promise<Optional<AuthPayload>> {
    const token = extractBearerToken(authorization);
    if (!token) {
      return undefined;
    }

    const payload = this.tokenCodec.verifyAccessToken(token);
    if (!payload) {
      return undefined;
    }

    const known = await this.isKnownUser(payload.sub).catch((err: unknown) => {
      logger.warn({ err }, "Optional authentication fell back to a guest");
      return false;
    });

    return known ? payload : undefined;
  }

  evictUser(userId: string): void {
    this.knownUsers.delete(userId);
  }

  private async isKnownUser(userId: string): Promise<boolean> {
    if (this.knownUsers.get(userId)) {
      return true;
    }
    const exists = await this.userLookup.exists(userId);
    if (exists) {
      this.knownUsers.set(userId, true);
    }
    return exists;
  }
}
