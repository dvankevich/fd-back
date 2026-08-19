import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import { API_PREFIX, type ApiModule } from "../../core/http/api-module.ts";
import { AreasController } from "./api/areas.controller.ts";
import { createAreasRouter } from "./api/areas.routes.ts";
import { AreasService } from "./application/areas.service.ts";
import { AreasRepository } from "./infrastructure/areas.repository.ts";
import "./api/areas.openapi.ts";

export type AreasModule = ApiModule & { service: AreasService };

export const createAreasModule = (client: PrismaClient = prisma): AreasModule => {
  const service = new AreasService(new AreasRepository(client));

  return {
    path: `${API_PREFIX}/areas`,
    router: createAreasRouter(new AreasController(service)),
    service,
  };
};

export const areasModule = createAreasModule();
