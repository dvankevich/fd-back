import type { IngredientView } from "./ingredient.view.ts";

export interface IngredientsReader {
  list(): Promise<IngredientView[]>;
  findExistingIds(ids: string[]): Promise<string[]>;
}
