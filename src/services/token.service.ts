import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { AuthConfig } from "../config/auth.ts";
import { TIME_MS } from "../core/time.ts";
import type { AuthPayload } from "../types/auth.ts";
import type { Clock, Nullable } from "../core/types/common.ts";
import { isNonEmptyString, isString } from "../core/guards.ts";
import type { TokenIssuer } from "./auth.ports.ts";

type TokenServiceOptions = Pick<AuthConfig, "accessToken" | "refreshToken"> & { clock: Clock };

const isAuthPayload = (decoded: string | jwt.JwtPayload): decoded is jwt.JwtPayload & AuthPayload =>
  !isString(decoded) && isNonEmptyString(decoded.sub);

const toSeconds = (ms: number): number => Math.floor(ms / TIME_MS.second);

export class TokenService implements TokenIssuer {
  private readonly accessToken: AuthConfig["accessToken"];
  private readonly refreshToken: AuthConfig["refreshToken"];
  private readonly clock: Clock;

  constructor({ accessToken, refreshToken, clock }: TokenServiceOptions) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.clock = clock;
  }

  signAccessToken(userId: string): string {
    const { secret, algorithm, ttlMs, issuer, audience } = this.accessToken;
    return jwt.sign({ sub: userId, iat: this.nowSeconds() }, secret, {
      algorithm,
      expiresIn: toSeconds(ttlMs),
      issuer,
      audience,
    });
  }

  verifyAccessToken(token: string): Nullable<AuthPayload> {
    const { secret, algorithm, ttlMs, issuer, audience } = this.accessToken;
    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: [algorithm],
        issuer,
        audience,
        maxAge: toSeconds(ttlMs),
        clockTimestamp: this.nowSeconds(),
      });
      return isAuthPayload(decoded) ? { sub: decoded.sub } : null;
    } catch {
      return null;
    }
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(this.refreshToken.bytes).toString("hex");
  }

  hashRefreshToken(refreshToken: string): string {
    return crypto.createHash("sha256").update(refreshToken).digest("hex");
  }

  private nowSeconds(): number {
    return toSeconds(this.clock().getTime());
  }
}
