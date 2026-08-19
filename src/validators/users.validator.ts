import { z } from "zod";
import { registry } from "../core/openapi/registry.ts";
import { ErrorSchema } from "../core/openapi/responses.ts";

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
    id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
    name: z.string().openapi({ example: "Olena Kravets" }),
    avatar: z.string().nullable().openapi({ example: null }),
  }),
);

export const UsersListSchema = registry.register(
  "UsersList",
  z.object({
    users: z.array(UserListItemSchema),
  }),
);

export const FollowMessageSchema = registry.register(
  "FollowMessage",
  z.object({
    message: z.string().openapi({ example: "Successfully followed" }),
  }),
);

export const AvatarResponseSchema = registry.register(
  "AvatarResponse",
  z.object({
    avatar: z.string().openapi({
      example: "https://res.cloudinary.com/.../avatar.jpg",
    }),
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
  description:
    "Returns the authenticated user profile including createdRecipesCount, favoritesCount, followersCount and followingCount.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: { "application/json": { schema: CurrentUserSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}",
  tags: ["Users"],
  summary: "Get another user profile",
  description:
    "Returns a public profile. Includes createdRecipesCount and followersCount. Does not include favoritesCount or followingCount.",
  security: [{ bearerAuth: [] }],
  request: {
    params: UserIdParamSchema,
  },
  responses: {
    200: {
      description: "User profile",
      content: { "application/json": { schema: PublicUserSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "User not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/avatar",
  tags: ["Users"],
  summary: "Update current user avatar",
  description:
    "Uploads a new avatar image (multipart field name: avatar). Max size 5MB, image/* only. Returns { avatar: url }.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            avatar: z.any().openapi({
              type: "string",
              format: "binary",
              description: "Image file (JPEG, PNG, WebP, etc.)",
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Avatar updated",
      content: { "application/json": { schema: AvatarResponseSchema } },
    },
    400: {
      description: "No file uploaded / invalid image / file too large",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/followers",
  tags: ["Users"],
  summary: "Get user followers",
  description:
    "Returns users who follow the given profile. Each item has id, name, avatar only.",
  security: [{ bearerAuth: [] }],
  request: { params: UserIdParamSchema },
  responses: {
    200: {
      description: "List of followers",
      content: { "application/json": { schema: UsersListSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "User not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/following",
  tags: ["Users"],
  summary: "Get users that current user is following",
  description:
    "Returns users followed by the authenticated user. Each item has id, name, avatar only.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of following",
      content: { "application/json": { schema: UsersListSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/{id}/follow",
  tags: ["Users"],
  summary: "Follow a user",
  description:
    "Follow another user. Returns 400 if you try to follow yourself or if already following.",
  security: [{ bearerAuth: [] }],
  request: { params: UserIdParamSchema },
  responses: {
    201: {
      description: "Successfully followed",
      content: { "application/json": { schema: FollowMessageSchema } },
    },
    400: {
      description: "Cannot follow yourself / already following",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "User not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/users/{id}/follow",
  tags: ["Users"],
  summary: "Unfollow a user",
  description:
    "Unfollow a user. Returns 404 if you are not following this user.",
  security: [{ bearerAuth: [] }],
  request: { params: UserIdParamSchema },
  responses: {
    204: {
      description: "Successfully unfollowed",
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Not following this user",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
