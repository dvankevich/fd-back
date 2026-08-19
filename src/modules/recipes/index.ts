export { createRecipesModule, recipesModule } from "./recipes.module.ts";
export type { RecipesModule } from "./recipes.module.ts";
export { RecipesService } from "./application/recipes.service.ts";
export { FavoritesService } from "./application/favorites.service.ts";
export type {
  CreatedRecipeView,
  PopularRecipeView,
  RecipeDetailView,
  RecipeListItemView,
} from "./domain/recipe.view.ts";
