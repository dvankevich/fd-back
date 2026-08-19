import type { Paginated } from "../../../core/paginator.ts";
import type { Optional } from "../../../core/types/common.ts";
import type { FavoriteMark } from "../domain/recipe.view.ts";
import type { FavoritesRepository } from "../domain/recipes.port.ts";

type Identified = { id: string };

export class FavoriteMarker {
  constructor(private readonly favorites: Pick<FavoritesRepository, "findFavoriteRecipeIds">) {}

  async markPage<T extends Identified>(
    page: Paginated<T>,
    viewerId: Optional<string>,
  ): Promise<Paginated<T & FavoriteMark>> {
    const favorites = await this.lookup(page.data, viewerId);

    return {
      ...page,
      data: page.data.map((recipe) => ({ ...recipe, isFavorite: favorites.has(recipe.id) })),
    };
  }

  async markOne<T extends Identified>(
    recipe: T,
    viewerId: Optional<string>,
  ): Promise<T & FavoriteMark> {
    const favorites = await this.lookup([recipe], viewerId);

    return { ...recipe, isFavorite: favorites.has(recipe.id) };
  }

  private async lookup(
    recipes: Identified[],
    viewerId: Optional<string>,
  ): Promise<ReadonlySet<string>> {
    if (!viewerId || recipes.length === 0) {
      return new Set();
    }

    const favorites = await this.favorites.findFavoriteRecipeIds({
      userId: viewerId,
      recipeIds: recipes.map(({ id }) => id),
    });

    return new Set(favorites);
  }
}
