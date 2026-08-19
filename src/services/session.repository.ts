import { Prisma, type PrismaClient } from "../../generated/prisma/client.ts";
import { TIME_MS } from "../core/time.ts";
import type { Nullable } from "../core/types/common.ts";
import type { NewSession, SessionRepository, SessionWriter, StoredSession } from "./auth.ports.ts";

type SessionDelegate = Pick<Prisma.TransactionClient, "refreshToken">;

const TRANSACTION_OPTIONS = {
  maxWait: 2 * TIME_MS.second,
  timeout: 5 * TIME_MS.second,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

const storedSessionSelect = {
  id: true,
  userId: true,
  expiresAt: true,
  rotatedAt: true,
} as const satisfies Prisma.RefreshTokenSelect;

class PrismaSessionWriter implements SessionWriter {
  constructor(private readonly client: SessionDelegate) {}

  async insert({ userId, tokenHash, expiresAt }: NewSession): Promise<void> {
    await this.client.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async markRotated({ id, at }: { id: string; at: Date }): Promise<boolean> {
    const { count } = await this.client.refreshToken.updateMany({
      where: { id, rotatedAt: null },
      data: { rotatedAt: at },
    });
    return count === 1;
  }

  async deleteAllForUser(userId: string): Promise<number> {
    const { count } = await this.client.refreshToken.deleteMany({ where: { userId } });
    return count;
  }
}

export class PrismaSessionRepository implements SessionRepository {
  private readonly writer: SessionWriter;

  constructor(private readonly client: PrismaClient) {
    this.writer = new PrismaSessionWriter(client);
  }

  insert(session: NewSession): Promise<void> {
    return this.writer.insert(session);
  }

  deleteAllForUser(userId: string): Promise<number> {
    return this.transaction(userId, (writer) => writer.deleteAllForUser(userId));
  }

  findByHash(tokenHash: string): Promise<Nullable<StoredSession>> {
    return this.client.refreshToken.findUnique({ where: { tokenHash }, select: storedSessionSelect });
  }

  async deleteLive({ userId, tokenHash }: { userId: string; tokenHash: string }): Promise<number> {
    const { count } = await this.client.refreshToken.deleteMany({ where: { userId, tokenHash, rotatedAt: null } });
    return count;
  }

  async deleteExpired({ userId, before }: { userId: string; before: Date }): Promise<number> {
    const { count } = await this.client.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: before } },
    });
    return count;
  }

  transaction<T>(userId: string, run: (writer: SessionWriter) => Promise<T>): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      return run(new PrismaSessionWriter(tx));
    }, TRANSACTION_OPTIONS);
  }
}
