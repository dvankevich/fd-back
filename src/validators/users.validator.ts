import { z } from "zod";
import { registry } from "../openapi.ts";

// ====================== Params ======================

export const UserIdParamSchema = registry.register(
  "UserIdParam",
  z.object({
    id: z.string().min(1).openapi({ example: "64c8d958249fae54bae90bb9" }),
  }),
);

// ====================== Response schemas ======================

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
  }),
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
  }),
);

export const UserListItemSchema = registry.register(
  "UserListItem",
  z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().nullable(),
  }),
);

export const UsersListSchema = registry.register(
  "UsersList",
  z.object({
    users: z.array(UserListItemSchema),
  }),
);

// ====================== Types ======================

export type UserIdParam = z.infer<typeof UserIdParamSchema>;

// ====================== Paths ======================

registry.registerPath({
  method: "get",
  path: "/api/users/me",
  tags: ["Users"],
  summary: "Get current user profile with counts",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: { "application/json": { schema: CurrentUserSchema } },
    },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}",
  tags: ["Users"],
  summary: "Get another user profile",
  security: [{ bearerAuth: [] }],
  request: {
    params: UserIdParamSchema,
  },
  responses: {
    200: {
      description: "User profile",
      content: { "application/json": { schema: PublicUserSchema } },
    },
    401: { description: "Unauthorized" },
    404: { description: "User not found" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/avatar",
  tags: ["Users"],
  summary: "Update current user avatar",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            avatar: z.any().openapi({ type: "string", format: "binary" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Avatar updated",
      content: {
        "application/json": {
          schema: z.object({
            avatar: z.string().openapi({
              example: "https://res.cloudinary.com/.../avatar.jpg",
            }),
          }),
        },
      },
    },
    400: { description: "No file uploaded" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/followers",
  tags: ["Users"],
  summary: "Get user followers",
  security: [{ bearerAuth: [] }],
  request: { params: UserIdParamSchema },
  responses: {
    200: {
      description: "List of followers",
      content: { "application/json": { schema: UsersListSchema } },
    },
    401: { description: "Unauthorized" },
    404: { description: "User not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/following",
  tags: ["Users"],
  summary: "Get users that current user is following",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of following",
      content: { "application/json": { schema: UsersListSchema } },
    },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/{id}/follow",
  tags: ["Users"],
  summary: "Follow a user",
  security: [{ bearerAuth: [] }],
  request: { params: UserIdParamSchema },
  responses: {
    201: { description: "Successfully followed" },
    400: { description: "Cannot follow yourself / already following" },
    401: { description: "Unauthorized" },
    404: { description: "User not found" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/users/{id}/follow",
  tags: ["Users"],
  summary: "Unfollow a user",
  security: [{ bearerAuth: [] }],
  request: { params: UserIdParamSchema },
  responses: {
    204: { description: "Successfully unfollowed" },
    401: { description: "Unauthorized" },
    404: { description: "Not following / user not found" },
  },
});
