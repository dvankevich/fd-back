import { z } from "zod";
import { registry } from "../../../core/openapi/registry.ts";
import { IngredientSchema } from "./view-dto/ingredient.view-dto.ts";

registry.registerPath({
  method: "get",
  path: "/api/ingredients",
  tags: ["Ingredients"],
  summary: "Get list of ingredients",
  responses: {
    200: {
      description: "List of ingredients",
      content: {
        "application/json": {
          schema: z.array(IngredientSchema),
        },
      },
    },
  },
});
