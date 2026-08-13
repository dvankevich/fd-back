import { z } from "zod";
import { registry } from "../openapi.ts";

// ---------- Query ----------
export const RecipesQuerySchema = registry.register(
  "RecipesQuery",
  z.object({
    category: z.string().optional().openapi({ example: "Dessert" }),
    area: z.string().optional().openapi({ example: "British" }),
    ingredient: z.string().optional().openapi({ example: "640c2dd963a319ea671e37aa" }),
    page: z.coerce.number().int().positive().default(1).openapi({ example: 1 }),
    limit: z.coerce.number().int().positive().max(50).default(10).openapi({ example: 10 }),
  }),
);

// ---------- Create body ----------
export const CreateRecipeSchema = registry.register(
  "CreateRecipe",
  z.object({
    title: z.string().min(3).max(200).openapi({ example: "Battenberg Cake" }),
    category: z.string().min(1).openapi({ example: "Dessert" }), // name
    area: z.string().min(1).openapi({ example: "British" }), // name
    instructions: z.string().min(10).openapi({ example: "Heat oven to 180C..." }),
    description: z.string().max(500).optional().openapi({ example: "A classic British cake" }),
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

// ---------- Response schemas ----------
export const RecipeListItemSchema = registry.register(
  "RecipeListItem",
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    thumb: z.string().nullable(),
    preview: z.string().nullable(),
    time: z.string().nullable(),
    category: z.object({ id: z.string(), name: z.string() }),
    area: z.object({ id: z.string(), name: z.string() }),
    owner: z.object({
      id: z.string(),
      name: z.string(),
      avatar: z.string().nullable(),
    }),
  }),
);

export const RecipeDetailSchema = registry.register(
  "RecipeDetail",
  RecipeListItemSchema.extend({
    instructions: z.string(),
    ingredients: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        measure: z.string(),
        img: z.string().nullable(),
      }),
    ),
  }),
);

export type RecipesQuery = z.infer<typeof RecipesQuerySchema>;
export type CreateRecipeBody = z.infer<typeof CreateRecipeSchema>;

// ---------- Paths (скорочено, основні) ----------
registry.registerPath({
  method: "get",
  path: "/api/recipes",
  tags: ["Recipes"],
  summary: "Search recipes by category, area, ingredient (paginated)",
  request: {
    query: RecipesQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of recipes",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(RecipeListItemSchema),
            total: z.number(),
            page: z.number(),
            limit: z.number(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/popular",
  tags: ["Recipes"],
  summary: "Get popular recipes (by favorites count)",
  responses: {
    200: {
      description: "List of popular recipes",
      content: {
        "application/json": { schema: z.array(RecipeListItemSchema) },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/{id}",
  tags: ["Recipes"],
  summary: "Get recipe details by id",
  request: {
    params: z.object({ id: z.string() }),
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
    },
  },
});
