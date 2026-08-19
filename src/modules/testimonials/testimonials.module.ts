import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import { API_PREFIX, type ApiModule } from "../../core/http/api-module.ts";
import { TestimonialsController } from "./api/testimonials.controller.ts";
import { createTestimonialsRouter } from "./api/testimonials.routes.ts";
import { TestimonialsService } from "./application/testimonials.service.ts";
import { TestimonialsRepository } from "./infrastructure/testimonials.repository.ts";
import "./api/testimonials.openapi.ts";

export type TestimonialsModule = ApiModule & { service: TestimonialsService };

export const createTestimonialsModule = (client: PrismaClient = prisma): TestimonialsModule => {
  const service = new TestimonialsService(new TestimonialsRepository(client));

  return {
    path: `${API_PREFIX}/testimonials`,
    router: createTestimonialsRouter(new TestimonialsController(service)),
    service,
  };
};

export const testimonialsModule = createTestimonialsModule();
