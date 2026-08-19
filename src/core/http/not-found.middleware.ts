import type { Request, Response } from "express";
import logger from "../logger.ts";
import { HTTP_STATUS } from "./http-status.ts";

const NOT_FOUND_MESSAGE = "Not found";

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.debug({ method: req.method, url: req.url }, "Route not found");

  res.status(HTTP_STATUS.notFound).json({ error: NOT_FOUND_MESSAGE });
};
