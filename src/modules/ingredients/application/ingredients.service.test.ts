import { describe, expect, it } from "vitest";
import type { IngredientsReader } from "../domain/ingredients.port.ts";
import type { IngredientView } from "../domain/ingredient.view.ts";
import { IngredientsService } from "./ingredients.service.ts";

const ingredients: IngredientView[] = [
  { id: "ing-1", name: "Squid", description: "A cephalopod", img: null },
  { id: "ing-2", name: "Tomato", description: null, img: "https://example.com/tomato.png" },
];

class FakeIngredientsReader implements IngredientsReader {
  constructor(private readonly rows: IngredientView[] = ingredients) {}

  async list(): Promise<IngredientView[]> {
    return this.rows;
  }

  async findExistingIds(ids: string[]): Promise<string[]> {
    const known = new Set(this.rows.map((row) => row.id));
    return ids.filter((id) => known.has(id));
  }
}

describe("IngredientsService", () => {
  it("should return the ingredients the reader gives", async () => {
    const service = new IngredientsService(new FakeIngredientsReader());

    await expect(service.list()).resolves.toEqual(ingredients);
  });

  it("should return an empty list when there are no ingredients", async () => {
    const service = new IngredientsService(new FakeIngredientsReader([]));

    await expect(service.list()).resolves.toEqual([]);
  });

  it("should report the ids that do not exist", async () => {
    const service = new IngredientsService(new FakeIngredientsReader());

    await expect(service.findMissingIds(["ing-1", "ghost", "ing-2"])).resolves.toEqual(["ghost"]);
  });

  it("should report nothing missing when every id exists", async () => {
    const service = new IngredientsService(new FakeIngredientsReader());

    await expect(service.findMissingIds(["ing-1", "ing-2"])).resolves.toEqual([]);
  });
});
