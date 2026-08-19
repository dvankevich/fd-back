import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import type { AreasService } from "../application/areas.service.ts";

export class AreasController {
  constructor(private readonly areas: AreasService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(HTTP_STATUS.ok).json(await this.areas.list());
  };
}
