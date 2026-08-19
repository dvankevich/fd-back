import type { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import { PRISMA_ERROR_CODE } from "../database/prisma-errors.ts";
import type { ErrorDetails } from "../exceptions/errors.ts";
import { isArrayOf, isNonEmptyString, isNumber, isRecord, isString } from "../guards.ts";
import logger from "../logger.ts";
import type { Optional } from "../types/common.ts";
import { HTTP_STATUS } from "./http-status.ts";

const BODY_PARSE_FAILURE = {
  type: "entity.parse.failed",
  message: "Validation failed",
  details: { body: ["Invalid JSON format in request body"] },
} as const;

const FALLBACK_MESSAGE = "Internal server error";

const PRISMA_FAILURE = new Map<string, { status: number; message: string }>([
  [PRISMA_ERROR_CODE.notFound, { status: HTTP_STATUS.notFound, message: "Resource not found" }],
  [PRISMA_ERROR_CODE.uniqueViolation, { status: HTTP_STATUS.conflict, message: "Unique constraint violation" }],
  [
    PRISMA_ERROR_CODE.foreignKeyViolation,
    { status: HTTP_STATUS.badRequest, message: "Foreign key constraint failed" },
  ],
]);

type Failure = {
  status: number;
  message: string;
  code: Optional<string>;
  type: Optional<string>;
  details: Optional<ErrorDetails>;
};

const isErrorDetails = (value: unknown): value is ErrorDetails =>
  isRecord(value) && Object.values(value).every((messages) => isArrayOf(messages, isString));

const toFailure = (err: unknown): Failure => {
  const source = isRecord(err) ? err : {};
  return {
    status: [source.status, source.statusCode].find(isNumber) ?? HTTP_STATUS.internalServerError,
    message: isNonEmptyString(source.message) ? source.message : FALLBACK_MESSAGE,
    code: isString(source.code) ? source.code : undefined,
    type: isString(source.type) ? source.type : undefined,
    details: isErrorDetails(source.details) ? source.details : undefined,
  };
};

const requestView = (req: Request) => ({ id: req.id, method: req.method, url: req.url });

const logFailure = ({ err, failure, req }: { err: unknown; failure: Failure; req: Request }): void => {
  if (failure.status >= HTTP_STATUS.internalServerError) {
    logger.error({ err, req: requestView(req) }, failure.message);
    return;
  }
  logger.warn(
    { err: { message: failure.message, status: failure.status, code: failure.code }, req: requestView(req) },
    failure.message,
  );
};

export const errorHandler = async (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (req.file?.path) {
    await fs.unlink(req.file.path).catch(() => {});
  }

  const failure = toFailure(err);

  logFailure({ err, failure, req });

  if (failure.type === BODY_PARSE_FAILURE.type) {
    res.status(HTTP_STATUS.badRequest).json({
      error: BODY_PARSE_FAILURE.message,
      details: BODY_PARSE_FAILURE.details,
    });
    return;
  }

  if (failure.status === HTTP_STATUS.unprocessableEntity && failure.details) {
    res.status(HTTP_STATUS.unprocessableEntity).json({ error: failure.message, details: failure.details });
    return;
  }

  if (failure.status >= HTTP_STATUS.badRequest && failure.status < HTTP_STATUS.internalServerError) {
    res.status(failure.status).json({ error: failure.message });
    return;
  }

  const prismaFailure = failure.code === undefined ? undefined : PRISMA_FAILURE.get(failure.code);
  if (prismaFailure) {
    res.status(prismaFailure.status).json({ error: prismaFailure.message });
    return;
  }

  res.status(HTTP_STATUS.internalServerError).json({ error: FALLBACK_MESSAGE });
};
