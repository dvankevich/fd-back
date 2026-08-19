import type { Nullable } from "../../../core/types/common.ts";

export type RecipeReferenceView = { id: string; name: string };

export type RecipeOwnerView = { id: string; name: string; avatar: Nullable<string> };

export type RecipeListItemView = {
  id: string;
  title: string;
  description: Nullable<string>;
  thumb: Nullable<string>;
  preview: Nullable<string>;
  time: Nullable<string>;
  category: RecipeReferenceView;
  area: RecipeReferenceView;
  owner: RecipeOwnerView;
};

export type PopularRecipeView = RecipeListItemView & { _count: { favorites: number } };

export type CreatedRecipeView = RecipeListItemView & { instructions: string };

export type RecipeIngredientView = {
  id: string;
  name: string;
  measure: string;
  img: Nullable<string>;
};

export type RecipeDetailView = CreatedRecipeView & { ingredients: RecipeIngredientView[] };

export type MessageView = { message: string };
