import type { Nullable } from "../../../core/types/common.ts";
import type { UserListItemView } from "./user.view.ts";

export type UserCountsRow = {
  recipes: number;
  favorites: number;
  followers: number;
  following: number;
};

export type CurrentUserRow = {
  id: string;
  name: string;
  email: string;
  avatar: Nullable<string>;
  _count: UserCountsRow;
};

export type PublicUserRow = {
  id: string;
  name: string;
  email: string;
  avatar: Nullable<string>;
  _count: Pick<UserCountsRow, "recipes" | "followers">;
};

export type FollowPair = { followerId: string; followingId: string };

export interface UsersRepository {
  findCurrent(userId: string): Promise<Nullable<CurrentUserRow>>;
  findPublic(userId: string): Promise<Nullable<PublicUserRow>>;
  exists(userId: string): Promise<boolean>;
  updateAvatar(input: { userId: string; avatar: string }): Promise<Nullable<string>>;
}

export interface FollowsRepository {
  listFollowers(userId: string): Promise<UserListItemView[]>;
  listFollowing(userId: string): Promise<UserListItemView[]>;
  exists(pair: FollowPair): Promise<boolean>;
  create(pair: FollowPair): Promise<void>;
  delete(pair: FollowPair): Promise<number>;
}
