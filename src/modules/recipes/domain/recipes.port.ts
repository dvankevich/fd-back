import type { PageRequest, Paginated } from "../../../core/paginator.ts";
import type { Nullable } from "../../../core/types/common.ts";
import type {
  CreatedRecipeView,
  PopularRecipeView,
  RecipeIngredientView,
  RecipeListItemView,
} from "./recipe.view.ts";

export type RecipeFilter = {
  category?: string;
  area?: string;
  ingredient?: string;
};

export type RecipeIngredientInput = { id: string; measure: string };

export type NewRecipe = {
  title: string;
  instructions: string;
  description?: string;
  time?: string;
  thumb: string;
  preview: string;
  ownerId: string;
  categoryId: string;
  areaId: string;
  ingredients: RecipeIngredientInput[];
};

export type RecipeDetailRow = CreatedRecipeView & {
  ingredients: { measure: string; ingredient: Omit<RecipeIngredientView, "measure"> }[];
};

export interface CategoryResolver {
  findByName(name: string): Promise<Nullable<{ id: string }>>;
}

export interface AreaResolver {
  findByName(name: string): Promise<Nullable<{ id: string }>>;
}

export interface IngredientChecker {
  findMissingIds(ids: string[]): Promise<string[]>;
}

export interface RecipesRepository {
  search(input: { filter: RecipeFilter; page: PageRequest }): Promise<Paginated<RecipeListItemView>>;
  listPopular(page: PageRequest): Promise<Paginated<PopularRecipeView>>;
  listOwn(input: { ownerId: string; page: PageRequest }): Promise<Paginated<RecipeListItemView>>;
  findDetail(recipeId: string): Promise<Nullable<RecipeDetailRow>>;
  findOwnerId(recipeId: string): Promise<Nullable<string>>;
  exists(recipeId: string): Promise<boolean>;
  create(recipe: NewRecipe): Promise<CreatedRecipeView>;
  delete(recipeId: string): Promise<void>;
}

export interface FavoritesRepository {
  listRecipes(input: { userId: string; page: PageRequest }): Promise<Paginated<RecipeListItemView>>;
  add(input: { userId: string; recipeId: string }): Promise<void>;
  remove(input: { userId: string; recipeId: string }): Promise<number>;
}
