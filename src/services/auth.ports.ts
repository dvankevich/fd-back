import type { AuthPayload } from "../types/auth.ts";
import type { Nullable, Optional } from "../types/common.ts";

export type TokenPair = { accessToken: string; refreshToken: string };

export type RotatedSession = TokenPair & { userId: string };

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, storedHash: Optional<string>): Promise<boolean>;
}

export interface AccessTokenCodec {
  signAccessToken(userId: string): string;
  verifyAccessToken(token: string): Nullable<AuthPayload>;
}

export interface RefreshTokenMinter {
  generateRefreshToken(): string;
  hashRefreshToken(refreshToken: string): string;
}

export type TokenIssuer = AccessTokenCodec & RefreshTokenMinter;

export interface UserLookup {
  exists(userId: string): Promise<boolean>;
}

export type StoredSession = {
  id: string;
  userId: string;
  expiresAt: Date;
  rotatedAt: Nullable<Date>;
};

export type NewSession = { userId: string; tokenHash: string; expiresAt: Date };

export interface SessionWriter {
  insert(session: NewSession): Promise<void>;
  markRotated(args: { id: string; at: Date }): Promise<boolean>;
  deleteAllForUser(userId: string): Promise<number>;
}

export interface SessionRepository extends Pick<SessionWriter, "insert" | "deleteAllForUser"> {
  findByHash(tokenHash: string): Promise<Nullable<StoredSession>>;
  deleteLive(args: { userId: string; tokenHash: string }): Promise<number>;
  deleteExpired(args: { userId: string; before: Date }): Promise<number>;
  transaction<T>(userId: string, run: (writer: SessionWriter) => Promise<T>): Promise<T>;
}
