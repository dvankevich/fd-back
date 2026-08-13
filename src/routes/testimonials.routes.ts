import { Router } from "express";
import { getTestimonials } from "../controllers/testimonials.controller.ts";
import "../validators/testimonials.validator.ts";

const router = Router();

router.get("/", getTestimonials);

export default router;
