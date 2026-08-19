import type { PrismaClient } from "../../../core/database/prisma.ts";
import { toPage, toSkip, type PageRequest, type Paginated } from "../../../core/paginator.ts";
import type { Nullable } from "../../../core/types/common.ts";
import type {
  NewRecipe,
  PopularRecipeRow,
  RecipeDetailRow,
  RecipeFilter,
  RecipeListRow,
  RecipesRepository,
} from "../domain/recipes.port.ts";
import type { CreatedRecipeView } from "../domain/recipe.view.ts";
import {
  createdRecipeSelect,
  popularRecipeSelect,
  recipeDetailSelect,
  recipeListSelect,
} from "./recipe-select.ts";
import { toRecipeWhere } from "./recipe-where.ts";

const newestFirst = { createdAt: "desc" } as const;

export class PrismaRecipesRepository implements RecipesRepository {
  constructor(private readonly client: PrismaClient) {}

  async search({
    filter,
    page,
  }: {
    filter: RecipeFilter;
    page: PageRequest;
  }): Promise<Paginated<RecipeListRow>> {
    const where = toRecipeWhere(filter);

    const [rows, total] = await Promise.all([
      this.client.recipe.findMany({
        where,
        select: recipeListSelect,
        orderBy: newestFirst,
        skip: toSkip(page),
        take: page.limit,
      }),
      this.client.recipe.count({ where }),
    ]);

    return toPage({ rows, total, page });
  }

  async listPopular(page: PageRequest): Promise<Paginated<PopularRecipeRow>> {
    const [rows, total] = await Promise.all([
      this.client.recipe.findMany({
        select: popularRecipeSelect,
        orderBy: { favorites: { _count: "desc" } },
        skip: toSkip(page),
        take: page.limit,
      }),
      this.client.recipe.count(),
    ]);

    return toPage({ rows, total, page });
  }

  async listOwn({
    ownerId,
    page,
  }: {
    ownerId: string;
    page: PageRequest;
  }): Promise<Paginated<RecipeListRow>> {
    const where = { ownerId };

    const [rows, total] = await Promise.all([
      this.client.recipe.findMany({
        where,
        select: recipeListSelect,
        orderBy: newestFirst,
        skip: toSkip(page),
        take: page.limit,
      }),
      this.client.recipe.count({ where }),
    ]);

    return toPage({ rows, total, page });
  }

  findDetail(recipeId: string): Promise<Nullable<RecipeDetailRow>> {
    return this.client.recipe.findUnique({ where: { id: recipeId }, select: recipeDetailSelect });
  }

  async findOwnerId(recipeId: string): Promise<Nullable<string>> {
    const recipe = await this.client.recipe.findUnique({
      where: { id: recipeId },
      select: { ownerId: true },
    });
    return recipe?.ownerId ?? null;
  }

  async exists(recipeId: string): Promise<boolean> {
    const recipe = await this.client.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true },
    });
    return recipe !== null;
  }

  create({ ingredients, ...recipe }: NewRecipe): Promise<CreatedRecipeView> {
    return this.client.recipe.create({
      data: {
        ...recipe,
        ingredients: {
          create: ingredients.map(({ id, measure }) => ({ ingredientId: id, measure })),
        },
      },
      select: createdRecipeSelect,
    });
  }

  async delete(recipeId: string): Promise<void> {
    await this.client.recipe.delete({ where: { id: recipeId } });
  }
}
