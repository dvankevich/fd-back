import type { PrismaClient } from "../../generated/prisma/client.ts";
import type { UserLookup } from "./auth.ports.ts";

export class PrismaUserLookup implements UserLookup {
  constructor(private readonly client: PrismaClient) {}

  async exists(userId: string): Promise<boolean> {
    const user = await this.client.user.findUnique({ where: { id: userId }, select: { id: true } });
    return user !== null;
  }
}
