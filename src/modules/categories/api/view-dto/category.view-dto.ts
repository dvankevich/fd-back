import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { CategoryView } from "../../domain/category.view.ts";

export const CategorySchema = registry.register(
  "Category",
  z.object({
    id: z.string().openapi({ example: "6462a6cd4c3d0ddd28897f8a" }),
    name: z.string().openapi({ example: "Seafood" }),
    image: z
      .string()
      .nullable()
      .openapi({
        example:
          "https://res.cloudinary.com/dvc0lg6q7/image/upload/v1787152926/foodies/categories/seafood.webp",
      }),
    description: z.string().nullable().openapi({
      example:
        "Ocean-inspired dishes with the fresh taste of fish and shellfish, from everyday meals to refined plates.",
    }),
  }) satisfies z.ZodType<CategoryView>,
);
