import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { CategoryView } from "../../domain/category.view.ts";

export const CategorySchema = registry.register(
  "Category",
  z.object({
    id: z.string().openapi({ example: "6462a6cd4c3d0ddd28897f8a" }),
    name: z.string().openapi({ example: "Seafood" }),
  }) satisfies z.ZodType<CategoryView>,
);
