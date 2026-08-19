import { PAGE_LIMITS, type Paginated } from "../../../core/paginator.ts";
import type {
  CreatedRecipeView,
  MessageView,
  PopularRecipeView,
  RecipeDetailView,
  RecipeListItemView,
  RecipeSummaryView,
} from "../domain/recipe.view.ts";
import { RECIPES_MESSAGE } from "../domain/recipes.messages.ts";

const UPLOADED_IMAGE =
  "https://res.cloudinary.com/dvc0lg6q7/image/upload/v1787152924/foodies/recipes/battenberg.webp";

const INSTRUCTIONS =
  "Heat oven to 180C/160C fan/gas 4 and line a 20cm square tin with baking parchment.";

const BRITISH = { id: "6462a6f04c3d0ddd28897fa1", name: "British" };

const SEED_OWNER = { id: "64c8d958249fae54bae90bb9", name: "GoIT", avatar: null };

const SUMMARY: RecipeSummaryView = {
  id: "6462a8f74c3d0ddd28897fcd",
  title: "Battenberg Cake",
  description: "A classic British cake made with almond sponge cake and covered in marzipan",
  thumb: "https://ftp.goit.study/img/so-yummy/preview/Battenberg%20Cake.jpg",
  preview: null,
  time: "60",
  category: { id: "6462a6cd4c3d0ddd28897f8f", name: "Dessert" },
  area: BRITISH,
  owner: SEED_OWNER,
};

const OTHER_SUMMARY: RecipeSummaryView = {
  id: "6462a8f74c3d0ddd28898027",
  title: "Beef Wellington",
  description: "A classic and elegant dish made with beef tenderloin and puff pastry",
  thumb: "https://ftp.goit.study/img/so-yummy/preview/Beef%20Wellington.jpg",
  preview: null,
  time: "90",
  category: { id: "6462a6cd4c3d0ddd28897f8e", name: "Beef" },
  area: BRITISH,
  owner: SEED_OWNER,
};

const toExamplePage = <T>({ data, total }: { data: T[]; total: number }): Paginated<T> => ({
  data,
  total,
  page: PAGE_LIMITS.firstPage,
  limit: PAGE_LIMITS.defaultSize,
});

const FAVORITE: RecipeListItemView = { ...SUMMARY, isFavorite: true };
const NOT_FAVORITE: RecipeListItemView = { ...OTHER_SUMMARY, isFavorite: false };

const POPULAR: PopularRecipeView = { ...FAVORITE, _count: { favorites: 12 } };

const DETAIL: RecipeDetailView = {
  ...FAVORITE,
  instructions: INSTRUCTIONS,
  ingredients: [
    {
      id: "640c2dd963a319ea671e367e",
      name: "Butter",
      measure: "175g",
      img: "https://ftp.goit.study/img/so-yummy/ingredients/640c2dd963a319ea671e367e.png",
    },
  ],
};

const CREATED: CreatedRecipeView = {
  ...SUMMARY,
  id: "clx8p2k1v0000qz7h9m4n2t5b",
  thumb: UPLOADED_IMAGE,
  preview: UPLOADED_IMAGE,
  instructions: INSTRUCTIONS,
};

const ADDED_TO_FAVORITES: MessageView = { message: RECIPES_MESSAGE.addedToFavorites };

export const RECIPE_EXAMPLE = {
  list: toExamplePage({ data: [FAVORITE, NOT_FAVORITE], total: 42 }),
  popular: toExamplePage({ data: [POPULAR], total: 42 }),
  own: toExamplePage({ data: [NOT_FAVORITE], total: 1 }),
  favorites: toExamplePage({ data: [FAVORITE], total: 1 }),
  detail: DETAIL,
  created: CREATED,
  addedToFavorites: ADDED_TO_FAVORITES,
  ingredientsField: JSON.stringify([{ id: "640c2dd963a319ea671e367e", measure: "175g" }]),
};

export const TOTAL_COUNT_EXAMPLE = {
  search: String(RECIPE_EXAMPLE.list.total),
  own: String(RECIPE_EXAMPLE.own.total),
  favorites: String(RECIPE_EXAMPLE.favorites.total),
};

export const RECIPE_VALIDATION_DETAILS_EXAMPLE = {
  create: {
    title: ["Too small: expected string to have >=3 characters"],
    instructions: ["Too small: expected string to have >=10 characters"],
    ingredients: ["Too small: expected array to have >=1 items"],
  },
  brokenIngredientsJson: { ingredients: [RECIPES_MESSAGE.invalidIngredientsJson] },
} as const;
