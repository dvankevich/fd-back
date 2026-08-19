import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { IngredientsService } from "../application/ingredients.service.ts";

export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(HTTP_STATUS.ok).json(await this.ingredients.list());
  };
}
