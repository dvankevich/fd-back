import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import createHttpError from "http-errors";
import { HTTP_STATUS } from "../constants/http.ts";
import type { ValueOf } from "../types/common.ts";

const VALIDATION_FAILURE = {
  body: { status: HTTP_STATUS.unprocessableEntity, message: "Validation failed" },
  params: { status: HTTP_STATUS.badRequest, message: "Invalid parameters" },
  query: { status: HTTP_STATUS.badRequest, message: "Invalid query parameters" },
} as const;

const ROOT_ERROR_KEY = "body";

const errorDetails = (error: z.ZodError): Record<string, string[]> => {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return formErrors.length > 0 ? { [ROOT_ERROR_KEY]: formErrors, ...fieldErrors } : fieldErrors;
};

const validationError = (failure: ValueOf<typeof VALIDATION_FAILURE>, error: z.ZodError) =>
  createHttpError(failure.status, failure.message, { details: errorDetails(error) });

export const validateBody =
  <T extends z.ZodType>(schema: T) =>
  (req: Request<ParamsDictionary, unknown, z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      return next(validationError(VALIDATION_FAILURE.body, result.error));
    }

    req.body = result.data;
    next();
  };

export const validateParams =
  <T extends z.ZodType>(schema: T) =>
  (req: Request<z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return next(validationError(VALIDATION_FAILURE.params, result.error));
    }

    req.params = result.data;
    next();
  };

export const validateQuery =
  <T extends z.ZodType>(schema: T) =>
  (req: Request, res: Response<unknown, { query: z.infer<T> }>, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(validationError(VALIDATION_FAILURE.query, result.error));
    }

    res.locals.query = result.data;
    next();
  };
