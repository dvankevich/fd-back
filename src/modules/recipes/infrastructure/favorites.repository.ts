import { isUniqueViolation } from "../../../core/database/prisma-errors.ts";
import type { PrismaClient } from "../../../core/database/prisma.ts";
import { ConflictError } from "../../../core/exceptions/errors.ts";
import { toPage, toSkip, type PageRequest, type Paginated } from "../../../core/paginator.ts";
import { RECIPES_MESSAGE } from "../domain/recipes.messages.ts";
import type { FavoritesRepository, RecipeListRow } from "../domain/recipes.port.ts";
import { recipeListSelect } from "./recipe-select.ts";

const rethrowAlreadyFavorite = (err: unknown): never => {
  if (isUniqueViolation(err)) {
    throw new ConflictError(RECIPES_MESSAGE.alreadyFavorite);
  }
  throw err;
};

export class PrismaFavoritesRepository implements FavoritesRepository {
  constructor(private readonly client: PrismaClient) {}

  async listRecipes({
    userId,
    page,
  }: {
    userId: string;
    page: PageRequest;
  }): Promise<Paginated<RecipeListRow>> {
    const where = { userId };

    const [favorites, total] = await Promise.all([
      this.client.favorite.findMany({
        where,
        select: { recipe: { select: recipeListSelect } },
        orderBy: { createdAt: "desc" },
        skip: toSkip(page),
        take: page.limit,
      }),
      this.client.favorite.count({ where }),
    ]);

    return toPage({ rows: favorites.map((favorite) => favorite.recipe), total, page });
  }

  async findFavoriteRecipeIds({
    userId,
    recipeIds,
  }: {
    userId: string;
    recipeIds: string[];
  }): Promise<string[]> {
    const favorites = await this.client.favorite.findMany({
      where: { userId, recipeId: { in: recipeIds } },
      select: { recipeId: true },
    });

    return favorites.map(({ recipeId }) => recipeId);
  }

  async add({ userId, recipeId }: { userId: string; recipeId: string }): Promise<void> {
    await this.client.favorite.create({ data: { userId, recipeId } }).catch(rethrowAlreadyFavorite);
  }

  async remove({ userId, recipeId }: { userId: string; recipeId: string }): Promise<number> {
    const { count } = await this.client.favorite.deleteMany({ where: { userId, recipeId } });
    return count;
  }
}
