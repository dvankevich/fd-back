import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type {
  CreatedRecipeView,
  PopularRecipeView,
  RecipeDetailView,
  RecipeListItemView,
} from "../../domain/recipe.view.ts";

const recipeSummaryFields = {
  id: z.string().openapi({ example: "6462a8f74c3d0ddd28897fcd" }),
  title: z.string().openapi({ example: "Battenberg Cake" }),
  description: z.string().nullable().openapi({ example: "A classic cake" }),
  thumb: z.string().nullable().openapi({ example: null }),
  preview: z.string().nullable().openapi({ example: null }),
  time: z.string().nullable().openapi({ example: "60" }),
  category: z.object({
    id: z.string().openapi({ example: "6462a6cd4c3d0ddd28897f8f" }),
    name: z.string().openapi({ example: "Dessert" }),
  }),
  area: z.object({
    id: z.string().openapi({ example: "6462a6f04c3d0ddd28897fa1" }),
    name: z.string().openapi({ example: "British" }),
  }),
  owner: z.object({
    id: z.string().openapi({ example: "64c8d958249fae54bae90bb9" }),
    name: z.string().openapi({ example: "GoIT" }),
    avatar: z.string().nullable().openapi({ example: null }),
  }),
};

const favoriteMarkFields = {
  isFavorite: z.boolean().openapi({
    description:
      "True when the recipe is in the favorites of the caller behind the access token. " +
      "False without a token or with a token that is not accepted.",
    example: true,
  }),
};

export const RecipeListItemSchema = registry.register(
  "RecipeListItem",
  z.object({
    ...recipeSummaryFields,
    ...favoriteMarkFields,
  }) satisfies z.ZodType<RecipeListItemView>,
);

export const CreatedRecipeSchema = registry.register(
  "CreatedRecipe",
  z.object({
    ...recipeSummaryFields,
    instructions: z.string().openapi({ example: "Heat oven to 180C..." }),
  }) satisfies z.ZodType<CreatedRecipeView>,
);

export const RecipeDetailSchema = registry.register(
  "RecipeDetail",
  CreatedRecipeSchema.extend({
    ...favoriteMarkFields,
    ingredients: z.array(
      z.object({
        id: z.string().openapi({ example: "640c2dd963a319ea671e367e" }),
        name: z.string().openapi({ example: "Butter" }),
        measure: z.string().openapi({ example: "175g" }),
        img: z.string().nullable().openapi({ example: null }),
      }),
    ),
  }) satisfies z.ZodType<RecipeDetailView>,
);

export const PopularRecipeSchema = registry.register(
  "PopularRecipe",
  RecipeListItemSchema.extend({
    _count: z.object({
      favorites: z.number().int().openapi({ example: 12 }),
    }),
  }) satisfies z.ZodType<PopularRecipeView>,
);
