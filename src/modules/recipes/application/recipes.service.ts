import { BadRequestError, ForbiddenError, NotFoundError } from "../../../core/exceptions/errors.ts";
import logger from "../../../core/logger.ts";
import type { PageRequest, Paginated } from "../../../core/paginator.ts";
import type { ImageStorage } from "../../media/index.ts";
import { toRecipeDetailView } from "../domain/recipe.mapper.ts";
import type {
  CreatedRecipeView,
  PopularRecipeView,
  RecipeDetailView,
  RecipeListItemView,
} from "../domain/recipe.view.ts";
import { RECIPES_MESSAGE } from "../domain/recipes.messages.ts";
import type {
  AreaResolver,
  CategoryResolver,
  IngredientChecker,
  RecipeFilter,
  RecipeIngredientInput,
  RecipesRepository,
} from "../domain/recipes.port.ts";

export const RECIPE_IMAGE = {
  folder: "foodies/recipes",
  transformation: { width: 800, height: 600, crop: "fill" },
} as const;

type RecipesServiceOptions = {
  recipes: RecipesRepository;
  categories: CategoryResolver;
  areas: AreaResolver;
  ingredients: IngredientChecker;
  images: ImageStorage;
};

export type NewRecipeInput = {
  title: string;
  category: string;
  area: string;
  instructions: string;
  description?: string;
  time?: string;
  ingredients: RecipeIngredientInput[];
};

type CreateRecipeArgs = { input: NewRecipeInput; ownerId: string; imagePath: string };

export class RecipesService {
  private readonly recipes: RecipesRepository;
  private readonly categories: CategoryResolver;
  private readonly areas: AreaResolver;
  private readonly ingredients: IngredientChecker;
  private readonly images: ImageStorage;

  constructor({ recipes, categories, areas, ingredients, images }: RecipesServiceOptions) {
    this.recipes = recipes;
    this.categories = categories;
    this.areas = areas;
    this.ingredients = ingredients;
    this.images = images;
  }

  search(input: { filter: RecipeFilter; page: PageRequest }): Promise<Paginated<RecipeListItemView>> {
    return this.recipes.search(input);
  }

  listPopular(page: PageRequest): Promise<Paginated<PopularRecipeView>> {
    return this.recipes.listPopular(page);
  }

  listOwn(input: { ownerId: string; page: PageRequest }): Promise<Paginated<RecipeListItemView>> {
    return this.recipes.listOwn(input);
  }

  async getDetail(recipeId: string): Promise<RecipeDetailView> {
    const recipe = await this.recipes.findDetail(recipeId);

    if (!recipe) {
      throw new NotFoundError(RECIPES_MESSAGE.notFound);
    }

    return toRecipeDetailView(recipe);
  }

  async create({ input, ownerId, imagePath }: CreateRecipeArgs): Promise<CreatedRecipeView> {
    logger.debug({ ownerId, title: input.title }, "Create recipe attempt");

    const [category, area] = await Promise.all([
      this.categories.findByName(input.category),
      this.areas.findByName(input.area),
    ]);

    if (!category) {
      throw new BadRequestError(RECIPES_MESSAGE.categoryNotFound);
    }
    if (!area) {
      throw new BadRequestError(RECIPES_MESSAGE.areaNotFound);
    }

    const missing = await this.ingredients.findMissingIds(input.ingredients.map(({ id }) => id));
    if (missing.length > 0) {
      throw new BadRequestError(RECIPES_MESSAGE.unknownIngredients);
    }

    const image = await this.images.upload({
      path: imagePath,
      folder: RECIPE_IMAGE.folder,
      transformation: RECIPE_IMAGE.transformation,
    });

    const recipe = await this.recipes.create({
      title: input.title,
      instructions: input.instructions,
      description: input.description,
      time: input.time,
      thumb: image.url,
      preview: image.url,
      ownerId,
      categoryId: category.id,
      areaId: area.id,
      ingredients: input.ingredients,
    });

    logger.info({ ownerId, recipeId: recipe.id }, "Recipe created");

    return recipe;
  }

  async delete({ recipeId, ownerId }: { recipeId: string; ownerId: string }): Promise<void> {
    const currentOwnerId = await this.recipes.findOwnerId(recipeId);

    if (!currentOwnerId) {
      throw new NotFoundError(RECIPES_MESSAGE.notFound);
    }
    if (currentOwnerId !== ownerId) {
      throw new ForbiddenError(RECIPES_MESSAGE.notOwner);
    }

    await this.recipes.delete(recipeId);

    logger.info({ ownerId, recipeId }, "Recipe deleted");
  }
}
