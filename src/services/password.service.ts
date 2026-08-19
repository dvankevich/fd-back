import bcrypt from "bcrypt";
import type { AuthConfig } from "../config/auth.ts";
import type { Optional } from "../core/types/common.ts";
import type { PasswordHasher } from "./auth.ports.ts";

const DECOY = { password: "decoy-password-for-constant-time-login" } as const;

export class PasswordService implements PasswordHasher {
  private readonly rounds: number;
  private decoyHash: Optional<Promise<string>>;

  constructor({ rounds }: AuthConfig["password"]) {
    this.rounds = rounds;
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async verify(plain: string, storedHash: Optional<string>): Promise<boolean> {
    if (storedHash === undefined) {
      await bcrypt.compare(plain, await this.getDecoyHash());
      return false;
    }
    return bcrypt.compare(plain, storedHash);
  }

  private getDecoyHash(): Promise<string> {
    this.decoyHash ??= bcrypt.hash(DECOY.password, this.rounds).catch((err: unknown) => {
      this.decoyHash = undefined;
      throw err;
    });
    return this.decoyHash;
  }
}
