import { isUniqueViolation } from "../../../core/database/prisma-errors.ts";
import type { Prisma, PrismaClient } from "../../../core/database/prisma.ts";
import { ConflictError } from "../../../core/exceptions/errors.ts";
import type { Nullable } from "../../../core/types/common.ts";
import { AUTH_MESSAGE } from "../domain/auth.messages.ts";
import type { AuthAccount, AuthUser, AuthUserRepository, NewAccount } from "../domain/auth.ports.ts";

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const satisfies Prisma.UserSelect;

const rethrowEmailTaken = (err: unknown): never => {
  if (isUniqueViolation(err)) {
    throw new ConflictError(AUTH_MESSAGE.emailTaken);
  }
  throw err;
};

export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(private readonly client: PrismaClient) {}

  create(account: NewAccount): Promise<AuthUser> {
    return this.client.user.create({ data: account, select: authUserSelect }).catch(rethrowEmailTaken);
  }

  findAccountByEmail(email: string): Promise<Nullable<AuthAccount>> {
    return this.client.user.findUnique({
      where: { email },
      select: { ...authUserSelect, password: true },
    });
  }

  async exists(userId: string): Promise<boolean> {
    const user = await this.client.user.findUnique({ where: { id: userId }, select: { id: true } });
    return user !== null;
  }
}
