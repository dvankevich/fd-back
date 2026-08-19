import { describe, expect, it } from "vitest";
import type { ErrorDetails } from "../../../core/exceptions/errors.ts";
import { isAppError } from "../../../core/exceptions/errors.ts";
import { parseCreateRecipeBody } from "./input-dto/create-recipe.input-dto.ts";
import { RECIPE_VALIDATION_DETAILS_EXAMPLE } from "./recipes.examples.ts";

const validBody = {
  title: "Battenberg Cake",
  category: "Dessert",
  area: "British",
  instructions: "Heat the oven and wait",
  ingredients: JSON.stringify([{ id: "640c2dd963a319ea671e367e", measure: "175g" }]),
};

const rejectionDetails = (body: unknown): ErrorDetails => {
  try {
    parseCreateRecipeBody(body);
    return {};
  } catch (err) {
    return isAppError(err) ? (err.details ?? {}) : {};
  }
};

describe("RECIPE_VALIDATION_DETAILS_EXAMPLE", () => {
  it("should show what a rejected create body really answers", () => {
    const details = rejectionDetails({
      ...validBody,
      title: "ab",
      instructions: "short",
      ingredients: "[]",
    });

    expect(details).toEqual(RECIPE_VALIDATION_DETAILS_EXAMPLE.create);
  });

  it("should show what a broken ingredients json really answers", () => {
    expect(rejectionDetails({ ...validBody, ingredients: "not json" })).toEqual(
      RECIPE_VALIDATION_DETAILS_EXAMPLE.brokenIngredientsJson,
    );
  });
});
