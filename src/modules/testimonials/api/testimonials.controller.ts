import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { TestimonialsService } from "../application/testimonials.service.ts";

export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(HTTP_STATUS.ok).json(await this.testimonials.list());
  };
}
