import type { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import logger from "../logger.ts";

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

  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
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
    return res.status(400).json({
      error: "Validation failed",
      details: {
        body: ["Invalid JSON format in request body"],
      },
    });
  }

  if (status === 422 && err.details) {
    return res.status(422).json({
      error: err.message,
      details: err.details,
    });
  }

  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: err.message });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Resource not found" });
  }

  if (err.code === "P2002") {
    return res.status(409).json({ error: "Unique constraint violation" });
  }

  if (err.code === "P2003") {
    return res.status(400).json({ error: "Foreign key constraint failed" });
  }

  res.status(500).json({ error: "Internal server error" });
};
