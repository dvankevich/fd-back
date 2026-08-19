import type { Request, Response } from "express";
import type { CategoriesService } from "../application/categories.service.ts";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";

export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(HTTP_STATUS.ok).json(await this.categories.list());
  };
}
