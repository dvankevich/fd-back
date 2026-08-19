import type { IngredientsReader } from "../domain/ingredients.port.ts";
import type { IngredientView } from "../domain/ingredient.view.ts";

export class IngredientsService {
  constructor(private readonly ingredients: IngredientsReader) {}

  list(): Promise<IngredientView[]> {
    return this.ingredients.list();
  }

  async findMissingIds(ids: string[]): Promise<string[]> {
    const existing = new Set(await this.ingredients.findExistingIds(ids));
    return ids.filter((id) => !existing.has(id));
  }
}
