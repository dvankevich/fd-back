import { describe, it, expect, beforeEach, afterAll } from "vitest";
import prisma from "../../src/core/database/prisma.client.ts";
import { TIME_MS } from "../../src/core/time.ts";
import type { NewSession } from "../../src/modules/auth/domain/auth.ports.ts";
import { PrismaSessionRepository } from "../../src/modules/auth/infrastructure/session.repository.ts";
import { cleanAuthTables } from "./helpers/auth.ts";

const repository = new PrismaSessionRepository(prisma);

const RACE = { holdMs: 100, justPastMs: 1 } as const;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const deferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

const createUser = async (suffix: string) => {
  const user = await prisma.user.create({
    data: { email: `repo-${suffix}@example.com`, password: "hash", name: "Repo" },
    select: { id: true },
  });
  return user.id;
};

const insertSession = async ({
  userId,
  tokenHash,
  expiresAt = new Date(Date.now() + TIME_MS.minute),
}: Omit<NewSession, "expiresAt"> & { expiresAt?: Date }) => {
  await repository.insert({ userId, tokenHash, expiresAt });
  const stored = await repository.findByHash(tokenHash);
  if (!stored) {
    throw new Error("session was not stored");
  }
  return stored;
};

describe("PrismaSessionRepository", () => {
  beforeEach(async () => {
    await cleanAuthTables();
  });

  afterAll(async () => {
    await cleanAuthTables();
    await prisma.$disconnect();
  });

  it("should store and find a session by hash without exposing the hash", async () => {
    const userId = await createUser("find");

    const stored = await insertSession({ userId, tokenHash: "hash-find" });

    expect(stored).toEqual({ id: expect.any(String), userId, expiresAt: expect.any(Date), rotatedAt: null });
    expect(await repository.findByHash("missing")).toBeNull();
  });

  it("should mark a session rotated exactly once", async () => {
    const userId = await createUser("cas");
    const stored = await insertSession({ userId, tokenHash: "hash-cas" });
    const at = new Date();

    const markRotated = () => repository.transaction(userId, (writer) => writer.markRotated({ id: stored.id, at }));

    expect(await markRotated()).toBe(true);
    expect(await markRotated()).toBe(false);
    expect((await repository.findByHash("hash-cas"))?.rotatedAt).toEqual(at);
  });

  it("should roll back the rotation mark when the transaction fails afterwards", async () => {
    const userId = await createUser("tx");
    const stored = await insertSession({ userId, tokenHash: "hash-tx" });

    await expect(
      repository.transaction(userId, async (writer) => {
        await writer.markRotated({ id: stored.id, at: new Date() });
        await writer.insert({ userId, tokenHash: "hash-tx-new", expiresAt: new Date(Date.now() + TIME_MS.minute) });
        throw new Error("sign failed");
      }),
    ).rejects.toThrow("sign failed");

    expect((await repository.findByHash("hash-tx"))?.rotatedAt).toBeNull();
    expect(await repository.findByHash("hash-tx-new")).toBeNull();
  });

  it("should delete only the matching live session of the user", async () => {
    const userId = await createUser("one");
    const otherId = await createUser("one-other");
    await insertSession({ userId, tokenHash: "hash-one-a" });
    await insertSession({ userId, tokenHash: "hash-one-b" });
    const rotated = await insertSession({ userId, tokenHash: "hash-one-rotated" });
    await repository.transaction(userId, (writer) => writer.markRotated({ id: rotated.id, at: new Date() }));
    await insertSession({ userId: otherId, tokenHash: "hash-one-foreign" });

    expect(await repository.deleteLive({ userId, tokenHash: "hash-one-a" })).toBe(1);
    expect(await repository.deleteLive({ userId, tokenHash: "hash-one-rotated" })).toBe(0);
    expect(await repository.deleteLive({ userId, tokenHash: "hash-one-foreign" })).toBe(0);
    expect(await repository.deleteAllForUser(userId)).toBe(2);
    expect(await repository.findByHash("hash-one-foreign")).not.toBeNull();
  });

  it("should serialise transactions of the same user", async () => {
    const userId = await createUser("lock");
    const order: string[] = [];
    const entered = deferred();
    const release = deferred();
    const first = repository.transaction(userId, async () => {
      order.push("first:start");
      entered.resolve();
      await release.promise;
      order.push("first:end");
    });
    await entered.promise;

    const second = repository.transaction(userId, async () => {
      order.push("second:start");
      order.push("second:end");
    });
    await sleep(RACE.holdMs);
    expect(order).toEqual(["first:start"]);
    release.resolve();

    await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "first:end", "second:start", "second:end"]);
  });

  it("should not block a transaction of another user", async () => {
    const userId = await createUser("lock-a");
    const otherId = await createUser("lock-b");
    const entered = deferred();
    const release = deferred();
    const holding = repository.transaction(userId, async () => {
      entered.resolve();
      await release.promise;
    });
    await entered.promise;

    await expect(repository.transaction(otherId, async () => "done")).resolves.toBe("done");

    release.resolve();
    await holding;
  });

  it("should make revoke-all wait for an open rotation of the same user and delete its new row", async () => {
    const userId = await createUser("revoke-race");
    const entered = deferred();
    const release = deferred();
    const rotating = repository.transaction(userId, async (writer) => {
      await writer.insert({ userId, tokenHash: "hash-race-new", expiresAt: new Date(Date.now() + TIME_MS.minute) });
      entered.resolve();
      await release.promise;
    });
    await entered.promise;

    const revoking = repository.deleteAllForUser(userId);
    await sleep(RACE.holdMs);
    release.resolve();

    await rotating;
    expect(await revoking).toBe(1);
    expect(await repository.findByHash("hash-race-new")).toBeNull();
  });

  it("should delete only the sessions of the user that expired strictly before the given instant", async () => {
    const userId = await createUser("exp");
    const otherId = await createUser("exp-other");
    const before = new Date();
    const past = new Date(before.getTime() - RACE.justPastMs);
    await insertSession({ userId, tokenHash: "hash-exp-old", expiresAt: past });
    await insertSession({ userId, tokenHash: "hash-exp-boundary", expiresAt: before });
    await insertSession({ userId, tokenHash: "hash-exp-live" });
    await insertSession({ userId: otherId, tokenHash: "hash-exp-foreign", expiresAt: past });

    expect(await repository.deleteExpired({ userId, before })).toBe(1);
    expect(await repository.findByHash("hash-exp-old")).toBeNull();
    expect(await repository.findByHash("hash-exp-boundary")).not.toBeNull();
    expect(await repository.findByHash("hash-exp-live")).not.toBeNull();
    expect(await repository.findByHash("hash-exp-foreign")).not.toBeNull();
  });
});
