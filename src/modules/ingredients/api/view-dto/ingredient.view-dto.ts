import { z } from "zod";
import { registry } from "../../../../core/openapi/registry.ts";
import type { IngredientView } from "../../domain/ingredient.view.ts";

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
  }) satisfies z.ZodType<IngredientView>,
);
