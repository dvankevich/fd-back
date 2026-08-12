import { z } from "zod";
import { registry } from "../openapi.ts";

export const IngredientSchema = registry.register(
  "Ingredient",
  z.object({
    id: z.string().openapi({ example: "640c2dd963a319ea671e37aa" }),
    name: z.string().openapi({ example: "Squid" }),
    description: z.string().nullable().openapi({
      example:
        "A type of cephalopod with a soft, cylindrical body and long tentacles...",
    }),
    img: z.string().nullable().openapi({
      example:
        "https://ftp.goit.study/img/so-yummy/ingredients/640c2dd963a319ea671e37aa.png",
    }),
  }),
);

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
