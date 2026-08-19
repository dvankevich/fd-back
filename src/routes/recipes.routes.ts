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
import { authModule } from "../modules/auth/index.ts";
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
router.get("/own", authModule.authenticate, validateQuery(PaginationQuerySchema), getOwnRecipes);
router.get(
  "/favorites",
  authModule.authenticate,
  validateQuery(PaginationQuerySchema),
  getFavoriteRecipes,
);

router.post("/", authModule.authenticate, uploadRecipeThumb, createRecipe);

router.post("/:id/favorite", authModule.authenticate, addFavorite);
router.delete("/:id/favorite", authModule.authenticate, removeFavorite);

router.get("/:id", getRecipeById);
router.delete("/:id", authModule.authenticate, deleteRecipe);

export default router;
