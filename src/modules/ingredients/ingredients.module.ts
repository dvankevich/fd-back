import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import { API_PREFIX, type ApiModule } from "../../core/http/api-module.ts";
import { IngredientsController } from "./api/ingredients.controller.ts";
import { createIngredientsRouter } from "./api/ingredients.routes.ts";
import { IngredientsService } from "./application/ingredients.service.ts";
import { IngredientsRepository } from "./infrastructure/ingredients.repository.ts";
import "./api/ingredients.openapi.ts";

export type IngredientsModule = ApiModule & { service: IngredientsService };

export const createIngredientsModule = (client: PrismaClient = prisma): IngredientsModule => {
  const service = new IngredientsService(new IngredientsRepository(client));

  return {
    path: `${API_PREFIX}/ingredients`,
    router: createIngredientsRouter(new IngredientsController(service)),
    service,
  };
};

export const ingredientsModule = createIngredientsModule();
