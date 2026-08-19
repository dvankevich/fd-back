import { Prisma } from "../../../core/database/prisma.ts";
import type { RecipeFilter } from "../domain/recipes.port.ts";

const insensitive = (value: string) => ({ equals: value, mode: Prisma.QueryMode.insensitive });

export const toRecipeWhere = ({ category, area, ingredient }: RecipeFilter): Prisma.RecipeWhereInput => ({
  ...(category ? { category: { name: insensitive(category) } } : {}),
  ...(area ? { area: { name: insensitive(area) } } : {}),
  ...(ingredient
    ? {
        ingredients: {
          some: {
            OR: [{ ingredientId: ingredient }, { ingredient: { name: insensitive(ingredient) } }],
          },
        },
      }
    : {}),
});
