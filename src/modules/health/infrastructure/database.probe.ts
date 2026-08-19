import type { PrismaClient } from "../../../core/database/prisma.ts";
import type { DatabaseProbe } from "../domain/health.port.ts";

export class PrismaDatabaseProbe implements DatabaseProbe {
  constructor(private readonly client: PrismaClient) {}

  async ping(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }
}
