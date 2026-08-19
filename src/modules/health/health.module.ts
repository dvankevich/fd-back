import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import type { ApiModule } from "../../core/http/api-module.ts";
import { HealthController } from "./api/health.controller.ts";
import { createHealthRouter } from "./api/health.routes.ts";
import { HealthService } from "./application/health.service.ts";
import { PrismaDatabaseProbe } from "./infrastructure/database.probe.ts";

const HEALTH_MOUNT_PATH = "/";

export type HealthModule = ApiModule & { service: HealthService };

export const createHealthModule = (client: PrismaClient = prisma): HealthModule => {
  const service = new HealthService(new PrismaDatabaseProbe(client));

  return {
    path: HEALTH_MOUNT_PATH,
    router: createHealthRouter(new HealthController(service)),
    service,
  };
};

export const healthModule = createHealthModule();
