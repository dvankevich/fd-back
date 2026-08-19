import { Router } from "express";
import type { HealthController } from "./health.controller.ts";

export const HEALTH_PATH = { liveness: "/healthz", readiness: "/readyz" } as const;

export const createHealthRouter = (controller: HealthController): Router => {
  const router = Router();

  router.get(HEALTH_PATH.liveness, controller.liveness);
  router.get(HEALTH_PATH.readiness, controller.readiness);

  return router;
};
