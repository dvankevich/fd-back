import type { CurrentUserRow, PublicUserRow } from "./users.port.ts";
import type { CurrentUserView, PublicUserView } from "./user.view.ts";

export const toCurrentUserView = ({ id, name, email, avatar, _count }: CurrentUserRow): CurrentUserView => ({
  id,
  name,
  email,
  avatar,
  createdRecipesCount: _count.recipes,
  favoritesCount: _count.favorites,
  followersCount: _count.followers,
  followingCount: _count.following,
});

export const toPublicUserView = ({ id, name, email, avatar, _count }: PublicUserRow): PublicUserView => ({
  id,
  name,
  email,
  avatar,
  createdRecipesCount: _count.recipes,
  followersCount: _count.followers,
});
