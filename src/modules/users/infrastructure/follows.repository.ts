import type { Prisma, PrismaClient } from "../../../core/database/prisma.ts";
import type { FollowPair, FollowsRepository } from "../domain/users.port.ts";
import type { UserListItemView } from "../domain/user.view.ts";

const userListItemSelect = { id: true, name: true, avatar: true } as const satisfies Prisma.UserSelect;

const followKey = ({ followerId, followingId }: FollowPair) => ({
  followerId_followingId: { followerId, followingId },
});

export class PrismaFollowsRepository implements FollowsRepository {
  constructor(private readonly client: PrismaClient) {}

  async listFollowers(userId: string): Promise<UserListItemView[]> {
    const follows = await this.client.follow.findMany({
      where: { followingId: userId },
      select: { follower: { select: userListItemSelect } },
      orderBy: { createdAt: "desc" },
    });
    return follows.map((follow) => follow.follower);
  }

  async listFollowing(userId: string): Promise<UserListItemView[]> {
    const follows = await this.client.follow.findMany({
      where: { followerId: userId },
      select: { following: { select: userListItemSelect } },
      orderBy: { createdAt: "desc" },
    });
    return follows.map((follow) => follow.following);
  }

  async exists(pair: FollowPair): Promise<boolean> {
    const follow = await this.client.follow.findUnique({ where: followKey(pair) });
    return follow !== null;
  }

  async create({ followerId, followingId }: FollowPair): Promise<void> {
    await this.client.follow.create({ data: { followerId, followingId } });
  }

  async delete({ followerId, followingId }: FollowPair): Promise<number> {
    const { count } = await this.client.follow.deleteMany({ where: { followerId, followingId } });
    return count;
  }
}
