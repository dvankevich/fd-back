import type { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import logger from "../logger.ts";
import { HTTP_STATUS } from "../constants/http.ts";
import { PRISMA_ERROR_CODE } from "../constants/prisma.ts";

export const errorHandler = async (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Always try to delete temporary uploaded file
  if (req.file?.path) {
    await fs.unlink(req.file.path).catch(() => {});
  }

  const status = err.status || err.statusCode || HTTP_STATUS.internalServerError;

  if (status >= HTTP_STATUS.internalServerError) {
    logger.error(
      {
        err,
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      err.message || "Internal server error",
    );
  } else {
    logger.warn(
      {
        err: { message: err.message, status, code: err.code },
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      err.message,
    );
  }

  if (err.type === "entity.parse.failed") {
    return res.status(HTTP_STATUS.badRequest).json({
      error: "Validation failed",
      details: {
        body: ["Invalid JSON format in request body"],
      },
    });
  }

  if (status === HTTP_STATUS.unprocessableEntity && err.details) {
    return res.status(HTTP_STATUS.unprocessableEntity).json({
      error: err.message,
      details: err.details,
    });
  }

  if (status >= HTTP_STATUS.badRequest && status < HTTP_STATUS.internalServerError) {
    return res.status(status).json({ error: err.message });
  }

  if (err.code === PRISMA_ERROR_CODE.notFound) {
    return res.status(HTTP_STATUS.notFound).json({ error: "Resource not found" });
  }

  if (err.code === PRISMA_ERROR_CODE.uniqueViolation) {
    return res.status(HTTP_STATUS.conflict).json({ error: "Unique constraint violation" });
  }

  if (err.code === PRISMA_ERROR_CODE.foreignKeyViolation) {
    return res.status(HTTP_STATUS.badRequest).json({ error: "Foreign key constraint failed" });
  }

  res.status(HTTP_STATUS.internalServerError).json({ error: "Internal server error" });
};
