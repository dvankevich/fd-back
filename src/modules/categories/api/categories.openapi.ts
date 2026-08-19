import { z } from "zod";
import { registry } from "../../../core/openapi/registry.ts";
import { CategorySchema } from "./view-dto/category.view-dto.ts";

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
