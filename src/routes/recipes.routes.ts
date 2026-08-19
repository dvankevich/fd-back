import { Router } from "express";
import {
  getRecipes,
  getPopularRecipes,
  getRecipeById,
  createRecipe,
  deleteRecipe,
  getOwnRecipes,
  getFavoriteRecipes,
  addFavorite,
  removeFavorite,
} from "../controllers/recipes.controller.ts";
import { validateQuery } from "../core/http/validate.middleware.ts";
import { uploadRecipeThumb } from "../core/http/upload.middleware.ts";
import {
  RecipesQuerySchema,
  CreateRecipeSchema,
  PaginationQuerySchema
} from "../validators/recipes.validator.ts";
import authenticate from "../middleware/authenticate.ts";
import "../validators/recipes.validator.ts";

const router = Router();

// Public
router.get("/", validateQuery(RecipesQuerySchema), getRecipes);
router.get(
  "/popular",
  validateQuery(PaginationQuerySchema),
  getPopularRecipes,
);

// Private (статичні шляхи — ПЕРЕД /:id)
router.get("/own", authenticate, validateQuery(PaginationQuerySchema), getOwnRecipes);
router.get(
  "/favorites",
  authenticate,
  validateQuery(PaginationQuerySchema),
  getFavoriteRecipes,
);

router.post("/", authenticate, uploadRecipeThumb, createRecipe);

router.post("/:id/favorite", authenticate, addFavorite);
router.delete("/:id/favorite", authenticate, removeFavorite);

router.get("/:id", getRecipeById);
router.delete("/:id", authenticate, deleteRecipe);

export default router;
