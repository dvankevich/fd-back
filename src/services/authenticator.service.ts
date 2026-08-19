import createHttpError from "http-errors";
import type { AuthConfig } from "../config/auth.ts";
import { HTTP_STATUS } from "../core/http/http-status.ts";
import type { AuthPayload } from "../types/auth.ts";
import type { Clock, Optional } from "../core/types/common.ts";
import { extractBearerToken } from "../utils/bearer.ts";
import { TtlCache } from "../core/ttl-cache.ts";
import type { AccessTokenCodec, UserLookup } from "./auth.ports.ts";

type AuthenticatorOptions = {
  tokenCodec: AccessTokenCodec;
  userLookup: UserLookup;
  userCache: AuthConfig["authenticate"]["userCache"];
  clock: Clock;
};

const AUTH_ERROR = {
  missing: "Authentication required",
  invalidToken: "Invalid or expired access token",
  unknownUser: "User not found",
} as const;

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
      throw createHttpError(HTTP_STATUS.unauthorized, AUTH_ERROR.missing);
    }

    const payload = this.tokenCodec.verifyAccessToken(token);
    if (!payload) {
      throw createHttpError(HTTP_STATUS.unauthorized, AUTH_ERROR.invalidToken);
    }

    if (!(await this.isKnownUser(payload.sub))) {
      throw createHttpError(HTTP_STATUS.unauthorized, AUTH_ERROR.unknownUser);
    }

    return payload;
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
