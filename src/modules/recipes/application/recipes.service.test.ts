import { describe, expect, it } from "vitest";
import type { PageRequest, Paginated } from "../../../core/paginator.ts";
import type { Nullable } from "../../../core/types/common.ts";
import type { ImageStorage, UploadImageInput, UploadedImage } from "../../media/index.ts";
import type {
  NewRecipe,
  RecipeDetailRow,
  RecipesRepository,
} from "../domain/recipes.port.ts";
import type { CreatedRecipeView, PopularRecipeView, RecipeListItemView } from "../domain/recipe.view.ts";
import { RECIPE_IMAGE, RecipesService } from "./recipes.service.ts";

const ownerId = "user-1";
const recipeId = "recipe-1";
const uploadedUrl = "https://res.cloudinary.com/demo/recipe.jpg";

const listItem: RecipeListItemView = {
  id: recipeId,
  title: "Battenberg",
  description: null,
  thumb: uploadedUrl,
  preview: uploadedUrl,
  time: "60",
  category: { id: "cat-1", name: "Dessert" },
  area: { id: "area-1", name: "British" },
  owner: { id: ownerId, name: "Owner", avatar: null },
};

const detailRow: RecipeDetailRow = {
  ...listItem,
  instructions: "Heat the oven",
  ingredients: [{ measure: "175g", ingredient: { id: "ing-1", name: "Butter", img: null } }],
};

const emptyPage = <T>(page: PageRequest): Paginated<T> => ({ data: [], total: 0, ...page });

class FakeRecipes implements RecipesRepository {
  readonly created: NewRecipe[] = [];
  deletedId: Nullable<string> = null;

  constructor(private readonly state: { detail?: RecipeDetailRow; ownerId?: Nullable<string> } = {}) {}

  async search({ page }: { filter: unknown; page: PageRequest }): Promise<Paginated<RecipeListItemView>> {
    return emptyPage(page);
  }

  async listPopular(page: PageRequest): Promise<Paginated<PopularRecipeView>> {
    return emptyPage(page);
  }

  async listOwn({ page }: { ownerId: string; page: PageRequest }): Promise<Paginated<RecipeListItemView>> {
    return emptyPage(page);
  }

  async findDetail(): Promise<Nullable<RecipeDetailRow>> {
    return this.state.detail ?? null;
  }

  async findOwnerId(): Promise<Nullable<string>> {
    return this.state.ownerId ?? null;
  }

  async exists(): Promise<boolean> {
    return true;
  }

  async create(recipe: NewRecipe): Promise<CreatedRecipeView> {
    this.created.push(recipe);
    return { ...listItem, instructions: recipe.instructions };
  }

  async delete(id: string): Promise<void> {
    this.deletedId = id;
  }
}

class FakeImages implements ImageStorage {
  readonly uploads: UploadImageInput[] = [];

  async upload(input: UploadImageInput): Promise<UploadedImage> {
    this.uploads.push(input);
    return { url: uploadedUrl };
  }
}

const input = {
  title: "Battenberg",
  category: "Dessert",
  area: "British",
  instructions: "Heat the oven",
  ingredients: [{ id: "ing-1", measure: "175g" }],
};

const createService = (
  options: {
    recipes?: FakeRecipes;
    category?: Nullable<{ id: string }>;
    area?: Nullable<{ id: string }>;
    missingIngredients?: string[];
    images?: FakeImages;
  } = {},
) => {
  const recipes = options.recipes ?? new FakeRecipes();
  const images = options.images ?? new FakeImages();
  const service = new RecipesService({
    recipes,
    images,
    categories: { findByName: async () => ("category" in options ? options.category : { id: "cat-1" }) ?? null },
    areas: { findByName: async () => ("area" in options ? options.area : { id: "area-1" }) ?? null },
    ingredients: { findMissingIds: async () => options.missingIngredients ?? [] },
  });
  return { service, recipes, images };
};

describe("RecipesService", () => {
  it("should flatten the ingredients of a recipe", async () => {
    const { service } = createService({ recipes: new FakeRecipes({ detail: detailRow }) });

    await expect(service.getDetail(recipeId)).resolves.toMatchObject({
      ingredients: [{ id: "ing-1", name: "Butter", measure: "175g", img: null }],
    });
  });

  it("should answer 404 for an unknown recipe", async () => {
    const { service } = createService();

    await expect(service.getDetail(recipeId)).rejects.toMatchObject({
      status: 404,
      message: "Recipe not found",
    });
  });

  it("should refuse an unknown category before touching the storage", async () => {
    const { service, images } = createService({ category: null });

    await expect(service.create({ input, ownerId, imagePath: "/tmp/x.png" })).rejects.toMatchObject({
      status: 400,
      message: "Category not found",
    });
    expect(images.uploads).toEqual([]);
  });

  it("should refuse an unknown area", async () => {
    const { service } = createService({ area: null });

    await expect(service.create({ input, ownerId, imagePath: "/tmp/x.png" })).rejects.toMatchObject({
      status: 400,
      message: "Area not found",
    });
  });

  it("should refuse ingredients that do not exist", async () => {
    const { service, images } = createService({ missingIngredients: ["ing-9"] });

    await expect(service.create({ input, ownerId, imagePath: "/tmp/x.png" })).rejects.toMatchObject({
      status: 400,
      message: "One or more ingredients not found",
    });
    expect(images.uploads).toEqual([]);
  });

  it("should upload the image and store the recipe with the resolved ids", async () => {
    const { service, recipes, images } = createService();

    await service.create({ input, ownerId, imagePath: "/tmp/x.png" });

    expect(images.uploads).toEqual([
      { path: "/tmp/x.png", folder: RECIPE_IMAGE.folder, transformation: RECIPE_IMAGE.transformation },
    ]);
    expect(recipes.created).toEqual([
      {
        title: input.title,
        instructions: input.instructions,
        description: undefined,
        time: undefined,
        thumb: uploadedUrl,
        preview: uploadedUrl,
        ownerId,
        categoryId: "cat-1",
        areaId: "area-1",
        ingredients: input.ingredients,
      },
    ]);
  });

  it("should answer 404 when deleting a recipe that is gone", async () => {
    const { service } = createService();

    await expect(service.delete({ recipeId, ownerId })).rejects.toMatchObject({
      status: 404,
      message: "Recipe not found",
    });
  });

  it("should refuse to delete a recipe of another owner", async () => {
    const { service } = createService({ recipes: new FakeRecipes({ ownerId: "someone-else" }) });

    await expect(service.delete({ recipeId, ownerId })).rejects.toMatchObject({
      status: 403,
      message: "You can delete only your own recipes",
    });
  });

  it("should delete an own recipe", async () => {
    const recipes = new FakeRecipes({ ownerId });
    const { service } = createService({ recipes });

    await service.delete({ recipeId, ownerId });

    expect(recipes.deletedId).toBe(recipeId);
  });
});
