import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import { LimitSchema, PageSchema } from "./pagination-query.input-dto.ts";

export const RecipesQuerySchema = registry.register(
  "RecipesQuery",
  z.object({
    category: z.string().optional().openapi({ example: "Dessert" }),
    area: z.string().optional().openapi({ example: "British" }),
    ingredient: z.string().optional().openapi({ example: "640c2dd963a319ea671e37aa" }),
    page: PageSchema,
    limit: LimitSchema,
  }),
);

export type RecipesQuery = z.infer<typeof RecipesQuerySchema>;
