import { z } from "zod";
import { registry } from "../../../core/openapi/registry.ts";
import { errorExamples, errorResponse, jsonResponse } from "../../../core/openapi/responses.ts";
import { UPLOAD_ERROR, UPLOAD_LIMITS } from "../../../core/http/upload.limits.ts";
import { unauthorizedResponse } from "../../auth/index.ts";
import { MEDIA_MESSAGE } from "../../media/index.ts";
import { USERS_MESSAGE } from "../domain/users.messages.ts";
import { UserIdParamSchema } from "./input-dto/user-id.param.input-dto.ts";
import { AvatarResponseSchema } from "./view-dto/avatar.view-dto.ts";
import { FollowMessageSchema } from "./view-dto/follow-message.view-dto.ts";
import { CurrentUserSchema, PublicUserSchema, UsersListSchema } from "./view-dto/user.view-dto.ts";
import { PaginationQuerySchema } from "../../recipes/api/input-dto/pagination-query.input-dto.ts";
import { PaginatedRecipesSchema } from "../../recipes/api/view-dto/paginated-recipes.view-dto.ts";

const USERS_RESPONSE = {
  unauthorized: unauthorizedResponse,
  userNotFound: errorResponse({ description: "User not found", error: USERS_MESSAGE.userNotFound }),
} as const;

registry.registerPath({
  method: "get",
  path: "/api/users/me",
  tags: ["Users"],
  summary: "Get current user profile with counts",
  description:
    "Returns the authenticated user profile including createdRecipesCount, favoritesCount, followersCount and followingCount.",
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonResponse({ description: "Current user profile", schema: CurrentUserSchema }),
    401: USERS_RESPONSE.unauthorized,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/recipes",
  tags: ["Users"],
  summary: "List recipes of a user",
  description:
    "Protected. Returns paginated recipes created by the given user. " +
    "isFavorite is relative to the authenticated viewer, not the profile owner.",
  security: [{ bearerAuth: [] }],
  request: {
    params: UserIdParamSchema,
    query: PaginationQuerySchema,
  },
  responses: {
    200: jsonResponse({
      description: "Paginated recipes of the user",
      schema: PaginatedRecipesSchema,
    }),
    401: USERS_RESPONSE.unauthorized,
    404: USERS_RESPONSE.userNotFound,
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
    200: jsonResponse({ description: "User profile", schema: PublicUserSchema }),
    401: USERS_RESPONSE.unauthorized,
    404: USERS_RESPONSE.userNotFound,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/avatar",
  tags: ["Users"],
  summary: "Update current user avatar",
  description:
    "Uploads a new avatar image (multipart field name: avatar). " +
    `Max size ${UPLOAD_LIMITS.fileSizeMb}MB, image/* only. Returns { avatar: url }.`,
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: z.object({
            avatar: z.string().openapi({
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
    200: jsonResponse({ description: "Avatar updated", schema: AvatarResponseSchema }),
    400: errorExamples({
      description: "Missing or rejected image",
      errors: {
        missingFile: USERS_MESSAGE.avatarRequired,
        imageTooLarge: UPLOAD_ERROR.tooLarge,
        notAnImage: UPLOAD_ERROR.notAnImage,
        rejectedByStorage: MEDIA_MESSAGE.invalidImage,
      },
    }),
    401: USERS_RESPONSE.unauthorized,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}/followers",
  tags: ["Users"],
  summary: "Get user followers",
  description:
    "Returns users who follow the given profile. Each item has id, name, avatar only. The authenticated viewer is omitted from the list when they follow this user, so the UI does not show the current user in another profile’s followers.",
  security: [{ bearerAuth: [] }],
  request: { params: UserIdParamSchema },
  responses: {
    200: jsonResponse({ description: "List of followers", schema: UsersListSchema }),
    401: USERS_RESPONSE.unauthorized,
    404: USERS_RESPONSE.userNotFound,
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
    200: jsonResponse({ description: "List of following", schema: UsersListSchema }),
    401: USERS_RESPONSE.unauthorized,
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
    201: jsonResponse({ description: "Successfully followed", schema: FollowMessageSchema }),
    400: errorExamples({
      description: "Cannot follow yourself, or already following",
      errors: { followSelf: USERS_MESSAGE.followSelf, alreadyFollowing: USERS_MESSAGE.alreadyFollowing },
    }),
    401: USERS_RESPONSE.unauthorized,
    404: USERS_RESPONSE.userNotFound,
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
    401: USERS_RESPONSE.unauthorized,
    404: errorResponse({
      description: "Not following this user",
      error: USERS_MESSAGE.notFollowing,
    }),
  },
});
