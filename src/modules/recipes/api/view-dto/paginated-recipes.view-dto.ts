import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import { PopularRecipeSchema, RecipeListItemSchema } from "./recipe.view-dto.ts";

const pageFields = {
  total: z.number().int().openapi({ example: 42 }),
  page: z.number().int().openapi({ example: 1 }),
  limit: z.number().int().openapi({ example: 10 }),
};

export const PaginatedRecipesSchema = registry.register(
  "PaginatedRecipes",
  z.object({
    data: z.array(RecipeListItemSchema),
    ...pageFields,
  }),
);

export const PaginatedPopularRecipesSchema = registry.register(
  "PaginatedPopularRecipes",
  z.object({
    data: z.array(PopularRecipeSchema),
    ...pageFields,
  }),
);
