import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import { API_PREFIX, type ApiModule } from "../../core/http/api-module.ts";
import { CategoriesController } from "./api/categories.controller.ts";
import { createCategoriesRouter } from "./api/categories.routes.ts";
import { CategoriesService } from "./application/categories.service.ts";
import { CategoriesRepository } from "./infrastructure/categories.repository.ts";
import "./api/categories.openapi.ts";

export type CategoriesModule = ApiModule & { service: CategoriesService };

export const createCategoriesModule = (client: PrismaClient = prisma): CategoriesModule => {
  const service = new CategoriesService(new CategoriesRepository(client));

  return {
    path: `${API_PREFIX}/categories`,
    router: createCategoriesRouter(new CategoriesController(service)),
    service,
  };
};

export const categoriesModule = createCategoriesModule();
