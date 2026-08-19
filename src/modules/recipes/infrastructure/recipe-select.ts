import type { Prisma } from "../../../core/database/prisma.ts";

export const recipeListSelect = {
  id: true,
  title: true,
  description: true,
  thumb: true,
  preview: true,
  time: true,
  category: { select: { id: true, name: true } },
  area: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, avatar: true } },
} as const satisfies Prisma.RecipeSelect;

export const createdRecipeSelect = {
  ...recipeListSelect,
  instructions: true,
} as const satisfies Prisma.RecipeSelect;

export const popularRecipeSelect = {
  ...recipeListSelect,
  _count: { select: { favorites: true } },
} as const satisfies Prisma.RecipeSelect;

export const recipeDetailSelect = {
  ...createdRecipeSelect,
  ingredients: {
    select: {
      measure: true,
      ingredient: { select: { id: true, name: true, img: true } },
    },
  },
} as const satisfies Prisma.RecipeSelect;
