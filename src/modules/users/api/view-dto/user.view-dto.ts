import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type {
  CurrentUserView,
  PublicUserView,
  UserListItemView,
  UsersListView,
} from "../../domain/user.view.ts";

export const CurrentUserSchema = registry.register(
  "CurrentUser",
  z.object({
    id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
    name: z.string().openapi({ example: "Olena Kravets" }),
    email: z.email().openapi({ example: "olena@example.com" }),
    avatar: z.string().nullable().openapi({
      example: "https://res.cloudinary.com/.../avatar.jpg",
    }),
    createdRecipesCount: z.number().int().nonnegative().openapi({ example: 12 }),
    favoritesCount: z.number().int().nonnegative().openapi({ example: 5 }),
    followersCount: z.number().int().nonnegative().openapi({ example: 34 }),
    followingCount: z.number().int().nonnegative().openapi({ example: 18 }),
  }) satisfies z.ZodType<CurrentUserView>,
);

export const PublicUserSchema = registry.register(
  "PublicUser",
  z.object({
    id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
    name: z.string().openapi({ example: "Olena Kravets" }),
    email: z.email().openapi({ example: "olena@example.com" }),
    avatar: z.string().nullable().openapi({
      example: "https://res.cloudinary.com/.../avatar.jpg",
    }),
    createdRecipesCount: z.number().int().nonnegative().openapi({ example: 12 }),
    followersCount: z.number().int().nonnegative().openapi({ example: 34 }),
  }) satisfies z.ZodType<PublicUserView>,
);

export const UserListItemSchema = registry.register(
  "UserListItem",
  z.object({
    id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
    name: z.string().openapi({ example: "Olena Kravets" }),
    avatar: z.string().nullable().openapi({ example: null }),
  }) satisfies z.ZodType<UserListItemView>,
);

export const UsersListSchema = registry.register(
  "UsersList",
  z.object({
    users: z.array(UserListItemSchema),
  }) satisfies z.ZodType<UsersListView>,
);
