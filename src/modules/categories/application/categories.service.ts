import type { CategoriesReader } from "../domain/categories.port.ts";
import type { CategoryView } from "../domain/category.view.ts";
import type { Nullable } from "../../../core/types/common.ts";

export class CategoriesService {
  constructor(private readonly categories: CategoriesReader) {}

  list(): Promise<CategoryView[]> {
    return this.categories.list();
  }

  findByName(name: string): Promise<Nullable<CategoryView>> {
    return this.categories.findByName(name);
  }
}
