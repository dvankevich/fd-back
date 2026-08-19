import type { Prisma, PrismaClient } from "../../../core/database/prisma.ts";
import type { CategoriesReader } from "../domain/categories.port.ts";
import type { CategoryView } from "../domain/category.view.ts";
import type { Nullable } from "../../../core/types/common.ts";

const categorySelect = { id: true, name: true } as const satisfies Prisma.CategorySelect;

export class CategoriesRepository implements CategoriesReader {
  constructor(private readonly client: PrismaClient) {}

  list(): Promise<CategoryView[]> {
    return this.client.category.findMany({ select: categorySelect, orderBy: { name: "asc" } });
  }

  findByName(name: string): Promise<Nullable<CategoryView>> {
    return this.client.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: categorySelect,
    });
  }
}
