import { z } from "zod";
import { registry } from "../openapi/registry.ts";
import { ErrorSchema, ValidationErrorSchema } from "./auth.validator.ts";

// ====================== Request schemas ======================

export const RecipesQuerySchema = registry.register(
  "RecipesQuery",
  z.object({
    category: z.string().optional().openapi({ example: "Dessert" }),
    area: z.string().optional().openapi({ example: "British" }),
    ingredient: z
      .string()
      .optional()
      .openapi({ example: "640c2dd963a319ea671e37aa" }),
    page: z.coerce.number().int().positive().default(1).openapi({ example: 1 }),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(50)
      .default(10)
      .openapi({ example: 10 }),
  }),
);

export const PaginationQuerySchema = registry.register(
  "PaginationQuery",
  z.object({
    page: z.coerce.number().int().positive().default(1).openapi({ example: 1 }),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(50)
      .default(10)
      .openapi({ example: 10 }),
  }),
);

export const RecipeIdParamSchema = registry.register(
  "RecipeIdParam",
  z.object({
    id: z.string().min(1).openapi({ example: "6462a8f74c3d0ddd28897fcd" }),
  }),
);

export const CreateRecipeSchema = registry.register(
  "CreateRecipe",
  z.object({
    title: z.string().min(3).max(200).openapi({ example: "Battenberg Cake" }),
    category: z.string().min(1).openapi({ example: "Dessert" }),
    area: z.string().min(1).openapi({ example: "British" }),
    instructions: z
      .string()
      .min(10)
      .openapi({ example: "Heat oven to 180C..." }),
    description: z
      .string()
      .max(500)
      .optional()
      .openapi({ example: "A classic British cake" }),
    time: z.string().optional().openapi({ example: "60" }),
    ingredients: z
      .array(
        z.object({
          id: z.string().openapi({ example: "640c2dd963a319ea671e367e" }),
          measure: z.string().min(1).openapi({ example: "175g" }),
        }),
      )
      .min(1),
  }),
);

// ====================== Response schemas ======================

export const RecipeListItemSchema = registry.register(
  "RecipeListItem",
  z.object({
    id: z.string().openapi({ example: "6462a8f74c3d0ddd28897fcd" }),
    title: z.string().openapi({ example: "Battenberg Cake" }),
    description: z.string().nullable().openapi({ example: "A classic cake" }),
    thumb: z.string().nullable().openapi({ example: null }),
    preview: z.string().nullable().openapi({ example: null }),
    time: z.string().nullable().openapi({ example: "60" }),
    category: z.object({
      id: z.string().openapi({ example: "6462a6cd4c3d0ddd28897f8a" }),
      name: z.string().openapi({ example: "Dessert" }),
    }),
    area: z.object({
      id: z.string().openapi({ example: "6462a6f04c3d0ddd28897f9c" }),
      name: z.string().openapi({ example: "British" }),
    }),
    owner: z.object({
      id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
      name: z.string().openapi({ example: "GoIT" }),
      avatar: z.string().nullable().openapi({ example: null }),
    }),
  }),
);

export const RecipeDetailSchema = registry.register(
  "RecipeDetail",
  RecipeListItemSchema.extend({
    instructions: z.string().openapi({ example: "Heat oven to 180C..." }),
    ingredients: z.array(
      z.object({
        id: z.string().openapi({ example: "640c2dd963a319ea671e367e" }),
        name: z.string().openapi({ example: "Butter" }),
        measure: z.string().openapi({ example: "175g" }),
        img: z.string().nullable().openapi({ example: null }),
      }),
    ),
  }),
);

export const PopularRecipeSchema = registry.register(
  "PopularRecipe",
  RecipeListItemSchema.extend({
    _count: z.object({
      favorites: z.number().int().openapi({ example: 12 }),
    }),
  }),
);

export const PaginatedRecipesSchema = registry.register(
  "PaginatedRecipes",
  z.object({
    data: z.array(RecipeListItemSchema),
    total: z.number().int().openapi({ example: 42 }),
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 10 }),
  }),
);

export const MessageSchema = registry.register(
  "Message",
  z.object({
    message: z.string().openapi({ example: "Added to favorites" }),
  }),
);

// ====================== Types ======================

export type RecipesQuery = z.infer<typeof RecipesQuerySchema>;
export type CreateRecipeBody = z.infer<typeof CreateRecipeSchema>;

// ====================== Paths ======================

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
    "Creates a recipe owned by the authenticated user. " +
    "category and area are **names** (e.g. \"Dessert\", \"British\"), not ids. " +
    "Image upload (thumb) is not supported on this endpoint yet — thumb will be null. " +
    "Content-Type: application/json.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateRecipeSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Recipe created",
      content: {
        "application/json": {
          schema: RecipeListItemSchema.extend({
            instructions: z.string(),
          }),
        },
      },
    },
    400: {
      description: "Category, area or ingredients not found",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    401: {
      description: "Authentication required",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    422: {
      description: "Validation error",
      content: {
        "application/json": { schema: ValidationErrorSchema },
      },
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
