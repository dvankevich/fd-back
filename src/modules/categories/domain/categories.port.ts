import type { CategoryView } from "./category.view.ts";

export interface CategoriesReader {
  list(): Promise<CategoryView[]>;
  findByName(name: string): Promise<CategoryView | null>;
}
