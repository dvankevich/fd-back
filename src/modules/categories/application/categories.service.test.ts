import { describe, expect, it } from "vitest";
import type { Nullable } from "../../../core/types/common.ts";
import type { CategoriesReader } from "../domain/categories.port.ts";
import type { CategoryView } from "../domain/category.view.ts";
import { CategoriesService } from "./categories.service.ts";

const categories: CategoryView[] = [
  { id: "cat-1", name: "Lamb" },
  { id: "cat-2", name: "Seafood" },
];

class FakeCategoriesReader implements CategoriesReader {
  readonly requestedNames: string[] = [];

  constructor(private readonly rows: CategoryView[] = categories) {}

  async list(): Promise<CategoryView[]> {
    return this.rows;
  }

  async findByName(name: string): Promise<Nullable<CategoryView>> {
    this.requestedNames.push(name);
    return this.rows.find((row) => row.name.toLowerCase() === name.toLowerCase()) ?? null;
  }
}

describe("CategoriesService", () => {
  it("should return the categories the reader gives", async () => {
    const service = new CategoriesService(new FakeCategoriesReader());

    await expect(service.list()).resolves.toEqual(categories);
  });

  it("should return an empty list when there are no categories", async () => {
    const service = new CategoriesService(new FakeCategoriesReader([]));

    await expect(service.list()).resolves.toEqual([]);
  });

  it("should look a category up by name", async () => {
    const reader = new FakeCategoriesReader();
    const service = new CategoriesService(reader);

    await expect(service.findByName("seafood")).resolves.toEqual({ id: "cat-2", name: "Seafood" });
    expect(reader.requestedNames).toEqual(["seafood"]);
  });

  it("should return null for an unknown category name", async () => {
    const service = new CategoriesService(new FakeCategoriesReader());

    await expect(service.findByName("Pizza")).resolves.toBeNull();
  });
});
