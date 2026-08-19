import type { Prisma, PrismaClient } from "../../../core/database/prisma.ts";
import type { Nullable } from "../../../core/types/common.ts";
import type { CurrentUserRow, PublicUserRow, UsersRepository } from "../domain/users.port.ts";

const currentUserSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  _count: {
    select: { recipes: true, favorites: true, followers: true, following: true },
  },
} as const satisfies Prisma.UserSelect;

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  _count: {
    select: { recipes: true, followers: true },
  },
} as const satisfies Prisma.UserSelect;

export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly client: PrismaClient) {}

  findCurrent(userId: string): Promise<Nullable<CurrentUserRow>> {
    return this.client.user.findUnique({ where: { id: userId }, select: currentUserSelect });
  }

  findPublic(userId: string): Promise<Nullable<PublicUserRow>> {
    return this.client.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  }

  async exists(userId: string): Promise<boolean> {
    const user = await this.client.user.findUnique({ where: { id: userId }, select: { id: true } });
    return user !== null;
  }

  async updateAvatar({ userId, avatar }: { userId: string; avatar: string }): Promise<Nullable<string>> {
    const updated = await this.client.user.update({
      where: { id: userId },
      data: { avatar },
      select: { avatar: true },
    });
    return updated.avatar;
  }
}
