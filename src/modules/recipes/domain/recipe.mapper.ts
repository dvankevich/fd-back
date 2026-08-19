import type { RecipeDetailRow } from "./recipes.port.ts";
import type { RecipeDetailContent } from "./recipe.view.ts";

export const toRecipeDetailContent = ({
  ingredients,
  ...recipe
}: RecipeDetailRow): RecipeDetailContent => ({
  ...recipe,
  ingredients: ingredients.map(({ measure, ingredient }) => ({
    id: ingredient.id,
    name: ingredient.name,
    img: ingredient.img,
    measure,
  })),
});
