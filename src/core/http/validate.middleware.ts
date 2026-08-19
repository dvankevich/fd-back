import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { BadRequestError, ValidationError, type ErrorDetails } from "../exceptions/errors.ts";

const VALIDATION_FAILURE = {
  body: (details: ErrorDetails) => new ValidationError("Validation failed", details),
  params: (details: ErrorDetails) => new BadRequestError("Invalid parameters", details),
  query: (details: ErrorDetails) => new BadRequestError("Invalid query parameters", details),
} as const;

const ROOT_ERROR_KEY = "body";

const errorDetails = (error: z.ZodError): ErrorDetails => {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return formErrors.length > 0 ? { [ROOT_ERROR_KEY]: formErrors, ...fieldErrors } : fieldErrors;
};

export const validateBody =
  <T extends z.ZodType>(schema: T) =>
  (req: Request<ParamsDictionary, unknown, z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      return next(VALIDATION_FAILURE.body(errorDetails(result.error)));
    }

    req.body = result.data;
    next();
  };

export const validateParams =
  <T extends z.ZodType>(schema: T) =>
  (req: Request<z.infer<T>>, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return next(VALIDATION_FAILURE.params(errorDetails(result.error)));
    }

    req.params = result.data;
    next();
  };

export const validateQuery =
  <T extends z.ZodType>(schema: T) =>
  (req: Request, res: Response<unknown, { query: z.infer<T> }>, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(VALIDATION_FAILURE.query(errorDetails(result.error)));
    }

    res.locals.query = result.data;
    next();
  };
