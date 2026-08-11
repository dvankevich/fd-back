import { Router } from "express";
import { getCategories } from "../controllers/categories.controller.ts";
import "../validators/categories.validator.ts";

const router = Router();

router.get("/", getCategories);

export default router;
