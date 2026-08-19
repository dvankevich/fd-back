import { z } from "zod";
import { TOTAL_COUNT_HEADER } from "../../../core/http/paginated-response.ts";
import { UPLOAD_ERROR, UPLOAD_LIMITS } from "../../../core/http/upload.limits.ts";
import { VALIDATION_MESSAGE } from "../../../core/http/validate.middleware.ts";
import { registry } from "../../../core/openapi/registry.ts";
import {
  errorExamples,
  errorResponse,
  jsonResponse,
  validationErrorExamples,
} from "../../../core/openapi/responses.ts";
import { unauthorizedResponse } from "../../auth/index.ts";
import { MEDIA_MESSAGE } from "../../media/index.ts";
import { RECIPES_MESSAGE } from "../domain/recipes.messages.ts";
import { CreateRecipeFormSchema } from "./input-dto/create-recipe.input-dto.ts";
import { PaginationQuerySchema } from "./input-dto/pagination-query.input-dto.ts";
import { RecipeIdParamSchema } from "./input-dto/recipe-id.param.input-dto.ts";
import { RecipesQuerySchema } from "./input-dto/recipes-query.input-dto.ts";
import {
  RECIPE_EXAMPLE,
  RECIPE_VALIDATION_DETAILS_EXAMPLE,
  TOTAL_COUNT_EXAMPLE,
} from "./recipes.examples.ts";
import { MessageSchema } from "./view-dto/message.view-dto.ts";
import {
  PaginatedPopularRecipesSchema,
  PaginatedRecipesSchema,
} from "./view-dto/paginated-recipes.view-dto.ts";
import { CreatedRecipeSchema, RecipeDetailSchema } from "./view-dto/recipe.view-dto.ts";

const OPTIONAL_AUTH: { security: Record<string, string[]>[]; note: string } = {
  security: [{}, { bearerAuth: [] }],
  note:
    "The access token is optional: with one, isFavorite reflects the caller's favorites, " +
    "without one it is false and the request still succeeds.",
};

const totalCountHeaders = (example: string) => ({
  [TOTAL_COUNT_HEADER]: z
    .string()
    .openapi({ description: "Number of recipes matching the request", example }),
});

const VARY_HEADERS = {
  Vary: z.string().openapi({
    description: "The body depends on the access token",
    example: "Origin, Authorization",
  }),
};

const RECIPES_RESPONSE = {
  invalidQuery: errorResponse({
    description: "Invalid query parameters",
    error: VALIDATION_MESSAGE.query,
  }),
  invalidQueryForGuest: {
    ...errorResponse({
      description: "Invalid query parameters",
      error: VALIDATION_MESSAGE.query,
    }),
    headers: z.object(VARY_HEADERS),
  },
  unauthorized: unauthorizedResponse,
  notFound: errorResponse({ description: "Recipe not found", error: RECIPES_MESSAGE.notFound }),
} as const;

// --- Public ---

registry.registerPath({
  method: "get",
  path: "/api/recipes",
  tags: ["Recipes"],
  summary: "Search recipes",
  description:
    "Search recipes by category, area and/or ingredient. " +
    "category and area match by name, case-insensitive; ingredient matches an id or a name. " +
    "Supports pagination. " +
    OPTIONAL_AUTH.note,
  security: OPTIONAL_AUTH.security,
  request: {
    query: RecipesQuerySchema,
  },
  responses: {
    200: {
      ...jsonResponse({
        description: "Paginated list of recipes",
        schema: PaginatedRecipesSchema,
        example: RECIPE_EXAMPLE.list,
      }),
      headers: z.object({ ...totalCountHeaders(TOTAL_COUNT_EXAMPLE.search), ...VARY_HEADERS }),
    },
    400: RECIPES_RESPONSE.invalidQueryForGuest,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/popular",
  tags: ["Recipes"],
  summary: "Get popular recipes",
  description:
    "Returns all recipes sorted by favorites count (descending), with pagination. " +
    OPTIONAL_AUTH.note,
  security: OPTIONAL_AUTH.security,
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      ...jsonResponse({
        description: "Paginated list of popular recipes",
        schema: PaginatedPopularRecipesSchema,
        example: RECIPE_EXAMPLE.popular,
      }),
      headers: z.object({ ...totalCountHeaders(TOTAL_COUNT_EXAMPLE.search), ...VARY_HEADERS }),
    },
    400: RECIPES_RESPONSE.invalidQueryForGuest,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/{id}",
  tags: ["Recipes"],
  summary: "Get recipe by id",
  description: "Returns detailed information about a recipe. " + OPTIONAL_AUTH.note,
  security: OPTIONAL_AUTH.security,
  request: {
    params: RecipeIdParamSchema,
  },
  responses: {
    200: {
      ...jsonResponse({
        description: "Recipe details",
        schema: RecipeDetailSchema,
        example: RECIPE_EXAMPLE.detail,
      }),
      headers: z.object(VARY_HEADERS),
    },
    404: { ...RECIPES_RESPONSE.notFound, headers: z.object(VARY_HEADERS) },
  },
});

