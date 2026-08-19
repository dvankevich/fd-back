import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { HealthService, LivenessView, ReadinessView } from "../application/health.service.ts";

export class HealthController {
  constructor(private readonly health: HealthService) {}

  liveness = (_req: Request, res: Response<LivenessView>): void => {
    res.status(HTTP_STATUS.ok).json(this.health.liveness());
  };

  readiness = async (_req: Request, res: Response<ReadinessView>): Promise<void> => {
    const readiness = await this.health.readiness();

    res
      .status(readiness.status === "ready" ? HTTP_STATUS.ok : HTTP_STATUS.serviceUnavailable)
      .json(readiness);
  };
}
