import { Router } from "express";
import type { CategoriesController } from "./categories.controller.ts";

export const createCategoriesRouter = (controller: CategoriesController): Router => {
  const router = Router();

  router.get("/", controller.list);

  return router;
};
