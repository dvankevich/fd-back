import { BadRequestError, NotFoundError } from "../../../core/exceptions/errors.ts";
import logger from "../../../core/logger.ts";
import type { UsersListView } from "../domain/user.view.ts";
import { USERS_MESSAGE } from "../domain/users.messages.ts";
import type { FollowPair, FollowsRepository, UsersRepository } from "../domain/users.port.ts";

type FollowsServiceOptions = { follows: FollowsRepository; users: UsersRepository };

export class FollowsService {
  private readonly follows: FollowsRepository;
  private readonly users: UsersRepository;

  constructor({ follows, users }: FollowsServiceOptions) {
    this.follows = follows;
    this.users = users;
  }

  async listFollowers(userId: string): Promise<UsersListView> {
    await this.assertUserExists(userId);

    return { users: await this.follows.listFollowers(userId) };
  }

  async listFollowing(userId: string): Promise<UsersListView> {
    return { users: await this.follows.listFollowing(userId) };
  }

  async follow({ followerId, followingId }: FollowPair): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestError(USERS_MESSAGE.followSelf);
    }

    await this.assertUserExists(followingId);

    if (await this.follows.exists({ followerId, followingId })) {
      throw new BadRequestError(USERS_MESSAGE.alreadyFollowing);
    }

    await this.follows.create({ followerId, followingId });

    logger.info({ followerId, followingId }, "User followed");
  }

  async unfollow({ followerId, followingId }: FollowPair): Promise<void> {
    const deleted = await this.follows.delete({ followerId, followingId });

    if (deleted === 0) {
      throw new NotFoundError(USERS_MESSAGE.notFollowing);
    }

    logger.info({ followerId, followingId }, "User unfollowed");
  }

  private async assertUserExists(userId: string): Promise<void> {
    if (!(await this.users.exists(userId))) {
      throw new NotFoundError(USERS_MESSAGE.userNotFound);
    }
  }
}
