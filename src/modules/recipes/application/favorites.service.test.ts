import { describe, expect, it } from "vitest";
import type { PageRequest, Paginated } from "../../../core/paginator.ts";
import type { FavoritesRepository, RecipeListRow } from "../domain/recipes.port.ts";
import { FavoritesService } from "./favorites.service.ts";

const userId = "user-1";

const row: RecipeListRow = {
  id: "recipe-1",
  title: "Battenberg",
  description: null,
  thumb: null,
  preview: null,
  time: "60",
  category: { id: "cat-1", name: "Dessert" },
  area: { id: "area-1", name: "British" },
  owner: { id: "user-2", name: "Owner", avatar: null },
};

class FakeFavorites implements FavoritesRepository {
  constructor(private readonly rows: RecipeListRow[] = []) {}

  async listRecipes({ page }: {
    userId: string;
    page: PageRequest;
  }): Promise<Paginated<RecipeListRow>> {
    return { data: this.rows, total: this.rows.length, ...page };
  }

  async findFavoriteRecipeIds({ recipeIds }: {
    userId: string;
    recipeIds: string[];
  }): Promise<string[]> {
    return recipeIds;
  }

  async add(): Promise<void> {}

  async remove(): Promise<number> {
    return 1;
  }
}

describe("FavoritesService", () => {
  it("should mark every listed recipe as a favorite", async () => {
    const service = new FavoritesService({
      favorites: new FakeFavorites([row, { ...row, id: "recipe-2" }]),
      recipes: { exists: async () => true },
    });

    const page = await service.list({ userId, page: { page: 1, limit: 10 } });

    expect(page.data).toEqual([
      { ...row, isFavorite: true },
      { ...row, id: "recipe-2", isFavorite: true },
    ]);
  });
});
