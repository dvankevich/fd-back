import type { Nullable } from "../../../core/types/common.ts";

export type CurrentUserView = {
  id: string;
  name: string;
  email: string;
  avatar: Nullable<string>;
  createdRecipesCount: number;
  favoritesCount: number;
  followersCount: number;
  followingCount: number;
};

export type PublicUserView = {
  id: string;
  name: string;
  email: string;
  avatar: Nullable<string>;
  createdRecipesCount: number;
  followersCount: number;
};

export type UserListItemView = {
  id: string;
  name: string;
  avatar: Nullable<string>;
};

export type UsersListView = { users: UserListItemView[] };

export type AvatarView = { avatar: string };

export type MessageView = { message: string };
