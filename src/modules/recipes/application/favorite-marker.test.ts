import { describe, expect, it } from "vitest";
import type { Paginated } from "../../../core/paginator.ts";
import { FavoriteMarker } from "./favorite-marker.ts";

const viewerId = "user-1";

const page = (ids: string[]): Paginated<{ id: string; title: string }> => ({
  data: ids.map((id) => ({ id, title: `Recipe ${id}` })),
  total: ids.length,
  page: 1,
  limit: 10,
});

class FakeFavorites {
  readonly lookups: { userId: string; recipeIds: string[] }[] = [];

  constructor(private readonly favoriteIds: string[] = []) {}

  async findFavoriteRecipeIds(input: {
    userId: string;
    recipeIds: string[];
  }): Promise<string[]> {
    this.lookups.push(input);
    return input.recipeIds.filter((id) => this.favoriteIds.includes(id));
  }
}

const createMarker = (favoriteIds: string[] = []) => {
  const favorites = new FakeFavorites(favoriteIds);
  return { marker: new FavoriteMarker(favorites), favorites };
};

describe("FavoriteMarker", () => {
  it("should mark a page with one lookup for all its rows", async () => {
    const { marker, favorites } = createMarker(["recipe-2"]);

    const marked = await marker.markPage(page(["recipe-1", "recipe-2"]), viewerId);

    expect(marked.data).toEqual([
      { id: "recipe-1", title: "Recipe recipe-1", isFavorite: false },
      { id: "recipe-2", title: "Recipe recipe-2", isFavorite: true },
    ]);
    expect(favorites.lookups).toEqual([
      { userId: viewerId, recipeIds: ["recipe-1", "recipe-2"] },
    ]);
  });

  it("should keep the page numbers untouched", async () => {
    const { marker } = createMarker();

    const marked = await marker.markPage(page(["recipe-1"]), viewerId);

    expect(marked).toMatchObject({ total: 1, page: 1, limit: 10 });
  });

  it("should mark a single recipe", async () => {
    const { marker } = createMarker(["recipe-1"]);

    await expect(marker.markOne({ id: "recipe-1" }, viewerId)).resolves.toEqual({
      id: "recipe-1",
      isFavorite: true,
    });
  });

  it("should answer false for a guest without asking the favorites", async () => {
    const { marker, favorites } = createMarker(["recipe-1"]);

    const marked = await marker.markPage(page(["recipe-1"]), undefined);

    expect(marked.data).toEqual([{ id: "recipe-1", title: "Recipe recipe-1", isFavorite: false }]);
    await expect(marker.markOne({ id: "recipe-1" }, undefined)).resolves.toEqual({
      id: "recipe-1",
      isFavorite: false,
    });
    expect(favorites.lookups).toEqual([]);
  });

  it("should skip the lookup for an empty page", async () => {
    const { marker, favorites } = createMarker();

    await expect(marker.markPage(page([]), viewerId)).resolves.toMatchObject({ data: [] });
    expect(favorites.lookups).toEqual([]);
  });
});
