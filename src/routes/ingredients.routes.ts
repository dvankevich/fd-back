import { Router } from "express";
import { getIngredients } from "../controllers/ingredients.controller.ts";
import "../validators/ingredients.validator.ts";

const router = Router();

router.get("/", getIngredients);

export default router;
