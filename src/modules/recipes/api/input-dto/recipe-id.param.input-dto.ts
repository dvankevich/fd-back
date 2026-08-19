import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";

export const RecipeIdParamSchema = registry.register(
  "RecipeIdParam",
  z.object({
    id: z.string().min(1).openapi({ example: "6462a8f74c3d0ddd28897fcd" }),
  }),
);

export type RecipeIdParam = z.infer<typeof RecipeIdParamSchema>;
