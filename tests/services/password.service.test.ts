import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcrypt";
import { PasswordService } from "../../src/services/password.service.ts";

const FAST_ROUNDS = 4;

describe("PasswordService", () => {
  const service = new PasswordService({ rounds: FAST_ROUNDS });
  const password = "securepass123";

  it("should hash a password into a bcrypt hash", async () => {
    const hash = await service.hash(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("should produce different hashes for the same password", async () => {
    expect(await service.hash(password)).not.toBe(await service.hash(password));
  });

  it("should verify the correct password against its hash", async () => {
    const hash = await service.hash(password);

    expect(await service.verify(password, hash)).toBe(true);
    expect(await service.verify("wrongpassword", hash)).toBe(false);
  });

  it("should always fail without a stored hash but still run a bcrypt compare", async () => {
    const compare = vi.spyOn(bcrypt, "compare");

    const result = await service.verify(password, undefined);

    expect(result).toBe(false);
    expect(compare).toHaveBeenCalledWith(password, expect.stringMatching(/^\$2[aby]\$/));
    compare.mockRestore();
  });

  it("should reuse one decoy hash across calls", async () => {
    const hash = vi.spyOn(bcrypt, "hash");
    const fresh = new PasswordService({ rounds: FAST_ROUNDS });

    await fresh.verify(password, undefined);
    await fresh.verify(password, undefined);

    expect(hash).toHaveBeenCalledTimes(1);
    hash.mockRestore();
  });
});