// --- Private: CRUD ---

registry.registerPath({
  method: "post",
  path: "/api/recipes",
  tags: ["Recipes"],
  summary: "Create own recipe",
  description:
    "Creates a recipe with required thumb image. " +
    "Content-Type: multipart/form-data. " +
    "category and area are **names** (e.g. \"Dessert\", \"British\"), not ids. " +
    "ingredients must be a JSON string: [{\"id\":\"...\",\"measure\":\"175g\"}]. " +
    `The image is required, up to ${UPLOAD_LIMITS.fileSizeMb}MB, image/* only. ` +
    "A freshly created recipe cannot be a favorite yet, so the response carries no isFavorite.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "multipart/form-data": { schema: CreateRecipeFormSchema },
      },
    },
  },
  responses: {
    201: jsonResponse({
      description: "Recipe created",
      schema: CreatedRecipeSchema,
      example: RECIPE_EXAMPLE.created,
    }),
    400: errorExamples({
      description: "Missing or rejected image, or a reference the API does not know",
      errors: {
        missingThumb: RECIPES_MESSAGE.thumbRequired,
        imageTooLarge: UPLOAD_ERROR.tooLarge,
        notAnImage: UPLOAD_ERROR.notAnImage,
        unknownCategory: RECIPES_MESSAGE.categoryNotFound,
        unknownArea: RECIPES_MESSAGE.areaNotFound,
        unknownIngredients: RECIPES_MESSAGE.unknownIngredients,
        rejectedByStorage: MEDIA_MESSAGE.invalidImage,
      },
    }),
    401: RECIPES_RESPONSE.unauthorized,
    422: validationErrorExamples({
      description: "Validation error",
      details: {
        fields: RECIPE_VALIDATION_DETAILS_EXAMPLE.create,
        brokenIngredientsJson: RECIPE_VALIDATION_DETAILS_EXAMPLE.brokenIngredientsJson,
      },
    }),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/recipes/{id}",
  tags: ["Recipes"],
  summary: "Delete own recipe",
  description: "Deletes a recipe. Only the owner can delete it.",
  security: [{ bearerAuth: [] }],
  request: {
    params: RecipeIdParamSchema,
  },
  responses: {
    204: {
      description: "Recipe deleted",
    },
    401: RECIPES_RESPONSE.unauthorized,
    403: errorResponse({
      description: "Not the owner of the recipe",
      error: RECIPES_MESSAGE.notOwner,
    }),
    404: RECIPES_RESPONSE.notFound,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/own",
  tags: ["Recipes"],
  summary: "Get own recipes",
  description:
    "Returns paginated list of recipes created by the authenticated user. " +
    "isFavorite tells whether the caller has that own recipe in favorites.",
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      ...jsonResponse({
        description: "Paginated list of own recipes",
        schema: PaginatedRecipesSchema,
        example: RECIPE_EXAMPLE.own,
      }),
      headers: z.object(totalCountHeaders(TOTAL_COUNT_EXAMPLE.own)),
    },
    400: RECIPES_RESPONSE.invalidQuery,
    401: RECIPES_RESPONSE.unauthorized,
  },
});

// --- Private: Favorites ---

registry.registerPath({
  method: "get",
  path: "/api/recipes/favorites",
  tags: ["Recipes"],
  summary: "Get favorite recipes",
  description:
    "Returns paginated list of recipes favorited by the authenticated user. " +
    "isFavorite is always true here.",
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      ...jsonResponse({
        description: "Paginated list of favorite recipes",
        schema: PaginatedRecipesSchema,
        example: RECIPE_EXAMPLE.favorites,
      }),
      headers: z.object(totalCountHeaders(TOTAL_COUNT_EXAMPLE.favorites)),
    },
    400: RECIPES_RESPONSE.invalidQuery,
    401: RECIPES_RESPONSE.unauthorized,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/recipes/{id}/favorite",
  tags: ["Recipes"],
  summary: "Add recipe to favorites",
  description: "Adds a recipe to the authenticated user's favorites.",
  security: [{ bearerAuth: [] }],
  request: {
    params: RecipeIdParamSchema,
  },
  responses: {
    201: jsonResponse({
      description: "Added to favorites",
      schema: MessageSchema,
      example: RECIPE_EXAMPLE.addedToFavorites,
    }),
    401: RECIPES_RESPONSE.unauthorized,
    404: RECIPES_RESPONSE.notFound,
    409: errorResponse({
      description: "Recipe already in favorites",
      error: RECIPES_MESSAGE.alreadyFavorite,
    }),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/recipes/{id}/favorite",
  tags: ["Recipes"],
  summary: "Remove recipe from favorites",
  description: "Removes a recipe from the authenticated user's favorites.",
  security: [{ bearerAuth: [] }],
  request: {
    params: RecipeIdParamSchema,
  },
  responses: {
    204: {
      description: "Removed from favorites",
    },
    401: RECIPES_RESPONSE.unauthorized,
    404: errorResponse({
      description: "Recipe not in the favorites of the caller",
      error: RECIPES_MESSAGE.notInFavorites,
    }),
  },
});
