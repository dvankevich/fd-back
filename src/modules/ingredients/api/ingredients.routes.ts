import { Router } from "express";
import type { IngredientsController } from "./ingredients.controller.ts";

export const createIngredientsRouter = (controller: IngredientsController): Router => {
  const router = Router();

  router.get("/", controller.list);

  return router;
};
