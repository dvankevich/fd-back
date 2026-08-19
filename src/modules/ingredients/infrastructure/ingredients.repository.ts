import type { Prisma, PrismaClient } from "../../../core/database/prisma.ts";
import type { IngredientsReader } from "../domain/ingredients.port.ts";
import type { IngredientView } from "../domain/ingredient.view.ts";

const ingredientSelect = {
  id: true,
  name: true,
  description: true,
  img: true,
} as const satisfies Prisma.IngredientSelect;

export class IngredientsRepository implements IngredientsReader {
  constructor(private readonly client: PrismaClient) {}

  list(): Promise<IngredientView[]> {
    return this.client.ingredient.findMany({ select: ingredientSelect, orderBy: { name: "asc" } });
  }

  async findExistingIds(ids: string[]): Promise<string[]> {
    const found = await this.client.ingredient.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return found.map((ingredient) => ingredient.id);
  }
}
