import { describe, expect, it } from "vitest";
import type { Nullable } from "../../../core/types/common.ts";
import type {
  CurrentUserRow,
  FollowPair,
  FollowsRepository,
  PublicUserRow,
  UsersRepository,
} from "../domain/users.port.ts";
import type { UserListItemView } from "../domain/user.view.ts";
import { FollowsService } from "./follows.service.ts";

const follower = "user-1";
const following = "user-2";

const listItem: UserListItemView = { id: following, name: "Ivan", avatar: null };

class FakeUsers implements UsersRepository {
  constructor(private readonly known: string[] = [follower, following]) {}

  async findCurrent(): Promise<Nullable<CurrentUserRow>> {
    return null;
  }

  async findPublic(): Promise<Nullable<PublicUserRow>> {
    return null;
  }

  async exists(userId: string): Promise<boolean> {
    return this.known.includes(userId);
  }

  async updateAvatar(): Promise<Nullable<string>> {
    return null;
  }
}

class FakeFollows implements FollowsRepository {
  readonly pairs: FollowPair[] = [];

  constructor(existing: FollowPair[] = []) {
    this.pairs.push(...existing);
  }

  async listFollowers(): Promise<UserListItemView[]> {
    return [listItem];
  }

  async listFollowing(): Promise<UserListItemView[]> {
    return [listItem];
  }

  async exists(pair: FollowPair): Promise<boolean> {
    return this.pairs.some((row) => row.followerId === pair.followerId && row.followingId === pair.followingId);
  }

  async create(pair: FollowPair): Promise<void> {
    this.pairs.push(pair);
  }

  async delete(pair: FollowPair): Promise<number> {
    const before = this.pairs.length;
    const kept = this.pairs.filter(
      (row) => row.followerId !== pair.followerId || row.followingId !== pair.followingId,
    );
    this.pairs.length = 0;
    this.pairs.push(...kept);
    return before - kept.length;
  }
}

const createService = (options: { users?: UsersRepository; follows?: FollowsRepository } = {}) =>
  new FollowsService({
    users: options.users ?? new FakeUsers(),
    follows: options.follows ?? new FakeFollows(),
  });

describe("FollowsService", () => {
  it("should list followers of a known user", async () => {
    await expect(createService().listFollowers(following)).resolves.toEqual({ users: [listItem] });
  });

  it("should answer 404 when listing followers of an unknown user", async () => {
    await expect(createService().listFollowers("ghost")).rejects.toMatchObject({
      status: 404,
      message: "User not found",
    });
  });

  it("should list who the current user follows without checking the user again", async () => {
    const service = createService({ users: new FakeUsers([]) });

    await expect(service.listFollowing(follower)).resolves.toEqual({ users: [listItem] });
  });

  it("should refuse to follow yourself", async () => {
    await expect(createService().follow({ followerId: follower, followingId: follower })).rejects.toMatchObject({
      status: 400,
      message: "You cannot follow yourself",
    });
  });

  it("should refuse to follow an unknown user", async () => {
    await expect(createService().follow({ followerId: follower, followingId: "ghost" })).rejects.toMatchObject({
      status: 404,
      message: "User not found",
    });
  });

  it("should refuse a second follow of the same user", async () => {
    const follows = new FakeFollows([{ followerId: follower, followingId: following }]);

    await expect(createService({ follows }).follow({ followerId: follower, followingId: following })).rejects.toMatchObject({
      status: 400,
      message: "You are already following this user",
    });
  });

  it("should store the follow", async () => {
    const follows = new FakeFollows();

    await createService({ follows }).follow({ followerId: follower, followingId: following });

    expect(follows.pairs).toEqual([{ followerId: follower, followingId: following }]);
  });

  it("should answer 404 when unfollowing someone you do not follow", async () => {
    await expect(createService().unfollow({ followerId: follower, followingId: following })).rejects.toMatchObject({
      status: 404,
      message: "You are not following this user",
    });
  });

  it("should remove the follow", async () => {
    const follows = new FakeFollows([{ followerId: follower, followingId: following }]);

    await createService({ follows }).unfollow({ followerId: follower, followingId: following });

    expect(follows.pairs).toEqual([]);
  });
});
