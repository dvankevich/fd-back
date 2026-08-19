import { Router } from "express";
import type { TestimonialsController } from "./testimonials.controller.ts";

export const createTestimonialsRouter = (controller: TestimonialsController): Router => {
  const router = Router();

  router.get("/", controller.list);

  return router;
};
