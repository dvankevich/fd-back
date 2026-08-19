import { Router } from "express";
import type { AreasController } from "./areas.controller.ts";

export const createAreasRouter = (controller: AreasController): Router => {
  const router = Router();

  router.get("/", controller.list);

  return router;
};
