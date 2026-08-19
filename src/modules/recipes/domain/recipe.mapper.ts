import type { RecipeDetailRow } from "./recipes.port.ts";
import type { RecipeDetailView } from "./recipe.view.ts";

export const toRecipeDetailView = ({ ingredients, ...recipe }: RecipeDetailRow): RecipeDetailView => ({
  ...recipe,
  ingredients: ingredients.map(({ measure, ingredient }) => ({
    id: ingredient.id,
    name: ingredient.name,
    img: ingredient.img,
    measure,
  })),
});
