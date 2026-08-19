import { z } from "zod";
import { ValidationError } from "../../../../core/exceptions/errors.ts";
import { isRecord, isString } from "../../../../core/guards.ts";
import { registry } from "../../../../core/openapi/registry.ts";
import { VALIDATION_MESSAGE, toErrorDetails } from "../../../../core/http/validate.middleware.ts";
import { UPLOAD_LIMITS } from "../../../../core/http/upload.limits.ts";
import { RECIPE_LIMITS } from "../../domain/recipe.limits.ts";
import { RECIPES_MESSAGE } from "../../domain/recipes.messages.ts";
import { RECIPE_EXAMPLE } from "../recipes.examples.ts";

export const CreateRecipeSchema = z.object({
  title: z
    .string()
    .min(RECIPE_LIMITS.titleMinChars)
    .max(RECIPE_LIMITS.titleMaxChars)
    .openapi({ example: "Battenberg Cake" }),
  category: z.string().min(1).openapi({ example: "Dessert" }),
  area: z.string().min(1).openapi({ example: "British" }),
  instructions: z
    .string()
    .min(RECIPE_LIMITS.instructionsMinChars)
    .openapi({ example: "Heat oven to 180C..." }),
  description: z
    .string()
    .max(RECIPE_LIMITS.descriptionMaxChars)
    .optional()
    .openapi({ example: "A classic British cake" }),
  time: z.string().optional().openapi({ example: "60" }),
  ingredients: z
    .array(
      z.object({
        id: z.string().openapi({ example: "640c2dd963a319ea671e367e" }),
        measure: z
          .string()
          .min(RECIPE_LIMITS.measureMinChars)
          .openapi({ example: "175g" }),
      }),
    )
    .min(RECIPE_LIMITS.minIngredients),
});

export const CreateRecipeFormSchema = registry.register(
  "CreateRecipeForm",
  CreateRecipeSchema.omit({ ingredients: true }).extend({
    ingredients: z.string().openapi({
      description: "JSON string array of { id, measure }",
      example: RECIPE_EXAMPLE.ingredientsField,
    }),
    thumb: z.string().openapi({
      type: "string",
      format: "binary",
      description: `Recipe image (required, max ${UPLOAD_LIMITS.fileSizeMb}MB, image/*)`,
    }),
  }),
);

export type CreateRecipeBody = z.infer<typeof CreateRecipeSchema>;

const readIngredients = (value: unknown): unknown => {
  if (!isString(value)) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new ValidationError(VALIDATION_MESSAGE.body, {
      ingredients: [RECIPES_MESSAGE.invalidIngredientsJson],
    });
  }
};

const blankToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

export const parseCreateRecipeBody = (body: unknown): CreateRecipeBody => {
  const source = isRecord(body) ? body : {};

  const result = CreateRecipeSchema.safeParse({
    title: source.title,
    category: source.category,
    area: source.area,
    instructions: source.instructions,
    description: blankToUndefined(source.description),
    time: blankToUndefined(source.time),
    ingredients: readIngredients(source.ingredients),
  });

  if (!result.success) {
    throw new ValidationError(VALIDATION_MESSAGE.body, toErrorDetails(result.error));
  }

  return result.data;
};
