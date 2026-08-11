import { z } from "zod";
import { registry } from "../openapi.ts";

export const CategorySchema = registry.register(
  "Category",
  z.object({
    id: z.string().openapi({ example: "6462a6cd4c3d0ddd28897f8a" }),
    name: z.string().openapi({ example: "Seafood" }),
  }),
);

registry.registerPath({
  method: "get",
  path: "/api/categories",
  tags: ["Categories"],
  summary: "Get list of recipe categories",
  responses: {
    200: {
      description: "List of categories",
      content: {
        "application/json": {
          schema: z.array(CategorySchema),
        },
      },
    },
  },
});
