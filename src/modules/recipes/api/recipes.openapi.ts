import { z } from "zod";
import { registry } from "../../../core/openapi/registry.ts";
import { ErrorSchema, ValidationErrorSchema } from "../../../core/openapi/responses.ts";
import { CreateRecipeSchema } from "./input-dto/create-recipe.input-dto.ts";
import { PaginationQuerySchema } from "./input-dto/pagination-query.input-dto.ts";
import { RecipeIdParamSchema } from "./input-dto/recipe-id.param.input-dto.ts";
import { RecipesQuerySchema } from "./input-dto/recipes-query.input-dto.ts";
import { MessageSchema } from "./view-dto/message.view-dto.ts";
import { PaginatedRecipesSchema } from "./view-dto/paginated-recipes.view-dto.ts";
import {
  CreatedRecipeSchema,
  PopularRecipeSchema,
  RecipeDetailSchema,
} from "./view-dto/recipe.view-dto.ts";

// --- Public ---

registry.registerPath({
  method: "get",
  path: "/api/recipes",
  tags: ["Recipes"],
  summary: "Search recipes",
  description:
    "Search recipes by category, area and/or ingredient. Supports pagination.",
  request: {
    query: RecipesQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of recipes",
      content: {
        "application/json": { schema: PaginatedRecipesSchema },
      },
    },
    400: {
      description: "Invalid query parameters",
      content: {
        "application/json": { schema: ValidationErrorSchema },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/popular",
  tags: ["Recipes"],
  summary: "Get popular recipes",
  description:
    "Returns all recipes sorted by favorites count (descending), with pagination.",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of popular recipes",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(PopularRecipeSchema),
            total: z.number().int(),
            page: z.number().int(),
            limit: z.number().int(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/{id}",
  tags: ["Recipes"],
  summary: "Get recipe by id",
  description: "Returns detailed information about a recipe.",
  request: {
    params: RecipeIdParamSchema,
  },
  responses: {
    200: {
      description: "Recipe details",
      content: {
        "application/json": { schema: RecipeDetailSchema },
      },
    },
    404: {
      description: "Recipe not found",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
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
    "ingredients must be a JSON string: [{\"id\":\"...\",\"measure\":\"175g\"}].",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            title: z.string().openapi({ example: "Battenberg Cake" }),
            category: z.string().openapi({ example: "Dessert" }),
            area: z.string().openapi({ example: "British" }),
            instructions: z.string().openapi({ example: "Heat oven to 180C..." }),
            description: z.string().optional().openapi({ example: "A classic cake" }),
            time: z.string().optional().openapi({ example: "60" }),
            ingredients: z.string().openapi({
              description: "JSON string array of { id, measure }",
              example: JSON.stringify([
                { id: "640c2dd963a319ea671e367e", measure: "175g" },
              ]),
            }),
            thumb: z.any().openapi({
              type: "string",
              format: "binary",
              description: "Recipe image (required, max 5MB, image/*)",
            }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Recipe created",
      content: {
        "application/json": {
          schema: CreatedRecipeSchema,
        },
      },
    },
    400: {
      description: "Missing thumb / category / area / ingredients not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ValidationErrorSchema } },
    },
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
    401: {
      description: "Authentication required",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    403: {
      description: "Not the owner of the recipe",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    404: {
      description: "Recipe not found",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/own",
  tags: ["Recipes"],
  summary: "Get own recipes",
  description: "Returns paginated list of recipes created by the authenticated user.",
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of own recipes",
      content: {
        "application/json": { schema: PaginatedRecipesSchema },
      },
    },
    401: {
      description: "Authentication required",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

// --- Private: Favorites ---

registry.registerPath({
  method: "get",
  path: "/api/recipes/favorites",
  tags: ["Recipes"],
  summary: "Get favorite recipes",
  description: "Returns paginated list of recipes favorited by the authenticated user.",
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of favorite recipes",
      content: {
        "application/json": { schema: PaginatedRecipesSchema },
      },
    },
    401: {
      description: "Authentication required",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
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
    201: {
      description: "Added to favorites",
      content: {
        "application/json": { schema: MessageSchema },
      },
    },
    401: {
      description: "Authentication required",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    404: {
      description: "Recipe not found",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    409: {
      description: "Recipe already in favorites",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
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
    401: {
      description: "Authentication required",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    404: {
      description: "Recipe not found in favorites",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});
