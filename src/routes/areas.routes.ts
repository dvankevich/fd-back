import { Router } from "express";
import { getAreas } from "../controllers/areas.controller.ts";
import "../validators/areas.validator.ts";

const router = Router();

router.get("/", getAreas);

export default router;
