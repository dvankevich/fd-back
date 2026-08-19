import { NotFoundError } from "../../../core/exceptions/errors.ts";
import type { PageRequest, Paginated } from "../../../core/paginator.ts";
import { RECIPES_MESSAGE } from "../domain/recipes.messages.ts";
import type { FavoritesRepository, RecipesRepository } from "../domain/recipes.port.ts";
import type { RecipeListItemView } from "../domain/recipe.view.ts";

type FavoritesServiceOptions = {
  favorites: FavoritesRepository;
  recipes: Pick<RecipesRepository, "exists">;
};

type FavoriteArgs = { userId: string; recipeId: string };

export class FavoritesService {
  private readonly favorites: FavoritesRepository;
  private readonly recipes: Pick<RecipesRepository, "exists">;

  constructor({ favorites, recipes }: FavoritesServiceOptions) {
    this.favorites = favorites;
    this.recipes = recipes;
  }

  list(input: { userId: string; page: PageRequest }): Promise<Paginated<RecipeListItemView>> {
    return this.favorites.listRecipes(input);
  }

  async add({ userId, recipeId }: FavoriteArgs): Promise<void> {
    if (!(await this.recipes.exists(recipeId))) {
      throw new NotFoundError(RECIPES_MESSAGE.notFound);
    }

    await this.favorites.add({ userId, recipeId });
  }

  async remove({ userId, recipeId }: FavoriteArgs): Promise<void> {
    const removed = await this.favorites.remove({ userId, recipeId });

    if (removed === 0) {
      throw new NotFoundError(RECIPES_MESSAGE.notInFavorites);
    }
  }
}
